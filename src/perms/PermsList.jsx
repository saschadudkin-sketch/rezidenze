import { useState } from 'react';
import { ROLES } from '../domain/permissions';
import { useActions, usePerms, useTemplates } from '../store/AppStore.jsx';
import { CAT_LABEL } from '../constants/index.js';
import { genId } from '../utils.js';
import { toast } from '../ui/Toasts.jsx';

// ─── PermsList ────────────────────────────────────────────────────────────────

export function PermsList({ user }) {
  const isContractor = user.role === ROLES.CONTRACTOR;
  const perms = usePerms(user.uid);
  const { setPerms: savePerms } = useActions();
  const [addingV,  setAddingV]  = useState(false);
  const [addingW,  setAddingW]  = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [vForm,    setVForm]    = useState({ name: '', phone: '' });
  const [wForm,    setWForm]    = useState({ name: '', phone: '', carPlate: '' });

  const save = next => { savePerms(user.uid, next); };

  const addVisitor = () => {
    if (!vForm.name.trim()) { toast('Введите ФИО', 'error'); return; }
    save({ ...perms, visitors: [...perms.visitors, { id: genId('pv'), ...vForm }] });
    setVForm({ name: '', phone: '' }); setAddingV(false);
    toast('Посетитель добавлен', 'success');
  };
  const addWorker = () => {
    if (!wForm.name.trim()) { toast('Введите ФИО', 'error'); return; }
    save({ ...perms, workers: [...perms.workers, { id: genId('pw'), ...wForm }] });
    setWForm({ name: '', phone: '', carPlate: '' }); setAddingW(false);
    toast('Рабочий добавлен', 'success');
  };
  const delVisitor = id => { save({ ...perms, visitors: perms.visitors.filter(v => v.id !== id) }); toast('Удалено', 'success'); };
  const delWorker  = id => { save({ ...perms, workers:  perms.workers.filter(w => w.id !== id) }); toast('Удалено', 'success'); };

  const startEdit = (item, type) => {
    setEditId(item.id);
    if (type === 'visitor') setVForm({ name: item.name, phone: item.phone || '' });
    else setWForm({ name: item.name, phone: item.phone || '', carPlate: item.carPlate || '' });
  };
  const saveEdit = type => {
    if (type === 'visitor') {
      if (!vForm.name.trim()) { toast('Введите ФИО', 'error'); return; }
      save({ ...perms, visitors: perms.visitors.map(v => v.id === editId ? { ...v, ...vForm } : v) });
    } else {
      if (!wForm.name.trim()) { toast('Введите ФИО', 'error'); return; }
      save({ ...perms, workers: perms.workers.map(w => w.id === editId ? { ...w, ...wForm } : w) });
    }
    setEditId(null);
    toast('Сохранено', 'success');
  };

  return (
    <div className="perms-wrap">
      {!isContractor && (
        <div className="perms-section">
          <div className="perms-title">Постоянные посетители</div>
          {perms.visitors.map(v => (
            <div key={v.id} className="perm-row u-col-stretch">
              {editId === v.id
                ? (
                  <div className="perm-form">
                    <div className="perm-form-row">
                      <input className="perm-form-inp" placeholder="ФИО *" value={vForm.name} onChange={e => setVForm({ ...vForm, name: e.target.value })} autoCapitalize="words" autoFocus />
                      <input className="perm-form-inp" placeholder="Телефон" type="tel" value={vForm.phone} onChange={e => setVForm({ ...vForm, phone: e.target.value })} inputMode="tel" />
                    </div>
                    <div className="perm-form-btns">
                      <button className="btn-outline" onClick={() => setEditId(null)}>Отмена</button>
                      <button className="btn-gold u-pad-btn" onClick={() => saveEdit('visitor')}><span>Сохранить</span></button>
                    </div>
                  </div>
                )
                : (
                  <div className="u-row-full">
                    <div className="perm-info u-flex1">
                      <div className="perm-name">{v.name}</div>
                      {v.phone && <div className="perm-meta">{v.phone}</div>}
                    </div>
                    <button className="btn-edit u-mr6" onClick={() => startEdit(v, 'visitor')} aria-label="Редактировать">✏️</button>
                    <button className="perm-del" onClick={() => delVisitor(v.id)}>✕</button>
                  </div>
                )
              }
            </div>
          ))}
          {addingV
            ? (
              <div className="perm-form">
                <div className="perm-form-row">
                  <input className="perm-form-inp" placeholder="ФИО *" value={vForm.name} onChange={e => setVForm({ ...vForm, name: e.target.value })} autoCapitalize="words" />
                  <input className="perm-form-inp" placeholder="Телефон" type="tel" value={vForm.phone} onChange={e => setVForm({ ...vForm, phone: e.target.value })} inputMode="tel" />
                </div>
                <div className="perm-form-btns">
                  <button className="btn-outline" onClick={() => { setAddingV(false); setVForm({ name: '', phone: '' }); }}>Отмена</button>
                  <button className="btn-gold u-pad-btn" onClick={addVisitor}><span>Добавить</span></button>
                </div>
              </div>
            )
            : <button className="perm-add" onClick={() => { setEditId(null); setAddingV(true); }}>＋ Добавить посетителя</button>
          }
        </div>
      )}

      <div className="perms-section">
        <div className="perms-title">{isContractor ? 'Постоянные рабочие' : 'Постоянные рабочие / мастера'}</div>
        {perms.workers.map(w => (
          <div key={w.id} className="perm-row u-col-stretch">
            {editId === w.id
              ? (
                <div className="perm-form">
                  <div className="perm-form-row">
                    <input className="perm-form-inp" placeholder="ФИО *" value={wForm.name} onChange={e => setWForm({ ...wForm, name: e.target.value })} autoCapitalize="words" autoFocus />
                    <input className="perm-form-inp" placeholder="Телефон" type="tel" value={wForm.phone} onChange={e => setWForm({ ...wForm, phone: e.target.value })} inputMode="tel" />
                  </div>
                  <div className="perm-form-row">
                    <input className="perm-form-inp" placeholder="Авто (марка, номер)" value={wForm.carPlate} onChange={e => setWForm({ ...wForm, carPlate: e.target.value })} autoCapitalize="characters" />
                  </div>
                  <div className="perm-form-btns">
                    <button className="btn-outline" onClick={() => setEditId(null)}>Отмена</button>
                    <button className="btn-gold u-pad-btn" onClick={() => saveEdit('worker')}><span>Сохранить</span></button>
                  </div>
                </div>
              )
              : (
                <div className="u-row-full">
                  <div className="perm-info u-flex1">
                    <div className="perm-name">{w.name}</div>
                    <div className="perm-meta">{[w.phone, w.carPlate].filter(Boolean).join(' · ')}</div>
                  </div>
                  <button className="btn-edit u-mr6" onClick={() => startEdit(w, 'worker')} aria-label="Редактировать">✏️</button>
                  <button className="perm-del" onClick={() => delWorker(w.id)}>✕</button>
                </div>
              )
            }
          </div>
        ))}
        {addingW
          ? (
            <div className="perm-form">
              <div className="perm-form-row">
                <input className="perm-form-inp" placeholder="ФИО *" value={wForm.name} onChange={e => setWForm({ ...wForm, name: e.target.value })} autoCapitalize="words" />
                <input className="perm-form-inp" placeholder="Телефон" type="tel" value={wForm.phone} onChange={e => setWForm({ ...wForm, phone: e.target.value })} inputMode="tel" />
              </div>
              <div className="perm-form-row">
                <input className="perm-form-inp" placeholder="Авто (марка, номер)" value={wForm.carPlate} onChange={e => setWForm({ ...wForm, carPlate: e.target.value })} autoCapitalize="characters" />
              </div>
              <div className="perm-form-btns">
                <button className="btn-outline" onClick={() => { setAddingW(false); setWForm({ name: '', phone: '', carPlate: '' }); }}>Отмена</button>
                <button className="btn-gold u-pad-btn" onClick={addWorker}><span>Добавить</span></button>
              </div>
            </div>
          )
          : <button className="perm-add" onClick={() => { setEditId(null); setAddingW(true); }}>＋ Добавить рабочего</button>
        }
      </div>
    </div>
  );
}

// ─── MyTemplates ──────────────────────────────────────────────────────────────

export function MyTemplates({ user, onUse }) {
  const tpls = useTemplates(user.uid);
  const { deleteTemplate } = useActions();
  const del = id => { deleteTemplate(user.uid, id); toast('Шаблон удалён', 'success'); };

  if (tpls.length === 0) return (
    <div className="empty">
      <div style={{ fontSize: 36, marginBottom: 16, opacity: .15 }}>📑</div>
      <div className="empty-title">Шаблонов нет</div>
      <div className="empty-sub">При создании пропуска или заявки нажмите<br />«💾 Сохранить как шаблон»</div>
    </div>
  );

  const passes = tpls.filter(t => t.type === 'pass');
  const tech   = tpls.filter(t => t.type === 'tech');

  return (
    <div>
      {passes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="tpl-section-hdr">🎫 Пропуска</div>
          <div className="tpl-list">
            {passes.map(t => (
              <div key={t.id} className="tpl-row" role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && e.currentTarget.click()} onClick={() => onUse(t)}>
                <span className="tpl-ico">🎫</span>
                <div className="tpl-info">
                  <div className="tpl-name">{t.name}</div>
                  <div className="tpl-meta">{CAT_LABEL[t.category]}{t.visitorName ? ' · ' + t.visitorName : ''}{t.comment ? ' · ' + t.comment : ''}</div>
                </div>
                <button className="tpl-del" onClick={e => { e.stopPropagation(); del(t.id); }} title="Удалить">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {tech.length > 0 && (
        <div>
          <div className="tpl-section-hdr">🔧 Техслужба</div>
          <div className="tpl-list">
            {tech.map(t => (
              <div key={t.id} className="tpl-row" role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && e.currentTarget.click()} onClick={() => onUse(t)}>
                <span className="tpl-ico">🔧</span>
                <div className="tpl-info">
                  <div className="tpl-name">{t.name}</div>
                  <div className="tpl-meta">{CAT_LABEL[t.category]}{t.comment ? ' · ' + t.comment : ''}</div>
                </div>
                <button className="tpl-del" onClick={e => { e.stopPropagation(); del(t.id); }} title="Удалить">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--t4)', textAlign: 'center' }}>
        Нажмите на шаблон чтобы создать заявку
      </div>
    </div>
  );
}
