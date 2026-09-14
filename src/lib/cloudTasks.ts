// Cloud Task Sync — powered by Supabase
// Reads/writes tasks and routines to the shared bureau_tasks table.
// Falls back gracefully when Supabase is not configured.
//
// Required Supabase table (run once in Supabase → SQL Editor):
//
//   create table if not exists bureau_tasks (
//     id                   text primary key,
//     order_number         int,
//     item_type            text not null default 'task',
//     title                text not null,
//     description          text,
//     assignee_id          text,
//     created_by_id        text,
//     created_by_username  text,
//     priority             text default 'routine',
//     status               text default 'pending',
//     category             text,
//     reminder_time        text,
//     last_notified_date   text,
//     estimated_hours      float,
//     spent_hours          float,
//     subtasks             jsonb default '[]',
//     due_date             text,
//     created_at           timestamptz default now(),
//     completed_at         timestamptz,
//     completed_by         text,
//     deleted_at           timestamptz,
//     deleted_by           text,
//     admin_signed_off     boolean default false,
//     admin_signed_at      timestamptz,
//     admin_signed_by      text,
//     admin_notes          text,
//     token_awarded        boolean default false,
//     tokens_earned        int default 0
//   );
//   alter table bureau_tasks enable row level security;
//   create policy "Allow all" on bureau_tasks for all using (true) with check (true);

import { supabase, isSupabaseConfigured } from './supabase';
import { Task } from '../types';

const TABLE = 'bureau_tasks';

// Map Supabase row → Task object
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id:                  row.id as string,
    orderNumber:         (row.order_number as number) ?? 1000,
    itemType:            (row.item_type as 'task' | 'routine') ?? 'task',
    title:               row.title as string,
    description:         (row.description as string) ?? '',
    assigneeId:          (row.assignee_id as string) ?? '',
    createdById:         (row.created_by_id as string) ?? '',
    createdByUsername:   (row.created_by_username as string) ?? '',
    priority:            (row.priority as 'routine' | 'urgent' | 'opus') ?? 'routine',
    status:              (row.status as 'pending' | 'in-progress' | 'completed' | 'deleted') ?? 'pending',
    category:            (row.category as string) ?? 'Atelier & Craft',
    reminderTime:        row.reminder_time as string | undefined,
    lastNotifiedDate:    row.last_notified_date as string | undefined,
    estimatedHours:      row.estimated_hours as number | undefined,
    spentHours:          row.spent_hours as number | undefined,
    subtasks:            (row.subtasks as Task['subtasks']) ?? [],
    dueDate:             (row.due_date as string) ?? '',
    createdAt:           (row.created_at as string) ?? new Date().toISOString(),
    completedAt:         row.completed_at as string | undefined,
    completedBy:         row.completed_by as string | undefined,
    deletedAt:           row.deleted_at as string | undefined,
    deletedBy:           row.deleted_by as string | undefined,
    adminSignedOff:      (row.admin_signed_off as boolean) ?? false,
    adminSignedAt:       row.admin_signed_at as string | undefined,
    adminSignedBy:       row.admin_signed_by as string | undefined,
    adminNotes:          row.admin_notes as string | undefined,
    tokenAwarded:        (row.token_awarded as boolean) ?? false,
    tokensEarned:        (row.tokens_earned as number) ?? 0,
  };
}

// Map Task object → Supabase row
function taskToRow(t: Task) {
  return {
    id:                  t.id,
    order_number:        t.orderNumber,
    item_type:           t.itemType,
    title:               t.title,
    description:         t.description ?? null,
    assignee_id:         t.assigneeId ?? null,
    created_by_id:       t.createdById ?? null,
    created_by_username: t.createdByUsername ?? null,
    priority:            t.priority,
    status:              t.status,
    category:            t.category ?? null,
    reminder_time:       t.reminderTime ?? null,
    last_notified_date:  t.lastNotifiedDate ?? null,
    estimated_hours:     t.estimatedHours ?? null,
    spent_hours:         t.spentHours ?? null,
    subtasks:            t.subtasks ?? [],
    due_date:            t.dueDate ?? null,
    created_at:          t.createdAt,
    completed_at:        t.completedAt ?? null,
    completed_by:        t.completedBy ?? null,
    deleted_at:          t.deletedAt ?? null,
    deleted_by:          t.deletedBy ?? null,
    admin_signed_off:    t.adminSignedOff ?? false,
    admin_signed_at:     t.adminSignedAt ?? null,
    admin_signed_by:     t.adminSignedBy ?? null,
    admin_notes:         t.adminNotes ?? null,
    token_awarded:       t.tokenAwarded ?? false,
    tokens_earned:       t.tokensEarned ?? 0,
  };
}

// ── Fetch all tasks for a specific user ───────────────────────────────────
export async function fetchCloudTasksForUser(userId: string): Promise<Task[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .or(`assignee_id.eq.${userId},created_by_id.eq.${userId}`)
      .order('order_number', { ascending: false });
    if (error) { console.warn('[Supabase] fetchCloudTasksForUser:', error.message); return null; }
    return (data ?? []).map(rowToTask);
  } catch (e) {
    console.warn('[Supabase] fetchCloudTasksForUser failed', e);
    return null;
  }
}

// ── Fetch ALL tasks (admin use) ───────────────────────────────────────────
export async function fetchAllCloudTasks(): Promise<Task[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('order_number', { ascending: false });
    if (error) { console.warn('[Supabase] fetchAllCloudTasks:', error.message); return null; }
    return (data ?? []).map(rowToTask);
  } catch (e) {
    console.warn('[Supabase] fetchAllCloudTasks failed', e);
    return null;
  }
}

// ── Upsert a single task ──────────────────────────────────────────────────
export async function pushCloudTask(task: Task): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { error } = await supabase.from(TABLE).upsert(taskToRow(task), { onConflict: 'id' });
    if (error) console.warn('[Supabase] pushCloudTask:', error.message);
  } catch (e) {
    console.warn('[Supabase] pushCloudTask failed', e);
  }
}

// ── Hard delete a task from Supabase ─────────────────────────────────────
export async function deleteCloudTask(taskId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', taskId);
    if (error) console.warn('[Supabase] deleteCloudTask:', error.message);
  } catch (e) {
    console.warn('[Supabase] deleteCloudTask failed', e);
  }
}

// ── Real-time subscription for a user's tasks ─────────────────────────────
export function subscribeCloudTasks(
  userId: string,
  callback: (tasks: Task[]) => void
): (() => void) | null {
  if (!isSupabaseConfigured || !supabase) return null;

  // Initial fetch
  fetchCloudTasksForUser(userId).then((tasks) => { if (tasks) callback(tasks); });

  const channel = supabase
    .channel(`bureau_tasks_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, async () => {
      const tasks = await fetchCloudTasksForUser(userId);
      if (tasks) callback(tasks);
    })
    .subscribe();

  return () => { supabase?.removeChannel(channel); };
}

export { isSupabaseConfigured };
