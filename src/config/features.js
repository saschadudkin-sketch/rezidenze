/**
 * config/features.js — флаги функциональности
 *
 * Централизованное место для включения/выключения фич.
 * firebaseService.js импортирует FEATURES.FIREBASE_LIVE отсюда.
 */

export const FEATURES = {
  /** true — реальный Firebase, false — демо-режим с локальными данными */
  FIREBASE_LIVE: false,
};
