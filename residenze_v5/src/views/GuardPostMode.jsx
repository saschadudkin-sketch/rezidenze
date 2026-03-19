/**
 * GuardPostMode.jsx — режим «Пост охраны»
 *
 * Подвкладки: Активные | Временные пропуска
 * - Активные: pending + approved (одноразовые)
 * - Временные: approved/arrived с passDuration=temporary
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRequests, useActions, useBlacklist, useUsers } from '../store/AppStore.jsx';
import { CAT_LABEL } from '../constants/index.js';
import { sortReqs, playAlert } from '../utils.js';
import { AvatarCircle } from '../ui/AvatarCircle.jsx';
import { useAvatar } from '../store/AppStore.jsx';
import { PassQRModal } from '../requests/PassQRModal.jsx';
import { checkBlacklist } from '../store/slices/blacklistSlice';
import { toast } from '../ui/Toasts.jsx';

// ─── Карточка пропуска ───────────────────────────────────────────────────────

function GuardCard({ req, userName, blacklist, residentPhone, onViewDetails }) {
  const { approveRequest, rejectRequest, arriveRequest, approveAndArrive } = useActions();
  const avData = useAvatar(req.createdByUid);
  const [loading, setLoading]       = useState(null);
  const [showQR, setShowQR]         = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [tapHint, setTapHint]       = useState(false);
  const lastTapRef = useRef(0);
  const blMatch = checkBlacklist(req, blacklist);

  const handleInfoTap = () => {
    if (!onViewDetails) return;
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      onViewDetails(req.id);
      lastTapRef.current = 0;
      setTapHint(false);
    } else {
      lastTapRef.current = now;
      setTapHint(true);
      setTimeout(() => setTapHint(false), 1500);
    }
  };

  const act = (key, fn, msg, type) => {
    if (loading) return;
    setLoading(key);
    setTimeout(() => { fn(); setLoading(null); toast(msg, type); }, 300);
  };

  const doPass = () => {
    if (req.passDuration === 'once' || !req.passDuration) {
      act('approve', () => approveAndArrive(req.id, userName, 'security'), 'Гость допущен', 'success');
    } else {
      act('approve', () => approveRequest(req.id, userName, 'security'), 'Допуск открыт', 'success');
    }
  };
  const doReject = () => { act('reject', () => rejectRequest(req.id, userName, 'security'), 'В допуске отказано', 'error'); setConfirmReject(false); };
  const doArrive = () => act('arrive', () => arriveRequest(req.id, userName, 'security'), 'Вход отмечен', 'success');

  return (
    <div className={'guard-card' + (blMatch ? ' bl-flagged' : '')} role="article">
      {blMatch && (
        <div className="bl-warning">
          <span style={{ fontSize: 22 }}>🚫</span>
          <div>
            <div className="bl-warning-text">ЧЁРНЫЙ СПИСОК</div>
            <div className="bl-warning-detail">
              {blMatch.name && <span>{blMatch.name} </span>}
              {blMatch.carPlate && <span>{blMatch.carPlate} </span>}
              {blMatch.reason && <span>— {blMatch.reason}</span>}
            </div>
          </div>
        </div>
      )}

      <div className="guard-card-top">
        <div className="guard-avatar">
          <AvatarCircle avData={avData} role={req.createdByRole} name={req.createdByName || '?'} size={48} fontSize={18} />
        </div>
        <div className="guard-info" onClick={handleInfoTap} style={{ cursor: onViewDetails ? 'pointer' : 'default' }}>
          <div className="guard-apt">
            {req.createdByApt && req.createdByApt !== '—' ? 'Апарт. ' + req.createdByApt : ''}
          </div>
          <div className="guard-name">{req.createdByName}</div>
          <div className="guard-cat">{CAT_LABEL[req.category] || req.category}</div>
          {tapHint && <div className="guard-tap-hint">Нажмите ещё раз для подробностей</div>}
        </div>
        {onViewDetails && <button className="guard-detail-btn" onClick={() => onViewDetails(req.id)} title="Подробнее">ℹ️</button>}
      </div>

      {(req.visitorName || req.carPlate || req.comment) && (
        <div className="guard-details">
          {req.visitorName && <div className="guard-detail"><span className="guard-detail-lbl">Гость</span><span className="guard-detail-val">{req.visitorName}</span></div>}
          {req.carPlate && <div className="guard-detail"><span className="guard-detail-lbl">Авто</span><span className="guard-detail-val">{req.carPlate}</span></div>}
          {req.comment && <div className="guard-detail"><span className="guard-detail-lbl">Коммент.</span><span className="guard-detail-val">{req.comment}</span></div>}
        </div>
      )}

      {req.status === 'approved' && (
        <button className="qr-pass-btn" onClick={() => setShowQR(true)} style={{ marginBottom: 0 }}>
          <span style={{ fontSize: 18 }}>📱</span>
          <div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>Показать QR-код</div></div>
        </button>
      )}
      {showQR && <PassQRModal req={req} onClose={() => setShowQR(false)} />}

      <div className="guard-actions">
        {req.status === 'pending' && (
          <>
            <button className="guard-btn approve" onClick={doPass} disabled={!!loading}>
              {loading === 'approve' ? <span className="btn-spin" /> : '✓'}
              <span>Пропустить</span>
            </button>
            {confirmReject ? (
              <button className="guard-btn reject confirm" onClick={doReject} disabled={!!loading}>
                {loading === 'reject' ? <span className="btn-spin" /> : '⚠️'}
                <span>Точно отказать?</span>
              </button>
            ) : (
              <button className="guard-btn reject" onClick={() => setConfirmReject(true)} disabled={!!loading}>
                <span>✕</span><span>Отказать</span>
              </button>
            )}
          </>
        )}
        {req.status === 'approved' && (req.passDuration === 'permanent' || req.passDuration === 'temporary') && (
          <button className="guard-btn arrive" onClick={doArrive} disabled={!!loading}>
            {loading === 'arrive' ? <span className="btn-spin" /> : '🚪'}
            <span>Отметить вход</span>
          </button>
        )}
        {residentPhone && (
          <a href={'tel:' + residentPhone.replace(/\s/g, '')} className="guard-btn call">
            📞 <span>Позвонить жильцу</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Секция ──────────────────────────────────────────────────────────────────

function GuardSection({ title, icon, count, children }) {
  if (count === 0) return null;
  return (
    <div className="guard-section">
      <div className="guard-section-head">
        <span>{icon} {title}</span>
        <span className="guard-section-count">{count}</span>
      </div>
      <div className="guard-list">{children}</div>
    </div>
  );
}

// ─── Строка временного пропуска ──────────────────────────────────────────────

function TempPassCard({ req, userName, residentPhone, blacklist }) {
  const { arriveRequest } = useActions();
  const avData = useAvatar(req.createdByUid);
  const [loading, setLoading] = useState(false);
  const blMatch = checkBlacklist(req, blacklist);

  const exp = new Date(req.validUntil);
  const diff = exp - new Date();
  const expired = diff <= 0;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const timeLeft = expired ? 'Истёк'
    : days > 0 ? `${days}д ${hours}ч`
    : hours > 0 ? `${hours}ч ${mins}мин`
    : `${mins}мин`;

  const doArrive = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      arriveRequest(req.id, userName, 'security');
      setLoading(false);
      toast('Вход отмечен', 'success');
    }, 300);
  };

  return (
    <div className={'guard-card' + (expired ? ' expired' : '') + (blMatch ? ' bl-flagged' : '')}>
      {blMatch && (
        <div className="bl-warning">
          <span style={{ fontSize: 22 }}>🚫</span>
          <div><div className="bl-warning-text">ЧЁРНЫЙ СПИСОК</div></div>
        </div>
      )}
      <div className="guard-card-top">
        <div className="guard-avatar">
          <AvatarCircle avData={avData} role={req.createdByRole} name={req.createdByName || '?'} size={42} fontSize={16} />
        </div>
        <div className="guard-info">
          <div className="guard-apt">
            {req.createdByApt && req.createdByApt !== '—' ? 'Апарт. ' + req.createdByApt : ''}
          </div>
          <div className="guard-name">{req.createdByName}</div>
          <div className="guard-cat">{req.visitorName || CAT_LABEL[req.category] || req.category}</div>
        </div>
        <div className={'guard-temp-expiry' + (expired ? ' expired' : diff < 3600000 ? ' soon' : '')}>
          {expired ? '⛔' : diff < 3600000 ? '⚠️' : '📅'} {timeLeft}
        </div>
      </div>

      {req.status === 'approved' && !expired && (
        <div className="guard-actions">
          <button className="guard-btn arrive" onClick={doArrive} disabled={loading}>
            {loading ? <span className="btn-spin" /> : '🚪'}
            <span>Отметить вход</span>
          </button>
          {residentPhone && (
            <a href={'tel:' + residentPhone.replace(/\s/g, '')} className="guard-btn call">
              📞 <span>Позвонить</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Карточка техзаявки ─────────────────────────────────────────────────────

function TechCard({ req, userName, residentPhone }) {
  const { acceptRequest, approveRequest } = useActions();
  const avData = useAvatar(req.createdByUid);
  const [loading, setLoading] = useState(null);

  const doAccept = () => {
    if (loading) return;
    setLoading('accept');
    setTimeout(() => { acceptRequest(req.id, userName, 'security'); setLoading(null); toast('Принято в работу', 'success'); }, 300);
  };

  return (
    <div className="guard-card">
      <div className="guard-card-top">
        <div className="guard-avatar">
          <AvatarCircle avData={avData} role={req.createdByRole} name={req.createdByName || '?'} size={42} fontSize={16} />
        </div>
        <div className="guard-info">
          <div className="guard-apt">
            {req.createdByApt && req.createdByApt !== '—' ? 'Апарт. ' + req.createdByApt : ''}
          </div>
          <div className="guard-name">{req.createdByName}</div>
          <div className="guard-cat">{CAT_LABEL[req.category] || req.category}</div>
        </div>
        <div className={'guard-tech-status ' + req.status}>
          {req.status === 'pending' ? '⏳ Новая' : req.status === 'accepted' ? '🔧 В работе' : '✅ Готово'}
        </div>
      </div>

      {req.comment && (
        <div className="guard-details">
          <div className="guard-detail"><span className="guard-detail-lbl">Описание</span><span className="guard-detail-val">{req.comment}</span></div>
        </div>
      )}

      <div className="guard-actions">
        {req.status === 'pending' && (
          <button className="guard-btn approve" onClick={doAccept} disabled={!!loading}>
            {loading === 'accept' ? <span className="btn-spin" /> : '🔧'}
            <span>Принять в работу</span>
          </button>
        )}
        {residentPhone && (
          <a href={'tel:' + residentPhone.replace(/\s/g, '')} className="guard-btn call">
            📞 <span>Позвонить жильцу</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Главный компонент ───────────────────────────────────────────────────────

export default function GuardPostMode({ user, onViewDetails }) {
  const requests = useRequests();
  const blacklist = useBlacklist();
  const { users } = useUsers();
  const [subTab, setSubTab] = useState('active');

  const pending  = useMemo(() => sortReqs(requests.filter(r => r.type === 'pass' && r.status === 'pending')), [requests]);
  const approved = useMemo(() => sortReqs(requests.filter(r => r.type === 'pass' && r.status === 'approved' && r.passDuration !== 'temporary')), [requests]);
  const temporary = useMemo(() => requests.filter(r =>
    r.type === 'pass' && r.passDuration === 'temporary' && r.validUntil &&
    (r.status === 'approved' || r.status === 'arrived')
  ).sort((a, b) => new Date(a.validUntil) - new Date(b.validUntil)), [requests]);
  const techPending  = useMemo(() => sortReqs(requests.filter(r => r.type === 'tech' && r.status === 'pending')), [requests]);
  const techActive   = useMemo(() => sortReqs(requests.filter(r => r.type === 'tech' && (r.status === 'pending' || r.status === 'accepted'))), [requests]);

  // Звук при новой pending (pass или tech)
  const prevPassCount = useRef(pending.length);
  const prevTechCount = useRef(techPending.length);
  useEffect(() => {
    if (pending.length > prevPassCount.current) playAlert('pass');
    if (techPending.length > prevTechCount.current) playAlert('tech');
    prevPassCount.current = pending.length;
    prevTechCount.current = techPending.length;
  }, [pending.length, techPending.length]);

  const getPhone = (uid) => { const u = users[uid]; return u ? u.phone : null; };

  return (
    <div className="guard-post">
      {/* Статистика */}
      <div className="guard-header">
        <div className="guard-header-stats">
          <div className={'guard-stat' + (pending.length > 0 ? ' urgent' : '')}>
            <span className="guard-stat-val">{pending.length}</span>
            <span className="guard-stat-lbl">ожидают</span>
          </div>
          <div className="guard-stat">
            <span className="guard-stat-val">{approved.length}</span>
            <span className="guard-stat-lbl">допущены</span>
          </div>
          <div className="guard-stat">
            <span className="guard-stat-val">{temporary.length}</span>
            <span className="guard-stat-lbl">временные</span>
          </div>
          {techActive.length > 0 && (
            <div className={'guard-stat' + (techPending.length > 0 ? ' urgent' : '')}>
              <span className="guard-stat-val">{techActive.length}</span>
              <span className="guard-stat-lbl">техслужба</span>
            </div>
          )}
        </div>
      </div>

      {/* Подвкладки */}
      <div className="guard-subtabs">
        <button className={'guard-subtab' + (subTab === 'active' ? ' active' : '')} onClick={() => setSubTab('active')}>
          🛡️ Активные
          {(pending.length + approved.length) > 0 && <span className="guard-subtab-badge">{pending.length + approved.length}</span>}
        </button>
        <button className={'guard-subtab' + (subTab === 'temp' ? ' active' : '')} onClick={() => setSubTab('temp')}>
          📅 Временные
          {temporary.length > 0 && <span className="guard-subtab-badge">{temporary.length}</span>}
        </button>
        <button className={'guard-subtab' + (subTab === 'tech' ? ' active' : '') + (techPending.length > 0 ? ' has-new' : '')} onClick={() => setSubTab('tech')}>
          🔧 Техслужба
          {techActive.length > 0 && <span className="guard-subtab-badge">{techActive.length}</span>}
        </button>
      </div>

      {/* Активные */}
      {subTab === 'active' && (
        <>
          {pending.length === 0 && approved.length === 0 && (
            <div className="guard-empty">
              <div style={{ fontSize: 48, opacity: .15, marginBottom: 16 }}>🛡️</div>
              <div style={{ fontSize: 18, color: 'var(--t3)', marginBottom: 8 }}>Всё спокойно</div>
              <div style={{ fontSize: 13, color: 'var(--t4)' }}>Нет активных пропусков</div>
            </div>
          )}
          <GuardSection title="Ожидают решения" icon="⏳" count={pending.length}>
            {pending.map(r => (
              <GuardCard key={r.id} req={r} userName={user.name} blacklist={blacklist} residentPhone={getPhone(r.createdByUid)} onViewDetails={onViewDetails} />
            ))}
          </GuardSection>
          <GuardSection title="Допущены" icon="✅" count={approved.length}>
            {approved.map(r => (
              <GuardCard key={r.id} req={r} userName={user.name} blacklist={blacklist} residentPhone={getPhone(r.createdByUid)} onViewDetails={onViewDetails} />
            ))}
          </GuardSection>
        </>
      )}

      {/* Временные */}
      {subTab === 'temp' && (
        <>
          {temporary.length === 0 && (
            <div className="guard-empty">
              <div style={{ fontSize: 48, opacity: .15, marginBottom: 16 }}>📅</div>
              <div style={{ fontSize: 18, color: 'var(--t3)', marginBottom: 8 }}>Нет временных пропусков</div>
              <div style={{ fontSize: 13, color: 'var(--t4)' }}>Временные пропуска с открытым доступом появятся здесь</div>
            </div>
          )}
          <div className="guard-list">
            {temporary.map(r => (
              <TempPassCard key={r.id} req={r} userName={user.name} blacklist={blacklist} residentPhone={getPhone(r.createdByUid)} />
            ))}
          </div>
        </>
      )}

      {/* Техслужба */}
      {subTab === 'tech' && (
        <>
          {techActive.length === 0 && (
            <div className="guard-empty">
              <div style={{ fontSize: 48, opacity: .15, marginBottom: 16 }}>🔧</div>
              <div style={{ fontSize: 18, color: 'var(--t3)', marginBottom: 8 }}>Нет техзаявок</div>
              <div style={{ fontSize: 13, color: 'var(--t4)' }}>Заявки на электрика и сантехника появятся здесь</div>
            </div>
          )}
          <GuardSection title="Новые заявки" icon="⏳" count={techPending.length}>
            {techActive.filter(r => r.status === 'pending').map(r => (
              <TechCard key={r.id} req={r} userName={user.name} residentPhone={getPhone(r.createdByUid)} />
            ))}
          </GuardSection>
          <GuardSection title="В работе" icon="🔧" count={techActive.filter(r => r.status === 'accepted').length}>
            {techActive.filter(r => r.status === 'accepted').map(r => (
              <TechCard key={r.id} req={r} userName={user.name} residentPhone={getPhone(r.createdByUid)} />
            ))}
          </GuardSection>
        </>
      )}
    </div>
  );
}
