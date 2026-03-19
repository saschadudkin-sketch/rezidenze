// ─── Телефон ─────────────────────────────────────────────────────────────────

/** Нормализует номер к формату 7XXXXXXXXXX (11 цифр) */
export const normalizePhone = (p) => {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return '7' + digits;   // 9161234567 → 79161234567
  return digits.replace(/^8/, '7');                 // 89161234567 → 79161234567
};

/** Ищет пользователя по номеру телефона в переданном phoneDb */
export const findByPhone = (p, phoneDb) => phoneDb[normalizePhone(p)] || null;

// ─── ID ──────────────────────────────────────────────────────────────────────

/** Генерирует уникальный ID с опциональным префиксом */
export const genId = (prefix = '') => {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return prefix + id;
};

// ─── Дата / Время ────────────────────────────────────────────────────────────

/** Относительная дата: «только что», «5 мин. назад», «сегодня», «вчера», «дд.мм» */
export const fmtDate = (d) => {
  if (!d) return '';
  const dt   = d instanceof Date ? d : new Date(d);
  const diff = Date.now() - dt.getTime();
  if (diff < 60_000)    return 'только что';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + ' мин. назад';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (dt >= today) return 'сегодня';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (dt >= yesterday) return 'вчера';
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

/** Время в формате ЧЧ:ММ */
export const fmtTime = (d) => {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

// ─── Фильтрация и группировка заявок ────────────────────────────────────────

/** Фильтрует заявки по периоду: «all» | «today» | «week» */
export const filterByPeriod = (arr, period) => {
  if (period === 'all') return arr;
  const now = Date.now();
  const ms  = period === 'today' ? 86_400_000 : 7 * 86_400_000;
  return arr.filter((r) => now - new Date(r.createdAt).getTime() < ms);
};

/** Группирует заявки по дате создания: «Сегодня» / «Вчера» / «Ранее» */
export const groupReqs = (arr) => {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const groups = [
    { label: 'Сегодня', items: arr.filter((r) => new Date(r.createdAt) >= today) },
    { label: 'Вчера',   items: arr.filter((r) => new Date(r.createdAt) >= yesterday && new Date(r.createdAt) < today) },
    { label: 'Ранее',   items: arr.filter((r) => new Date(r.createdAt) < yesterday) },
  ];
  return groups.filter((g) => g.items.length > 0);
};

/** Сортирует заявки: сначала по приоритету, потом pending/scheduled, потом по дате убыв. */
export const sortReqs = (arr) => {
  const prioOrder   = { urgent: 0, normal: 1, low: 2 };
  const statusOrder = { pending: 0, scheduled: 1 };
  return [...arr].sort((a, b) => {
    const ap = prioOrder[a.priority] ?? 1;
    const bp = prioOrder[b.priority] ?? 1;
    if (ap !== bp) return ap - bp;
    const ao = statusOrder[a.status] ?? 2;
    const bo = statusOrder[b.status] ?? 2;
    if (ao !== bo) return ao - bo;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

// ─── Браузерные уведомления ──────────────────────────────────────────────────

let _swReg = null;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((reg) => { _swReg = reg; })
    .catch((e) => console.warn('[SW] registration failed:', e));
}

/** Запрашивает разрешение на push-уведомления */
export const requestNotifPerm = () => {
  if ('Notification' in window && Notification.permission === 'default')
    Notification.requestPermission();
};

/** Показывает системное уведомление (через SW или напрямую) */
export const sendNotif = (title, body, tag) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if (_swReg) {
      _swReg.showNotification(title, {
        body,
        tag:       tag || 'default',
        renotify:  true,
        icon:      '/logo192.png',
        badge:     '/logo192.png',
        vibrate:   [200, 100, 200],
      });
    } else {
      new Notification(title, { body, icon: '/logo192.png' });
    }
  } catch (e) { /* silent */ }
};

/** Воспроизводит звуковой сигнал типа «pass» или «tech» */
export const playAlert = (type) => {
  try {
    const ctx   = new (window.AudioContext || window.webkitAudioContext)();
    const notes = type === 'pass'
      ? [[880, 0, .12], [1046, 0.13, .12], [1318, 0.26, .18]]
      : [[660, 0, .1],  [660, .12, .1],    [880,  .25, .15]];
    notes.forEach(([freq, delay, dur]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + dur + 0.05);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch (e) { /* silent */ }
};
