/**
 * services/firebaseService.js
 *
 * Единственное место где знают о Firebase.
 * Компоненты никогда не импортируют firebase напрямую.
 *
 * В demo-режиме все функции возвращают заглушки.
 * Для перехода на live достаточно поменять FB_MODE = 'live'
 * и раскомментировать реальные реализации.
 */

// ─── Режим ───────────────────────────────────────────────────────────────────

import { FEATURES } from '../config/features';

/** Режим работы Firebase: 'demo' или 'live' (управляется через FEATURES.FIREBASE_LIVE) */
export const FB_MODE = FEATURES.FIREBASE_LIVE ? 'live' : 'demo';

// ─── Заявки ──────────────────────────────────────────────────────────────────

/** Подписка на все заявки в реальном времени. Возвращает unsubscribe. */
export const subscribeRequests = (callback) => {
  if (FB_MODE !== 'live') return () => {};
  // live: return onSnapshot(collection(db, 'requests'), snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  return () => {};
};

/** Создать заявку */
export const createRequest = async (data) => {
  if (FB_MODE !== 'live') return;
  // live: await addDoc(collection(db, 'requests'), data);
};

/** Обновить заявку */
export const updateRequest = async (id, patch) => {
  if (FB_MODE !== 'live') return;
  // live: await updateDoc(doc(db, 'requests', id), patch);
};

/** Удалить заявку */
export const deleteRequest = async (id) => {
  if (FB_MODE !== 'live') return;
  // live: await deleteDoc(doc(db, 'requests', id));
};

/** Загрузить фото заявки, вернуть URL */
export const uploadRequestPhoto = async (reqId, dataUrl) => {
  if (FB_MODE !== 'live') return dataUrl;
  // live:
  // const ref = storageRef(storage, `requests/${reqId}`);
  // await uploadString(ref, dataUrl, 'data_url');
  // return getDownloadURL(ref);
  return dataUrl;
};

// ─── Чат ─────────────────────────────────────────────────────────────────────

/** Подписка на сообщения чата. Возвращает unsubscribe. */
export const subscribeChat = (callback) => {
  if (FB_MODE !== 'live') return () => {};
  // live: return onSnapshot(query(collection(db, 'chat'), orderBy('at')), snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  return () => {};
};

/** Отправить сообщение */
export const sendMessage = async (data) => {
  if (FB_MODE !== 'live') return;
  // live: await addDoc(collection(db, 'chat'), data);
};

// ─── Пользователи ────────────────────────────────────────────────────────────

/** Получить всех пользователей */
export const fetchAllUsers = async () => {
  if (FB_MODE !== 'live') return [];
  // live: const snap = await getDocs(collection(db, 'users')); return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  return [];
};

/** Создать / обновить пользователя */
export const saveUser = async (uid, data) => {
  if (FB_MODE !== 'live') return;
  // live: await setDoc(doc(db, 'users', uid), data, { merge: true });
};

/** Удалить пользователя */
export const removeUser = async (uid) => {
  if (FB_MODE !== 'live') return;
  // live: await deleteDoc(doc(db, 'users', uid));
};

// ─── Разрешения (списки посетителей / рабочих) ───────────────────────────────

/** Получить перм-список пользователя */
export const fetchPerms = async (uid) => {
  if (FB_MODE !== 'live') return { visitors: [], workers: [] };
  // live: const snap = await getDoc(doc(db, 'perms', uid)); return snap.exists() ? snap.data() : { visitors: [], workers: [] };
  return { visitors: [], workers: [] };
};

/** Сохранить перм-список */
export const savePerms = async (uid, data) => {
  if (FB_MODE !== 'live') return;
  // live: await setDoc(doc(db, 'perms', uid), data);
};

// ─── Шаблоны ─────────────────────────────────────────────────────────────────

/** Получить шаблоны пользователя */
export const fetchTemplates = async (uid) => {
  if (FB_MODE !== 'live') return [];
  // live: const snap = await getDoc(doc(db, 'templates', uid)); return snap.exists() ? snap.data().items ?? [] : [];
  return [];
};

/** Сохранить шаблоны */
export const saveTemplates = async (uid, items) => {
  if (FB_MODE !== 'live') return;
  // live: await setDoc(doc(db, 'templates', uid), { items });
};

// ─── Аватарки ─────────────────────────────────────────────────────────────────

/** Загрузить аватарку, вернуть URL */
export const uploadAvatar = async (uid, dataUrl) => {
  if (FB_MODE !== 'live') return dataUrl;
  // live:
  // const ref = storageRef(storage, `avatars/${uid}`);
  // await uploadString(ref, dataUrl, 'data_url');
  // return getDownloadURL(ref);
  return dataUrl;
};

/** Удалить аватарку */
export const deleteAvatar = async (uid) => {
  if (FB_MODE !== 'live') return;
  // live: await deleteObject(storageRef(storage, `avatars/${uid}`)).catch(() => {});
};
