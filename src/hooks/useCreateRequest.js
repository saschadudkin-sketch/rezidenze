import { useState, useEffect, useRef } from 'react';
import { useActions, usePerms } from '../store/AppStore.jsx';
import { genId } from '../utils.js';
import { toast } from '../ui/Toasts';
import { lockScroll, unlockScroll } from '../ui/scrollLock.js';
import {
  FB_MODE,
  createRequest,
  uploadRequestPhoto,
} from '../services/firebaseService';

// ─── Предикаты категорий ─────────────────────────────────────────────────────

/** Нужно ли поле «марка и номер авто» */
export const needsCarPlate = (cat) =>
  ['taxi', 'car', 'master', 'delivery'].includes(cat);

/** Нужно ли обязательное имя посетителя */
export const requiresVisitorName = (cat) =>
  !['taxi', 'car', 'master', 'team', 'courier'].includes(cat);

/** Показывать ли поля посетителя вообще */
export const hasVisitorFields = (cat) =>
  cat !== 'taxi' && cat !== 'team';

/** Может ли категория использовать постоянный список */
export const canUsePermsList = (type, cat) =>
  type === 'pass' && !['taxi', 'team', 'courier'].includes(cat);

// ─── Сжатие изображения ──────────────────────────────────────────────────────

const compressImage = (dataUrl, maxWidth = 1024, quality = 0.72) =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

// ─── Форматирование запланированной даты ─────────────────────────────────────

export const fmtScheduled = (s) => {
  if (!s) return '';
  const d    = new Date(s);
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString())
    return 'Сегодня в ' + time;
  if (d.toDateString() === new Date(Date.now() + 86_400_000).toDateString())
    return 'Завтра в ' + time;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ' в ' + time;
};

export const minDateTime = () => {
  const d = new Date(Date.now() + 5 * 60_000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};

export const SCHEDULE_PRESETS = [
  { label: 'Через 1 час',       mins: 60  },
  { label: 'Через 2 часа',      mins: 120 },
  { label: 'Сегодня в 18:00',   fn: () => { const d = new Date(); d.setHours(18, 0, 0, 0); return d; } },
  { label: 'Завтра утром',       fn: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
];

// ─── Хук ─────────────────────────────────────────────────────────────────────

/**
 * useCreateRequest — вся логика формы создания заявки.
 * CreateModal становится чистым «шаблоном» без бизнес-логики.
 */
export function useCreateRequest({ user, type, initialCat, initialData, onClose, onDone }) {
  const cats = type === 'pass'
    ? (user.role === 'contractor'
        ? ['worker', 'team', 'delivery', 'car']
        : ['guest', 'courier', 'taxi', 'car', 'master'])
    : ['electrician', 'plumber'];

  // ── Состояние формы ─────────────────────────────────────────────────────
  const [cat,      setCat]      = useState(initialData?.category  || initialCat || cats[0]);
  const [vName,    setVName]    = useState(initialData?.visitorName  || '');
  const [vNames,   setVNames]   = useState(initialData?.visitorName ? [initialData.visitorName] : ['']);
  const [vPhone,   setVPhone]   = useState(initialData?.visitorPhone || '');
  const [carPlate, setCarPlate] = useState(initialData?.carPlate   || '');
  const [comment,  setComment]  = useState(initialData?.comment    || '');
  const [priority, setPriority] = useState(initialData?.priority   || 'normal');
  const [passDuration, setPassDuration] = useState(initialData?.passDuration || 'once');
  const [validUntil,   setValidUntil]   = useState(initialData?.validUntil   || '');
  const [photos,   setPhotos]   = useState([]);
  const [loading,  setLoading]  = useState(false);

  // ── Шаблоны ─────────────────────────────────────────────────────────────
  const [showSaveTpl, setShowSaveTpl] = useState(false);
  const [tplName,     setTplName]     = useState('');

  // ── Расписание ──────────────────────────────────────────────────────────
  const [showSchedule,  setShowSchedule]  = useState(false);
  const [scheduledFor,  setScheduledFor]  = useState('');

  // ── Выбор из списка ─────────────────────────────────────────────────────
  const [showPermsPicker, setShowPermsPicker] = useState(false);

  const { addTemplate, addRequest } = useActions();
  const userPerms = usePerms(user.uid);

  // Постоянный список для подстановки
  const permsList = canUsePermsList(type, cat)
    ? (user.role === 'contractor' ? userPerms.workers : userPerms.visitors)
    : [];

  // Блокировка скролла при открытом модале
  useEffect(() => {
    lockScroll();
    return unlockScroll;
  }, []);

  // Сброс полей при смене категории
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setVName(''); setVPhone(''); setCarPlate(''); setVNames(['']);
  }, [cat]);

  // ── Обработчики ─────────────────────────────────────────────────────────

  const handlePhoto = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - photos.length;
    if (remaining <= 0) { toast('Максимум 5 фото', 'error'); return; }
    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) toast(`Добавлено ${remaining} из ${files.length} фото (макс. 5)`, 'info');

    toProcess.forEach(f => {
      if (f.size > 10 * 1024 * 1024) { toast('Фото слишком большое (макс. 10 МБ)', 'error'); return; }
      const reader = new FileReader();
      reader.onerror = () => toast('Не удалось загрузить фото', 'error');
      reader.onload = async (ev) => {
        const compressed = await compressImage(ev.target.result);
        setPhotos(prev => prev.length < 5 ? [...prev, compressed] : prev);
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const applyPreset = (preset) => {
    const d = preset.fn ? preset.fn() : new Date(Date.now() + preset.mins * 60_000);
    d.setSeconds(0, 0);
    setScheduledFor(d.toISOString().slice(0, 16));
  };

  const handleSaveTpl = () => {
    if (!tplName.trim()) { toast('Введите название шаблона', 'error'); return; }
    addTemplate(user.uid, {
      id:          genId('t'),
      name:        tplName.trim(),
      type,
      category:    cat,
      visitorName: cat === 'taxi' ? '' : cat === 'team'
                     ? vNames.filter(n => n.trim()).join(', ')
                     : vName,
      visitorPhone: vPhone,
      carPlate,
      comment,
    });
    setTplName('');
    setShowSaveTpl(false);
    toast('Шаблон «' + tplName.trim() + '» сохранён', 'success');
  };

  const handlePickPerm = (perm) => {
    setVName(perm.name);
    if (perm.phone) setVPhone(perm.phone);
    setShowPermsPicker(false);
  };

  const handleSubmit = async () => {
    // Валидация
    if (type === 'pass' && cat === 'taxi'  && !carPlate.trim())              { toast('Укажите марку и номер авто', 'error');  return; }
    if (type === 'pass' && cat === 'team'  && !vNames.some(n => n.trim()))   { toast('Укажите имена посетителей', 'error'); return; }
    if (type === 'pass' && requiresVisitorName(cat) && !vName.trim())        { toast('Укажите имя посетителя',     'error');  return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 500));

    const schedDate   = showSchedule && scheduledFor ? new Date(scheduledFor) : null;
    const isScheduled = Boolean(schedDate && schedDate > new Date());

    const newReq = {
      id:            genId('r'),
      type,
      category:      cat,
      createdByUid:  user.uid,
      createdByRole: user.role,
      createdByName: user.name,
      createdByApt:  user.apartment,
      visitorName:   type !== 'pass'       ? null
                   : cat  === 'taxi'       ? null
                   : cat  === 'team'       ? vNames.filter(n => n.trim()).join(', ') || null
                   : vName.trim()          || null,
      carPlate:      needsCarPlate(cat)    ? carPlate.trim() || null : null,
      visitorPhone:  type === 'pass'       ? vPhone.trim()   || null : null,
      comment:       comment.trim(),
      priority:      'normal',
      passDuration:  type === 'pass' ? (validUntil ? 'temporary' : 'once') : null,
      validUntil:    type === 'pass' && validUntil ? new Date(validUntil) : null,
      photo:         null,
      photos:        [],
      status:        isScheduled ? 'scheduled' : 'pending',
      createdAt:     new Date(),
      arrivedAt:     null,
      scheduledFor:  schedDate,
    };

    // Загрузка фото
    if (photos.length > 0) {
      if (FB_MODE === 'live') {
        const uploaded = [];
        for (let i = 0; i < photos.length; i++) {
          try { uploaded.push(await uploadRequestPhoto(newReq.id + '_' + i, photos[i])); }
          catch (e) { console.warn(e); uploaded.push(photos[i]); }
        }
        newReq.photos = uploaded;
      } else {
        newReq.photos = photos;
      }
      newReq.photo = newReq.photos[0] || null;
    }

    if (FB_MODE === 'live') createRequest({ ...newReq, id: undefined }).catch(console.warn);
    addRequest(newReq);
    setLoading(false);

    const successMsg = isScheduled
      ? 'Запланировано на ' + fmtScheduled(scheduledFor)
      : type === 'pass' ? 'Пропуск создан' : 'Заявка отправлена';
    toast(successMsg, 'success');
    onDone();
    onClose();
  };

  return {
    // Данные формы
    cats, cat, setCat,
    vName, setVName,
    vNames, setVNames,
    vPhone, setVPhone,
    carPlate, setCarPlate,
    comment, setComment,
    priority, setPriority,
    passDuration, setPassDuration,
    validUntil, setValidUntil,
    photos, removePhoto,
    loading,
    permsList,

    // Шаблоны
    showSaveTpl, setShowSaveTpl,
    tplName, setTplName,

    // Расписание
    showSchedule, setShowSchedule,
    scheduledFor, setScheduledFor,

    // Выбор из списка
    showPermsPicker, setShowPermsPicker,

    // Обработчики
    handlePhoto,
    applyPreset,
    handleSaveTpl,
    handlePickPerm,
    handleSubmit,
  };
}
