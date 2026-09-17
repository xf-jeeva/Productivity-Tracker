// Auth helpers — Supabase Auth (Google OAuth)
// This replaces the old localStorage username/password system.

import { supabase, SupabaseProfile } from './supabase';
import { Session, User } from '@supabase/supabase-js';

export type AuthUser = {
  id: string;          // Supabase auth.uid()
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
};

// ── Get current session ────────────────────────────────────────────────────
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Get current auth user + their profile (role, name, etc.) ──────────────
export async function getAuthUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      return await fetchProfile(user);
    }
  } catch (e) {
    console.warn('getUser check notice, falling back to session:', e);
  }

  // Fallback to local session if getUser network call fails or is delayed
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return await fetchProfile(session.user);
    }
  } catch (e) {
    console.warn('getSession fallback error:', e);
  }

  return null;
}

// ── Fetch profile from `profiles` table (bulletproof fallback) ─────────────
export async function fetchProfile(user: User): Promise<AuthUser> {
  const email = user.email || '';
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (email ? email.split('@')[0] : 'Bureau Member');
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  const fallbackUser: AuthUser = {
    id: user.id,
    email,
    name,
    avatarUrl,
    role: 'member',
  };

  if (!supabase) return fallbackUser;

  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        email: data.email || fallbackUser.email,
        name: data.name || fallbackUser.name,
        avatarUrl: data.avatar_url ?? fallbackUser.avatarUrl,
        role: (data.role as 'admin' | 'member') || 'member',
      };
    }

    // If profile row doesn't exist yet, attempt to upsert
    const isFirstUser = await checkFirstUser().catch(() => false);
    const assignedRole: 'admin' | 'member' = isFirstUser ? 'admin' : 'member';
    fallbackUser.role = assignedRole;

    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: fallbackUser.email,
        name: fallbackUser.name,
        avatar_url: fallbackUser.avatarUrl,
        role: assignedRole,
      });
    } catch (upsertErr) {
      console.warn('Profile upsert note:', upsertErr);
    }

    return fallbackUser;
  } catch (err) {
    console.warn('Error reading profiles table, using auth fallback:', err);
    return fallbackUser;
  }
}

// ── Check if any admin exists yet ─────────────────────────────────────────
async function checkFirstUser(): Promise<boolean> {
  if (!supabase) return false;
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  return (count ?? 0) === 0;
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
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ── Listen to auth state changes ───────────────────────────────────────────
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const authUser = await fetchProfile(session.user);
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
  const { data } = await supabase.from('profiles').select('*').order('created_at');
  return (data ?? []).map((p: SupabaseProfile) => ({
    id: p.id,
    email: p.email,
    name: p.name ?? p.email.split('@')[0],
    avatarUrl: p.avatar_url,
    role: p.role,
  }));
}
