import { useState } from 'react';
import { useActions, useAvatar } from '../../store/AppStore';
import { ROLE_LABELS, S_END } from '../../constants';
import { AvatarCircle } from '../../ui/AvatarCircle';
import { toast } from '../../ui/Toasts';
import { canDeleteUser, canChangeRole } from '../../domain/permissions';
import { FB_MODE, saveUser, removeUser } from '../../services/firebaseService';

export default function AdminUserRow({ u, currentUser }) {
  const isSelf = u.uid === currentUser.uid;
  const canDel  = canDeleteUser(currentUser, u);
  const canRole = canChangeRole(currentUser, u);

  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(u.name);
  const [phone,   setPhone]   = useState(u.phone);
  const [role,    setRole]    = useState(u.role);
  const [apt,     setApt]     = useState(u.apartment === '—' ? '' : u.apartment);
  const { updateUser, deleteUser } = useActions();
  const avData = useAvatar(u.uid);

  function save() {
    if (!name.trim()) { toast('Введите имя', 'error'); return; }
    const patch = { name: name.trim(), phone: phone.trim(), role, apartment: apt.trim() || '—' };
    updateUser(u.uid, patch, u.phone);
    if (FB_MODE === 'live') saveUser(u.uid, patch).catch(console.warn);
    setEditing(false);
    toast('Данные сохранены', 'success');
  }

  function del() {
    if (!canDel) { toast('Нельзя удалить собственный аккаунт', 'error'); return; }
    deleteUser(u.uid);
    if (FB_MODE === 'live') removeUser(u.uid).catch(console.warn);
    toast(u.name + ' удалён', 'success');
  }

  function handleCancel() { setEditing(false); }

  return (
    <div
      style={{ background: 'var(--s2)', borderRadius: 6, border: '1px solid var(--b1)', marginBottom: 6, overflow: 'hidden', transition: 'border-color .13s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--b2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--b1)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <div className="u-fs0">
          <AvatarCircle avData={avData} role={u.role} name={u.name} size={36} fontSize={14} />
        </div>
        <div className="u-flex1 u-mw0">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{u.name}</span>
            <span className={'admin-badge ' + u.role}>{ROLE_LABELS[u.role]}</span>
            {isSelf && <span style={{ fontSize: 11, color: 'var(--g2)', letterSpacing: .5 }}>• это вы</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span>{u.phone}</span>
            {u.apartment !== '—' && <span>Апарт. {u.apartment}</span>}
          </div>
        </div>
        <div className="u-row-g5-fs0">
          <button className="btn-edit" onClick={() => setEditing(e => !e)} aria-label={editing ? 'Закрыть' : 'Редактировать'}>
            {editing ? '✕' : '✏️'}
          </button>
          {canDel && <button className="btn-del-sm" onClick={del} aria-label="Удалить пользователя">🗑</button>}
        </div>
      </div>

      {editing && (
        <div className="edit-inline" style={{ margin: '0 10px 10px', borderRadius: 6 }}>
          <div className="edit-inline-row">
            <input className="edit-inline-inp" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} autoCapitalize="words" autoFocus />
            <input className="edit-inline-inp" placeholder="Телефон" value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" />
          </div>
          <div className="edit-inline-row">
            <select className="edit-inline-sel" value={role} onChange={e => setRole(e.target.value)}
              disabled={!canRole} title={!canRole ? 'Нельзя изменить собственную роль' : ''}>
              {['owner','tenant','contractor','concierge','security','admin'].map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <input className="edit-inline-inp" placeholder="Апарт." value={apt} onChange={e => setApt(e.target.value)} style={{ maxWidth: 80 }} />
          </div>
          <div style={S_END}>
            <button className="btn-outline" onClick={handleCancel}>Отмена</button>
            <button className="btn-gold u-pad-btn" onClick={save}><span>Сохранить</span></button>
          </div>
        </div>
      )}
    </div>
  );
}
