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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return fetchProfile(user);
}

// ── Fetch profile from `profiles` table ───────────────────────────────────
export async function fetchProfile(user: User): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!data) {
    // Profile might not exist yet — create it
    const isFirstUser = await checkFirstUser();
    const profile: Partial<SupabaseProfile> = {
      id: user.id as unknown as string,
      email: user.email!,
      name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
      avatar_url: user.user_metadata?.avatar_url ?? null,
      role: isFirstUser ? 'admin' : 'member',
    };
    await supabase.from('profiles').upsert(profile);
    return {
      id: user.id,
      email: user.email!,
      name: profile.name!,
      avatarUrl: profile.avatar_url ?? null,
      role: profile.role!,
    };
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name ?? data.email.split('@')[0],
    avatarUrl: data.avatar_url,
    role: data.role,
  };
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
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : '/auth/callback';

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
