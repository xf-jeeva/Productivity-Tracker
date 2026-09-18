'use client';

import React, { useState } from 'react';
import { Task, User } from '../types';
import { 
  toggleSubTask, 
  markTaskComplete, 
  adminSignOff, 
  deleteTask, 
  restoreTask,
  permanentDeleteTask,
  getCurrentUser, 
  getUserByUsername 
} from '../lib/storage';
import { playRubberStampSound, playVintageBell, playTypewriterClick, playCoinClink } from '../lib/sound';
import { useAuth } from './AuthProvider';
import RubberStamp from './RubberStamp';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Clock, 
  Calendar, 
  CheckSquare, 
  Square, 
  Trash2, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  Stamp, 
  RotateCcw,
  Edit3,
  Bell,
  Repeat,
  Coins,
  User as UserIcon
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  showAssignee?: boolean;
}

export default function TaskCard({ task, onEdit, showAssignee = true }: TaskCardProps) {
  const { user: authUser } = useAuth();
  const [justStamped, setJustStamped] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [adminNoteInput, setAdminNoteInput] = useState(task.adminNotes || '');
  const [isSigning, setIsSigning] = useState(false);

  const currentUser = getCurrentUser();
  const effectiveUsername = authUser?.email
    ? authUser.email.split('@')[0]
    : (currentUser?.username || authUser?.name || 'user');

  const isAdmin = authUser?.role === 'admin' || currentUser?.role === 'admin';
  const isDeleted = task.status === 'deleted';

  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((st) => st.completed).length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const isReminderDueNow = (() => {
    if (!task.reminderTime || task.status === 'completed' || task.status === 'deleted') return false;
    const now = new Date();
    const parts = task.reminderTime.split(':');
    if (parts.length < 2) return false;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return false;
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const reminderMin = h * 60 + m;
    return currentMin >= reminderMin;
  })();

  const is10MinWarning = (() => {
    if (!task.reminderTime || task.status === 'completed' || task.status === 'deleted') return false;
    const now = new Date();
    const parts = task.reminderTime.split(':');
    if (parts.length < 2) return false;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return false;
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const reminderMin = h * 60 + m;
    return currentMin >= reminderMin - 10 && currentMin < reminderMin;
  })();

  const handleToggleSubtask = (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleted) return;
    playTypewriterClick();
    toggleSubTask(task.id, subtaskId);
  };

  const handleCompleteTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleted) return;

    const isBecomingComplete = task.status !== 'completed';

    if (isBecomingComplete) {
      playRubberStampSound();
      setTimeout(() => playVintageBell(), 180);
      setTimeout(() => playCoinClink(), 320);

      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.7 },
        colors: ['#1d5236', '#b38234', '#d8a658', '#f7f2e7'],
        disableForReducedMotion: true,
      });

      setJustStamped(true);
      setTimeout(() => setJustStamped(false), 800);
    } else {
      playTypewriterClick();
    }

    markTaskComplete(task.id, effectiveUsername);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Move Dispatch Order № ${task.orderNumber} to Deleted archive?`)) {
      playTypewriterClick();
      deleteTask(task.id, effectiveUsername);
    }
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    playRubberStampSound();
    restoreTask(task.id);
  };

  const handlePermanentDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Permanently purge Dispatch Order № ${task.orderNumber}? This will remove it completely from your desk and the Bureau cloud database.`)) {
      playTypewriterClick();
      permanentDeleteTask(task.id);
    }
  };

  const handleAdminSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !currentUser) return;

    playRubberStampSound();
    adminSignOff(task.id, currentUser, adminNoteInput);
    setIsSigning(false);
  };

  return (
    <div
      className="vintage-paper"
      style={{
        padding: '1.25rem',
        marginBottom: '1rem',
        transition: 'box-shadow 0.2s, transform 0.2s',
        borderLeft: isDeleted
          ? '4px solid var(--stamp-red)'
          : task.status === 'completed' 
            ? '4px solid var(--stamp-green)' 
            : isReminderDueNow
              ? '5px solid var(--stamp-red)'
              : is10MinWarning
                ? '4px solid var(--brass-gold)'
                : task.priority === 'opus' 
                  ? '4px solid var(--brass-gold)' 
                  : task.priority === 'urgent' 
                    ? '4px solid var(--stamp-red)' 
                    : '4px solid var(--border-sepia-dark)',
        position: 'relative',
        backgroundColor: isDeleted 
          ? 'var(--bg-parchment-deep)' 
          : task.status === 'completed' 
            ? 'var(--bg-card-alt)' 
            : 'var(--bg-card)',
        opacity: isDeleted ? 0.85 : 1,
        boxSizing: 'border-box',
        maxWidth: '100%',
        overflow: 'hidden',
        wordBreak: 'break-word',
      }}
    >
      {/* Header Ledger Band */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          borderBottom: '1px solid var(--border-sepia)',
          paddingBottom: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span
            className="typewriter-text"
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--ink-secondary)',
              letterSpacing: '0.06em',
            }}
          >
            DISPATCH № {task.orderNumber}
          </span>
          <span style={{ color: 'var(--ink-faint)' }}>•</span>

          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '0.15rem 0.45rem',
              borderRadius: '2px',
              backgroundColor: task.itemType === 'routine' ? 'var(--brass-glow)' : 'var(--bg-parchment-deep)',
              color: task.itemType === 'routine' ? 'var(--brass-dark)' : 'var(--ink-secondary)',
              border: '1px solid var(--border-sepia)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            {task.itemType === 'routine' && <Repeat size={10} />}
            {task.itemType === 'routine' ? 'DAILY ROUTINE' : 'DAILY TASK'}
          </span>

          {/* Token Reward Bounty Badge */}
          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '0.15rem 0.45rem',
              borderRadius: '2px',
              backgroundColor: 'var(--brass-glow)',
              color: 'var(--brass-dark)',
              border: '1px solid var(--border-brass)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title={`Earn ${task.priority === 'opus' ? '2 Tokens (Worth ₹4)' : '1 Token (Worth ₹2)'} on completion`}
          >
            <span>🪙</span>
            <span>+{task.priority === 'opus' ? '2 Tokens (₹4)' : '1 Token (₹2)'}</span>
          </span>

          {task.reminderTime && (
            <span
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '0.15rem 0.45rem',
                borderRadius: '2px',
                backgroundColor: isReminderDueNow
                  ? 'var(--stamp-red-bg)'
                  : is10MinWarning
                  ? 'var(--brass-glow)'
                  : 'var(--stamp-blue-bg)',
                color: isReminderDueNow
                  ? 'var(--stamp-red)'
                  : is10MinWarning
                  ? 'var(--brass-dark)'
                  : 'var(--stamp-blue)',
                border: isReminderDueNow
                  ? '1.5px solid var(--stamp-red)'
                  : is10MinWarning
                  ? '1.5px solid var(--brass-gold)'
                  : '1px solid var(--border-sepia)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                animation: isReminderDueNow ? 'gentlePulse 2s infinite' : 'none',
              }}
              title={
                isReminderDueNow
                  ? `Reminder time (${task.reminderTime}) reached! Pending action.`
                  : is10MinWarning
                  ? `Starts in 10 minutes (${task.reminderTime})!`
                  : `Scheduled reminder alert time: ${task.reminderTime}`
              }
            >
              <Bell size={10} />
              <span>
                {isReminderDueNow
                  ? `DUE NOW (${task.reminderTime})`
                  : is10MinWarning
                  ? `10m ALERT (${task.reminderTime})`
                  : task.reminderTime}
              </span>
            </span>
          )}

          <span style={{ color: 'var(--ink-faint)' }}>•</span>
          <span
            className="typewriter-text"
            style={{
              fontSize: '0.7rem',
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
            }}
          >
            {task.category}
          </span>
        </div>


        {/* Priority & Status Stamps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isDeleted ? (
            <RubberStamp
              type="deleted"
              text="DELETED"
              subtext={task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : undefined}
            />
          ) : (
            <>
              <RubberStamp type={task.priority} />

              {task.status === 'completed' && (
                <RubberStamp
                  type="completed"
                  text="COMPLETED"
                  animate={justStamped}
                  subtext={task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                />
              )}

              {task.adminSignedOff && (
                <RubberStamp
                  type="approved"
                  text="CHIEF SEAL"
                  subtext="VERIFIED"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div style={{ marginBottom: '0.85rem' }}>
        <h3
          className="serif-display"
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--ink-primary)',
            lineHeight: 1.3,
            marginBottom: '0.4rem',
            textDecoration: isDeleted || task.status === 'completed' ? 'line-through' : 'none',
            opacity: isDeleted || task.status === 'completed' ? 0.75 : 1,
          }}
        >
          {task.title}
        </h3>
        {task.description && (
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--ink-secondary)',
              lineHeight: 1.5,
            }}
          >
            {task.description}
          </p>
        )}
      </div>

      {/* Subtasks Progress & Expandable Checklist */}
      {totalSubtasks > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-parchment)',
            border: '1px solid var(--border-sepia)',
            borderRadius: '3px',
            padding: '0.65rem 0.85rem',
            marginBottom: '0.85rem',
          }}
        >
          <div
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckSquare size={13} style={{ color: 'var(--brass-gold)' }} />
              <span>
                CHECKLIST: {completedSubtasks}/{totalSubtasks} ITEMS
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>{Math.round(subtaskProgress)}%</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          <div
            style={{
              height: '4px',
              backgroundColor: 'var(--border-sepia)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginTop: '0.45rem',
            }}
          >
            <div
              style={{
                width: `${subtaskProgress}%`,
                height: '100%',
                backgroundColor: subtaskProgress === 100 ? 'var(--stamp-green)' : 'var(--brass-gold)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {expanded && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {task.subtasks.map((st) => (
                <div
                  key={st.id}
                  onClick={(e) => handleToggleSubtask(st.id, e)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: isDeleted ? 'default' : 'pointer',
                    fontSize: '0.82rem',
                    padding: '0.25rem 0.35rem',
                    borderRadius: '2px',
                    backgroundColor: 'var(--bg-card)',
                  }}
                >
                  {st.completed ? (
                    <CheckSquare size={14} style={{ color: 'var(--stamp-green)' }} />
                  ) : (
                    <Square size={14} style={{ color: 'var(--ink-muted)' }} />
                  )}
                  <span
                    style={{
                      textDecoration: st.completed ? 'line-through' : 'none',
                      color: st.completed ? 'var(--ink-muted)' : 'var(--ink-primary)',
                    }}
                  >
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Notes & Sign-off Details */}
      {task.adminNotes && (
        <div
          style={{
            border: '1px dashed var(--border-brass)',
            backgroundColor: 'var(--bg-card-alt)',
            padding: '0.65rem 0.85rem',
            marginBottom: '0.85rem',
            borderRadius: '3px',
            fontSize: '0.8rem',
          }}
        >
          <div
            className="typewriter-text"
            style={{
              fontWeight: 700,
              fontSize: '0.68rem',
              color: 'var(--brass-dark)',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '0.25rem',
            }}
          >
            <Award size={12} />
            <span>Chief Inspector Annotation:</span>
          </div>
          <p style={{ fontStyle: 'italic', color: 'var(--ink-secondary)' }}>
            "{task.adminNotes}"
          </p>
        </div>
      )}

      {/* Footer Meta Strip & Action Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderTop: '1px solid var(--border-sepia)',
          paddingTop: '0.75rem',
          marginTop: '0.5rem',
        }}
      >
        {/* Creator / Assignee info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div
            className="typewriter-text"
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--brass-dark)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <UserIcon size={13} />
            <span>User: @{task.createdByUsername || 'unknown'}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.72rem',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Calendar size={13} />
            <span>Due {task.dueDate}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '0.4rem',
            maxWidth: '100%',
          }}
        >
          {isDeleted ? (
            <>
              <button
                onClick={handleRestore}
                className="btn-brass"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                title="Restore task to active"
              >
                <RotateCcw size={13} />
                <span>Restore Task</span>
              </button>

              <button
                onClick={handlePermanentDelete}
                className="btn-parchment"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', color: 'var(--stamp-red)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                title="Permanently purge task and remove from database"
              >
                <Trash2 size={13} />
                <span>Purge Permanently</span>
              </button>
            </>
          ) : (
            <>
              {/* Mark Complete button */}
              <button
                onClick={handleCompleteTask}
                className={task.status === 'completed' ? 'btn-parchment' : 'btn-brass'}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
                title={task.status === 'completed' ? 'Reopen task' : 'Mark task completed with ink stamp'}
              >
                <Stamp size={13} />
                <span>{task.status === 'completed' ? 'Reopen Order' : 'Stamp as Complete'}</span>
              </button>

              {/* Edit button */}
              {onEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="btn-parchment"
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.72rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  title="Edit task or routine details"
                >
                  <Edit3 size={12} style={{ color: 'var(--brass-gold)' }} />
                  <span>Edit</span>
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={handleDelete}
                className="btn-parchment"
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.72rem', color: 'var(--stamp-red)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                title="Delete task from desk"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
