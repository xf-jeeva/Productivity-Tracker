'use client';

import React, { useState, useEffect } from 'react';
import { Task, User, TaskPriority, ItemType } from '../types';
import { getUsers, getCurrentUser, createTask, updateTask } from '../lib/storage';
import { getAllProfiles, getDeletedUserIdsSync } from '../lib/auth';
import { useAuth } from './AuthProvider';
import { playRubberStampSound, playTypewriterClick, playVintageBell } from '../lib/sound';
import { X, Plus, Trash2, Stamp, Calendar, Clock, Bell, Repeat, CheckSquare, UserCheck } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultType?: ItemType;
  defaultAssigneeId?: string;
}

export default function TaskModal({
  isOpen,
  onClose,
  taskToEdit,
  defaultType = 'task',
  defaultAssigneeId,
}: TaskModalProps) {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [itemType, setItemType] = useState<ItemType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('routine');
  const [category, setCategory] = useState('General Work');
  const [reminderTime, setReminderTime] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(2.0);
  const [dueDate, setDueDate] = useState('');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    const deletedSet = getDeletedUserIdsSync();
    const rawLocal = getUsers().filter(
      (u) =>
        u.id !== 'usr-admin' &&
        u.username?.toLowerCase() !== 'admin' &&
        u.email?.toLowerCase() !== 'admin@dailybureau.org' &&
        !deletedSet.has(u.id.toLowerCase().trim()) &&
        (!u.email || !deletedSet.has(u.email.toLowerCase().trim()))
    );
    let loadedUsers: User[] = [...rawLocal];

    if (authUser && !loadedUsers.some((u) => u.id === authUser.id || u.email?.toLowerCase() === authUser.email.toLowerCase())) {
      if (!deletedSet.has(authUser.id.toLowerCase().trim()) && (!authUser.email || !deletedSet.has(authUser.email.toLowerCase().trim()))) {
        loadedUsers.unshift({
          id: authUser.id,
          username: authUser.email ? authUser.email.split('@')[0] : authUser.id,
          password: '',
          name: authUser.name,
          email: authUser.email,
          role: authUser.role,
          avatar: authUser.avatarUrl || undefined,
          title: authUser.role === 'admin' ? 'Administrator' : 'Team Member',
          department: 'Operations',
          deskNumber: `Desk ${authUser.id.slice(0, 4).toUpperCase()}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    setUsers(loadedUsers);

    // Also pull cloud profiles to ensure newly registered Google accounts appear
    getAllProfiles().then((cloudProfiles) => {
      if (cloudProfiles && cloudProfiles.length > 0) {
        const validProfiles = cloudProfiles.filter(
          (p) =>
            p.id !== 'usr-admin' &&
            p.email?.toLowerCase() !== 'admin@dailybureau.org' &&
            !deletedSet.has(p.id.toLowerCase().trim()) &&
            (!p.email || !deletedSet.has(p.email.toLowerCase().trim()))
        );
        const profileIds = new Set(validProfiles.map((p) => p.id));
        const formatted: User[] = validProfiles.map((p) => {
          const username = p.email ? p.email.split('@')[0] : p.id;
          const existing = loadedUsers.find(
            (u) => u.id === p.id || u.username.toLowerCase() === username.toLowerCase()
          );
          return {
            id: p.id,
            username: existing?.username || username,
            password: '',
            name: p.name || username,
            email: p.email,
            role: p.role,
            avatar: p.avatarUrl || existing?.avatar,
            title: existing?.title || (p.role === 'admin' ? 'Administrator' : 'Team Member'),
            department: existing?.department || 'Operations',
            deskNumber: existing?.deskNumber || `Desk ${p.id.slice(0, 4).toUpperCase()}`,
            createdAt: existing?.createdAt || new Date().toISOString(),
          };
        });

        const merged = [
          ...formatted,
          ...loadedUsers.filter(
            (u) =>
              !profileIds.has(u.id) &&
              !deletedSet.has(u.id.toLowerCase().trim()) &&
              (!u.email || !deletedSet.has(u.email.toLowerCase().trim()))
          ),
        ];
        setUsers(merged);
      }
    });

    if (taskToEdit) {
      setItemType(taskToEdit.itemType || 'task');
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setAssigneeId(taskToEdit.assigneeId || defaultAssigneeId || authUser?.id || '');
      setPriority(taskToEdit.priority);
      setCategory(taskToEdit.category || 'General Work');
      setReminderTime(taskToEdit.reminderTime || '');
      setEstimatedHours(taskToEdit.estimatedHours || 2.0);
      setDueDate(taskToEdit.dueDate);
      setSubtasks(taskToEdit.subtasks || []);
    } else {
      const current = getCurrentUser();
      setItemType(defaultType);
      setTitle('');
      setDescription('');
      const targetAssignee = defaultAssigneeId || authUser?.id || current?.id || loadedUsers[0]?.id || '';
      setAssigneeId(targetAssignee);
      setPriority('routine');
      setCategory('General Work');
      setReminderTime('');
      setEstimatedHours(2.0);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().split('T')[0]);
      setSubtasks([]);
    }
    setNewSubtaskTitle('');
  }, [isOpen, taskToEdit, defaultType, defaultAssigneeId, authUser]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    playTypewriterClick();
    setSubtasks([
      ...subtasks,
      {
        id: `st-${Date.now()}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    playTypewriterClick();
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    playRubberStampSound();

    if (reminderTime && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if (taskToEdit) {
      updateTask(taskToEdit.id, {
        title: title.trim(),
        description: description.trim(),
        itemType,
        reminderTime: reminderTime.trim(),
        priority,
        category,
        estimatedHours: Number(estimatedHours),
        dueDate,
        subtasks,
        assigneeId: assigneeId || taskToEdit.assigneeId,
      });
    } else {
      const current = getCurrentUser();
      const effectiveUid = authUser?.id || current?.id || 'usr-default';
      const effectiveUsername = authUser?.email
        ? authUser.email.split('@')[0]
        : (current?.username || authUser?.name || 'user');

      createTask({
        title: title.trim(),
        description: description.trim(),
        itemType,
        reminderTime: reminderTime.trim(),
        priority,
        category,
        estimatedHours: Number(estimatedHours),
        dueDate,
        subtasks,
        assigneeId: assigneeId || effectiveUid,
        createdById: effectiveUid,
        createdByUsername: effectiveUsername,
      });
    }

    onClose();
  };

  const categories = [
    'General Work',
    'Engineering & Tech',
    'Design & Creative',
    'Operations & Planning',
    'Review & Testing',
  ];

  return (
    <div
      className="modal-overlay-responsive"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 16, 12, 0.72)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <div
        className="vintage-paper modal-card-responsive"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--paper-shadow-lg)',
          border: '2px solid var(--border-sepia-dark)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '3px double var(--border-sepia)',
            paddingBottom: '0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div
              className="typewriter-text"
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--brass-dark)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {itemType === 'routine' ? 'Daily Routine' : 'Daily Task'}
            </div>
            <h2
              className="serif-display"
              style={{
                fontSize: '1.45rem',
                fontWeight: 700,
                color: 'var(--ink-primary)',
                marginTop: '0.15rem',
              }}
            >
              {taskToEdit
                ? `Edit ${itemType === 'routine' ? 'Routine' : 'Task'} #${taskToEdit.orderNumber}`
                : `Create New ${itemType === 'routine' ? 'Daily Routine' : 'Daily Task'}`}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="btn-parchment"
            style={{ padding: '0.35rem 0.55rem' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Section Selector: Daily Task vs Daily Routine */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="vintage-label">Item Type *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                playTypewriterClick();
                setItemType('task');
              }}
              className={itemType === 'task' ? 'btn-brass' : 'btn-parchment'}
              style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', justifyContent: 'center' }}
            >
              <CheckSquare size={15} />
              <span>Daily Task</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTypewriterClick();
                setItemType('routine');
              }}
              className={itemType === 'routine' ? 'btn-brass' : 'btn-parchment'}
              style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', justifyContent: 'center' }}
            >
              <Repeat size={15} />
              <span>Daily Routine</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="vintage-label">
              {itemType === 'routine' ? 'Routine Title *' : 'Task Title *'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={itemType === 'routine' ? 'e.g. Morning team sync & plan' : 'e.g. Complete customer portal integration'}
              className="vintage-input"
            />
          </div>

          {/* Assign To (Allows Admin and Members to assign to anyone) */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="vintage-label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <UserCheck size={14} style={{ color: 'var(--brass-dark)' }} />
                Assign To *
              </span>
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="vintage-input"
              style={{ fontWeight: 600 }}
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email || u.username}) {u.role === 'admin' ? '★ Admin' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="vintage-label">Description & Instructions</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed notes or instructions for this item..."
              className="vintage-textarea"
            />
          </div>

          {/* Reminder Alert Time */}
          <div
            style={{
              backgroundColor: 'var(--bg-parchment)',
              border: '1px solid var(--border-brass)',
              borderRadius: '4px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <label className="vintage-label" style={{ marginBottom: '0.15rem', color: 'var(--brass-dark)' }}>
                  Reminder Alert Time (Browser Notification)
                </label>
                <div style={{ fontSize: '0.74rem', color: 'var(--ink-secondary)' }}>
                  The app alerts you with sound and notification at this scheduled time
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={16} style={{ color: 'var(--brass-gold)' }} />
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    onFocus={() => {
                      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission().catch(() => {});
                      }
                    }}
                    className="vintage-input"
                    style={{ width: '135px', padding: '0.35rem 0.6rem', fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>
                {reminderTime && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const perm = await Notification.requestPermission();
                        if (perm === 'granted') playVintageBell();
                      } catch {}
                    }}
                    className="btn-parchment"
                    style={{ fontSize: '0.66rem', padding: '0.15rem 0.45rem', color: 'var(--brass-dark)' }}
                  >
                    <span>🔔 Enable Desktop Alerts</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Priority & Category Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label className="vintage-label">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="vintage-input"
              >
                <option value="routine">Normal Priority</option>
                <option value="urgent">Urgent Priority</option>
                <option value="opus">High Priority</option>
              </select>
            </div>

            <div>
              <label className="vintage-label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="vintage-input"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Date & Estimated Hours */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <label className="vintage-label">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="vintage-input"
              />
            </div>

            <div>
              <label className="vintage-label">Estimated Hours</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="80"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 1)}
                className="vintage-input"
              />
            </div>
          </div>

          {/* Subtasks Checklist Builder */}
          <div
            style={{
              border: '1px solid var(--border-sepia)',
              borderRadius: '4px',
              padding: '1rem',
              marginBottom: '1.5rem',
              backgroundColor: 'var(--bg-parchment)',
            }}
          >
            <label className="vintage-label" style={{ marginBottom: '0.65rem' }}>
              Subtasks Checklist ({subtasks.length} Defined)
            </label>

            {subtasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
                {subtasks.map((st, index) => (
                  <div
                    key={st.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0.65rem',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '3px',
                      border: '1px solid var(--border-sepia)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="typewriter-text" style={{ color: 'var(--ink-muted)' }}>
                        {index + 1}.
                      </span>
                      <span>{st.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--stamp-red)',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add subtask step..."
                className="vintage-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="btn-parchment"
                style={{ padding: '0.5rem 0.85rem' }}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              borderTop: '1px solid var(--border-sepia)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-parchment"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-brass"
            >
              <Stamp size={15} />
              <span>
                {taskToEdit
                  ? 'Save Changes'
                  : `Create ${itemType === 'routine' ? 'Routine' : 'Task'}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
