'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  getCurrentUser, 
  getTasks, 
  BUREAU_SYNC_EVENT 
} from '@/lib/storage';
import { Task, User, ItemType } from '@/types';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import TokenPurseWidget from '@/components/TokenPurseWidget';
import ClaimRewardModal from '@/components/ClaimRewardModal';
import StickyNotesSection from '@/components/StickyNotesSection';
import { playTypewriterClick } from '@/lib/sound';
import { 
  CheckCircle2, 
  Clock, 
  ListOrdered, 
  TrendingUp, 
  PlusCircle, 
  Search, 
  BookOpen, 
  StickyNote,
  Trash2,
  LogIn,
  ShieldCheck,
  Repeat,
  CheckSquare,
  Bell,
  Archive,
  Award,
  Coins,
  Users
} from 'lucide-react';

export default function MyDeskPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation view: 'active' (Shows Daily Tasks & Daily Routines sections) | 'completed' (Saved separately) | 'deleted'
  const [activeView, setActiveView] = useState<'active' | 'completed' | 'deleted'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [deskNotes, setDeskNotes] = useState('');

  // Modal State
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<ItemType>('task');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);


  useEffect(() => {
    const sync = () => {
      const user = getCurrentUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setCurrentUser(user);
      setTasks(getTasks());
      setIsLoading(false);
    };

    sync();
    window.addEventListener(BUREAU_SYNC_EVENT, sync);

    const savedNotes = localStorage.getItem('daily_bureau_desk_notes');
    if (savedNotes) setDeskNotes(savedNotes);

    return () => window.removeEventListener(BUREAU_SYNC_EVENT, sync);
  }, [router]);

  const handleSaveNotes = (val: string) => {
    setDeskNotes(val);
    localStorage.setItem('daily_bureau_desk_notes', val);
  };

  // Filter tasks belonging to current user
  const myItems = tasks.filter((t) => {
    if (!currentUser) return false;
    const isCreator = t.createdByUsername?.toLowerCase() === currentUser.username.toLowerCase();
    const isAssignee = t.assigneeId === currentUser.id || t.createdById === currentUser.id;
    return isCreator || isAssignee;
  });

  // 1. Daily Tasks (active)
  const myDailyTasks = myItems.filter(
    (t) => (t.itemType !== 'routine') && (t.status === 'pending' || t.status === 'in-progress')
  );

  // 2. Daily Routines (active)
  const myDailyRoutines = myItems.filter(
    (t) => (t.itemType === 'routine') && (t.status === 'pending' || t.status === 'in-progress')
  );

  // 3. Completed Tasks (Saved Separately)
  const myCompletedItems = myItems.filter((t) => t.status === 'completed');

  // 4. Deleted Items
  const myDeletedItems = myItems.filter((t) => t.status === 'deleted');

  // Open Modal helpers
  const handleOpenCreateTask = () => {
    playTypewriterClick();
    setTaskToEdit(null);
    setModalDefaultType('task');
    setIsTaskModalOpen(true);
  };

  const handleOpenCreateRoutine = () => {
    playTypewriterClick();
    setTaskToEdit(null);
    setModalDefaultType('routine');
    setIsTaskModalOpen(true);
  };

  const handleOpenEdit = (item: Task) => {
    playTypewriterClick();
    setTaskToEdit(item);
    setModalDefaultType(item.itemType || 'task');
    setIsTaskModalOpen(true);
  };

  // Search filter helper
  const matchesSearch = (t: Task) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      t.orderNumber.toString().includes(q) ||
      (t.reminderTime && t.reminderTime.includes(q))
    );
  };

  const filteredDailyTasks = myDailyTasks.filter(matchesSearch);
  const filteredDailyRoutines = myDailyRoutines.filter(matchesSearch);
  const filteredCompleted = myCompletedItems.filter(matchesSearch);
  const filteredDeleted = myDeletedItems.filter(matchesSearch);

  if (isLoading || !currentUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="typewriter-text" style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', letterSpacing: '0.1em' }}>
            LOADING WORKSTATION...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Workstation Masthead */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          borderTop: '4px solid var(--brass-gold)',
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
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser.name}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: '2px solid var(--brass-gold)',
                objectFit: 'cover',
                boxShadow: 'var(--paper-shadow)',
              }}
            />
            <div>
              <div
                className="typewriter-text"
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--brass-dark)',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                @{currentUser.username} • {currentUser.role === 'admin' ? 'BUREAU ADMINISTRATOR' : 'TEAM MEMBER'}
              </div>
              <h2
                className="serif-display"
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--ink-primary)',
                  lineHeight: 1.2,
                }}
              >
                {currentUser.name}’s Daily Dispatch Desk
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
                Manage both your Daily Tasks & Daily Routines with scheduled reminder alerts.
              </p>
            </div>
          </div>

          {/* Action buttons to create task or routine */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              href="/team"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="View all team personnel"
            >
              <Users size={14} style={{ color: 'var(--stamp-blue)' }} />
              <span>Team Roster</span>
            </Link>

            <Link
              href="/dispatch-log"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="View daily work logs"
            >
              <BookOpen size={14} style={{ color: 'var(--ink-secondary)' }} />
              <span>Dispatch Logs</span>
            </Link>

            <button
              onClick={handleOpenCreateTask}
              className="btn-brass"
              style={{ padding: '0.55rem 1rem' }}
            >
              <PlusCircle size={15} />
              <span>Create Daily Task</span>
            </button>

            <button
              onClick={handleOpenCreateRoutine}
              className="btn-parchment"
              style={{ padding: '0.55rem 1rem' }}
            >
              <Repeat size={15} style={{ color: 'var(--brass-dark)' }} />
              <span>Add Daily Routine</span>
            </button>

            {currentUser.role === 'admin' && (
              <Link
                href="/admin"
                className="btn-parchment"
                style={{ padding: '0.55rem 0.95rem' }}
              >
                <ShieldCheck size={15} style={{ color: 'var(--stamp-red)' }} />
                <span>Admin Page</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bureau Token Treasury Banner */}
      <div style={{ marginBottom: '1.5rem' }}>
        <TokenPurseWidget variant="expanded" onOpenClaimModal={() => setIsClaimModalOpen(true)} />
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >

        {/* Daily Tasks Metric */}
        <div
          className="vintage-paper"
          style={{
            padding: '1.1rem',
            borderBottom: '3px solid var(--stamp-blue)',
            cursor: 'pointer',
            backgroundColor: activeView === 'active' ? 'var(--bg-card-alt)' : 'var(--bg-card)',
          }}
          onClick={() => setActiveView('active')}
        >
          <div
            className="typewriter-text"
            style={{
              fontSize: '0.7rem',
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Active Daily Tasks</span>
            <CheckSquare size={14} style={{ color: 'var(--stamp-blue)' }} />
          </div>
          <div
            className="serif-display"
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--ink-primary)',
              marginTop: '0.2rem',
            }}
          >
            {myDailyTasks.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
            Editable work orders on desk
          </div>
        </div>

        {/* Daily Routines Metric */}
        <div
          className="vintage-paper"
          style={{
            padding: '1.1rem',
            borderBottom: '3px solid var(--brass-gold)',
            cursor: 'pointer',
            backgroundColor: activeView === 'active' ? 'var(--bg-card-alt)' : 'var(--bg-card)',
          }}
          onClick={() => setActiveView('active')}
        >
          <div
            className="typewriter-text"
            style={{
              fontSize: '0.7rem',
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Daily Routines</span>
            <Repeat size={14} style={{ color: 'var(--brass-dark)' }} />
          </div>
          <div
            className="serif-display"
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--brass-dark)',
              marginTop: '0.2rem',
            }}
          >
            {myDailyRoutines.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
            Recurring daily workstation rituals
          </div>
        </div>

        {/* Completed Tasks (Saved Separately) Metric */}
        <div
          className="vintage-paper"
          style={{
            padding: '1.1rem',
            borderBottom: '3px solid var(--stamp-green)',
            cursor: 'pointer',
            backgroundColor: activeView === 'completed' ? 'var(--bg-card-alt)' : 'var(--bg-card)',
          }}
          onClick={() => setActiveView('completed')}
        >
          <div
            className="typewriter-text"
            style={{
              fontSize: '0.7rem',
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Completed Archive</span>
            <CheckCircle2 size={14} style={{ color: 'var(--stamp-green)' }} />
          </div>
          <div
            className="serif-display"
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--stamp-green)',
              marginTop: '0.2rem',
            }}
          >
            {myCompletedItems.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
            Saved separately in Stamped Folio
          </div>
        </div>

        {/* Timed Reminders Metric */}
        <div
          className="vintage-paper"
          style={{
            padding: '1.1rem',
            borderBottom: '3px solid var(--stamp-red)',
          }}
        >
          <div
            className="typewriter-text"
            style={{
              fontSize: '0.7rem',
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Timed Reminders</span>
            <Bell size={14} style={{ color: 'var(--stamp-red)' }} />
          </div>
          <div
            className="serif-display"
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--stamp-red)',
              marginTop: '0.2rem',
            }}
          >
            {myItems.filter((t) => t.reminderTime && t.status !== 'completed' && t.status !== 'deleted').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
            Active telegraph alerts scheduled
          </div>
        </div>
      </div>

      {/* Main View Selection Bar */}
      <div
        className="vintage-paper"
        style={{
          padding: '0.85rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        {/* Navigation View Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              playTypewriterClick();
              setActiveView('active');
            }}
            className={activeView === 'active' ? 'btn-brass' : 'btn-parchment'}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.76rem' }}
          >
            <CheckSquare size={13} />
            <span>Active Desk ({myDailyTasks.length + myDailyRoutines.length})</span>
          </button>

          <button
            onClick={() => {
              playTypewriterClick();
              setActiveView('completed');
            }}
            className={activeView === 'completed' ? 'btn-brass' : 'btn-parchment'}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.76rem' }}
          >
            <CheckCircle2 size={13} style={{ color: 'var(--stamp-green)' }} />
            <span>Completed Archive (Saved Separately) ({myCompletedItems.length})</span>
          </button>

          <button
            onClick={() => {
              playTypewriterClick();
              setActiveView('deleted');
            }}
            className={activeView === 'deleted' ? 'btn-brass' : 'btn-parchment'}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.76rem' }}
          >
            <Trash2 size={13} style={{ color: 'var(--stamp-red)' }} />
            <span>Deleted Archive ({myDeletedItems.length})</span>
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '220px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dispatch or time..."
            className="vintage-input"
            style={{ padding: '0.4rem 0.6rem 0.4rem 1.8rem', fontSize: '0.76rem' }}
          />
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-muted)',
            }}
          />
        </div>
      </div>

      {/* CONTENT AREA */}
      {activeView === 'active' ? (
        /* ACTIVE VIEW: TWO DISTINCT EDITABLE SECTIONS (DAILY TASKS & DAILY ROUTINES) + STICKY NOTES */
        <>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start',
            marginBottom: '1.5rem',
          }}
        >
          {/* SECTION 1: DAILY TASKS */}
          <div
            className="vintage-paper"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid var(--stamp-blue)',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid var(--border-sepia-dark)',
                paddingBottom: '0.65rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div
                  className="typewriter-text"
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--stamp-blue)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Section 1 • Work Orders
                </div>
                <h3 className="serif-display" style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                  Daily Tasks ({myDailyTasks.length})
                </h3>
              </div>

              <button
                onClick={handleOpenCreateTask}
                className="btn-brass"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}
              >
                <PlusCircle size={13} />
                <span>New Task</span>
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
              Specific work dispatches scheduled for today. Both tasks and routines are fully editable with custom reminder times.
            </p>

            {filteredDailyTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {filteredDailyTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    showAssignee={false}
                    onEdit={handleOpenEdit}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-parchment)',
                  border: '1px dashed var(--border-sepia-dark)',
                  borderRadius: '3px',
                }}
              >
                <CheckSquare size={28} style={{ color: 'var(--ink-muted)', margin: '0 auto 0.5rem' }} />
                <div className="serif-display" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  No Daily Tasks on Desk
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', margin: '0.25rem 0 0.85rem' }}>
                  Commission a new daily task docket to log your shift's assignments.
                </p>
                <button onClick={handleOpenCreateTask} className="btn-brass" style={{ padding: '0.35rem 0.8rem', fontSize: '0.72rem' }}>
                  Create Daily Task
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: DAILY ROUTINES */}
          <div
            className="vintage-paper"
            style={{
              padding: '1.25rem',
              borderTop: '4px solid var(--brass-gold)',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid var(--border-sepia-dark)',
                paddingBottom: '0.65rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div
                  className="typewriter-text"
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--brass-dark)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Section 2 • Workstation Rituals
                </div>
                <h3 className="serif-display" style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                  Daily Routines ({myDailyRoutines.length})
                </h3>
              </div>

              <button
                onClick={handleOpenCreateRoutine}
                className="btn-brass"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}
              >
                <PlusCircle size={13} />
                <span>New Routine</span>
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
              Recurring workstation habits, calibrations, and inspections. Easily editable with scheduled alerts.
            </p>

            {filteredDailyRoutines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {filteredDailyRoutines.map((routine) => (
                  <TaskCard
                    key={routine.id}
                    task={routine}
                    showAssignee={false}
                    onEdit={handleOpenEdit}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-parchment)',
                  border: '1px dashed var(--border-sepia-dark)',
                  borderRadius: '3px',
                }}
              >
                <Repeat size={28} style={{ color: 'var(--brass-gold)', margin: '0 auto 0.5rem' }} />
                <div className="serif-display" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  No Daily Routines Configured
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', margin: '0.25rem 0 0.85rem' }}>
                  Set up recurring workstation habits or morning equipment checks.
                </p>
                <button onClick={handleOpenCreateRoutine} className="btn-brass" style={{ padding: '0.35rem 0.8rem', fontSize: '0.72rem' }}>
                  Add Daily Routine
                </button>
              </div>
              )}
          </div>
        </div>

        {/* SECTION 3: STICKY NOTES — Full width below the two columns */}
        <div
          className="vintage-paper"
          style={{
            padding: '1.25rem',
            borderTop: '4px solid #f59e0b',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <StickyNotesSection userId={currentUser.id} />
        </div>
        </>
      ) : activeView === 'completed' ? (
        /* COMPLETED TASKS VIEW (SAVED SEPARATELY) */
        <div
          className="vintage-paper"
          style={{
            padding: '1.5rem',
            borderTop: '5px solid var(--stamp-green)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '3px double var(--border-sepia-dark)',
              paddingBottom: '0.85rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <div
                className="typewriter-text"
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--stamp-green)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Permanent Archive • Stamped Completed Registry
              </div>
              <h3 className="serif-display" style={{ fontSize: '1.65rem', fontWeight: 800 }}>
                Completed Tasks & Routines ({myCompletedItems.length} Saved Separately)
              </h3>
            </div>

            <span
              className="typewriter-text"
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.65rem',
                backgroundColor: 'var(--stamp-green-bg)',
                color: 'var(--stamp-green)',
                border: '1px solid var(--stamp-green)',
                borderRadius: '3px',
                fontWeight: 700,
              }}
            >
              ALL ITEMS PRESERVED & AUDITED
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '1.5rem' }}>
            All tasks stamped completed are permanently saved in this dedicated register, isolated from your active work desk.
          </p>

          {filteredCompleted.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredCompleted.map((item) => (
                <TaskCard
                  key={item.id}
                  task={item}
                  showAssignee={false}
                  onEdit={handleOpenEdit}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-parchment)',
                border: '2px dashed var(--border-sepia-dark)',
                borderRadius: '4px',
              }}
            >
              <CheckCircle2 size={40} style={{ color: 'var(--stamp-green)', margin: '0 auto 0.75rem' }} />
              <h4 className="serif-display" style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>
                No Completed Items in Registry Yet
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                Stamp your daily tasks or daily routines as complete on your desk to file them in this registry.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* DELETED TASKS ARCHIVE */
        <div
          className="vintage-paper"
          style={{
            padding: '1.5rem',
            borderTop: '5px solid var(--stamp-red)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div
            style={{
              borderBottom: '3px double var(--border-sepia-dark)',
              paddingBottom: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              className="typewriter-text"
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--stamp-red)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Archived & Soft-Deleted Dispatches
            </div>
            <h3 className="serif-display" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              Deleted Tasks & Routines ({myDeletedItems.length})
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
              These dispatches were removed from your active desk, but remain accessible for administrative auditing with restore capability.
            </p>
          </div>

          {filteredDeleted.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredDeleted.map((item) => (
                <TaskCard
                  key={item.id}
                  task={item}
                  showAssignee={false}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-parchment)',
                border: '2px dashed var(--border-sepia-dark)',
                borderRadius: '4px',
              }}
            >
              <Trash2 size={36} style={{ color: 'var(--stamp-red)', margin: '0 auto 0.75rem' }} />
              <h4 className="serif-display" style={{ fontSize: '1.25rem' }}>
                Deleted Archive is Empty
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                No tasks or routines have been deleted.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ruled Desk Scratchpad Bottom Strip */}
      <div
        className="vintage-paper"
        style={{
          marginTop: '2rem',
          padding: '1.25rem',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div
          className="typewriter-text"
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--ink-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '0.5rem',
            borderBottom: '1px solid var(--border-sepia)',
            paddingBottom: '0.4rem',
          }}
        >
          <StickyNote size={14} style={{ color: 'var(--brass-gold)' }} />
          <span>Workstation Scratchpad (Auto-saved)</span>
        </div>
        <textarea
          rows={3}
          value={deskNotes}
          onChange={(e) => handleSaveNotes(e.target.value)}
          placeholder="Quick jotting notes, telegraph codes, or measurements..."
          className="vintage-textarea ledger-ruled"
          style={{
            fontSize: '0.82rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--bg-parchment)',
          }}
        />
      </div>

      {/* Task & Routine Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        defaultType={modalDefaultType}
      />

      {/* Claim Reward Modal */}
      <ClaimRewardModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
      />
    </div>
  );
}

