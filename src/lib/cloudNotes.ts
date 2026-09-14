// Cloud Sticky Notes Sync — powered by Supabase
// Reads/writes sticky notes to the shared bureau_sticky_notes table.
// Falls back gracefully when Supabase is not configured.
//
// Required Supabase table (run once in Supabase → SQL Editor):
//
//   create table if not exists bureau_sticky_notes (
//     id         text primary key,
//     user_id    text not null,
//     content    text,
//     color      text default 'yellow',
//     pinned     boolean default false,
//     created_at timestamptz default now(),
//     updated_at timestamptz default now()
//   );
//   alter table bureau_sticky_notes enable row level security;
//   create policy "Allow all" on bureau_sticky_notes for all using (true) with check (true);

import { supabase, isSupabaseConfigured } from './supabase';
import { StickyNote, StickyColor } from '../types';

const TABLE = 'bureau_sticky_notes';

// Map Supabase row → StickyNote object
function rowToNote(row: Record<string, unknown>): StickyNote {
  return {
    id:        row.id as string,
    userId:    row.user_id as string,
    content:   (row.content as string) ?? '',
    color:     (row.color as StickyColor) ?? 'yellow',
    pinned:    (row.pinned as boolean) ?? false,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

// Map StickyNote object → Supabase row
function noteToRow(n: StickyNote) {
  return {
    id:         n.id,
    user_id:    n.userId,
    content:    n.content ?? null,
    color:      n.color,
    pinned:     n.pinned ?? false,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
  };
}

// ── Fetch all notes for a user ────────────────────────────────────────────
export async function fetchCloudNotes(userId: string): Promise<StickyNote[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) { console.warn('[Supabase] fetchCloudNotes:', error.message); return null; }
    return (data ?? []).map(rowToNote);
  } catch (e) {
    console.warn('[Supabase] fetchCloudNotes failed', e);
    return null;
  }
}

// ── Upsert a single note ──────────────────────────────────────────────────
export async function pushCloudNote(note: StickyNote): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { error } = await supabase.from(TABLE).upsert(noteToRow(note), { onConflict: 'id' });
    if (error) console.warn('[Supabase] pushCloudNote:', error.message);
  } catch (e) {
    console.warn('[Supabase] pushCloudNote failed', e);
  }
}

// ── Delete a note by ID ───────────────────────────────────────────────────
export async function deleteCloudNote(noteId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', noteId);
    if (error) console.warn('[Supabase] deleteCloudNote:', error.message);
  } catch (e) {
    console.warn('[Supabase] deleteCloudNote failed', e);
  }
}

// ── Real-time subscription for a user's notes ────────────────────────────
export function subscribeCloudNotes(
  userId: string,
  callback: (notes: StickyNote[]) => void
): (() => void) | null {
  if (!isSupabaseConfigured || !supabase) return null;

  // Initial fetch
  fetchCloudNotes(userId).then((notes) => { if (notes) callback(notes); });

  const channel = supabase
    .channel(`bureau_notes_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, async () => {
      const notes = await fetchCloudNotes(userId);
      if (notes) callback(notes);
    })
    .subscribe();

  return () => { supabase?.removeChannel(channel); };
}

export { isSupabaseConfigured };
