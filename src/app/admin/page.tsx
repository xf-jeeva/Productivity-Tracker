'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  getUsers, 
  getTasks, 
  deleteTask,
  restoreTask,
  permanentDeleteTask,
  rolloverDailyRoutines,
  updateTask,
  markTaskComplete,
  adminSignOff,
  BUREAU_SYNC_EVENT,
  getRewardClaims,
  updateRewardClaimStatus,
  getUserTokens,
  TOKEN_RUPEE_RATE,
  MIN_REDEEM_AMOUNT_RUPEES,
  MIN_REDEEM_TOKENS
} from '@/lib/storage';
import { getAllProfiles, isMasterAdmin, deleteUserCompletely } from '@/lib/auth';
import { fetchAllCloudTasks } from '@/lib/cloudTasks';
import { fetchCloudNotes } from '@/lib/cloudNotes';
import { supabase } from '@/lib/supabase';

import { User, Task, RewardClaim, StickyNote, ItemType } from '@/types';
import TaskModal from '@/components/TaskModal';
import { 
  playTypewriterClick, 
  playRubberStampSound, 
  playVintageBell,
  playCoinRewardFanfare 
} from '@/lib/sound';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Search, 
  Stamp, 
  Lock, 
  AlertCircle,
  Coins, 
  Gift, 
  CheckSquare, 
  BookOpen,
  FileText,
  Repeat,
  RotateCcw,
  Sparkles,
  BarChart3,
  Edit3,
  PlusCircle,
  UserX,
  ExternalLink
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  // ── Dashboard Data State (Instant synchronous initial state) ───────────────
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window === 'undefined') return [];
    return getUsers().filter(
      (u) => u.id !== 'usr-admin' && u.username?.toLowerCase() !== 'admin' && u.email?.toLowerCase() !== 'admin@dailybureau.org'
    );
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === 'undefined') return [];
    return getTasks();
  });
  const [rewardClaims, setRewardClaims] = useState<RewardClaim[]>(() => {
    if (typeof window === 'undefined') return [];
    return getRewardClaims();
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const initial = getUsers().filter(
      (u) => u.id !== 'usr-admin' && u.username?.toLowerCase() !== 'admin' && u.email?.toLowerCase() !== 'admin@dailybureau.org'
    );
    return initial.find((u) => isMasterAdmin(u.email)) || initial[0] || null;
  });

  // User inspection view: 'tasks' | 'routines' | 'completed' | 'deleted' | 'notes'
  const [userTab, setUserTab] = useState<'tasks' | 'routines' | 'completed' | 'deleted' | 'notes'>('tasks');
  const [inspectNotes, setInspectNotes] = useState<string>('');
  const [inspectStickyNotes, setInspectStickyNotes] = useState<StickyNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);

  // Global Ledger filter & search
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'task' | 'routine' | 'pending' | 'completed' | 'deleted'>('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Task edit / assign modal state
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<ItemType>('task');
  const [modalAssigneeId, setModalAssigneeId] = useState<string | undefined>(undefined);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  // ── Master data synchronization ───────────────────────────────────────────
  const syncData = async () => {
    rolloverDailyRoutines();
    const rawLocalUsers = getUsers();
    const localUsers = rawLocalUsers.filter(
      (u) => u.id !== 'usr-admin' && u.username?.toLowerCase() !== 'admin' && u.email?.toLowerCase() !== 'admin@dailybureau.org'
    );
    setUsers(localUsers);
    setTasks(getTasks());
    setRewardClaims(getRewardClaims());

    try {
      const [cloudProfiles, cloudTasks] = await Promise.all([
        getAllProfiles(),
        fetchAllCloudTasks(),
      ]);

      if (cloudProfiles && cloudProfiles.length > 0) {
        const validProfiles = cloudProfiles.filter(
          (p) => p.id !== 'usr-admin' && p.email?.toLowerCase() !== 'admin@dailybureau.org'
        );
        const profileIds = new Set(validProfiles.map((p) => p.id));
        const profileEmails = new Set(validProfiles.map((p) => p.email.toLowerCase()));

        const formattedUsers: User[] = validProfiles.map((p) => {
          const username = p.email ? p.email.split('@')[0] : p.id;
          const existing = localUsers.find(
            (u) => u.id === p.id || u.username.toLowerCase() === username.toLowerCase()
          );
          const isAdminUser = isMasterAdmin(p.email);
          return {
            id: p.id,
            username: existing?.username || username,
            password: '',
            name: p.name || username,
            email: p.email,
            role: isAdminUser ? 'admin' : 'member',
            avatar: p.avatarUrl || existing?.avatar,
            title: existing?.title || (isAdminUser ? 'Administrator' : 'Team Member'),
            department: existing?.department || 'Operations',
            deskNumber: existing?.deskNumber || `Desk ${p.id.slice(0, 4).toUpperCase()}`,
            createdAt: existing?.createdAt || new Date().toISOString(),
          };
        });

        const merged = [
          ...formattedUsers,
          ...localUsers.filter(
            (u) => !profileIds.has(u.id) && (!u.email || !profileEmails.has(u.email.toLowerCase()))
          ),
        ];
        setUsers(merged);

        setSelectedUser((prev) => {
          if (prev && merged.some((u) => u.id === prev.id)) return prev;
          const masterAdminUser = merged.find((u) => isMasterAdmin(u.email));
          return masterAdminUser || merged[0] || null;
        });
      }

      if (cloudTasks && cloudTasks.length > 0) {
        const localTasks = getTasks();
        const mergedMap = new Map<string, Task>();
        for (const ct of cloudTasks) {
          mergedMap.set(ct.id, ct);
        }
        for (const lt of localTasks) {
          if (!mergedMap.has(lt.id)) {
            mergedMap.set(lt.id, lt);
          } else {
            const ct = mergedMap.get(lt.id)!;
            if (ct.status === 'deleted') {
              mergedMap.set(ct.id, ct);
            } else if (lt.status === 'deleted') {
              mergedMap.set(lt.id, lt);
            } else if (ct.status === 'completed') {
              mergedMap.set(ct.id, ct);
            } else if (lt.status === 'completed') {
              mergedMap.set(lt.id, lt);
            } else {
              mergedMap.set(ct.id, ct);
            }
          }
        }
        const mergedTasks = Array.from(mergedMap.values()).sort(
          (a, b) => (b.orderNumber || 0) - (a.orderNumber || 0)
        );
        setTasks(mergedTasks);
        if (typeof window !== 'undefined') {
          localStorage.setItem('daily_bureau_tasks_v3', JSON.stringify(mergedTasks));
        }
      }
    } catch (err) {
      console.warn('Admin cloud sync note:', err);
    }
  };

  useEffect(() => {
    if (!authUser || !isMasterAdmin(authUser.email)) return;
    syncData();
    window.addEventListener(BUREAU_SYNC_EVENT, syncData);

    // Realtime subscription on bureau_tasks to instantly reflect all user moves
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('admin_live_task_watch')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bureau_tasks' }, () => {
          syncData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          syncData();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener(BUREAU_SYNC_EVENT, syncData);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [authUser]);

  // ── Fetch selected user's notes whenever inspector targets a user ─────────
  useEffect(() => {
    if (!selectedUser) return;
    setIsLoadingNotes(true);

    if (typeof window !== 'undefined') {
      const notes = localStorage.getItem(`bureau_desk_notes_${selectedUser.id}`);
      setInspectNotes(notes || '');
    }

    fetchCloudNotes(selectedUser.id)
      .then((notes) => {
        setInspectStickyNotes(notes || []);
        setIsLoadingNotes(false);
      })
      .catch(() => setIsLoadingNotes(false));
  }, [selectedUser]);

  // ── Reward Claim Management ───────────────────────────────────────────────
  const handleApproveClaim = (claimId: string) => {
    playRubberStampSound();
    setTimeout(() => playCoinRewardFanfare(), 120);
    updateRewardClaimStatus(claimId, 'approved', 'Approved and disbursed by Administrator.', authUser?.email || 'admin');
    syncData();
  };

  const handleRejectClaim = (claimId: string) => {
    playTypewriterClick();
    updateRewardClaimStatus(claimId, 'rejected', 'Claim rejected; tokens refunded to member.', authUser?.email || 'admin');
    syncData();
  };

  // ── Admin Sign-Off on Task ────────────────────────────────────────────────
  const handleAdminSignOff = (task: Task) => {
    playRubberStampSound();
    updateTask(task.id, {
      adminSignedOff: true,
      adminSignedAt: new Date().toISOString(),
      adminSignedBy: authUser?.name || 'Administrator',
      status: 'completed',
    });
    syncData();
  };

  // ── Task Management Actions ───────────────────────────────────────────────
  const handleOpenAssignTask = (targetAssigneeId?: string) => {
    playTypewriterClick();
    setTaskToEdit(null);
    setModalDefaultType('task');
    setModalAssigneeId(targetAssigneeId || selectedUser?.id);
    setIsTaskModalOpen(true);
  };

  const handleOpenAssignRoutine = (targetAssigneeId?: string) => {
    playTypewriterClick();
    setTaskToEdit(null);
    setModalDefaultType('routine');
    setModalAssigneeId(targetAssigneeId || selectedUser?.id);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (item: Task) => {
    playTypewriterClick();
    setTaskToEdit(item);
    setModalDefaultType(item.itemType || 'task');
    setModalAssigneeId(item.assigneeId || selectedUser?.id);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = (item: Task) => {
    const isRoutine = item.itemType === 'routine';
    const confirmed = window.confirm(
      `Delete ${isRoutine ? 'routine' : 'task'} #${item.orderNumber} "${item.title}"?`
    );
    if (!confirmed) return;
    playTypewriterClick();
    deleteTask(item.id, authUser?.email || 'admin');
    syncData();
  };

  const handlePermanentDeleteTask = (item: Task) => {
    const isRoutine = item.itemType === 'routine';
    const confirmed = window.confirm(
      `Permanently purge ${isRoutine ? 'routine' : 'task'} #${item.orderNumber} "${item.title}" from the database? This cannot be undone.`
    );
    if (!confirmed) return;
    playTypewriterClick();
    permanentDeleteTask(item.id);
    syncData();
  };

  // ── User Deletion Action (Deletes user + all tasks from DB & Local) ────────
  const handleDeleteUser = async (targetUser: User) => {
    if (isMasterAdmin(targetUser.email)) {
      alert('The Master Administrator account cannot be deleted.');
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete user "${targetUser.name}" (${targetUser.email || targetUser.username})?\n\n` +
      `⚠️ WARNING: This will permanently remove the user, all their daily tasks, all their routines, and all notes from the Supabase database.`
    );
    if (!confirmed) return;

    playTypewriterClick();
    setIsDeletingUser(true);
    const result = await deleteUserCompletely(targetUser.id, targetUser.email);
    setIsDeletingUser(false);

    if (result.success) {
      playVintageBell();
      const remaining = users.filter((u) => u.id !== targetUser.id);
      setUsers(remaining);
      setSelectedUser(remaining.find((u) => isMasterAdmin(u.email)) || remaining[0] || null);
      syncData();
      alert(`User "${targetUser.name}" and all their tasks were permanently removed from the database.`);
    } else {
      alert(`Error deleting user: ${result.error}`);
    }
  };

  const isReminderDueNow = (t: Task) => {
    if (!t.reminderTime || t.status === 'completed' || t.status === 'deleted') return false;
    const parts = t.reminderTime.split(':');
    if (parts.length < 2) return false;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return false;
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    return currentMin >= h * 60 + m;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. AUTHENTICATION GUARDS
  // ═══════════════════════════════════════════════════════════════════════════
  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <img
          src="/bureau_crest.jpg"
          alt="Daily Bureau"
          style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--brass-gold)', opacity: 0.8 }}
        />
        <div className="typewriter-text" style={{ fontSize: '0.84rem', color: 'var(--ink-secondary)', letterSpacing: '0.12em', fontWeight: 700 }}>
          VERIFYING ADMIN ACCESS...
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div style={{ maxWidth: '440px', margin: '3.5rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <div
          className="vintage-paper"
          style={{
            padding: '2.5rem 2.25rem',
            borderTop: '5px solid var(--stamp-red)',
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--paper-shadow-lg)',
          }}
        >
          <img
            src="/bureau_crest.jpg"
            alt="Daily Bureau"
            style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid var(--brass-gold)', margin: '0 auto 1.25rem', display: 'block' }}
          />
          <div
            className="typewriter-text"
            style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--stamp-red)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem' }}
          >
            AUTHENTICATION REQUIRED
          </div>
          <h2 className="serif-display" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink-primary)', marginBottom: '0.75rem' }}>
            Not Signed In
          </h2>
          <p style={{ fontSize: '0.83rem', color: 'var(--ink-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            You must be signed in with Google as an administrator to access the admin dashboard.
          </p>
          <Link
            href="/login"
            className="btn-brass"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', textDecoration: 'none' }}
          >
            <span>Sign In with Google</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!isMasterAdmin(authUser.email)) {
    return (
      <div style={{ maxWidth: '480px', margin: '3.5rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <div
          className="vintage-paper"
          style={{
            padding: '2.5rem 2.25rem',
            borderTop: '5px solid var(--stamp-red)',
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--paper-shadow-lg)',
          }}
        >
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
            <img
              src="/bureau_crest.jpg"
              alt="Daily Bureau"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: '2.5px solid var(--stamp-red)',
                objectFit: 'cover',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                backgroundColor: 'var(--stamp-red)',
                color: 'white',
                borderRadius: '50%',
                padding: '4px',
                border: '2px solid white',
              }}
            >
              <Lock size={12} />
            </div>
          </div>

          <div
            className="typewriter-text"
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--stamp-red)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '0.35rem',
            }}
          >
            RESTRICTED ACCESS • ADMINISTRATORS ONLY
          </div>
          <h2
            className="serif-display"
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '0.75rem',
              color: 'var(--ink-primary)',
            }}
          >
            Access Denied
          </h2>
          <div
            style={{
              backgroundColor: 'var(--stamp-red-bg)',
              border: '1px solid var(--stamp-red)',
              borderRadius: '4px',
              padding: '0.85rem 1rem',
              marginBottom: '1.75rem',
              textAlign: 'left',
              fontSize: '0.82rem',
              color: 'var(--stamp-red)',
              lineHeight: 1.55,
            }}
          >
            <strong>Administrator Access Only:</strong> This dashboard is restricted to the administrator (<strong>freefirejeeva2810@gmail.com</strong>). Your signed-in account (<code>{authUser.email}</code>) does not have administrator privileges.
          </div>

          <div>
            <Link
              href="/"
              className="btn-parchment"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.82rem',
                textDecoration: 'none',
              }}
            >
              <span>← Return to My Tasks</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. UNLOCKED ADMIN DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  // Filter tasks for selected user in the inspector (comprehensive matching)
  const userItems = selectedUser
    ? tasks.filter((t) => {
        const uid = selectedUser.id?.toLowerCase();
        const uemail = selectedUser.email?.toLowerCase();
        const uname = selectedUser.name?.toLowerCase();
        const uusername = selectedUser.username?.toLowerCase();
        const uhandle = uemail?.split('@')[0]?.toLowerCase();

        const tAssignee = t.assigneeId?.toLowerCase();
        const tCreator = t.createdById?.toLowerCase();
        const tUsername = t.createdByUsername?.toLowerCase();
        const tDeletedBy = t.deletedBy?.toLowerCase();

        if (uid && (tAssignee === uid || tCreator === uid || tDeletedBy === uid)) return true;
        if (uemail && (tAssignee === uemail || tCreator === uemail || tUsername === uemail || tDeletedBy === uemail)) return true;
        if (uusername && (tAssignee === uusername || tCreator === uusername || tUsername === uusername || tDeletedBy === uusername)) return true;
        if (uhandle && (tAssignee === uhandle || tCreator === uhandle || tUsername === uhandle || tDeletedBy === uhandle)) return true;
        if (uname && (tAssignee === uname || tCreator === uname || tUsername === uname || tDeletedBy === uname)) return true;

        if ((!t.assigneeId || t.assigneeId === 'usr-default') && (!t.createdById || t.createdById === 'usr-default') && users[0]?.id === selectedUser.id) {
          return true;
        }

        return false;
      })
    : [];

  const userTasksOnly = userItems.filter((t) => (t.itemType || 'task') === 'task' && t.status !== 'deleted');
  const userRoutinesOnly = userItems.filter((t) => t.itemType === 'routine' && t.status !== 'deleted');

  const userPendingTasks = userTasksOnly.filter((t) => t.status === 'pending' || t.status === 'in-progress');
  const userCompletedTasks = userTasksOnly.filter((t) => t.status === 'completed');
  const userCompletedRoutines = userRoutinesOnly.filter((t) => t.status === 'completed');
  const userCompletedAll = userItems.filter((t) => t.status === 'completed');
  const userDeletedTasks = userItems.filter((t) => t.status === 'deleted');

  const nonDeletedItems = userItems.filter((t) => t.status !== 'deleted');
  const userCompletionRate = nonDeletedItems.length > 0
    ? Math.round((userCompletedAll.length / nonDeletedItems.length) * 100)
    : 0;

  // Global Ledger Filtering
  const globalFiltered = tasks.filter((t) => {
    if (ledgerFilter === 'task' && t.itemType === 'routine') return false;
    if (ledgerFilter === 'routine' && t.itemType !== 'routine') return false;
    if (ledgerFilter === 'pending' && (t.status === 'completed' || t.status === 'deleted')) return false;
    if (ledgerFilter === 'completed' && t.status !== 'completed') return false;
    if (ledgerFilter === 'deleted' && t.status !== 'deleted') return false;
    if (ledgerFilter !== 'deleted' && ledgerFilter !== 'all' && t.status === 'deleted') return false;

    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchOrder = t.orderNumber.toString().includes(q);
      const matchCat = t.category?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchOrder || matchCat;
    }
    return true;
  });

  const totalAllTasks = tasks.filter((t) => (t.itemType || 'task') === 'task' && t.status !== 'deleted');
  const totalAllCompleted = tasks.filter((t) => t.status === 'completed');
  const totalAllRoutines = tasks.filter((t) => t.itemType === 'routine' && t.status !== 'deleted');
  const totalNonDeleted = tasks.filter((t) => t.status !== 'deleted');
  const globalCompletionRate = totalNonDeleted.length > 0
    ? Math.round((totalAllCompleted.length / totalNonDeleted.length) * 100)
    : 0;

  const pendingClaims = rewardClaims.filter((c) => c.status === 'pending');

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          borderTop: '5px solid var(--stamp-red)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div
          className="masthead-responsive"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: '2px solid var(--stamp-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--stamp-red-bg)',
                color: 'var(--stamp-red)',
                boxShadow: 'var(--paper-shadow)',
              }}
            >
              <ShieldCheck size={28} />
            </div>
            <div>
              <div
                className="typewriter-text"
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--stamp-red)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                ADMIN ACCESS • DASHBOARD & CONTROLS
              </div>
              <h2
                className="serif-display"
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: 'var(--ink-primary)',
                  lineHeight: 1.15,
                }}
              >
                Admin Dashboard & Team Management
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
                Assign tasks, schedule daily routines, delete users, and manage team workflows.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="masthead-actions-responsive" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleOpenAssignTask()}
              className="btn-brass"
              style={{ padding: '0.55rem 0.95rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <PlusCircle size={15} />
              <span>+ Assign Task</span>
            </button>

            <button
              onClick={() => handleOpenAssignRoutine()}
              className="btn-parchment"
              style={{ padding: '0.55rem 0.95rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Repeat size={15} style={{ color: '#8b5cf6' }} />
              <span>+ Assign Routine</span>
            </button>

            <Link
              href="/"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="Return to My Tasks"
            >
              <CheckSquare size={14} style={{ color: 'var(--brass-gold)' }} />
              <span>My Tasks</span>
            </Link>

            <Link
              href="/team"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="Team Members"
            >
              <Users size={14} style={{ color: 'var(--ink-secondary)' }} />
              <span>Team</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Global Metrics Bar ───────────────────────────────────────────── */}
      <div className="metrics-grid-responsive">
        {/* Total Users */}
        <div className="vintage-paper" style={{ padding: '1rem', borderLeft: '4px solid var(--brass-gold)', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Team Members
            </span>
            <Users size={18} style={{ color: 'var(--brass-gold)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--ink-primary)' }}>
            {users.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
            Synced with cloud database
          </div>
        </div>

        {/* Daily Tasks */}
        <div className="vintage-paper" style={{ padding: '1rem', borderLeft: '4px solid var(--stamp-blue)', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Daily Tasks
            </span>
            <CheckSquare size={18} style={{ color: 'var(--stamp-blue)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--ink-primary)' }}>
            {totalAllTasks.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
            {totalAllCompleted.length} completed • {totalAllTasks.length - totalAllCompleted.length} pending
          </div>
        </div>

        {/* Daily Routines */}
        <div className="vintage-paper" style={{ padding: '1rem', borderLeft: '4px solid #8b5cf6', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Daily Routines
            </span>
            <Repeat size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--ink-primary)' }}>
            {totalAllRoutines.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
            Recurring scheduled checklists
          </div>
        </div>

        {/* Completion Rate */}
        <div className="vintage-paper" style={{ padding: '1rem', borderLeft: '4px solid var(--stamp-green)', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Completion Rate
            </span>
            <BarChart3 size={18} style={{ color: 'var(--stamp-green)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--stamp-green)' }}>
            {globalCompletionRate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
            Overall task completion rate
          </div>
        </div>

        {/* Reward Claims */}
        <div className="vintage-paper" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Reward Claims
            </span>
            <Coins size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: pendingClaims.length > 0 ? 'var(--stamp-red)' : 'var(--ink-primary)' }}>
            {pendingClaims.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
            {pendingClaims.length > 0 ? 'Claims pending approval' : 'All claims reviewed'}
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Team Members Selector + User Inspector ──── */}
      <div className="admin-two-col-layout">
        
        {/* ── LEFT COLUMN: Team Members List ──────────────────────────────── */}
        <div
          className="vintage-paper"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--bg-card)',
            borderTop: '4px solid var(--brass-gold)',
            height: 'fit-content',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="serif-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
              Team Members
            </h3>
            <span className="typewriter-text" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', backgroundColor: 'var(--bg-parchment)', borderRadius: '3px', fontWeight: 700 }}>
              {users.length} Members
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
            Select a member below to inspect tasks, assign work, or manage their account.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto' }}>
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              const userTasks = tasks.filter((t) => {
                const uid = u.id?.toLowerCase();
                const uemail = u.email?.toLowerCase();
                const uname = u.name?.toLowerCase();
                const uusername = u.username?.toLowerCase();
                const uhandle = uemail?.split('@')[0]?.toLowerCase();

                const tAssignee = t.assigneeId?.toLowerCase();
                const tCreator = t.createdById?.toLowerCase();
                const tUsername = t.createdByUsername?.toLowerCase();
                const tDeletedBy = t.deletedBy?.toLowerCase();

                if (uid && (tAssignee === uid || tCreator === uid || tDeletedBy === uid)) return true;
                if (uemail && (tAssignee === uemail || tCreator === uemail || tUsername === uemail || tDeletedBy === uemail)) return true;
                if (uusername && (tAssignee === uusername || tCreator === uusername || tUsername === uusername || tDeletedBy === uusername)) return true;
                if (uhandle && (tAssignee === uhandle || tCreator === uhandle || tUsername === uhandle || tDeletedBy === uhandle)) return true;
                if (uname && (tAssignee === uname || tCreator === uname || tUsername === uname || tDeletedBy === uname)) return true;

                if ((!t.assigneeId || t.assigneeId === 'usr-default') && (!t.createdById || t.createdById === 'usr-default') && users[0]?.id === u.id) {
                  return true;
                }

                return false;
              });
              const pendingCount = userTasks.filter((t) => t.status === 'pending' || t.status === 'in-progress').length;
              const completedCount = userTasks.filter((t) => t.status === 'completed').length;
              const deletedCount = userTasks.filter((t) => t.status === 'deleted').length;

              return (
                <div
                  key={u.id}
                  onClick={() => {
                    playTypewriterClick();
                    setSelectedUser(u);
                  }}
                  style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: '4px',
                    border: isSelected ? '2px solid var(--brass-gold)' : '1px solid var(--border-sepia)',
                    backgroundColor: isSelected ? 'var(--bg-parchment)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                      alt={u.name}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '1.5px solid var(--border-sepia)',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.name}
                        </div>
                        {isMasterAdmin(u.email) && (
                          <span style={{ fontSize: '0.62rem', padding: '0.05rem 0.35rem', backgroundColor: 'var(--stamp-red-bg)', color: 'var(--stamp-red)', borderRadius: '2px', fontWeight: 700 }}>
                            Admin
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email || `@${u.username}`}
                      </div>
                    </div>
                  </div>

                  {/* Task counts summary */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed var(--border-sepia)', fontSize: '0.7rem' }}>
                    <span style={{ color: pendingCount > 0 ? 'var(--stamp-red)' : 'var(--ink-muted)', fontWeight: pendingCount > 0 ? 700 : 400 }}>
                      {pendingCount} active
                    </span>
                    <span style={{ color: 'var(--ink-faint)' }}>•</span>
                    <span style={{ color: 'var(--stamp-green)' }}>
                      {completedCount} done
                    </span>
                    {deletedCount > 0 && (
                      <>
                        <span style={{ color: 'var(--ink-faint)' }}>•</span>
                        <span style={{ color: 'var(--ink-muted)' }}>
                          {deletedCount} deleted
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Detailed User Inspector & Management ─────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedUser ? (
            <div
              className="vintage-paper"
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-card)',
                borderTop: '4px solid var(--brass-gold)',
              }}
            >
              {/* User Header with Quick Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-sepia)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={selectedUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={selectedUser.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      border: '2px solid var(--brass-gold)',
                      objectFit: 'cover',
                      boxShadow: 'var(--paper-shadow)',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 className="serif-display" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--ink-primary)' }}>
                        {selectedUser.name}
                      </h3>
                      <span
                        className="typewriter-text"
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '3px',
                          backgroundColor: isMasterAdmin(selectedUser.email) ? 'var(--stamp-red-bg)' : 'var(--stamp-blue-bg)',
                          color: isMasterAdmin(selectedUser.email) ? 'var(--stamp-red)' : 'var(--stamp-blue)',
                          border: '1px solid var(--border-sepia)',
                        }}
                      >
                        {isMasterAdmin(selectedUser.email) ? '★ Master Administrator' : 'Team Member'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
                      {selectedUser.email} • ID: <span className="typewriter-text" style={{ fontSize: '0.72rem' }}>{selectedUser.id}</span>
                    </div>
                  </div>
                </div>

                {/* Actions & Metrics */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {/* Assign buttons */}
                  <button
                    onClick={() => handleOpenAssignTask(selectedUser.id)}
                    className="btn-brass"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Assign a new daily task to this user"
                  >
                    <PlusCircle size={14} />
                    <span>Assign Task</span>
                  </button>

                  <button
                    onClick={() => handleOpenAssignRoutine(selectedUser.id)}
                    className="btn-parchment"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Schedule a daily recurring routine for this user"
                  >
                    <Repeat size={14} style={{ color: '#8b5cf6' }} />
                    <span>Assign Routine</span>
                  </button>

                  {/* Delete User Button (disabled for master admin) */}
                  {!isMasterAdmin(selectedUser.email) && (
                    <button
                      onClick={() => handleDeleteUser(selectedUser)}
                      disabled={isDeletingUser}
                      className="btn-parchment"
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--stamp-red)',
                        borderColor: 'var(--stamp-red)',
                        backgroundColor: 'var(--stamp-red-bg)',
                        cursor: isDeletingUser ? 'not-allowed' : 'pointer',
                      }}
                      title="Permanently delete user and their tasks from the database"
                    >
                      <UserX size={14} />
                      <span>{isDeletingUser ? 'Deleting...' : 'Delete User'}</span>
                    </button>
                  )}

                  {/* Velocity badge */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-parchment)',
                      border: '1px solid var(--border-sepia)',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '4px',
                      textAlign: 'right',
                    }}
                  >
                    <div className="typewriter-text" style={{ fontSize: '0.62rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                      Completion Rate
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: userCompletionRate > 60 ? 'var(--stamp-green)' : 'var(--ink-primary)' }}>
                      {userCompletionRate}% <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--ink-muted)' }}>({userCompletedAll.length}/{nonDeletedItems.length})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspector Navigation Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  borderBottom: '2px solid var(--border-sepia)',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => {
                    playTypewriterClick();
                    setUserTab('tasks');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: userTab === 'tasks' ? 700 : 500,
                    color: userTab === 'tasks' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                    backgroundColor: userTab === 'tasks' ? 'var(--bg-parchment)' : 'transparent',
                    border: 'none',
                    borderBottom: userTab === 'tasks' ? '3px solid var(--brass-gold)' : '3px solid transparent',
                    cursor: 'pointer',
                    borderRadius: '4px 4px 0 0',
                  }}
                >
                  <CheckSquare size={15} style={{ color: 'var(--stamp-blue)' }} />
                  <span>Daily Tasks ({userTasksOnly.length})</span>
                  {userPendingTasks.length > 0 && (
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '10px', backgroundColor: 'var(--stamp-red-bg)', color: 'var(--stamp-red)', fontWeight: 700 }}>
                      {userPendingTasks.length} pending
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    playTypewriterClick();
                    setUserTab('routines');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: userTab === 'routines' ? 700 : 500,
                    color: userTab === 'routines' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                    backgroundColor: userTab === 'routines' ? 'var(--bg-parchment)' : 'transparent',
                    border: 'none',
                    borderBottom: userTab === 'routines' ? '3px solid var(--brass-gold)' : '3px solid transparent',
                    cursor: 'pointer',
                    borderRadius: '4px 4px 0 0',
                  }}
                >
                  <Repeat size={15} style={{ color: '#8b5cf6' }} />
                  <span>Daily Routines ({userRoutinesOnly.length})</span>
                </button>

                <button
                  onClick={() => {
                    playTypewriterClick();
                    setUserTab('completed');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: userTab === 'completed' ? 700 : 500,
                    color: userTab === 'completed' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                    backgroundColor: userTab === 'completed' ? 'var(--bg-parchment)' : 'transparent',
                    border: 'none',
                    borderBottom: userTab === 'completed' ? '3px solid var(--stamp-green)' : '3px solid transparent',
                    cursor: 'pointer',
                    borderRadius: '4px 4px 0 0',
                  }}
                >
                  <CheckCircle2 size={15} style={{ color: 'var(--stamp-green)' }} />
                  <span>Completed Tasks ({userCompletedAll.length})</span>
                </button>

                <button
                  onClick={() => {
                    playTypewriterClick();
                    setUserTab('deleted');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: userTab === 'deleted' ? 700 : 500,
                    color: userTab === 'deleted' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                    backgroundColor: userTab === 'deleted' ? 'var(--bg-parchment)' : 'transparent',
                    border: 'none',
                    borderBottom: userTab === 'deleted' ? '3px solid var(--stamp-red)' : '3px solid transparent',
                    cursor: 'pointer',
                    borderRadius: '4px 4px 0 0',
                  }}
                >
                  <Trash2 size={15} style={{ color: 'var(--stamp-red)' }} />
                  <span>Deleted Archive ({userDeletedTasks.length})</span>
                </button>

                <button
                  onClick={() => {
                    playTypewriterClick();
                    setUserTab('notes');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: userTab === 'notes' ? 700 : 500,
                    color: userTab === 'notes' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                    backgroundColor: userTab === 'notes' ? 'var(--bg-parchment)' : 'transparent',
                    border: 'none',
                    borderBottom: userTab === 'notes' ? '3px solid var(--brass-gold)' : '3px solid transparent',
                    cursor: 'pointer',
                    borderRadius: '4px 4px 0 0',
                  }}
                >
                  <FileText size={15} style={{ color: '#f59e0b' }} />
                  <span>Personal Notes</span>
                </button>
              </div>

              {/* ── TAB 1: Daily Tasks List ── */}
              {userTab === 'tasks' && (
                <div>
                  {userTasksOnly.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
                      <CheckSquare size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <p style={{ fontSize: '0.85rem' }}>No daily tasks logged for this member yet.</p>
                      <button
                        onClick={() => handleOpenAssignTask(selectedUser.id)}
                        className="btn-brass"
                        style={{ marginTop: '0.75rem', padding: '0.45rem 0.95rem', fontSize: '0.78rem' }}
                      >
                        + Assign First Task
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {userTasksOnly.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            padding: '0.85rem 1rem',
                            backgroundColor: 'var(--bg-parchment)',
                            border: '1px solid var(--border-sepia)',
                            borderLeft: t.status === 'completed'
                              ? '4px solid var(--stamp-green)'
                              : t.priority === 'opus'
                              ? '4px solid #8b5cf6'
                              : t.priority === 'urgent'
                              ? '4px solid var(--stamp-red)'
                              : '4px solid var(--stamp-blue)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ minWidth: '220px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <span className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--brass-dark)', fontWeight: 700 }}>
                                #{t.orderNumber}
                              </span>
                              <span
                                className="typewriter-text"
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '2px',
                                  backgroundColor: t.priority === 'opus' ? '#f3e8ff' : t.priority === 'urgent' ? 'var(--stamp-red-bg)' : 'var(--bg-card)',
                                  color: t.priority === 'opus' ? '#7c3aed' : t.priority === 'urgent' ? 'var(--stamp-red)' : 'var(--ink-secondary)',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {t.priority === 'opus' ? 'High' : t.priority === 'urgent' ? 'Urgent' : 'Normal'}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                                Due: {t.dueDate || 'Today'}
                              </span>
                              {t.reminderTime && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: isReminderDueNow(t) ? 'var(--stamp-red)' : 'var(--brass-dark)',
                                    fontWeight: isReminderDueNow(t) ? 700 : 500,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.05rem 0.35rem',
                                    borderRadius: '2px',
                                    backgroundColor: isReminderDueNow(t) ? 'var(--stamp-red-bg)' : 'var(--bg-card)',
                                    border: isReminderDueNow(t) ? '1px solid var(--stamp-red)' : '1px solid var(--border-sepia)',
                                  }}
                                >
                                  <Clock size={11} />
                                  {t.reminderTime} {isReminderDueNow(t) ? '• TIME HIT / DUE' : '• REMINDER'}
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink-primary)', textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>
                              {t.title}
                            </div>

                            {t.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                                {t.description}
                              </div>
                            )}

                            {t.subtasks && t.subtasks.length > 0 && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: '0.35rem' }}>
                                Subtasks: {t.subtasks.filter((s) => s.completed).length} of {t.subtasks.length} completed
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                              className="typewriter-text"
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.65rem',
                                borderRadius: '3px',
                                backgroundColor: t.status === 'completed' ? 'var(--stamp-green-bg)' : 'var(--bg-card)',
                                color: t.status === 'completed' ? 'var(--stamp-green)' : 'var(--ink-primary)',
                                border: '1px solid var(--border-sepia)',
                              }}
                            >
                              {t.status === 'completed' ? 'COMPLETED' : t.status === 'in-progress' ? 'IN PROGRESS' : 'PENDING'}
                            </span>

                            {t.status !== 'completed' && (
                              <button
                                onClick={() => handleAdminSignOff(t)}
                                className="btn-parchment"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                title="Admin Sign-Off and Complete Task"
                              >
                                <Stamp size={13} style={{ color: 'var(--stamp-red)' }} />
                                <span>Sign-Off</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditTask(t)}
                              className="btn-parchment"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="Edit this task"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleDeleteTask(t)}
                              className="btn-parchment"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--stamp-red)' }}
                              title="Delete this task"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: Daily Routines List ── */}
              {userTab === 'routines' && (
                <div>
                  {userRoutinesOnly.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
                      <Repeat size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <p style={{ fontSize: '0.85rem' }}>No daily recurring routines scheduled for this member.</p>
                      <button
                        onClick={() => handleOpenAssignRoutine(selectedUser.id)}
                        className="btn-brass"
                        style={{ marginTop: '0.75rem', padding: '0.45rem 0.95rem', fontSize: '0.78rem' }}
                      >
                        + Schedule Routine
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {userRoutinesOnly.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            padding: '0.85rem 1rem',
                            backgroundColor: 'var(--bg-parchment)',
                            border: '1px solid var(--border-sepia)',
                            borderLeft: '4px solid #8b5cf6',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <Repeat size={14} style={{ color: '#8b5cf6' }} />
                              <span className="typewriter-text" style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 700 }}>
                                DAILY RECURRING ROUTINE
                              </span>
                              {r.reminderTime && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Clock size={12} /> {r.reminderTime}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                              {r.title}
                            </div>
                            {r.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                                {r.description}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                              className="typewriter-text"
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.65rem',
                                borderRadius: '3px',
                                backgroundColor: r.status === 'completed' ? 'var(--stamp-green-bg)' : 'var(--bg-card)',
                                color: r.status === 'completed' ? 'var(--stamp-green)' : 'var(--ink-secondary)',
                                border: '1px solid var(--border-sepia)',
                              }}
                            >
                              {r.status === 'completed' ? 'COMPLETED TODAY' : 'ACTIVE SCHEDULE'}
                            </span>

                            <button
                              onClick={() => handleOpenEditTask(r)}
                              className="btn-parchment"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="Edit routine"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleDeleteTask(r)}
                              className="btn-parchment"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--stamp-red)' }}
                              title="Delete routine"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: Completed Tasks ── */}
              {userTab === 'completed' && (
                <div>
                  {userCompletedAll.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
                      <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5, color: 'var(--stamp-green)' }} />
                      <p style={{ fontSize: '0.85rem' }}>No completed tasks or routines logged for this member yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {userCompletedAll.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: '0.85rem 1rem',
                            backgroundColor: 'var(--bg-parchment)',
                            border: '1px solid var(--border-sepia)',
                            borderLeft: '4px solid var(--stamp-green)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ minWidth: '220px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                              <span className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--brass-dark)', fontWeight: 700 }}>
                                #{item.orderNumber}
                              </span>
                              <span
                                className="typewriter-text"
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '2px',
                                  backgroundColor: item.itemType === 'routine' ? '#f3e8ff' : 'var(--stamp-blue-bg)',
                                  color: item.itemType === 'routine' ? '#7c3aed' : 'var(--stamp-blue)',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {item.itemType === 'routine' ? 'ROUTINE' : 'TASK'}
                              </span>
                              <span
                                className="typewriter-text"
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '2px',
                                  backgroundColor: 'var(--stamp-green-bg)',
                                  color: 'var(--stamp-green)',
                                  fontWeight: 700,
                                }}
                              >
                                COMPLETED
                              </span>
                              {item.adminSignedOff && (
                                <span
                                  className="typewriter-text"
                                  style={{
                                    fontSize: '0.62rem',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '2px',
                                    backgroundColor: 'var(--stamp-red-bg)',
                                    color: 'var(--stamp-red)',
                                    fontWeight: 700,
                                  }}
                                >
                                  ★ ADMIN VERIFIED
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '2px',
                                  backgroundColor: 'var(--brass-glow)',
                                  color: 'var(--brass-dark)',
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                🪙 +{item.tokensEarned || (item.priority === 'opus' ? 2 : 1)} Tokens
                              </span>
                            </div>

                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink-primary)', textDecoration: 'line-through' }}>
                              {item.title}
                            </div>

                            {item.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                                {item.description}
                              </div>
                            )}

                            <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: '0.35rem' }}>
                              {item.completedAt && (
                                <span>Completed: {new Date(item.completedAt).toLocaleString()} • </span>
                              )}
                              <span>User: @{item.completedBy || selectedUser.name}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {!item.adminSignedOff ? (
                              <button
                                onClick={() => handleAdminSignOff(item)}
                                className="btn-parchment"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                title="Admin Sign-Off on this completed task"
                              >
                                <Stamp size={13} style={{ color: 'var(--stamp-red)' }} />
                                <span>Sign-Off</span>
                              </button>
                            ) : (
                              <span className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--stamp-red)', fontWeight: 700 }}>
                                Signed by {item.adminSignedBy || 'Admin'}
                              </span>
                            )}

                            <button
                              onClick={() => {
                                playTypewriterClick();
                                markTaskComplete(item.id, selectedUser.username);
                                syncData();
                              }}
                              className="btn-parchment"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="Reopen task to pending"
                            >
                              <RotateCcw size={13} />
                              <span>Reopen</span>
                            </button>

                            <button
                              onClick={() => handleDeleteTask(item)}
                              className="btn-parchment"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--stamp-red)' }}
                              title="Delete"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: User Deleted Archive ── */}
              {userTab === 'deleted' && (
                <div>
                  {userDeletedTasks.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
                      <Trash2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <p style={{ fontSize: '0.85rem' }}>No deleted tasks or routines in this member’s archive.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {userDeletedTasks.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: '0.85rem 1rem',
                            backgroundColor: 'var(--bg-parchment-deep)',
                            border: '1px solid var(--border-sepia)',
                            borderLeft: '4px solid var(--stamp-red)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                            opacity: 0.85,
                          }}
                        >
                          <div style={{ minWidth: '220px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                              <span className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--stamp-red)', fontWeight: 700 }}>
                                #{item.orderNumber}
                              </span>
                              <span
                                className="typewriter-text"
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '2px',
                                  backgroundColor: item.itemType === 'routine' ? '#f3e8ff' : 'var(--stamp-blue-bg)',
                                  color: item.itemType === 'routine' ? '#7c3aed' : 'var(--stamp-blue)',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {item.itemType === 'routine' ? 'ROUTINE' : 'TASK'}
                              </span>
                              <span
                                className="typewriter-text"
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '2px',
                                  backgroundColor: 'var(--stamp-red-bg)',
                                  color: 'var(--stamp-red)',
                                  fontWeight: 700,
                                }}
                              >
                                DELETED
                              </span>
                            </div>

                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink-secondary)', textDecoration: 'line-through' }}>
                              {item.title}
                            </div>

                            {item.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '0.2rem' }}>
                                {item.description}
                              </div>
                            )}

                            <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: '0.35rem' }}>
                              <span>Deleted: {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : 'Recently'} • </span>
                              <span>By: @{item.deletedBy || selectedUser.name}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => {
                                playRubberStampSound();
                                restoreTask(item.id);
                                syncData();
                              }}
                              className="btn-parchment"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="Restore task to active"
                            >
                              <RotateCcw size={13} style={{ color: 'var(--stamp-green)' }} />
                              <span>Restore</span>
                            </button>

                            <button
                              onClick={() => handlePermanentDeleteTask(item)}
                              className="btn-parchment"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--stamp-red)' }}
                              title="Permanently remove from database"
                            >
                              <Trash2 size={13} />
                              <span>Purge Permanently</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 5: User Desk Notes & Sticky Notes ── */}
              {userTab === 'notes' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {/* Desk Scratchpad */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-parchment)',
                        border: '1px solid var(--border-sepia)',
                        borderRadius: '4px',
                        padding: '1rem',
                      }}
                    >
                      <div className="typewriter-text" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brass-dark)', marginBottom: '0.5rem' }}>
                        MEMO SCRATCHPAD
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: inspectNotes ? 'var(--ink-primary)' : 'var(--ink-muted)',
                          fontStyle: inspectNotes ? 'normal' : 'italic',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          lineHeight: 1.5,
                        }}
                      >
                        {inspectNotes || 'No notes currently drafted by this user.'}
                      </div>
                    </div>

                    {/* Sticky Notes */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-parchment)',
                        border: '1px solid var(--border-sepia)',
                        borderRadius: '4px',
                        padding: '1rem',
                      }}
                    >
                      <div className="typewriter-text" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brass-dark)', marginBottom: '0.5rem' }}>
                        STICKY NOTES ({inspectStickyNotes.length})
                      </div>
                      {isLoadingNotes ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Loading sticky notes...</div>
                      ) : inspectStickyNotes.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                          No sticky notes pinned by this member.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
                          {inspectStickyNotes.map((note) => (
                            <div
                              key={note.id}
                              style={{
                                padding: '0.65rem 0.85rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border-sepia)',
                                backgroundColor:
                                  note.color === 'yellow' ? '#fef9c3' :
                                  note.color === 'pink' ? '#fce7f3' :
                                  note.color === 'blue' ? '#e0f2fe' :
                                  note.color === 'green' ? '#dcfce7' :
                                  note.color === 'purple' ? '#f3e8ff' : '#ffedd5',
                                fontSize: '0.82rem',
                                color: '#1f2937',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {note.content}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="vintage-paper" style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
              <Users size={42} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h4 className="serif-display" style={{ fontSize: '1.25rem' }}>Select a Team Member</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginTop: '0.25rem' }}>
                Choose a team member from the list on the left to inspect and manage their work.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION: Master Tasks & Routines Register ─────────────────────── */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-card)',
          borderTop: '4px solid var(--brass-gold)',
          marginTop: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--brass-dark)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ALL TASKS & ROUTINES REGISTER
            </div>
            <h3 className="serif-display" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              Master Tasks & Activity List
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
              Real-time list of all tasks and routines across all team members. Delete, edit, or sign off directly.
            </p>
          </div>

          {/* Search + Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
              <input
                type="text"
                placeholder="Search all tasks..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="vintage-input"
                style={{ paddingLeft: '2rem', fontSize: '0.78rem', width: '200px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-parchment)', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-sepia)' }}>
              {(['all', 'task', 'routine', 'pending', 'completed', 'deleted'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    playTypewriterClick();
                    setLedgerFilter(mode);
                  }}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.72rem',
                    borderRadius: '3px',
                    border: 'none',
                    backgroundColor: ledgerFilter === mode ? 'var(--brass-gold)' : 'transparent',
                    color: ledgerFilter === mode ? 'white' : 'var(--ink-secondary)',
                    fontWeight: ledgerFilter === mode ? 700 : 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Tasks Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-sepia)', backgroundColor: 'var(--bg-parchment)', textAlign: 'left' }}>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>#</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>TYPE</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>TASK TITLE</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>ASSIGNEE</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>PRIORITY</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>STATUS</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {globalFiltered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
                    No records found matching current search/filter.
                  </td>
                </tr>
              ) : (
                globalFiltered.map((t) => {
                  const assignee = users.find((u) => u.id === t.assigneeId || u.username === t.createdByUsername || u.email === t.assigneeId);

                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: '1px solid var(--border-sepia)',
                        backgroundColor: t.status === 'deleted' ? 'var(--bg-parchment-deep)' : 'transparent',
                        opacity: t.status === 'deleted' ? 0.75 : 1,
                      }}
                    >
                      <td className="typewriter-text" style={{ padding: '0.65rem', fontWeight: 700, color: 'var(--brass-dark)' }}>
                        #{t.orderNumber}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span
                          className="typewriter-text"
                          style={{
                            fontSize: '0.62rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '2px',
                            backgroundColor: t.itemType === 'routine' ? '#f3e8ff' : 'var(--stamp-blue-bg)',
                            color: t.itemType === 'routine' ? '#7c3aed' : 'var(--stamp-blue)',
                            fontWeight: 700,
                          }}
                        >
                          {t.itemType === 'routine' ? 'ROUTINE' : 'TASK'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink-primary)', textDecoration: t.status === 'deleted' ? 'line-through' : 'none' }}>
                          {t.title}
                        </div>
                        {t.description && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                            {t.description.slice(0, 70)}...
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <img
                            src={assignee?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                            alt=""
                            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span style={{ fontSize: '0.78rem' }}>
                            {assignee?.name || t.createdByUsername}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span
                          className="typewriter-text"
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '2px',
                            backgroundColor: t.priority === 'opus' ? '#f3e8ff' : t.priority === 'urgent' ? 'var(--stamp-red-bg)' : 'transparent',
                            color: t.priority === 'opus' ? '#7c3aed' : t.priority === 'urgent' ? 'var(--stamp-red)' : 'var(--ink-secondary)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {t.priority === 'opus' ? 'High' : t.priority === 'urgent' ? 'Urgent' : 'Normal'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span
                          className="typewriter-text"
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: t.status === 'completed'
                              ? 'var(--stamp-green)'
                              : t.status === 'deleted'
                              ? 'var(--stamp-red)'
                              : 'var(--stamp-blue)',
                          }}
                        >
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'right' }}>
                        {t.status === 'deleted' ? (
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                playTypewriterClick();
                                restoreTask(t.id);
                                syncData();
                              }}
                              className="btn-parchment"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem' }}
                              title="Restore task"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteTask(t)}
                              className="btn-parchment"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', color: 'var(--stamp-red)' }}
                              title="Purge permanently from database"
                            >
                              Purge
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {t.status !== 'completed' && (
                              <button
                                onClick={() => handleAdminSignOff(t)}
                                className="btn-parchment"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem' }}
                                title="Sign-Off and Complete"
                              >
                                Sign-Off
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditTask(t)}
                              className="btn-parchment"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem' }}
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTask(t)}
                              className="btn-parchment"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem', color: 'var(--stamp-red)' }}
                              title="Delete task"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION: Reward Claims & Token Payouts ────────────────────────── */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-card)',
          borderTop: '4px solid #f59e0b',
          marginTop: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div className="typewriter-text" style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              REWARD CLAIMS & PAYOUTS
            </div>
            <h3 className="serif-display" style={{ fontSize: '1.45rem', fontWeight: 800 }}>
              Token Redemptions & Cash Payouts
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
              Review and approve cash redemptions requested by team members (1 token = ₹{TOKEN_RUPEE_RATE}).
            </p>
          </div>

          <span className="typewriter-text" style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', backgroundColor: pendingClaims.length > 0 ? 'var(--stamp-red-bg)' : 'var(--bg-parchment)', color: pendingClaims.length > 0 ? 'var(--stamp-red)' : 'var(--ink-secondary)', borderRadius: '3px', fontWeight: 700 }}>
            {pendingClaims.length} Pending Approval
          </span>
        </div>

        {rewardClaims.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
            <Coins size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>No reward claims submitted yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rewardClaims.map((claim) => (
              <div
                key={claim.id}
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--bg-parchment)',
                  border: '1px solid var(--border-sepia)',
                  borderLeft: claim.status === 'approved'
                    ? '4px solid var(--stamp-green)'
                    : claim.status === 'rejected'
                    ? '4px solid var(--stamp-red)'
                    : '4px solid #f59e0b',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className="typewriter-text" style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700 }}>
                      CLAIM #{claim.claimNumber}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                      {new Date(claim.requestedAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    {claim.userName} (@{claim.username}) — ₹{claim.rupeeAmount} ({claim.tokensRedeemed} Tokens)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                    Method: <strong style={{ textTransform: 'uppercase' }}>{claim.payoutMethod}</strong> • Details: <code>{claim.payoutDetails}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    className="typewriter-text"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.65rem',
                      borderRadius: '3px',
                      backgroundColor: claim.status === 'approved' ? 'var(--stamp-green-bg)' : claim.status === 'rejected' ? 'var(--stamp-red-bg)' : '#fef3c7',
                      color: claim.status === 'approved' ? 'var(--stamp-green)' : claim.status === 'rejected' ? 'var(--stamp-red)' : '#92400e',
                    }}
                  >
                    {claim.status.toUpperCase()}
                  </span>

                  {claim.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApproveClaim(claim.id)}
                        className="btn-brass"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                      >
                        Approve & Pay
                      </button>
                      <button
                        onClick={() => handleRejectClaim(claim.id)}
                        className="btn-parchment"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: 'var(--stamp-red)' }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task / Routine Modal (Assign & Edit) */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          taskToEdit={taskToEdit}
          defaultType={modalDefaultType}
          defaultAssigneeId={modalAssigneeId}
          onClose={() => {
            setIsTaskModalOpen(false);
            setTaskToEdit(null);
            syncData();
          }}
        />
      )}
    </div>
  );
}
