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
import { getAllProfiles, isMasterAdmin } from '@/lib/auth';
import { fetchAllCloudTasks } from '@/lib/cloudTasks';
import { fetchCloudNotes } from '@/lib/cloudNotes';

import { User, Task, RewardClaim, StickyNote } from '@/types';
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
  Unlock,
  AlertCircle,
  Coins, 
  Gift, 
  CheckSquare, 
  BookOpen,
  FileText,
  Repeat,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Eye,
  LogOut,
  Calendar,
  Layers
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  // ── Dashboard Data State ──────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewardClaims, setRewardClaims] = useState<RewardClaim[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // User inspection view: 'tasks' | 'routines' | 'completed' | 'notes'
  const [userTab, setUserTab] = useState<'tasks' | 'routines' | 'completed' | 'notes'>('tasks');
  const [inspectNotes, setInspectNotes] = useState<string>('');
  const [inspectStickyNotes, setInspectStickyNotes] = useState<StickyNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);

  // Global Ledger filter & search
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'task' | 'routine' | 'pending' | 'completed'>('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Task edit modal
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);

  // ── Master data synchronization ───────────────────────────────────────────
  const syncData = async () => {
    const rawLocalUsers = getUsers();
    // Exclude mock usr-admin
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
        // Exclude mock admin from cloudProfiles as well
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
            title: existing?.title || (isAdminUser ? 'Chief Bureau Administrator' : 'Field Operative'),
            department: existing?.department || 'Dispatch & Logistics',
            deskNumber: existing?.deskNumber || `DK-${p.id.slice(0, 4).toUpperCase()}`,
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

        // Select the admin or first user by default
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
            if (lt.status === 'completed' && ct.status !== 'completed') {
              mergedMap.set(lt.id, lt);
            } else if (lt.status === 'deleted' && ct.status !== 'deleted') {
              mergedMap.set(lt.id, lt);
            }
          }
        }
        const mergedTasks = Array.from(mergedMap.values()).sort(
          (a, b) => (b.orderNumber || 0) - (a.orderNumber || 0)
        );
        setTasks(mergedTasks);
      }
    } catch (err) {
      console.warn('Admin cloud sync note:', err);
    }
  };

  useEffect(() => {
    if (!authUser || !isMasterAdmin(authUser.email)) return;
    syncData();
    window.addEventListener(BUREAU_SYNC_EVENT, syncData);
    return () => window.removeEventListener(BUREAU_SYNC_EVENT, syncData);
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
    updateRewardClaimStatus(claimId, 'approved', 'Disbursed by Bureau Chief via Treasury.', authUser?.email || 'admin');
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
      adminSignedBy: authUser?.name || 'Chief Administrator',
      status: 'completed',
    });
    syncData();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. EXECUTIVE AUTHENTICATION GUARDS
  // ═══════════════════════════════════════════════════════════════════════════
  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <img
          src="/bureau_crest.jpg"
          alt="Bureau Seal"
          style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--brass-gold)', opacity: 0.8 }}
        />
        <div className="typewriter-text" style={{ fontSize: '0.84rem', color: 'var(--ink-secondary)', letterSpacing: '0.12em', fontWeight: 700 }}>
          VERIFYING EXECUTIVE CLEARANCE...
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
            alt="Bureau Seal"
            style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid var(--brass-gold)', margin: '0 auto 1.25rem', display: 'block' }}
          />
          <div
            className="typewriter-text"
            style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--stamp-red)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem' }}
          >
            SESSION AUTHENTICATION REQUIRED
          </div>
          <h2 className="serif-display" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink-primary)', marginBottom: '0.75rem' }}>
            Officer Not Signed In
          </h2>
          <p style={{ fontSize: '0.83rem', color: 'var(--ink-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            You must be authenticated with Google as the Chief Administrator to access this executive oversight terminal.
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
              alt="Bureau Crest"
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
            RESTRICTED ACCESS • EXECUTIVE CLEARANCE ONLY
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
            Access Prohibited
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
            <strong>Clearance Refused:</strong> This executive terminal is strictly restricted to the Chief Bureau Administrator (<strong>freefirejeeva2810@gmail.com</strong>). Your signed-in account (<code>{authUser.email}</code>) does not possess executive oversight credentials.
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
              <span>← Return to My Work Desk</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. UNLOCKED EXECUTIVE ADMIN DASHBOARD
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

        if (uid && (tAssignee === uid || tCreator === uid)) return true;
        if (uemail && (tAssignee === uemail || tCreator === uemail || tUsername === uemail)) return true;
        if (uusername && (tAssignee === uusername || tCreator === uusername || tUsername === uusername)) return true;
        if (uhandle && (tAssignee === uhandle || tCreator === uhandle || tUsername === uhandle)) return true;
        if (uname && (tAssignee === uname || tCreator === uname || tUsername === uname)) return true;

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
      {/* ── Top Masthead Bar ─────────────────────────────────────────────── */}
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
                EXECUTIVE CLEARANCE ACTIVE • BUREAU OVERSIGHT TERMINAL
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
                Master Personnel & Task Supervision
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
                Monitor team daily tasks, recurring routines, desk memos, and approve token requisitions.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link
              href="/"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="Return to My Desk"
            >
              <CheckSquare size={14} style={{ color: 'var(--brass-gold)' }} />
              <span>My Work Desk</span>
            </Link>

            <Link
              href="/team"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="Team Personnel Register"
            >
              <Users size={14} style={{ color: 'var(--ink-secondary)' }} />
              <span>Team Roster</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Global Metrics Bar ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Total Personnel */}
        <div className="vintage-paper" style={{ padding: '1rem', borderLeft: '4px solid var(--brass-gold)', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Registered Staff
            </span>
            <Users size={18} style={{ color: 'var(--brass-gold)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--ink-primary)' }}>
            {users.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
            Synced via Google & Cloud Registry
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
            Recurring scheduled daily checklists
          </div>
        </div>

        {/* Completion Rate */}
        <div className="vintage-paper" style={{ padding: '1rem', borderLeft: '4px solid var(--stamp-green)', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Clearance Rate
            </span>
            <BarChart3 size={18} style={{ color: 'var(--stamp-green)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--stamp-green)' }}>
            {globalCompletionRate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
            Overall task completion velocity
          </div>
        </div>

        {/* Treasury Claims */}
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
            {pendingClaims.length > 0 ? 'Claims pending admin approval' : 'All requisitions disbursed'}
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Staff Selector + Personnel Dossier Watcher ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* ── LEFT COLUMN: Personnel Selector ────────────────────────────── */}
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
              Bureau Personnel
            </h3>
            <span className="typewriter-text" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', backgroundColor: 'var(--bg-parchment)', borderRadius: '3px', fontWeight: 700 }}>
              {users.length} Active
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
            Click an officer below to inspect their daily tasks, routines, and desk notes.
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

                if (uid && (tAssignee === uid || tCreator === uid)) return true;
                if (uemail && (tAssignee === uemail || tCreator === uemail || tUsername === uemail)) return true;
                if (uusername && (tAssignee === uusername || tCreator === uusername || tUsername === uusername)) return true;
                if (uhandle && (tAssignee === uhandle || tCreator === uhandle || tUsername === uhandle)) return true;
                if (uname && (tAssignee === uname || tCreator === uname || tUsername === uname)) return true;

                if ((!t.assigneeId || t.assigneeId === 'usr-default') && (!t.createdById || t.createdById === 'usr-default') && users[0]?.id === u.id) {
                  return true;
                }

                return false;
              });
              const pendingCount = userTasks.filter((t) => t.status === 'pending' || t.status === 'in-progress').length;
              const completedCount = userTasks.filter((t) => t.status === 'completed').length;

              return (
                <button
                  key={u.id}
                  onClick={() => {
                    playTypewriterClick();
                    setSelectedUser(u);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.75rem',
                    backgroundColor: isSelected ? 'var(--brass-glow)' : 'var(--bg-parchment)',
                    border: isSelected ? '1.5px solid var(--brass-gold)' : '1px solid var(--border-sepia)',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                      alt={u.name}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '1.5px solid var(--brass-gold)',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.email || `@${u.username}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                    <span
                      className="typewriter-text"
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.35rem',
                        borderRadius: '2px',
                        backgroundColor: isMasterAdmin(u.email) ? 'var(--stamp-red-bg)' : 'var(--bg-card)',
                        color: isMasterAdmin(u.email) ? 'var(--stamp-red)' : 'var(--stamp-blue)',
                        border: '1px solid var(--border-sepia)',
                      }}
                    >
                      {isMasterAdmin(u.email) ? 'ADMIN' : 'STAFF'}
                    </span>
                    {pendingCount > 0 && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--stamp-red)', fontWeight: 700 }}>
                        {pendingCount} pending
                      </span>
                    )}
                    {completedCount > 0 && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--stamp-green)', fontWeight: 700 }}>
                        {completedCount} completed
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Selected Personnel Dossier Watcher ─────────────── */}
        <div
          className="vintage-paper"
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--bg-card)',
            borderTop: '4px solid var(--stamp-blue)',
          }}
        >
          {selectedUser ? (
            <div>
              {/* User Header Profile */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                        {isMasterAdmin(selectedUser.email) ? '★ Chief Administrator' : 'Field Operative'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
                      {selectedUser.email} • ID: <span className="typewriter-text" style={{ fontSize: '0.72rem' }}>{selectedUser.id}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Badge */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-parchment)',
                    border: '1px solid var(--border-sepia)',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    textAlign: 'right',
                  }}
                >
                  <div className="typewriter-text" style={{ fontSize: '0.65rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                    Task Clearance Velocity
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: userCompletionRate > 60 ? 'var(--stamp-green)' : 'var(--ink-primary)' }}>
                    {userCompletionRate}% <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--ink-muted)' }}>({userCompletedAll.length}/{nonDeletedItems.length})</span>
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
                  <span>Completed Archive ({userCompletedAll.length})</span>
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
                  <span>Desk Notes & Memos</span>
                </button>
              </div>

              {/* ── TAB 1: Daily Tasks List ── */}
              {userTab === 'tasks' && (
                <div>
                  {userTasksOnly.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
                      <CheckSquare size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <p style={{ fontSize: '0.85rem' }}>No daily tasks logged for this officer yet.</p>
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
                                {t.priority}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                                Due: {t.dueDate || 'Today'}
                              </span>
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

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
                      <p style={{ fontSize: '0.85rem' }}>No daily recurring routines scheduled for this officer.</p>
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
                            {r.status === 'completed' ? 'CHECKED TODAY' : 'ACTIVE SCHEDULE'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: Completed Archive ── */}
              {userTab === 'completed' && (
                <div>
                  {userCompletedAll.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
                      <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5, color: 'var(--stamp-green)' }} />
                      <p style={{ fontSize: '0.85rem' }}>No completed tasks or routines logged for this officer yet.</p>
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
                                  ★ CHIEF VERIFIED
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
                              <span>Officer: @{item.completedBy || selectedUser.name}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!item.adminSignedOff ? (
                              <button
                                onClick={() => handleAdminSignOff(item)}
                                className="btn-parchment"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                title="Admin Sign-Off on this completed order"
                              >
                                <Stamp size={13} style={{ color: 'var(--stamp-red)' }} />
                                <span>Chief Sign-Off</span>
                              </button>
                            ) : (
                              <span className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--stamp-red)', fontWeight: 700 }}>
                                Signed by {item.adminSignedBy || 'Chief Admin'}
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
                              title="Reopen order to pending"
                            >
                              <span>Reopen</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: User Desk Notes & Memos ── */}
              {userTab === 'notes' && (
                <div>
                  {isLoadingNotes ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-secondary)' }}>
                      <div className="typewriter-text">RETRIEVING DESK NOTES...</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Desk Daily Notes */}
                      <div>
                        <div className="typewriter-text" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brass-dark)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                          Personal Workstation Desk Notes
                        </div>
                        <div
                          style={{
                            padding: '1rem',
                            backgroundColor: 'var(--bg-parchment)',
                            border: '1px solid var(--border-sepia)',
                            borderRadius: '4px',
                            minHeight: '100px',
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.85rem',
                            color: inspectNotes ? 'var(--ink-primary)' : 'var(--ink-muted)',
                            fontFamily: 'inherit',
                          }}
                        >
                          {inspectNotes || 'No notes currently drafted on this officer’s desk.'}
                        </div>
                      </div>

                      {/* Sticky Notes */}
                      <div>
                        <div className="typewriter-text" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                          Pinned Sticky Memos ({inspectStickyNotes.length})
                        </div>
                        {inspectStickyNotes.length === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                            No pinned sticky memos found for this user.
                          </p>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                            {inspectStickyNotes.map((note) => (
                              <div
                                key={note.id}
                                style={{
                                  padding: '0.85rem',
                                  backgroundColor: note.color === 'yellow' ? '#fef3c7' : note.color === 'blue' ? '#e0f2fe' : note.color === 'green' ? '#dcfce7' : '#fee2e2',
                                  border: '1px solid var(--border-sepia)',
                                  borderRadius: '3px',
                                  boxShadow: 'var(--paper-shadow)',
                                  fontSize: '0.82rem',
                                  color: '#1f2937',
                                  minHeight: '80px',
                                }}
                              >
                                {note.content}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
              <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h4 className="serif-display" style={{ fontSize: '1.25rem' }}>Select an Officer</h4>
              <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Choose any staff member from the left list to inspect their activities.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION: Global Master Task & Routine Ledger ──────────────────── */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-card)',
          borderTop: '4px solid var(--brass-gold)',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div className="typewriter-text" style={{ fontSize: '0.7rem', color: 'var(--brass-dark)', fontWeight: 700, textTransform: 'uppercase' }}>
              Master Bureau Ledger
            </div>
            <h3 className="serif-display" style={{ fontSize: '1.45rem', fontWeight: 800 }}>
              All Work Orders & Routines Across Team
            </h3>
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-muted)' }} />
              <input
                type="text"
                placeholder="Search ledger..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem 0.45rem 2rem',
                  fontSize: '0.82rem',
                  backgroundColor: 'var(--bg-parchment)',
                  border: '1px solid var(--border-sepia)',
                  borderRadius: '3px',
                  width: '180px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {(['all', 'task', 'routine', 'pending', 'completed'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    playTypewriterClick();
                    setLedgerFilter(mode);
                  }}
                  className="typewriter-text"
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: ledgerFilter === mode ? 'var(--brass-gold)' : 'var(--bg-parchment)',
                    color: ledgerFilter === mode ? '#ffffff' : 'var(--ink-secondary)',
                    border: '1px solid var(--border-sepia)',
                    borderRadius: '2px',
                    cursor: 'pointer',
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-sepia)', backgroundColor: 'var(--bg-parchment)' }}>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>ORDER #</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>TYPE</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>TITLE & DESCRIPTION</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>ASSIGNEE</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>PRIORITY</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>STATUS</th>
                <th className="typewriter-text" style={{ padding: '0.65rem', fontSize: '0.68rem', fontWeight: 700, textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {globalFiltered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
                    No items match the current ledger criteria.
                  </td>
                </tr>
              ) : (
                globalFiltered.map((t) => {
                  const assignee = users.find((u) => u.id === t.assigneeId || u.username === t.createdByUsername);

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-sepia)' }}>
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
                            backgroundColor: t.itemType === 'routine' ? '#f3e8ff' : 'var(--bg-card)',
                            color: t.itemType === 'routine' ? '#7c3aed' : 'var(--stamp-blue)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {t.itemType || 'task'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem', maxWidth: '300px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>{t.title}</div>
                        {t.description && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--ink-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.description}
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
                          <span style={{ fontSize: '0.78rem', color: 'var(--ink-primary)', fontWeight: 500 }}>
                            {assignee?.name || t.createdByUsername}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span
                          className="typewriter-text"
                          style={{
                            fontSize: '0.62rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '2px',
                            backgroundColor: t.priority === 'opus' ? '#f3e8ff' : t.priority === 'urgent' ? 'var(--stamp-red-bg)' : 'transparent',
                            color: t.priority === 'opus' ? '#7c3aed' : t.priority === 'urgent' ? 'var(--stamp-red)' : 'var(--ink-secondary)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span
                          className="typewriter-text"
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: t.status === 'completed' ? 'var(--stamp-green)' : 'var(--stamp-blue)',
                          }}
                        >
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'right' }}>
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION: Treasury Requisitions & Reward Claims ────────────────── */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-card)',
          borderTop: '4px solid #f59e0b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div className="typewriter-text" style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
              Bureau Treasury Office
            </div>
            <h3 className="serif-display" style={{ fontSize: '1.45rem', fontWeight: 800 }}>
              Member Reward Requisitions & Payouts
            </h3>
          </div>
          <span className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)', fontWeight: 700 }}>
            Conversion Rate: 1 Token = ₹{TOKEN_RUPEE_RATE}
          </span>
        </div>

        {rewardClaims.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
            <Coins size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>No reward claims have been submitted by members yet.</p>
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
                  borderLeft: claim.status === 'approved' ? '4px solid var(--stamp-green)' : claim.status === 'rejected' ? '4px solid var(--stamp-red)' : '4px solid #f59e0b',
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
                    <span className="typewriter-text" style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--brass-dark)' }}>
                      CLAIM #{claim.id.slice(-6).toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                      @{claim.username}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                      Requested: {claim.tokensRedeemed} tokens (₹{claim.rupeeAmount})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
                    Payout via {claim.payoutMethod.toUpperCase()}: <span className="typewriter-text" style={{ fontWeight: 700 }}>{claim.payoutDetails}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    className="typewriter-text"
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '2px',
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
                        Approve & Disburse
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

      {/* Task Edit Modal */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          taskToEdit={taskToEdit}
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
