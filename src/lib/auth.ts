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
  try {
    // 1. Try local storage user profile first (instant, 0ms)
    const stored = localStorage.getItem('daily_bureau_current_user_v3');
    if (stored) {
      const u = JSON.parse(stored);
      if (u?.id && (u?.email || u?.username)) {
        const email = u.email || '';
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

// ── Get all users (admin only) ────────────────────────────────────────────
export async function getAllProfiles(): Promise<AuthUser[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at');
    if (error) {
      console.warn('[Supabase] getAllProfiles:', error.message);
      return [];
    }
    return (data ?? []).map((p: SupabaseProfile) => ({
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

  try {
    if (supabase) {
      // 1. Delete from profiles table in Supabase
      const { error: profileErr } = await supabase.from('profiles').delete().eq('id', userId);
      if (profileErr) console.warn('[Supabase] delete profile notice:', profileErr.message);

      if (userEmail) {
        await supabase.from('profiles').delete().eq('email', userEmail);
      }

      // 2. Delete from bureau_users table in Supabase
      await supabase.from('bureau_users').delete().eq('id', userId);

      // 3. Delete all tasks & routines belonging to or created by this user
      const taskOr = [`assignee_id.eq.${userId}`, `created_by_id.eq.${userId}`];
      if (userEmail) {
        taskOr.push(`assignee_id.eq.${userEmail}`);
        taskOr.push(`created_by_id.eq.${userEmail}`);
        const handle = userEmail.split('@')[0];
        if (handle) {
          taskOr.push(`assignee_id.eq.${handle}`);
          taskOr.push(`created_by_username.eq.${handle}`);
        }
      }
      await supabase.from('bureau_tasks').delete().or(taskOr.join(','));

      // 4. Delete user's sticky notes from Supabase
      await supabase.from('bureau_sticky_notes').delete().eq('user_id', userId);
    }

    // 5. Clean up localStorage
    if (typeof window !== 'undefined') {
      // Clean users list
      const usersRaw = localStorage.getItem('daily_bureau_users_v3');
      if (usersRaw) {
        try {
          const users = JSON.parse(usersRaw);
          const filtered = users.filter(
            (u: { id: string; email?: string }) =>
              u.id !== userId && (!userEmail || u.email?.toLowerCase() !== userEmail.toLowerCase())
          );
          localStorage.setItem('daily_bureau_users_v3', JSON.stringify(filtered));
        } catch {}
      }

      // Clean tasks list
      const tasksRaw = localStorage.getItem('daily_bureau_tasks_v3');
      if (tasksRaw) {
        try {
          const tasks = JSON.parse(tasksRaw);
          const filteredTasks = tasks.filter((t: { assigneeId?: string; createdById?: string }) => {
            const matchAssignee = t.assigneeId === userId || (userEmail && t.assigneeId === userEmail);
            const matchCreator = t.createdById === userId || (userEmail && t.createdById === userEmail);
            return !matchAssignee && !matchCreator;
          });
          localStorage.setItem('daily_bureau_tasks_v3', JSON.stringify(filteredTasks));
        } catch {}
      }

      // Clean sticky notes
      const notesRaw = localStorage.getItem('daily_bureau_sticky_notes_v3');
      if (notesRaw) {
        try {
          const notes = JSON.parse(notesRaw);
          const filteredNotes = notes.filter((n: { userId: string }) => n.userId !== userId);
          localStorage.setItem('daily_bureau_sticky_notes_v3', JSON.stringify(filteredNotes));
        } catch {}
      }

      // Clean desk notes
      localStorage.removeItem(`bureau_desk_notes_${userId}`);

      // Clear current user if it was this user
      const currentUserRaw = localStorage.getItem('daily_bureau_current_user_v3');
      if (currentUserRaw) {
        try {
          const cu = JSON.parse(currentUserRaw);
          if (cu.id === userId || (userEmail && cu.email?.toLowerCase() === userEmail.toLowerCase())) {
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
