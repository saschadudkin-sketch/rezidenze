import { useState, useEffect } from 'react';
import { useActions } from '../store/AppStore.jsx';
import { CAT_ICON, CAT_LABEL } from '../constants/index.js';
import { toast } from '../ui/Toasts.jsx';
import { lockScroll, unlockScroll } from '../ui/scrollLock.js';

import { FB_MODE, updateRequest as fbUpdateReq } from '../services/firebaseService';


export function EditRequestModal({ req, onClose, onDone }) {
  const [vName,    setVName]    = useState(req.visitorName  || '');
  const [vPhone,   setVPhone]   = useState(req.visitorPhone || '');
  const [carPlate, setCarPlate] = useState(req.carPlate     || '');
  const [comment,  setComment]  = useState(req.comment      || '');
  const [loading,  setLoading]  = useState(false);
  const { updateRequest } = useActions();

  useEffect(() => {
    lockScroll();
    return () => { unlockScroll(); };
  }, []);

  const save = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const patch = {
      visitorName:  vName.trim()    || null,
      visitorPhone: vPhone.trim()   || null,
      carPlate:     carPlate.trim() || null,
      comment:      comment.trim(),
    };
    updateRequest(req.id, patch);
    if (FB_MODE === 'live') fbUpdateReq(req.id, patch).catch(console.warn);
    setLoading(false);
    toast('Заявка обновлена', 'success');
    onDone(); onClose();
  };

  const needsPlate = ['taxi', 'car', 'master', 'delivery'].includes(req.category);

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-head">
          <div>
            <span className="modal-title">Редактировать заявку</span>
            <div style={{ fontSize: 11, color: 'var(--g2)', marginTop: 2 }}>
              {CAT_ICON[req.category]} {CAT_LABEL[req.category]}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>
        <div className="modal-body">
          {req.type === 'pass' && req.category !== 'taxi' && (
            <div className="field">
              <label className="field-lbl">{req.category === 'team' ? 'Имена посетителей' : 'Имя посетителя'}</label>
              <input className="field-inp" value={vName} onChange={e => setVName(e.target.value)} autoCapitalize="words" />
            </div>
          )}
          {req.type === 'pass' && req.category !== 'taxi' && req.category !== 'team' && (
            <div className="field">
              <label className="field-lbl">Телефон</label>
              <input className="field-inp" value={vPhone} onChange={e => setVPhone(e.target.value)} type="tel" inputMode="tel" />
            </div>
          )}
          {req.type === 'pass' && req.category === 'taxi' && (
            <div className="field">
              <label className="field-lbl">Марка и номер авто</label>
              <input className="field-inp" value={carPlate} onChange={e => setCarPlate(e.target.value)} autoCapitalize="characters" />
            </div>
          )}
          {req.type === 'pass' && needsPlate && req.category !== 'taxi' && (
            <div className="field">
              <label className="field-lbl">Марка и номер авто</label>
              <input className="field-inp" value={carPlate} onChange={e => setCarPlate(e.target.value)} autoCapitalize="characters" />
            </div>
          )}
          <div className="field">
            <label className="field-lbl">Комментарий</label>
            <textarea className="field-textarea" rows={3} value={comment} onChange={e => setComment(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-outline" onClick={onClose}>Отмена</button>
          <button className="btn-gold u-flex2" onClick={save} disabled={loading}>
            <span>{loading ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
