'use client';

// CloudUserSync Component
// On app load, this silently syncs the Firebase user registry into localStorage.
// This means users created by admin on any device become available on ALL devices.
// Runs invisibly — no UI, no loading states. Falls back gracefully when Firebase is not configured.

import { useEffect } from 'react';
import { subscribeCloudUsers, isFirebaseConfigured } from '../lib/cloudUsers';
import { getUsers, BUREAU_SYNC_EVENT } from '../lib/storage';

const USERS_KEY = 'daily_bureau_users_v3';

export default function CloudUserSync() {
  useEffect(() => {
    if (!isFirebaseConfigured) return; // No Firebase — local-only mode

    const unsubscribe = subscribeCloudUsers((cloudUsers) => {
      if (!cloudUsers || cloudUsers.length === 0) return;

      // Merge: cloud users take precedence, but keep any local-only users too
      const localUsers = getUsers();
      const cloudIds = new Set(cloudUsers.map((u) => u.id));
      const localOnly = localUsers.filter((u) => !cloudIds.has(u.id));
      const merged = [...cloudUsers, ...localOnly];

      // Write merged list to localStorage
      try {
        localStorage.setItem(USERS_KEY, JSON.stringify(merged));
        // Notify all components to re-read users
        window.dispatchEvent(new Event(BUREAU_SYNC_EVENT));
      } catch {
        // Storage quota exceeded — ignore
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return null; // Invisible component
}
