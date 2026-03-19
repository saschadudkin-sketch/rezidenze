import { AppProvider } from './store/AppStore';
import Dashboard from './views/Dashboard';
import Login from './views/Login';
import Toasts from './ui/Toasts';
import ErrorBoundary from './ui/ErrorBoundary';
import { useAuth, PHASE } from './hooks/useAuth';
import { LOGO } from './constants/logo';

import './styles/theme.css';

// ─── Splash ───────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="loading">
      <img src={LOGO} alt="" className="loading-logo" />
      <div className="loading-name">Резиденции Замоскворечья</div>
      <div className="loading-bar" />
    </div>
  );
}

// ─── AppInner ─────────────────────────────────────────────────────────────────

function AppInner() {
  const { phase, user, login, logout } = useAuth();

  // Защита: если phase=dashboard но user=null — fallback на логин
  const safePhase = (phase === PHASE.DASHBOARD && !user) ? PHASE.LOGIN : phase;

  return (
    <>
      {safePhase === PHASE.LOADING && <LoadingScreen />}
      {safePhase === PHASE.LOGIN && (
        <ErrorBoundary name="Вход">
          <Login onLogin={login} />
        </ErrorBoundary>
      )}
      {safePhase === PHASE.DASHBOARD && user && (
        <ErrorBoundary name="Приложение">
          <Dashboard user={user} onLogout={logout} />
        </ErrorBoundary>
      )}
      <Toasts />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary name="Критическая ошибка">
      <AppProvider>
        <AppInner />
      </AppProvider>
    </ErrorBoundary>
  );
}
