// Auth helpers — Supabase Auth (Google OAuth)
// Production-grade instant authentication with cached session fast-path

import { supabase, SupabaseProfile } from './supabase';
import { Session, User } from '@supabase/supabase-js';

export type AuthUser = {
  id: string;          // Supabase auth.uid()
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
};

export const MASTER_ADMIN_EMAIL = 'freefirejeeva2810@gmail.com';

export function isMasterAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === MASTER_ADMIN_EMAIL;
}

// Key for storing permanently deleted user IDs & emails across local sessions
export const DELETED_USERS_STORAGE_KEY = 'daily_bureau_deleted_user_ids_v3';

// Synchronous check: get set of all deleted user IDs & emails from local cache (0ms)
export function getDeletedUserIdsSync(): Set<string> {
  const set = new Set<string>();
  if (typeof window === 'undefined') return set;
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((item) => {
          if (typeof item === 'string' && item.trim()) {
            set.add(item.toLowerCase().trim());
          }
        });
      }
    }
  } catch {}
  return set;
}

// Record a deleted tombstone locally
export function saveDeletedTombstoneLocal(id: string, email?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedUserIdsSync();
    if (id) set.add(id.toLowerCase().trim());
    if (email) set.add(email.toLowerCase().trim());
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

// Query persistent tombstones from Supabase bureau_users table (which has open RLS)
export async function getDeletedUserTombstones(): Promise<{ ids: Set<string>; emails: Set<string> }> {
  const localSet = getDeletedUserIdsSync();
  const ids = new Set<string>();
  const emails = new Set<string>();

  localSet.forEach((val) => {
    if (val.includes('@')) {
      emails.add(val.toLowerCase());
    } else {
      ids.add(val);
    }
  });

  if (!supabase) return { ids, emails };

  try {
    const { data, error } = await supabase
      .from('bureau_users')
      .select('id, username, role, department, desk_number')
      .or('role.eq.deleted,id.like.deleted_%,username.like.__deleted__%');

    if (!error && data) {
      data.forEach((r) => {
        if (r.desk_number) ids.add(r.desk_number.toLowerCase().trim());
        if (typeof r.id === 'string' && r.id.startsWith('deleted_')) {
          ids.add(r.id.replace('deleted_', '').toLowerCase().trim());
        }
        if (typeof r.department === 'string' && r.department.includes('@')) {
          emails.add(r.department.toLowerCase().trim());
        }
      });
      // Save merged tombstones back to localStorage
      if (typeof window !== 'undefined') {
        const combined = Array.from(new Set([...Array.from(ids), ...Array.from(emails)]));
        localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(combined));
      }
    }
  } catch (e) {
    console.warn('[Supabase] getDeletedUserTombstones notice:', e);
  }

  return { ids, emails };
}

// Quick synchronous check: does localStorage contain a Supabase auth token?
export function hasLocalAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = localStorage.getItem(key);
        if (val && val !== 'null' && val !== '{}' && val !== '""') {
          return true;
        }
      }
    }
  } catch {}
  return false;
}

// Extract cached AuthUser immediately from localStorage in 0ms (no network delay)
export function getCachedAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const deletedSet = getDeletedUserIdsSync();

  try {
    // 1. Try local storage user profile first (instant, 0ms)
    const stored = localStorage.getItem('daily_bureau_current_user_v3');
    if (stored) {
      const u = JSON.parse(stored);
      if (u?.id && (u?.email || u?.username)) {
        const email = u.email || '';
        // If user was deleted, do not return cached auth
        if (deletedSet.has(u.id.toLowerCase()) || (email && deletedSet.has(email.toLowerCase()))) {
          return null;
        }
        return {
          id: u.id,
          email,
          name: u.name || (email ? email.split('@')[0] : u.username || 'User'),
          avatarUrl: u.avatar || null,
          role: isMasterAdmin(email) ? 'admin' : (u.role || 'member'),
        };
      }
    }

    // 2. Try Supabase token in localStorage (instant, 0ms)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          const su = parsed?.user;
          if (su?.id && su?.email) {
            if (deletedSet.has(su.id.toLowerCase()) || deletedSet.has(su.email.toLowerCase())) {
              return null;
            }
            const role = isMasterAdmin(su.email) ? 'admin' : 'member';
            return {
              id: su.id,
              email: su.email,
              name: su.user_metadata?.full_name || su.user_metadata?.name || su.email.split('@')[0],
              avatarUrl: su.user_metadata?.avatar_url || su.user_metadata?.picture || null,
              role,
            };
          }
        }
      }
    }
  } catch {}
  return null;
}

// Convert Supabase User object into AuthUser
export function mapSupabaseUserToAuthUser(user: User): AuthUser {
  const email = user.email || '';
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (email ? email.split('@')[0] : 'Team Member');
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;
  const role: 'admin' | 'member' = isMasterAdmin(email) ? 'admin' : 'member';

  return {
    id: user.id,
    email,
    name,
    avatarUrl,
    role,
  };
}

// Silently background-sync profile to Supabase `profiles` table without blocking UI
export function syncProfileInBackground(user: User): void {
  if (!supabase) return;
  const authUser = mapSupabaseUserToAuthUser(user);
  const deletedSet = getDeletedUserIdsSync();
  if (deletedSet.has(authUser.id.toLowerCase()) || (authUser.email && deletedSet.has(authUser.email.toLowerCase()))) {
    return;
  }

  Promise.resolve(
    supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        avatar_url: authUser.avatarUrl,
        role: authUser.role,
      }, { onConflict: 'id' })
  )
    .then(({ error }) => {
      if (error) console.warn('[Supabase] profile background sync notice:', error.message);
    })
    .catch(() => {});
}

// ── Get current session ────────────────────────────────────────────────────
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Get current auth user + their profile (with timeout protection) ─────────
export async function getAuthUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const cached = getCachedAuthUser();
  if (!hasLocalAuthSession() && !cached) return null;

  try {
    // Fast timeout of 2.5 seconds to never freeze the UI if network is slow
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 2500)
    );
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

    if (session?.user) {
      const authUser = mapSupabaseUserToAuthUser(session.user);
      const deletedSet = getDeletedUserIdsSync();
      if (deletedSet.has(authUser.id.toLowerCase()) || (authUser.email && deletedSet.has(authUser.email.toLowerCase()))) {
        signOut();
        return null;
      }
      syncProfileInBackground(session.user);
      return authUser;
    }
  } catch (e) {
    console.warn('getSession notice:', e);
  }

  // Fallback to getUser() with timeout
  try {
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null }; error: null }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: null }), 2000)
    );
    const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
    if (user) {
      const authUser = mapSupabaseUserToAuthUser(user);
      const deletedSet = getDeletedUserIdsSync();
      if (deletedSet.has(authUser.id.toLowerCase()) || (authUser.email && deletedSet.has(authUser.email.toLowerCase()))) {
        signOut();
        return null;
      }
      syncProfileInBackground(user);
      return authUser;
    }
  } catch (e) {
    console.warn('getUser check notice:', e);
  }

  return cached;
}

// ── Fetch profile from `profiles` table (instant response with fallback) ───
export async function fetchProfile(user: User): Promise<AuthUser> {
  const fallback = mapSupabaseUserToAuthUser(user);
  if (!supabase) return fallback;

  try {
    // Non-blocking upsert in background
    syncProfileInBackground(user);
    return fallback;
  } catch (err) {
    console.warn('Error syncing profile:', err);
    return fallback;
  }
}

// ── Sign in with Google ────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectTo = origin
    ? `${origin}/auth/callback/`
    : '/auth/callback/';

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error) throw error;
}

// ── Sign out ───────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('daily_bureau_current_user_v3');
  }
  if (!supabase) return;
  await supabase.auth.signOut().catch(() => {});
}

// ── Listen to auth state changes ───────────────────────────────────────────
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const authUser = mapSupabaseUserToAuthUser(session.user);
      const deletedSet = getDeletedUserIdsSync();
      if (deletedSet.has(authUser.id.toLowerCase()) || (authUser.email && deletedSet.has(authUser.email.toLowerCase()))) {
        signOut();
        callback(null);
        return;
      }
      syncProfileInBackground(session.user);
      callback(authUser);
    } else {
      callback(null);
    }
  });
  return () => subscription.unsubscribe();
}

// ── Update a user's role (admin only) ─────────────────────────────────────
export async function updateUserRole(userId: string, role: 'admin' | 'member'): Promise<void> {
  if (!supabase) return;
  await supabase.from('profiles').update({ role }).eq('id', userId);
}

// ── Get all users (admin only) with permanent tombstone filtering ─────────
export async function getAllProfiles(): Promise<AuthUser[]> {
  if (!supabase) return [];
  try {
    const [profilesRes, tombstones] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      getDeletedUserTombstones(),
    ]);

    if (profilesRes.error) {
      console.warn('[Supabase] getAllProfiles:', profilesRes.error.message);
      return [];
    }

    const { ids: deletedIds, emails: deletedEmails } = tombstones;

    return (profilesRes.data ?? [])
      .filter((p: SupabaseProfile) => {
        if (!p.id || !p.email) return false;
        if (p.id === 'usr-admin' || p.email.toLowerCase() === 'admin@dailybureau.org') return false;
        // Permanently filter out any deleted user
        if (deletedIds.has(p.id.toLowerCase().trim())) return false;
        if (deletedEmails.has(p.email.toLowerCase().trim())) return false;
        return true;
      })
      .map((p: SupabaseProfile) => ({
        id: p.id,
        email: p.email,
        name: p.name ?? p.email.split('@')[0],
        avatarUrl: p.avatar_url,
        role: isMasterAdmin(p.email) ? 'admin' : 'member',
      }));
  } catch (e) {
    console.warn('[Supabase] getAllProfiles error:', e);
    return [];
  }
}

// ── Permanently delete a user from Supabase database & all tables ─────────
export async function deleteUserCompletely(
  userId: string,
  userEmail?: string
): Promise<{ success: boolean; error?: string }> {
  if (isMasterAdmin(userEmail)) {
    return { success: false, error: 'Cannot delete the Master Administrator account.' };
  }

  const cleanEmail = (userEmail || '').toLowerCase().trim();

  // 1. Instantly record tombstone in localStorage (0ms synchronous)
  saveDeletedTombstoneLocal(userId, cleanEmail);

  try {
    if (supabase) {
      // 2. Persist tombstone in Supabase bureau_users table (which has open RLS)
      // This guarantees all devices and future sessions know this user is permanently deleted
      try {
        await supabase.from('bureau_users').upsert({
          id: `deleted_${userId}`,
          username: `__deleted__${userId}`,
          password: 'DELETED',
          name: '[Deleted User]',
          role: 'deleted',
          department: cleanEmail,
          desk_number: userId,
          title: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (e) {
        console.warn('bureau_users tombstone notice:', e);
      }

      // 3. Delete any active row from bureau_users
      try {
        await supabase.from('bureau_users').delete().eq('id', userId);
        if (cleanEmail) {
          const handle = cleanEmail.split('@')[0];
          if (handle) {
            await supabase.from('bureau_users').delete().eq('username', handle);
          }
        }
      } catch {}

      // 4. Attempt deleting from profiles table
      try {
        await supabase.from('profiles').delete().eq('id', userId);
        if (cleanEmail) {
          await supabase.from('profiles').delete().eq('email', cleanEmail);
        }
      } catch {}

      // 5. Delete all tasks & routines for this user from bureau_tasks
      try {
        const taskOr = [`assignee_id.eq.${userId}`, `created_by_id.eq.${userId}`];
        if (cleanEmail) {
          taskOr.push(`assignee_id.eq.${cleanEmail}`);
          taskOr.push(`created_by_id.eq.${cleanEmail}`);
          const handle = cleanEmail.split('@')[0];
          if (handle) {
            taskOr.push(`assignee_id.eq.${handle}`);
            taskOr.push(`created_by_username.eq.${handle}`);
          }
        }
        await supabase.from('bureau_tasks').delete().or(taskOr.join(','));
      } catch (e) {
        console.warn('bureau_tasks delete notice:', e);
      }

      // 6. Delete sticky notes
      try {
        await supabase.from('bureau_sticky_notes').delete().eq('user_id', userId);
      } catch {}
    }

    // 7. Clean up localStorage
    if (typeof window !== 'undefined') {
      // Filter users
      const usersRaw = localStorage.getItem('daily_bureau_users_v3');
      if (usersRaw) {
        try {
          const users = JSON.parse(usersRaw);
          const filtered = users.filter(
            (u: { id: string; email?: string }) =>
              u.id !== userId && (!cleanEmail || u.email?.toLowerCase().trim() !== cleanEmail)
          );
          localStorage.setItem('daily_bureau_users_v3', JSON.stringify(filtered));
        } catch {}
      }

      // Filter tasks
      const tasksRaw = localStorage.getItem('daily_bureau_tasks_v3');
      if (tasksRaw) {
        try {
          const tasks = JSON.parse(tasksRaw);
          const filteredTasks = tasks.filter((t: { assigneeId?: string; createdById?: string }) => {
            const matchAssignee = t.assigneeId === userId || (cleanEmail && t.assigneeId?.toLowerCase() === cleanEmail);
            const matchCreator = t.createdById === userId || (cleanEmail && t.createdById?.toLowerCase() === cleanEmail);
            return !matchAssignee && !matchCreator;
          });
          localStorage.setItem('daily_bureau_tasks_v3', JSON.stringify(filteredTasks));
        } catch {}
      }

      // Filter sticky notes
      const notesRaw = localStorage.getItem('daily_bureau_sticky_notes_v3');
      if (notesRaw) {
        try {
          const notes = JSON.parse(notesRaw);
          const filteredNotes = notes.filter((n: { userId: string }) => n.userId !== userId);
          localStorage.setItem('daily_bureau_sticky_notes_v3', JSON.stringify(filteredNotes));
        } catch {}
      }

      localStorage.removeItem(`bureau_desk_notes_${userId}`);

      // Clear current user if it's the deleted user
      const currentUserRaw = localStorage.getItem('daily_bureau_current_user_v3');
      if (currentUserRaw) {
        try {
          const cu = JSON.parse(currentUserRaw);
          if (cu.id === userId || (cleanEmail && cu.email?.toLowerCase().trim() === cleanEmail)) {
            localStorage.removeItem('daily_bureau_current_user_v3');
          }
        } catch {}
      }

      // Trigger global sync event
      window.dispatchEvent(new Event('daily_bureau_sync_event'));
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('deleteUserCompletely error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to delete user.';
    return { success: false, error: msg };
  }
}

