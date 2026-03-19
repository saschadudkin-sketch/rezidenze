/**
 * requestPredicates.js — именованные предикаты для заявок.
 *
 * Заменяют длинные inline-условия вида:
 *   req.status === 'rejected' || req.status === 'accepted' || req.status === 'arrived'
 * на читаемые:
 *   isCompletedRequest(req)
 */

import { canManageRequests, isResident as isResidentRole } from '../domain/permissions';

// ─── Статусы ─────────────────────────────────────────────────────────────────

/** Заявка ещё активна (можно одобрить/отклонить) */
export const isActiveRequest = (req) =>
  req.status === 'pending' || req.status === 'approved';

/** Заявка завершена (можно повторить) */
export const isCompletedRequest = (req) =>
  ['rejected', 'accepted', 'arrived', 'expired'].includes(req.status);

/** Заявка ожидает решения */
export const isPendingRequest = (req) => req.status === 'pending';

/** Заявка одобрена, посетитель ещё не вошёл */
export const isApprovedRequest = (req) => req.status === 'approved';

/** Заявка запланирована на будущее */
export const isScheduledRequest = (req) => req.status === 'scheduled';

// ─── Роли (реэкспорт из domain/permissions) ──────────────────────────────────
export { canManageRequests, isResidentRole };

// ─── Типы заявок ─────────────────────────────────────────────────────────────

/** Пропуск для посетителя */
export const isPassRequest = (req) => req.type === 'pass';

/** Заявка в техслужбу */
export const isTechRequest = (req) => req.type === 'tech';

// ─── Видимость кнопок действий ───────────────────────────────────────────────

/**
 * Показывать ли блок действий в карточке заявки
 * (кнопки охраны / повтор / редактирование)
 */
export const shouldShowActions = (req, { userRole, onRepeat, onEdit, onDelete }) =>
  canManageRequests(userRole)
  || (onRepeat && isCompletedRequest(req))
  || ((onEdit || onDelete) && isPendingRequest(req));
