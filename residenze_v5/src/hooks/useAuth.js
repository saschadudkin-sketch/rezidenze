import { useState, useEffect, useCallback } from 'react';
import { requestNotifPerm } from '../utils';
import { logger } from '../services/logger';
import { toast } from '../ui/Toasts';

// ─── Config ──────────────────────────────────────────────────────────────────

export const APP_CONFIG = {
  splashDelay: 1200,
};

export const PHASE = {
  LOADING:   'loading',
  LOGIN:     'login',
  DASHBOARD: 'dashboard',
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [phase, setPhase] = useState(PHASE.LOADING);
  const [user,  setUser]  = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setPhase(PHASE.LOGIN), APP_CONFIG.splashDelay);
    return () => clearTimeout(t);
  }, []);

  const login = useCallback((u) => {
    if (!u || !u.uid) {
      logger.error('Login called with invalid user', u);
      toast('Ошибка входа', 'error');
      return;
    }
    setUser(u);
    setPhase(PHASE.DASHBOARD);
    toast('Добро пожаловать, ' + u.name + '!', 'success');
    requestNotifPerm();
    logger.setContext({ uid: u.uid, role: u.role, name: u.name });
    logger.action('login', { role: u.role });
  }, []);

  const logout = useCallback(() => {
    logger.action('logout');
    logger.clearContext();
    setUser(null);
    setPhase(PHASE.LOGIN);
  }, []);

  return { phase, user, login, logout };
}
