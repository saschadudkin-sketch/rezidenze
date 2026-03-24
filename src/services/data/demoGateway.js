/**
 * data/demoGateway.js
 *
 * Demo-адаптер источника данных.
 * Хранит контракт live API, но не зависит от Firebase SDK.
 */

export const demoGateway = {
  subscribeRequests: () => () => {},
  createRequest: async () => {},
  updateRequest: async () => {},
  deleteRequest: async () => {},
  uploadRequestPhoto: async (reqId, dataUrl) => dataUrl,

  subscribeChat: () => () => {},
  sendMessage: async () => {},

  fetchAllUsers: async () => [],
  saveUser: async () => {},
  removeUser: async () => {},

  fetchPerms: async () => ({ visitors: [], workers: [] }),
  savePerms: async () => {},

  fetchTemplates: async () => [],
  saveTemplates: async () => {},

  uploadAvatar: async (uid, dataUrl) => dataUrl,
  deleteAvatar: async () => {},
};
