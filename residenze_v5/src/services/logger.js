/**
 * services/logger.js — централизованный логгер
 *
 * Обёртка над console, которая:
 * - в dev-режиме выводит всё
 * - в prod-режиме подавляет debug/info, отправляет error в сервис
 * - добавляет контекст (роль, uid) к каждой записи
 *
 * Использование:
 *   import { logger } from '../services/logger';
 *   logger.info('Заявка создана', { reqId, userRole });
 *   logger.error('Firebase error', err);
 */

const IS_DEV = process.env.NODE_ENV !== 'production';

// Контекст текущей сессии (устанавливается при логине)
let _ctx = {};

export const logger = {
  /** Установить контекст (uid, role) — вызывать при логине */
  setContext(ctx) {
    _ctx = { ..._ctx, ...ctx };
  },

  /** Сбросить контекст — при логауте */
  clearContext() {
    _ctx = {};
  },

  debug(...args) {
    if (IS_DEV) console.debug('[DEBUG]', ..._fmtArgs(args));
  },

  info(...args) {
    if (IS_DEV) console.info('[INFO]', ..._fmtArgs(args));
  },

  warn(...args) {
    console.warn('[WARN]', ..._fmtArgs(args));
  },

  error(message, error, extra = {}) {
    const payload = {
      message,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      context: _ctx,
      extra,
      timestamp: new Date().toISOString(),
    };
    console.error('[ERROR]', payload);

    // В prod — отправить в сервис (Sentry, Datadog и т.д.)
    if (!IS_DEV) {
      _sendToService(payload);
    }
  },

  /** Логировать действие пользователя */
  action(name, data = {}) {
    if (IS_DEV) console.log('[ACTION]', name, { ..._ctx, ...data });
  },
};

function _fmtArgs(args) {
  if (Object.keys(_ctx).length === 0) return args;
  return [...args, _ctx];
}

function _sendToService(payload) {
  // Заглушка — заменить на реальный сервис:
  // Sentry.captureException(payload.error, { extra: payload })
  // fetch('/api/logs', { method: 'POST', body: JSON.stringify(payload) })
  void payload;
}
