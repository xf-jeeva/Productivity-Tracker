'use client';

// CloudUserSync — silently syncs Supabase registries ↔ localStorage on every page.
//
// • Users:  When Supabase is empty (first run), local users are PUSHED UP to bootstrap.
//           When Supabase has users, they are PULLED DOWN so every device can login.
// • Tasks:  Real-time subscription keeps the user's tasks in sync across devices.
// • Notes:  Real-time subscription keeps the user's sticky notes in sync across devices.
// Falls back gracefully to local-only mode when Supabase env vars are not set.

import { useEffect } from 'react';
import { subscribeCloudUsers, pushCloudUsers, isSupabaseConfigured } from '../lib/cloudUsers';
import { subscribeCloudTasks } from '../lib/cloudTasks';
import { subscribeCloudNotes } from '../lib/cloudNotes';
import { getUsers, getCurrentUser, BUREAU_SYNC_EVENT } from '../lib/storage';

const USERS_KEY        = 'daily_bureau_users_v3';
const TASKS_KEY        = 'daily_bureau_tasks_v3';
const STICKY_NOTES_KEY = 'daily_bureau_sticky_notes_v3';

export default function CloudUserSync() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // ── 1. Users sync ────────────────────────────────────────────────────────
    const unsubscribeUsers = subscribeCloudUsers((cloudUsers) => {
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

    // ── 2. Tasks sync (for current logged-in user) ───────────────────────────
    const currentUser = getCurrentUser();
    let unsubscribeTasks: (() => void) | null = null;
    let unsubscribeNotes: (() => void) | null = null;

    if (currentUser) {
      unsubscribeTasks = subscribeCloudTasks(currentUser.id, (cloudTasks) => {
        try {
          // Merge cloud tasks over local — cloud is source of truth
          const stored = localStorage.getItem(TASKS_KEY);
          const localTasks = stored ? JSON.parse(stored) : [];
          const cloudIds = new Set(cloudTasks.map((t) => t.id));
          // Keep local-only tasks not yet pushed (optimistic UI)
          const localOnly = localTasks.filter((t: { id: string }) => !cloudIds.has(t.id));
          const merged = [...cloudTasks, ...localOnly];
          localStorage.setItem(TASKS_KEY, JSON.stringify(merged));
          window.dispatchEvent(new Event(BUREAU_SYNC_EVENT));
        } catch {
          // Storage quota exceeded — ignore
        }
      });

      // ── 3. Sticky notes sync ────────────────────────────────────────────────
      unsubscribeNotes = subscribeCloudNotes(currentUser.id, (cloudNotes) => {
        try {
          const stored = localStorage.getItem(STICKY_NOTES_KEY);
          const localNotes = stored ? JSON.parse(stored) : [];
          const cloudIds = new Set(cloudNotes.map((n) => n.id));
          const localOnly = localNotes.filter(
            (n: { id: string; userId: string }) =>
              !cloudIds.has(n.id) && n.userId === currentUser.id
          );
          const merged = [...cloudNotes, ...localOnly];
          localStorage.setItem(STICKY_NOTES_KEY, JSON.stringify(merged));
          window.dispatchEvent(new Event(BUREAU_SYNC_EVENT));
        } catch {
          // Storage quota exceeded — ignore
        }
      });
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeTasks) unsubscribeTasks();
      if (unsubscribeNotes) unsubscribeNotes();
    };
  }, []);

  return null;
}
