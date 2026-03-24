import { useState, useEffect, lazy, Suspense } from 'react';
import {
  useRequests, useChat, useAvatar, useActions,
} from '../store/AppStore';
import { ROLE_LABELS } from '../constants';
import { canManageRequests } from '../constants/requestPredicates';
import { ROLES } from '../domain/permissions';
import { AvatarCircle } from '../ui/AvatarCircle';
import { AvatarModal } from '../ui/Modals';
import { toast } from '../ui/Toasts';
import ErrorBoundary from '../ui/ErrorBoundary';
import ResidentView from './ResidentView';
import { ConciergeView, SecurityView } from './SecurityConciergeViews';
import { LOGO } from '../constants/logo';
import { FB_MODE } from '../services/firebaseService';
import { useDashboardRuntime } from './dashboard/useDashboardRuntime';

const AdminView = lazy(() => import('./AdminView'));

// ─── RenderContent ────────────────────────────────────────────────────────────

function RenderContent({ user, activeTab, setActiveTab, highlightReqId, setHighlightReqId }) {
  if (user.role === ROLES.SECURITY)  return <SecurityView  user={user} activeTab={activeTab} setActiveTab={setActiveTab} highlightReqId={highlightReqId} setHighlightReqId={setHighlightReqId} />;
  if (user.role === ROLES.CONCIERGE) return <ConciergeView user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
  if (user.role === ROLES.ADMIN)     return <Suspense fallback={<div style={{textAlign:'center',padding:40,color:'var(--t4)'}}>Загрузка...</div>}><AdminView user={user} activeTab={activeTab} /></Suspense>;
  return <ResidentView user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({ user, onLogout }) {
  const requests = useRequests();
  const { chat, chatLastSeen } = useChat();
  const avData = useAvatar(user.uid);
  const {
    setAvatar, deleteAvatar,
    setAllRequests, setAllMessages, setAllUsers,
    setPerms, setTemplates,
    markChatSeen, activateScheduled,
  } = useActions();

  const [menuOpen, setMenuOpen] = useState(false);
  const [avOpen,   setAvOpen]   = useState(false);

  // ── Тема ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('rz-theme') || 'auto');
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-dark');
    if (theme === 'light') html.classList.add('theme-light');
    else if (theme === 'dark') html.classList.add('theme-dark');
    localStorage.setItem('rz-theme', theme);
  }, [theme]);
  const cycleTheme  = () => setTheme(t => t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto');
  const themeIcon   = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '✦';
  const themeLabel  = theme === 'light' ? 'Светлая' : theme === 'dark' ? 'Тёмная' : 'Авто';

  // ── Аватарка ──────────────────────────────────────────────────────────────
  const saveAvatar = av => {
    if (av) setAvatar(user.uid, av);
    else    deleteAvatar(user.uid);
    toast(av ? 'Аватарка сохранена' : 'Аватарка удалена', 'success');
  };

  // ── Табы ──────────────────────────────────────────────────────────────────
  const defaultTab = { owner: 'passes', tenant: 'passes', contractor: 'passes', concierge: 'passes', security: 'guardpost', admin: 'stats' }[user.role] || 'passes';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [highlightReqId, setHighlightReqId] = useState(null);
  const goTab = k => { if (k === 'chat') markChatSeen(user.uid); setActiveTab(k); };

  // ── Счётчики ──────────────────────────────────────────────────────────────
  const pendingT   = requests.filter(r => r.type === 'tech' && r.status === 'pending').length;
  const pendingP   = requests.filter(r => r.type === 'pass' && r.status === 'pending').length;
  const lastSeen   = chatLastSeen[user.uid] || 0;
  const unreadMsgs = chat.filter(m => m.uid !== user.uid && new Date(m.at).getTime() > lastSeen).length;

  useDashboardRuntime({
    user,
    requests,
    chat,
    unreadMsgs,
    pendingP,
    pendingT,
    actions: {
      activateScheduled,
      setAllRequests,
      setAllMessages,
      setAllUsers,
      setPerms,
      setTemplates,
    },
  });

  // ── Навигация ─────────────────────────────────────────────────────────────
  const NAV = {
    owner:      [['passes', '🎫', 'Пропуска', 0], ['tech', '🔧', 'Техслужба', 0],     ['perms', '📋', 'Список', 0],  ['chat', '💬', 'Чат', unreadMsgs]],
    tenant:     [['passes', '🎫', 'Пропуска', 0], ['tech', '🔧', 'Техслужба', 0],     ['perms', '📋', 'Список', 0],  ['chat', '💬', 'Чат', unreadMsgs]],
    contractor: [['passes', '🎫', 'Пропуска', 0], ['tech', '🔧', 'Техслужба', 0],     ['perms', '📋', 'Список', 0],  ['chat', '💬', 'Чат', unreadMsgs]],
    concierge:  [['passes', '🎫', 'Заявки', pendingT], ['visitlog', '📖', 'Журнал', 0], ['blacklist', '🚫', 'ЧС', 0], ['chat', '💬', 'Чат', unreadMsgs]],
    security:   [['guardpost', '🛡️', 'Пост', pendingP], ['passes', '📋', 'Заявки', pendingP + pendingT], ['visitlog', '📖', 'Журнал', 0], ['blacklist', '🚫', 'ЧС', 0], ['chat', '💬', 'Чат', unreadMsgs]],
    admin:      [['stats', '📊', 'Аналитика', 0], ['requests', '📋', 'Заявки', pendingP + pendingT], ['users', '👥', 'Резиденты', 0], ['visitlog', '📖', 'Журнал', 0], ['blacklist', '🚫', 'ЧС', 0], ['chat', '💬', 'Чат', unreadMsgs]],
  }[user.role] || [];

  const PAGE_T = { owner: 'Добро пожаловать', tenant: 'Добро пожаловать', contractor: 'Панель подрядчика', concierge: 'Рабочее место', security: 'Пост охраны', admin: 'Управление' }[user.role];
  const aptStr = 'Апартаменты ' + user.apartment;
  const PAGE_S = { owner: aptStr, tenant: aptStr, contractor: 'Управление пропусками', concierge: 'Контроль и координация', security: 'Контроль доступа', admin: 'Резиденции Замоскворечья' }[user.role] || '';

  const navBtnClass = (k) => ['tn-btn', activeTab === k ? 'active' : '',
    // Охрана: вкладка Заявки мигает при pending tech (красный) или pending pass (жёлтый)
    user.role === ROLES.SECURITY && k === 'passes' && pendingT > 0 && activeTab !== 'passes' ? 'blink'   : '',
    user.role === ROLES.SECURITY && k === 'passes' && pendingT === 0 && pendingP > 0 && activeTab !== 'passes' ? 'blink-y' : '',
    // Консьерж: вкладка Заявки мигает при pending
    user.role === ROLES.CONCIERGE && k === 'passes' && pendingT > 0 && activeTab !== 'passes' ? 'blink' : '',
    k === 'chat' && unreadMsgs > 0 && activeTab !== 'chat' ? 'blink-y' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div onClick={() => menuOpen && setMenuOpen(false)}>
        <header className="header">
          <div className="header-inner">
            <div className="header-brand">
              <img src={LOGO} alt="" className="header-logo" />
              <span className="header-wordmark">Резиденции Замоскворечья</span>
              {FB_MODE === 'demo' && <span className="demo-badge">DEMO</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
              <button className="theme-btn" onClick={cycleTheme} title="Переключить тему" aria-label={'Тема: ' + themeLabel}>
                <span>{themeIcon}</span>
                <span>{themeLabel}</span>
              </button>
              <div className="header-user" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}>
                <div className="header-info">
                  <div className="header-name">{user.name}</div>
                  <div className="header-role">{ROLE_LABELS[user.role]}</div>
                </div>
                <div className="u-rel">
                  <div className="header-avatar" style={{ background: 'transparent', padding: 0, border: 'none' }}>
                    <AvatarCircle avData={avData} role={user.role} name={user.name} size={34} fontSize={14} />
                  </div>
                  {canManageRequests(user.role) && (pendingT + pendingP) > 0 && (
                    <span style={{ position: 'absolute', top: -3, right: -3, background: 'var(--err)', color: 'var(--err-t)', fontSize: 11, fontWeight: 700, minWidth: 15, height: 15, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid var(--bg)' }}>
                      {pendingT + pendingP}
                    </span>
                  )}
                </div>
                {menuOpen && (
                  <div className="dropdown" onClick={e => e.stopPropagation()}>
                    <div className="dd-avatar-wrap" onClick={e => e.stopPropagation()}>
                      <div style={{ cursor: 'pointer', position: 'relative' }} onClick={() => { setMenuOpen(false); setAvOpen(true); }}>
                        <div className="dd-avatar-big" style={{ background: 'transparent', border: 'none' }}>
                          <AvatarCircle avData={avData} role={user.role} name={user.name} size={56} fontSize={22} />
                          <div className="dd-avatar-overlay">📷</div>
                        </div>
                      </div>
                      <div className="dd-user-info">
                        <div className="dd-user-name">{user.name}</div>
                        <div className="dd-user-phone">{user.phone}</div>
                      </div>
                      <button className="dd-upload-btn" onClick={() => { setMenuOpen(false); setAvOpen(true); }}>
                        🎨 Настроить аватарку
                      </button>
                    </div>
                    <button className="dd-out" onClick={onLogout}>Выйти из аккаунта</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="layout">
          <nav className="top-nav">
            {NAV.map(([k, icon, label, badge]) => (
              <button key={k} className={navBtnClass(k)} onClick={() => goTab(k)}>
                <span className="tn-icon">{icon}</span>
                <span>{label}</span>
                {badge > 0 && <span className="tn-badge">{badge}</span>}
              </button>
            ))}
          </nav>
          <main className="content">
            {activeTab !== 'chat' && (
              <div className="page-top">
                <div>
                  <h1 className="page-title">{PAGE_T}</h1>
                  <p className="page-sub">{PAGE_S}</p>
                </div>
              </div>
            )}
            <ErrorBoundary name="Экран">
              <RenderContent user={user} activeTab={activeTab} setActiveTab={setActiveTab} highlightReqId={highlightReqId} setHighlightReqId={setHighlightReqId} />
            </ErrorBoundary>
          </main>
        </div>

        <nav className="mobile-nav">
          {NAV.map(([k, icon, label, badge]) => (
            <button key={k} className={navBtnClass(k).replace('tn-btn', 'mn-btn')} onClick={() => goTab(k)}>
              <span className="mn-icon">{icon}</span>
              <span className="mn-label">{label}</span>
              {badge > 0 && <span className="mn-dot" />}
            </button>
          ))}
        </nav>
      </div>

      {avOpen && <AvatarModal user={user} avatar={avData} onSave={saveAvatar} onClose={() => setAvOpen(false)} />}
    </>
  );
}
