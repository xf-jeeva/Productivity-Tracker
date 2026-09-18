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
import { subscribeCloudTasks, subscribeAllCloudTasks, pushCloudTask } from '../lib/cloudTasks';
import { subscribeCloudNotes } from '../lib/cloudNotes';
import { getUsers, getCurrentUser, BUREAU_SYNC_EVENT } from '../lib/storage';
import { isMasterAdmin } from '../lib/auth';
import { useAuth } from './AuthProvider';
import { Task } from '../types';

const USERS_KEY        = 'daily_bureau_users_v3';
const TASKS_KEY        = 'daily_bureau_tasks_v3';
const STICKY_NOTES_KEY = 'daily_bureau_sticky_notes_v3';

export default function CloudUserSync() {
  const { user: authUser } = useAuth();

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

      // Merge: cloud users take precedence, exclude mock admin
      const cloudIds = new Set(cloudUsers.map((u) => u.id));
      const localOnly = localUsers.filter((u) => !cloudIds.has(u.id) && u.id !== 'usr-admin');
      const merged = [...cloudUsers.filter((u) => u.id !== 'usr-admin'), ...localOnly];

      try {
        localStorage.setItem(USERS_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event(BUREAU_SYNC_EVENT));
      } catch {
        // Storage quota exceeded — ignore
      }
    });

    // ── 2. Tasks sync (for current logged-in user or master admin) ────────────
    const currentUser = getCurrentUser();
    const activeUserId = authUser?.id || currentUser?.id;
    const activeEmail = authUser?.email || currentUser?.email;
    const activeName = authUser?.name || currentUser?.name;
    const isAdmin = isMasterAdmin(activeEmail);

    let unsubscribeTasks: (() => void) | null = null;
    let unsubscribeNotes: (() => void) | null = null;

    const handleTasksSync = (cloudTasks: Task[]) => {
      try {
        const stored = localStorage.getItem(TASKS_KEY);
        const localTasks: Task[] = stored ? JSON.parse(stored) : [];

        const mergedMap = new Map<string, Task>();

        // Cloud tasks are base
        for (const ct of cloudTasks) {
          mergedMap.set(ct.id, ct);
        }

        // Smart merge with local tasks: deleted always takes precedence over older states
        for (const lt of localTasks) {
          if (!mergedMap.has(lt.id)) {
            // Task exists only locally -> keep it and upload to cloud
            mergedMap.set(lt.id, lt);
            pushCloudTask(lt).catch(() => {});
          } else {
            const ct = mergedMap.get(lt.id)!;
            // 1. DELETED STATUS PRECEDENCE:
            if (ct.status === 'deleted') {
              // Cloud recorded deletion -> KEEP DELETED. Do NOT resurrect with local status!
              mergedMap.set(ct.id, ct);
            } else if (lt.status === 'deleted') {
              // Local deleted it -> mark deleted and push to cloud
              mergedMap.set(lt.id, lt);
              pushCloudTask(lt).catch(() => {});
            } 
            // 2. COMPLETED STATUS PRECEDENCE (if neither is deleted):
            else if (ct.status === 'completed') {
              mergedMap.set(ct.id, ct);
            } else if (lt.status === 'completed') {
              mergedMap.set(lt.id, lt);
              pushCloudTask(lt).catch(() => {});
            } 
            // 3. Otherwise, cloud is the authority
            else {
              mergedMap.set(ct.id, ct);
            }
          }
        }

        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => (b.orderNumber || 0) - (a.orderNumber || 0)
        );
        localStorage.setItem(TASKS_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event(BUREAU_SYNC_EVENT));
      } catch {
        // Storage quota exceeded — ignore
      }
    };

    if (isAdmin) {
      // Chief Administrator receives all tasks across the Bureau in real time
      unsubscribeTasks = subscribeAllCloudTasks(handleTasksSync);
    } else if (activeUserId) {
      // Field operative receives all their own tasks (by ID, email, or username)
      unsubscribeTasks = subscribeCloudTasks(activeUserId, handleTasksSync, activeEmail, activeName);
    }

    if (activeUserId) {
      // ── 3. Sticky notes sync ────────────────────────────────────────────────
      unsubscribeNotes = subscribeCloudNotes(activeUserId, (cloudNotes) => {
        try {
          const stored = localStorage.getItem(STICKY_NOTES_KEY);
          const localNotes = stored ? JSON.parse(stored) : [];
          const cloudIds = new Set(cloudNotes.map((n) => n.id));
          const localOnly = localNotes.filter(
            (n: { id: string; userId: string }) =>
              !cloudIds.has(n.id) && n.userId === activeUserId
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
  }, [authUser?.id, authUser?.email]);

  return null;
}
