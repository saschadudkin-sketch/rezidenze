import { useState, useRef, useEffect } from 'react';
import { toast } from '../ui/Toasts';
import { PassQRModal } from './PassQRModal';
import {
  useActions, useAvatar,
  useRequestHistory as useReqHistory,
} from '../store/AppStore.jsx';
import { CAT_LABEL, STS_LABEL, ROLE_LABELS, PASS_DURATION_LABEL, PASS_DURATION_ICON } from '../constants/index.js';
import {
  isActiveRequest, isPendingRequest,
  isApprovedRequest, isScheduledRequest,
  canManageRequests, shouldShowActions,
} from '../constants/requestPredicates';
import { fmtDate, fmtTime, groupReqs } from '../utils.js';
import { AvatarCircle } from '../ui/AvatarCircle.jsx';
import { PhotoLightbox } from '../ui/PhotoLightbox.jsx';

// ─── Toast (глобальный синглтон) ────────────────────────────────────────────


// ─── ReqPhoto ────────────────────────────────────────────────────────────────

function ReqPhoto({ src }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img src={src} alt="фото"
        style={{ maxWidth: 220, maxHeight: 200, objectFit: 'contain',
          background: 'var(--s1)', borderRadius: 8,
          cursor: 'zoom-in', display: 'block' }}
        onClick={() => setOpen(true)}
      />
      {open && <PhotoLightbox src={src} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReqPhotos({ req }) {
  const photos = req.photos && req.photos.length > 0 ? req.photos : req.photo ? [req.photo] : [];
  if (photos.length === 0) return null;
  return (
    <div className="req-photos-grid">
      {photos.map((src, i) => <ReqPhoto key={i} src={src} />)}
    </div>
  );
}

// ─── ReqSkeleton ─────────────────────────────────────────────────────────────

export function ReqSkeleton({ count = 3 }) {
  return (
    <div className="req-list" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card"
          style={{ '--card-delay': (i * 80) + 'ms', animationDelay: (i * 80) + 'ms' }}>
          <div className="skeleton-row">
            <div className="skeleton-avatar" />
            <div className="skeleton-lines">
              <div className="skeleton-bar wide" />
              <div className="skeleton-bar mid" />
            </div>
            <div className="u-col-end-g6">
              <div className="skeleton-bar narrow" style={{ width: 48 }} />
              <div className="skeleton-bar narrow" style={{ width: 64 }} />
            </div>
          </div>
          <div className="skeleton-bar" style={{ width: '80%', marginTop: 2 }} />
        </div>
      ))}
    </div>
  );
}

// ─── ReqCard ─────────────────────────────────────────────────────────────────

export function ReqCard({ req, userRole, userName, staggerIdx = 0, onRepeat, onEdit, onDelete, highlightId, onHighlighted }) {
  const isStaffRole = canManageRequests(userRole);
  const isActive = isActiveRequest(req);
  const [actLoading, setActLoading] = useState(null);
  const isHighlighted = highlightId === req.id;
  const [expanded, setExpanded] = useState(isStaffRole && isActive || isHighlighted);
  const [confirmDel, setConfirmDel] = useState(false);
  const [showQR,    setShowQR]    = useState(false);
  const cardRef = useRef(null);
  const history = useReqHistory(req.id);
  const { approveRequest, rejectRequest, acceptRequest, arriveRequest } = useActions();
  const avData = useAvatar(req.createdByUid);

  // Auto-expand and scroll when highlighted
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      setExpanded(true);
      setTimeout(() => {
        cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardRef.current.classList.add('req-card-highlight');
        setTimeout(() => {
          cardRef.current?.classList.remove('req-card-highlight');
          onHighlighted && onHighlighted();
        }, 2000);
      }, 100);
    }
  }, [isHighlighted, onHighlighted]);

  const actorName = userName || userRole;
  const act = (key, fn, msg, type) => {
    if (actLoading) return;
    setActLoading(key);
    setTimeout(() => { fn(); setActLoading(null); toast(msg, type); }, 350);
  };
  const doApprove = () => act('approve', () => approveRequest(req.id, actorName, userRole), 'Допуск предоставлен', 'success');
  const doReject  = () => act('reject',  () => rejectRequest(req.id, actorName, userRole),  'В допуске отказано', 'error');
  const doAccept  = () => act('accept',  () => acceptRequest(req.id, actorName, userRole),  'Заявка принята в работу', 'success');
  const doArrive  = () => act('arrive',  () => arriveRequest(req.id, actorName, userRole),  'Отмечен вход на территорию', 'success');

  const hasDetails = !!(req.arrivedAt || req.visitorName || req.carPlate || req.visitorPhone || req.comment || req.photo || (req.photos && req.photos.length) || history.length);
  const showActions = shouldShowActions(req, { userRole, onRepeat, onEdit, onDelete });

  return (
    <div ref={cardRef} className={'req-card ' + req.status} style={{ '--card-delay': (staggerIdx * 45) + 'ms' }} role="article" aria-label={(req.visitorName || CAT_LABEL[req.category] || '') + ' — ' + (req.createdByName || '')}>
      <div className="req-head"
        onClick={() => (hasDetails || showActions) && setExpanded(o => !o)}
        style={{ cursor: (hasDetails || showActions) ? 'pointer' : 'default', marginBottom: 0 }}>
        <div className="req-left">
          <div className="req-ico" style={{ overflow: 'hidden', padding: 0 }}>
            <AvatarCircle avData={avData} role={req.createdByRole} name={req.createdByName || '?'} size={34} fontSize={13} />
          </div>
          <div className="u-mw0">
            <div className="req-cat">
              {req.createdByApt && req.createdByApt !== '—' ? 'Апарт. ' + req.createdByApt + ' · ' : ''}
              {req.createdByName}
            </div>
            <div className="req-meta">
              <span style={{ opacity: .55, marginRight: 4 }}>{req.type === 'tech' ? '🔧' : '🎫'}</span>
              {CAT_LABEL[req.category] || req.category}
              {req.passDuration && req.passDuration !== 'once' && (
                <span className={'pass-dur-tag ' + req.passDuration}>{PASS_DURATION_ICON[req.passDuration]} {PASS_DURATION_LABEL[req.passDuration]}</span>
              )}
            </div>
          </div>
        </div>
        <div className="u-col-end-g4">
          <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>
            {fmtDate(req.createdAt)}
            {(fmtDate(req.createdAt) === 'сегодня' || fmtDate(req.createdAt) === 'только что')
              ? ' ' + fmtTime(req.createdAt) : ''}
          </span>
          <span className={'badge ' + req.status}>{STS_LABEL[req.status]}</span>
        </div>
      </div>

      {expanded && (<>
        {(req.arrivedAt || req.visitorName || req.carPlate || req.visitorPhone || req.comment) && (
          <div className="req-details">
            {req.arrivedAt    && <div><div className="det-lbl">Вход отмечен</div><div className="det-val u-arrived">{new Date(req.arrivedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div></div>}
            {req.scheduledFor && isScheduledRequest(req) && <div style={{ gridColumn: '1/-1' }}><div className="det-lbl">Отправка запланирована</div><div className="det-val u-scheduled-t">{new Date(req.scheduledFor).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div></div>}
            {req.passDuration && <div><div className="det-lbl">Тип пропуска</div><div className="det-val">{PASS_DURATION_ICON[req.passDuration]} {PASS_DURATION_LABEL[req.passDuration]}</div></div>}
            {req.validUntil   && <div><div className="det-lbl">Действует до</div><div className="det-val">{new Date(req.validUntil).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>}
            {req.carPlate     && <div><div className="det-lbl">Авто</div><div className="det-val">{req.carPlate}</div></div>}
            {req.visitorName  && <div><div className="det-lbl">Посетитель</div><div className="det-val">{req.visitorName}</div></div>}
            {req.visitorPhone && <div><div className="det-lbl">Телефон</div><div className="det-val">{req.visitorPhone}</div></div>}
            {req.comment      && <div className="u-grid-span"><div className="det-lbl">Комментарий</div><div className="det-val">{req.comment}</div></div>}
            {history.length > 0 && (
              <div className="u-grid-span">
                <div className="det-lbl">История</div>
                {history.map((h, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--t4)', lineHeight: 1.6 }}>
                    <span className="u-t3">{fmtTime(h.at)}</span> · {h.action} · <span className="u-t4">{ROLE_LABELS[h.byRole] || h.byRole}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <ReqPhotos req={req} />

        {req.type === 'pass' && (req.status === 'approved' || req.status === 'pending') && (
          <button className="qr-pass-btn" onClick={() => setShowQR(true)}>
            <span style={{ fontSize: 18 }}>📱</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>QR-код пропуска</div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                {req.status === 'approved' ? 'Покажите охране для прохода' : 'Будет активен после одобрения'}
              </div>
            </div>
          </button>
        )}

        {isStaffRole && (
          <div className="req-actions">
            {req.type === 'pass' ? <>
              {req.status === 'pending'  && <button className="btn-yes"    onClick={doApprove} disabled={!!actLoading}>{actLoading === 'approve' && <span className="btn-spin" />}Разрешить</button>}
              {req.status === 'pending'  && <button className="btn-no"     onClick={doReject}  disabled={!!actLoading}>{actLoading === 'reject'  && <span className="btn-spin" />}Отказать</button>}
              {isApprovedRequest(req) && <button className="btn-arrive" onClick={doArrive}  disabled={!!actLoading}>{actLoading === 'arrive'  && <span className="btn-spin" />}Отметить вход</button>}
              {req.status === 'rejected' && <button className="btn-yes"    onClick={doApprove} disabled={!!actLoading}>{actLoading === 'approve' && <span className="btn-spin" />}Разрешить</button>}
            </> : <>
              {req.status !== 'accepted' && <button className="btn-accept" onClick={doAccept} disabled={!!actLoading}>{actLoading === 'accept' && <span className="btn-spin" />}Принять заявку</button>}
            </>}
          </div>
        )}
        {onRepeat && req.status !== 'pending' && (
          <button className="tpl-save-btn" style={{ marginTop: 8, fontSize: 11 }} onClick={() => onRepeat(req)}>↩ Повторить заявку</button>
        )}
        {(onEdit || onDelete) && isPendingRequest(req) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
            {confirmDel ? <>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>Удалить?</span>
              <button className="btn-del-sm" onClick={() => onDelete(req.id)}>Да</button>
              <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setConfirmDel(false)}>Нет</button>
            </> : <>
              {onEdit   && <button className="btn-edit"   onClick={() => onEdit(req)}>✏️ Редактировать</button>}
              {onDelete && <button className="btn-del-sm" onClick={() => setConfirmDel(true)}>🗑 Удалить</button>}
            </>}
          </div>
        )}
      </>)}
      {showQR && <PassQRModal req={req} onClose={() => setShowQR(false)} />}
    </div>
  );
}

// ─── GroupedReqList ──────────────────────────────────────────────────────────

export function GroupedReqList({ reqs, userRole, userName, onRepeat, onEdit, onDelete }) {
  const groups = groupReqs(reqs);
  if (groups.length === 0) return null;
  const showHeaders = groups.length > 1 || (groups[0] && groups[0].label !== 'Сегодня');
  return (
    <div className="req-list">
      {groups.map(g => (
        <div key={g.label}>
          {showHeaders && <div className="group-date-label">{g.label}</div>}
          {g.items.map((r, i) => (
            <ReqCard key={r.id} req={r} staggerIdx={i} userRole={userRole} userName={userName}
              onRepeat={onRepeat ? r2 => onRepeat(r2) : undefined}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
