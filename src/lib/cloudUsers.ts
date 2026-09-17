// Cloud User Sync — powered by Supabase
// Reads/writes user accounts to a shared Supabase PostgreSQL table.
// Falls back to localStorage-only mode when Supabase is not configured.
//
// Required Supabase table (run this SQL in Supabase → SQL Editor):
//
//   create table if not exists bureau_users (
//     id           text primary key,
//     username     text unique not null,
//     password     text not null,
//     name         text not null,
//     role         text not null default 'member',
//     title        text,
//     department   text,
//     avatar       text,
//     desk_number  text,
//     signature    text,
//     created_at   timestamptz default now()
//   );
//   alter table bureau_users enable row level security;
//   create policy "Allow all" on bureau_users for all using (true) with check (true);

import { supabase, isSupabaseConfigured } from './supabase';
import { User } from '../types';

const TABLE = 'bureau_users';

// Map Supabase row → User object
function rowToUser(row: Record<string, unknown>): User {
  return {
    id:          row.id as string,
    username:    row.username as string,
    password:    row.password as string,
    name:        row.name as string,
    role:        (row.role as 'admin' | 'member') ?? 'member',
    title:       row.title as string | undefined,
    department:  row.department as string | undefined,
    avatar:      row.avatar as string | undefined,
    deskNumber:  row.desk_number as string | undefined,
    signature:   row.signature as string | undefined,
    createdAt:   row.created_at as string ?? new Date().toISOString(),
  };
}

// Map User object → Supabase row
function userToRow(u: User) {
  return {
    id:          u.id,
    username:    u.username,
    password:    u.password,
    name:        u.name,
    role:        u.role,
    title:       u.title ?? null,
    department:  u.department ?? null,
    avatar:      u.avatar ?? null,
    desk_number: u.deskNumber ?? null,
    signature:   u.signature ?? null,
    created_at:  u.createdAt,
  };
}

// ── Fetch all users ────────────────────────────────────────────────────────
export async function fetchCloudUsers(): Promise<User[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) { console.warn('[Supabase] fetchCloudUsers:', error.message); return null; }
    return (data ?? []).map(rowToUser);
  } catch (e) {
    console.warn('[Supabase] fetchCloudUsers failed', e);
    return null;
  }
}

// ── Upsert a single user ──────────────────────────────────────────────────
export async function pushSingleCloudUser(user: User): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const row = userToRow(user);
    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] pushSingleCloudUser:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] pushSingleCloudUser failed', e);
    return false;
  }
}

// ── Upsert all users (used when admin creates a user) ─────────────────────
export async function pushCloudUsers(users: User[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const rows = users.map(userToRow);
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[Supabase] pushCloudUsers:', error.message);
  } catch (e) {
    console.warn('[Supabase] pushCloudUsers failed', e);
  }
}

// ── Delete a user by ID ────────────────────────────────────────────────────
export async function deleteCloudUser(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', userId);
    if (error) console.warn('[Supabase] deleteCloudUser:', error.message);
  } catch (e) {
    console.warn('[Supabase] deleteCloudUser failed', e);
  }
}

// ── Subscribe to real-time user changes ───────────────────────────────────
export function subscribeCloudUsers(callback: (users: User[]) => void): (() => void) | null {
  if (!isSupabaseConfigured || !supabase) return null;

  // Initial fetch
  fetchCloudUsers().then((users) => { if (users) callback(users); });

  // Real-time subscription
  const channel = supabase
    .channel('bureau_users_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, async () => {
      const users = await fetchCloudUsers();
      if (users) callback(users);
    })
    .subscribe();

  return () => { supabase?.removeChannel(channel); };
}

// ── Ensure the default admin always exists in Supabase ────────────────────
// Purges legacy mock admin rows if present in Supabase table
export async function ensureAdminExists(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from(TABLE).delete().eq('id', 'usr-admin');
    await supabase.from(TABLE).delete().eq('username', 'admin');
  } catch (e) {
    console.warn('[Supabase] ensureAdminExists cleanup notice:', e);
  }
}

export { isSupabaseConfigured };
