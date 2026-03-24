/**
 * services/firebaseService.js
 *
 * Тонкий фасад источника данных приложения.
 * UI и store импортируют только этот модуль и не знают,
 * работает ли приложение в demo- или live-режиме.
 */

import { FEATURES } from '../config/features';
import { demoGateway } from './data/demoGateway';
import { liveGateway } from './data/liveGateway';

/** Режим работы источника данных: 'demo' или 'live'. */
export const FB_MODE = FEATURES.FIREBASE_LIVE ? 'live' : 'demo';

const gateway = FB_MODE === 'live' ? liveGateway : demoGateway;

export const subscribeRequests = gateway.subscribeRequests;
export const createRequest = gateway.createRequest;
export const updateRequest = gateway.updateRequest;
export const deleteRequest = gateway.deleteRequest;
export const uploadRequestPhoto = gateway.uploadRequestPhoto;

export const subscribeChat = gateway.subscribeChat;
export const sendMessage = gateway.sendMessage;

export const fetchAllUsers = gateway.fetchAllUsers;
export const saveUser = gateway.saveUser;
export const removeUser = gateway.removeUser;

export const fetchPerms = gateway.fetchPerms;
export const savePerms = gateway.savePerms;

export const fetchTemplates = gateway.fetchTemplates;
export const saveTemplates = gateway.saveTemplates;

export const uploadAvatar = gateway.uploadAvatar;
export const deleteAvatar = gateway.deleteAvatar;
