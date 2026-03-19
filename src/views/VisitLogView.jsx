/**
 * VisitLogView.jsx — журнал посещений.
 * Карточки с полной информацией о визите.
 */

import { useState, useMemo } from 'react';
import { useRequests } from '../store/AppStore.jsx';
import { useDebounce } from '../hooks/useDebounce';
import { CAT_LABEL, CAT_ICON, PASS_DURATION_ICON, PASS_DURATION_LABEL } from '../constants/index.js';
import { isResident } from '../domain/permissions';
import { fmtTime } from '../utils.js';

function fmtDateFull(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  if (day.getTime() === today.getTime()) return 'Сегодня';
  if (day.getTime() === yesterday.getTime()) return 'Вчера';
  const sameYear = dt.getFullYear() === now.getFullYear();
  return dt.toLocaleDateString('ru-RU', sameYear
    ? { day: 'numeric', month: 'long', weekday: 'short' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDuration(from, to) {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (ms < 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} мин`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}ч ${m}мин` : `${h}ч`;
}

function groupByDate(items) {
  const map = {};
  for (const item of items) {
    const key = fmtDateFull(item.arrivedAt || item.createdAt);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return Object.entries(map).map(([label, items]) => ({ label, items }));
}

function VisitCard({ r }) {
  const duration = fmtDuration(r.createdAt, r.arrivedAt);

  return (
    <div className="vlog-card">
      <div className="vlog-card-left">
        <div className="vlog-card-time">{fmtTime(r.arrivedAt || r.createdAt)}</div>
        <div className="vlog-card-icon">{CAT_ICON[r.category] || '👤'}</div>
      </div>
      <div className="vlog-card-body">
        <div className="vlog-card-row1">
          <span className="vlog-card-name">{r.visitorName || CAT_LABEL[r.category]}</span>
          {r.passDuration && r.passDuration !== 'once' && (
            <span className={'pass-dur-tag ' + r.passDuration}>
              {PASS_DURATION_ICON[r.passDuration]} {PASS_DURATION_LABEL[r.passDuration]}
            </span>
          )}
        </div>
        <div className="vlog-card-details">
          {r.createdByApt && r.createdByApt !== '—' && (
            <span className="vlog-card-apt">Апарт. {r.createdByApt}</span>
          )}
          <span className="vlog-card-who">{r.createdByName}</span>
        </div>
        <div className="vlog-card-tags">
          <span className="vlog-tag cat">{CAT_LABEL[r.category]}</span>
          {r.carPlate && <span className="vlog-tag car">🚗 {r.carPlate}</span>}
          {duration && <span className="vlog-tag dur">⏱ {duration}</span>}
          {r.status === 'expired' && <span className="vlog-tag expired">Истёк</span>}
        </div>
        {r.comment && <div className="vlog-card-comment">{r.comment}</div>}
      </div>
    </div>
  );
}

export default function VisitLogView({ user }) {
  const requests = useRequests();
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('week');
  const debouncedQuery = useDebounce(query, 250);
  const q = debouncedQuery.trim().toLowerCase();

  const visits = useMemo(() => {
    let arr = requests.filter(r => r.type === 'pass' && (r.arrivedAt || r.status === 'expired'));
    if (isResident(user.role)) arr = arr.filter(r => r.createdByUid === user.uid);
    if (period !== 'all') {
      const ms = period === 'today' ? 86_400_000 : period === 'week' ? 7 * 86_400_000 : 30 * 86_400_000;
      arr = arr.filter(r => Date.now() - new Date(r.arrivedAt).getTime() < ms);
    }
    if (q) {
      arr = arr.filter(r =>
        (r.visitorName || '').toLowerCase().includes(q)
        || (r.carPlate || '').toLowerCase().includes(q)
        || (r.createdByName || '').toLowerCase().includes(q)
        || (r.createdByApt || '').includes(q)
        || (r.comment || '').toLowerCase().includes(q)
      );
    }
    return arr.sort((a, b) => new Date(b.arrivedAt || b.createdAt) - new Date(a.arrivedAt || a.createdAt));
  }, [requests, user, period, q]);

  const groups = groupByDate(visits);
  const totalCount = visits.length;

  return (
    <div className="vlog-wrap">
      <div className="vlog-header">
        <span className="vlog-title">📖 Журнал посещений</span>
        <span className="vlog-total">{totalCount} {totalCount === 1 ? 'визит' : totalCount < 5 ? 'визита' : 'визитов'}</span>
      </div>

      <div className="date-pills" style={{ marginBottom: 12, justifyContent: 'center' }}>
        {[['today','Сегодня'],['week','Неделя'],['month','Месяц'],['all','Всё время']].map(([k, l]) => (
          <button key={k} className={'date-pill' + (period === k ? ' active' : '')} onClick={() => setPeriod(k)}>{l}</button>
        ))}
      </div>

      <div className="search-wrap u-mb16">
        <span className="search-ico">🔍</span>
        <input className="search-inp" placeholder="Поиск по имени, авто, квартире, комментарию..."
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {visits.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: 36, marginBottom: 12, opacity: .15 }}>📖</div>
          <div className="empty-title">{q ? 'Ничего не найдено' : 'Посещений нет'}</div>
          <div className="empty-sub">{q ? 'Попробуйте другой запрос' : 'Входы посетителей будут отображаться здесь'}</div>
        </div>
      )}

      {groups.map(g => (
        <div key={g.label} className="vlog-group">
          <div className="vlog-date-label">{g.label}</div>
          <div className="vlog-cards">
            {g.items.map(r => <VisitCard key={r.id} r={r} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
