/**
 * AppStore.jsx — тонкий оркестратор стейта
 *
 * Делегирует логику слайсам:
 *   slices/requestsSlice.js  — заявки + история
 *   slices/chatSlice.js      — чат
 *   slices/usersSlice.js     — пользователи + аватарки
 *   slices/permsSlice.js     — разрешения + шаблоны
 */

import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { normalizePhone } from '../utils';

import { requestsReducer, INITIAL_REQUESTS, INITIAL_HISTORY }                           from './slices/requestsSlice';
import { chatReducer,     INITIAL_CHAT,     INITIAL_CHAT_LAST_SEEN }                    from './slices/chatSlice';
import { usersReducer,    INITIAL_USERS,    INITIAL_PHONE_DB, INITIAL_AVATARS, PHONE_DB_INITIAL } from './slices/usersSlice';
import { permsReducer,    INITIAL_PERMS,    INITIAL_TEMPLATES }                         from './slices/permsSlice';
import { blacklistReducer, INITIAL_BLACKLIST }                                          from './slices/blacklistSlice';

// ─── Action types ─────────────────────────────────────────────────────────────

export const A = {
  REQUEST_ADD: 'REQUEST_ADD', REQUEST_UPDATE: 'REQUEST_UPDATE', REQUEST_DELETE: 'REQUEST_DELETE',
  REQUEST_SET_STATUS: 'REQUEST_SET_STATUS', REQUEST_ARRIVE: 'REQUEST_ARRIVE',
  REQUESTS_SET_ALL: 'REQUESTS_SET_ALL', REQUEST_ACTIVATE_SCHEDULED: 'REQUEST_ACTIVATE_SCHEDULED',
  HISTORY_ADD: 'HISTORY_ADD',
  CHAT_SEND: 'CHAT_SEND', CHAT_SET_ALL: 'CHAT_SET_ALL', CHAT_MARK_SEEN: 'CHAT_MARK_SEEN',
  CHAT_UPDATE_MESSAGE: 'CHAT_UPDATE_MESSAGE', CHAT_DELETE_MESSAGE: 'CHAT_DELETE_MESSAGE',
  USER_ADD: 'USER_ADD', USER_UPDATE: 'USER_UPDATE', USER_DELETE: 'USER_DELETE', USERS_SET_ALL: 'USERS_SET_ALL',
  AVATAR_SET: 'AVATAR_SET', AVATAR_DELETE: 'AVATAR_DELETE',
  PERMS_SET: 'PERMS_SET', TEMPLATE_ADD: 'TEMPLATE_ADD', TEMPLATE_DELETE: 'TEMPLATE_DELETE', TEMPLATES_SET: 'TEMPLATES_SET',
  BLACKLIST_ADD: 'BLACKLIST_ADD', BLACKLIST_REMOVE: 'BLACKLIST_REMOVE', BLACKLIST_SET_ALL: 'BLACKLIST_SET_ALL',
};

// ─── Начальное состояние ──────────────────────────────────────────────────────

const INITIAL_STATE = {
  requests: INITIAL_REQUESTS, history: INITIAL_HISTORY,
  chat: INITIAL_CHAT, chatLastSeen: INITIAL_CHAT_LAST_SEEN,
  users: INITIAL_USERS, phoneDb: INITIAL_PHONE_DB, avatars: INITIAL_AVATARS,
  perms: INITIAL_PERMS, templates: INITIAL_TEMPLATES,
  blacklist: INITIAL_BLACKLIST,
};

// ─── Корневой reducer ─────────────────────────────────────────────────────────

const REQUESTS_ACTIONS = new Set(['REQUEST_ADD','REQUEST_UPDATE','REQUEST_DELETE','REQUEST_SET_STATUS','REQUEST_ARRIVE','REQUESTS_SET_ALL','REQUEST_ACTIVATE_SCHEDULED','HISTORY_ADD']);
const CHAT_ACTIONS     = new Set(['CHAT_SEND','CHAT_SET_ALL','CHAT_MARK_SEEN','CHAT_UPDATE_MESSAGE','CHAT_DELETE_MESSAGE']);
const USERS_ACTIONS    = new Set(['USER_ADD','USER_UPDATE','USER_DELETE','USERS_SET_ALL','AVATAR_SET','AVATAR_DELETE']);
const PERMS_ACTIONS    = new Set(['PERMS_SET','TEMPLATE_ADD','TEMPLATE_DELETE','TEMPLATES_SET']);
const BLACKLIST_ACTIONS = new Set(['BLACKLIST_ADD','BLACKLIST_REMOVE','BLACKLIST_SET_ALL']);

function appReducer(state, action) {
  if (REQUESTS_ACTIONS.has(action.type)) return requestsReducer(state, action);
  if (CHAT_ACTIONS.has(action.type))     return chatReducer(state, action);
  if (USERS_ACTIONS.has(action.type))    return usersReducer(state, action);
  if (PERMS_ACTIONS.has(action.type))    return permsReducer(state, action);
  if (BLACKLIST_ACTIONS.has(action.type)) return blacklistReducer(state, action);
  return state;
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const LS_KEY = 'residenze_v5';

function saveToLS(state) {
  try {
    const photos = {};
    const reqsClean = state.requests.map(r => {
      const base = { ...r,
        createdAt:    r.createdAt    instanceof Date ? r.createdAt.toISOString()    : r.createdAt,
        arrivedAt:    r.arrivedAt    instanceof Date ? r.arrivedAt.toISOString()    : r.arrivedAt,
        scheduledFor: r.scheduledFor instanceof Date ? r.scheduledFor.toISOString() : (r.scheduledFor || null),
        validUntil:   r.validUntil   instanceof Date ? r.validUntil.toISOString()   : (r.validUntil || null),
      };
      if (r.photo?.startsWith('data:')) { photos[r.id] = r.photo; base.photo = '__photo__'; }
      if (r.photos && r.photos.length > 0) {
        r.photos.forEach((p, i) => { if (p?.startsWith('data:')) photos[r.id + '_' + i] = p; });
        base.photos = r.photos.map((p, i) => p?.startsWith('data:') ? '__photo_' + i + '__' : p);
      }
      return base;
    });
    localStorage.setItem(LS_KEY, JSON.stringify({
      requests: reqsClean,
      chat: state.chat.map(m => ({ ...m, at: m.at instanceof Date ? m.at.toISOString() : m.at })),
      chatLastSeen: state.chatLastSeen, history: state.history,
      avatars: state.avatars, perms: state.perms, templates: state.templates,
      blacklist: (state.blacklist || []).map(e => ({ ...e, addedAt: e.addedAt instanceof Date ? e.addedAt.toISOString() : e.addedAt })),
      extraUsers: Object.fromEntries(
        Object.entries(state.users).filter(([uid]) => !Object.values(PHONE_DB_INITIAL).some(u => u.uid === uid))
      ),
    }));
    Object.entries(photos).forEach(([id, src]) => {
      try {
        localStorage.setItem(LS_KEY + '_ph_' + id, src);
      } catch (e) {
        // Квота исчерпана — удаляем фото только завершённых заявок
        console.warn('[AppStore] localStorage quota exceeded, cleaning old photos');
        const activeIds = new Set(state.requests
          .filter(r => r.status === 'pending' || r.status === 'approved' || r.status === 'scheduled')
          .map(r => LS_KEY + '_ph_' + r.id));
        const photoKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LS_KEY + '_ph_') && k !== LS_KEY + '_ph_' + id && !activeIds.has(k)) photoKeys.push(k);
        }
        photoKeys.slice(0, Math.max(1, Math.ceil(photoKeys.length / 2))).forEach(k => {
          try { localStorage.removeItem(k); } catch {}
        });
        try { localStorage.setItem(LS_KEY + '_ph_' + id, src); } catch {}
      }
    });
  } catch (e) { console.warn('[AppStore] save failed:', e); }
}

function loadFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const result = {};
    if (d.requests)     result.requests     = d.requests.map(r => ({ ...r, createdAt: r.createdAt ? new Date(r.createdAt) : new Date(), arrivedAt: r.arrivedAt ? new Date(r.arrivedAt) : null, scheduledFor: r.scheduledFor ? new Date(r.scheduledFor) : null, validUntil: r.validUntil ? new Date(r.validUntil) : null, photo: r.photo === '__photo__' ? (localStorage.getItem(LS_KEY + '_ph_' + r.id) || null) : r.photo, photos: (r.photos || []).map((p, i) => p?.startsWith('__photo_') ? (localStorage.getItem(LS_KEY + '_ph_' + r.id + '_' + i) || null) : p).filter(Boolean) }));
    if (d.chat)         result.chat         = d.chat.map(m => ({ ...m, at: m.at ? new Date(m.at) : new Date() }));
    if (d.chatLastSeen) result.chatLastSeen = d.chatLastSeen;
    if (d.history)      result.history      = d.history;
    if (d.avatars)      result.avatars      = d.avatars;
    if (d.perms)        result.perms        = d.perms;
    if (d.templates)    result.templates    = d.templates;
    if (d.blacklist)    result.blacklist    = d.blacklist.map(e => ({ ...e, addedAt: e.addedAt ? new Date(e.addedAt) : new Date() }));
    if (d.extraUsers) {
      const extras = Object.entries(d.extraUsers);
      if (extras.length > 0) {
        const newUsers = { ...INITIAL_USERS }; const newPhoneDb = { ...PHONE_DB_INITIAL };
        extras.forEach(([uid, u]) => { newUsers[uid] = u; newPhoneDb[normalizePhone(u.phone)] = u; });
        result.users = newUsers; result.phoneDb = newPhoneDb;
      }
    }
    return result;
  } catch (e) { console.warn('[AppStore] load failed:', e); return null; }
}

// ─── Context + Provider ──────────────────────────────────────────────────────

const AppStateContext    = createContext(null);
const AppDispatchContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, () => {
    const saved = loadFromLS();
    return saved ? { ...INITIAL_STATE, ...saved } : INITIAL_STATE;
  });
  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToLS(state), 500);
    return () => clearTimeout(saveTimer.current);
  }, [state]);
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// ─── Хуки для чтения ─────────────────────────────────────────────────────────

export function useAppState()           { return useContext(AppStateContext); }
export function useAppDispatch()        { return useContext(AppDispatchContext); }
export function useRequests()           { return useContext(AppStateContext).requests; }
export function useChat()               { const { chat, chatLastSeen } = useContext(AppStateContext); return { chat, chatLastSeen }; }
export function useUsers()              { const { users, phoneDb } = useContext(AppStateContext); return { users, phoneDb }; }
export function useAvatar(uid)          { const { avatars, users } = useContext(AppStateContext); return avatars[uid] || users[uid]?.avatar || null; }
export function usePerms(uid)           { return useContext(AppStateContext).perms[uid]     || { visitors: [], workers: [] }; }
export function useTemplates(uid)       { return useContext(AppStateContext).templates[uid] || []; }
export function useRequestHistory(reqId){ return useContext(AppStateContext).history[reqId] || []; }
export function useBlacklist()          { return useContext(AppStateContext).blacklist || []; }

// ─── useActions ───────────────────────────────────────────────────────────────

export function useActions() {
  const dispatch = useContext(AppDispatchContext);
  return {
    addRequest:        useCallback((req)          => dispatch({ type: A.REQUEST_ADD,                request: req }),               [dispatch]),
    updateRequest:     useCallback((id, patch)    => dispatch({ type: A.REQUEST_UPDATE,             id, patch }),                  [dispatch]),
    deleteRequest:     useCallback((id)           => dispatch({ type: A.REQUEST_DELETE,             id }),                         [dispatch]),
    setAllRequests:    useCallback((requests)     => dispatch({ type: A.REQUESTS_SET_ALL,           requests }),                   [dispatch]),
    activateScheduled: useCallback(()             => dispatch({ type: A.REQUEST_ACTIVATE_SCHEDULED }),                             [dispatch]),

    approveRequest: useCallback((id, byName, byRole) => { const now = new Date(); dispatch({ type: A.REQUEST_SET_STATUS, id, status: 'approved' }); dispatch({ type: A.HISTORY_ADD, reqId: id, byName, byRole, label: 'Допуск разрешён', at: now }); }, [dispatch]),
    rejectRequest:  useCallback((id, byName, byRole) => { const now = new Date(); dispatch({ type: A.REQUEST_SET_STATUS, id, status: 'rejected' }); dispatch({ type: A.HISTORY_ADD, reqId: id, byName, byRole, label: 'Отказано', at: now }); }, [dispatch]),
    acceptRequest:  useCallback((id, byName, byRole) => { const now = new Date(); dispatch({ type: A.REQUEST_SET_STATUS, id, status: 'accepted' }); dispatch({ type: A.HISTORY_ADD, reqId: id, byName, byRole, label: 'Принято в работу', at: now }); }, [dispatch]),
    arriveRequest:  useCallback((id, byName, byRole) => { const now = new Date(); dispatch({ type: A.REQUEST_ARRIVE, id, arrivedAt: now }); dispatch({ type: A.HISTORY_ADD, reqId: id, byName, byRole, label: 'Отмечен вход', at: now }); }, [dispatch]),
    approveAndArrive: useCallback((id, byName, byRole) => { const now = new Date(); dispatch({ type: A.REQUEST_SET_STATUS, id, status: 'approved' }); dispatch({ type: A.REQUEST_ARRIVE, id, arrivedAt: now }); dispatch({ type: A.HISTORY_ADD, reqId: id, byName, byRole, label: 'Допуск разрешён', at: now }); dispatch({ type: A.HISTORY_ADD, reqId: id, byName, byRole, label: 'Отмечен вход', at: new Date(now.getTime() + 1) }); }, [dispatch]),

    sendMessage:    useCallback((msg)     => dispatch({ type: A.CHAT_SEND,    message: msg }),   [dispatch]),
    setAllMessages: useCallback((msgs)    => dispatch({ type: A.CHAT_SET_ALL, messages: msgs }), [dispatch]),
    markChatSeen:   useCallback((uid)     => dispatch({ type: A.CHAT_MARK_SEEN, uid }),          [dispatch]),
    updateMessage:  useCallback((id, patch) => dispatch({ type: A.CHAT_UPDATE_MESSAGE, id, patch }), [dispatch]),
    deleteMessage:  useCallback((id)        => dispatch({ type: A.CHAT_DELETE_MESSAGE, id }),         [dispatch]),

    addUser:     useCallback((user)          => dispatch({ type: A.USER_ADD,    user }),                          [dispatch]),
    updateUser:  useCallback((uid, p, old)   => dispatch({ type: A.USER_UPDATE, uid, patch: p, oldPhone: old }), [dispatch]),
    deleteUser:  useCallback((uid)           => dispatch({ type: A.USER_DELETE, uid }),                          [dispatch]),
    setAllUsers: useCallback((users)         => dispatch({ type: A.USERS_SET_ALL, users }),                      [dispatch]),

    setAvatar:    useCallback((uid, avatar)  => dispatch({ type: A.AVATAR_SET,    uid, avatar }), [dispatch]),
    deleteAvatar: useCallback((uid)          => dispatch({ type: A.AVATAR_DELETE, uid }),         [dispatch]),

    setPerms:       useCallback((uid, perms)      => dispatch({ type: A.PERMS_SET,       uid, perms }),     [dispatch]),
    addTemplate:    useCallback((uid, template)   => dispatch({ type: A.TEMPLATE_ADD,    uid, template }),  [dispatch]),
    deleteTemplate: useCallback((uid, id)         => dispatch({ type: A.TEMPLATE_DELETE, uid, id }),        [dispatch]),
    setTemplates:   useCallback((uid, templates)  => dispatch({ type: A.TEMPLATES_SET,   uid, templates }), [dispatch]),

    addToBlacklist:    useCallback((entry) => dispatch({ type: A.BLACKLIST_ADD,     entry }),  [dispatch]),
    removeFromBlacklist: useCallback((id) => dispatch({ type: A.BLACKLIST_REMOVE,   id }),     [dispatch]),
    setBlacklist:      useCallback((entries) => dispatch({ type: A.BLACKLIST_SET_ALL, entries }), [dispatch]),
  };
}
