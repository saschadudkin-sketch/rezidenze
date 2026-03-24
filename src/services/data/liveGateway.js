/**
 * data/liveGateway.js
 *
 * Заготовка live-адаптера. Здесь должна жить реальная интеграция с Firebase.
 * Пока контракт совпадает с demoGateway, чтобы UI зависел только от фасада.
 */

export const liveGateway = {
  subscribeRequests: () => {
    // live: return onSnapshot(collection(db, 'requests'), ...)
    return () => {};
  },
  createRequest: async () => {
    // live: await addDoc(collection(db, 'requests'), data)
  },
  updateRequest: async () => {
    // live: await updateDoc(doc(db, 'requests', id), patch)
  },
  deleteRequest: async () => {
    // live: await deleteDoc(doc(db, 'requests', id))
  },
  uploadRequestPhoto: async (reqId, dataUrl) => {
    // live: upload to storage and return download URL
    return dataUrl;
  },

  subscribeChat: () => {
    // live: return onSnapshot(query(collection(db, 'chat'), orderBy('at')), ...)
    return () => {};
  },
  sendMessage: async () => {
    // live: await addDoc(collection(db, 'chat'), data)
  },

  fetchAllUsers: async () => {
    // live: read collection(db, 'users')
    return [];
  },
  saveUser: async () => {
    // live: await setDoc(doc(db, 'users', uid), data, { merge: true })
  },
  removeUser: async () => {
    // live: await deleteDoc(doc(db, 'users', uid))
  },

  fetchPerms: async () => {
    // live: return user perms document
    return { visitors: [], workers: [] };
  },
  savePerms: async () => {
    // live: await setDoc(doc(db, 'perms', uid), data)
  },

  fetchTemplates: async () => {
    // live: return templates for user
    return [];
  },
  saveTemplates: async () => {
    // live: await setDoc(doc(db, 'templates', uid), { items })
  },

  uploadAvatar: async (uid, dataUrl) => {
    // live: upload avatar and return URL
    return dataUrl;
  },
  deleteAvatar: async () => {
    // live: await deleteObject(storageRef(storage, `avatars/${uid}`))
  },
};
