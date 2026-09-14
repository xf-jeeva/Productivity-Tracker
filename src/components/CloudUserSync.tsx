'use client';

// CloudUserSync — silently syncs Supabase user registry ↔ localStorage on every page.
// When Supabase is empty (first run), local users are PUSHED UP to bootstrap the cloud.
// When Supabase has users, they are PULLED DOWN so every device can login with them.
// Falls back gracefully to local-only mode when Supabase env vars are not set.

import { useEffect } from 'react';
import { subscribeCloudUsers, pushCloudUsers, isSupabaseConfigured } from '../lib/cloudUsers';
import { getUsers, BUREAU_SYNC_EVENT } from '../lib/storage';

const USERS_KEY = 'daily_bureau_users_v3';

export default function CloudUserSync() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const unsubscribe = subscribeCloudUsers((cloudUsers) => {
      const localUsers = getUsers();

      if (!cloudUsers || cloudUsers.length === 0) {
        // Supabase is empty — bootstrap it with current local users
        if (localUsers.length > 0) {
          pushCloudUsers(localUsers).catch(() => {});
        }
        return;
      }

      // Merge: cloud users take precedence, keep any local-only users too
      const cloudIds = new Set(cloudUsers.map((u) => u.id));
      const localOnly = localUsers.filter((u) => !cloudIds.has(u.id));
      const merged = [...cloudUsers, ...localOnly];

      try {
        localStorage.setItem(USERS_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event(BUREAU_SYNC_EVENT));
      } catch {
        // Storage quota exceeded — ignore
      }
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  return null;
}
