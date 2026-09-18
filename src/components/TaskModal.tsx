'use client';

import React, { useState, useEffect } from 'react';
import { Task, User, TaskPriority, ItemType } from '../types';
import { getUsers, getCurrentUser, createTask, updateTask } from '../lib/storage';
import { useAuth } from './AuthProvider';
import { playRubberStampSound, playTypewriterClick } from '../lib/sound';
import { X, Plus, Trash2, Stamp, Calendar, Clock, Bell, Repeat, CheckSquare } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultType?: ItemType;
}

export default function TaskModal({ isOpen, onClose, taskToEdit, defaultType = 'task' }: TaskModalProps) {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [itemType, setItemType] = useState<ItemType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('routine');
  const [category, setCategory] = useState('Atelier & Craft');
  const [reminderTime, setReminderTime] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(2.0);
  const [dueDate, setDueDate] = useState('');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    const loadedUsers = getUsers();
    if (authUser && !loadedUsers.some((u) => u.id === authUser.id)) {
      loadedUsers.unshift({
        id: authUser.id,
        username: authUser.email ? authUser.email.split('@')[0] : authUser.id,
        password: '',
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        avatar: authUser.avatarUrl || undefined,
        title: authUser.role === 'admin' ? 'Chief Bureau Administrator' : 'Field Operative',
        department: 'Dispatch & Logistics',
        deskNumber: `DK-${authUser.id.slice(0, 4).toUpperCase()}`,
        createdAt: new Date().toISOString(),
      });
    }
    setUsers(loadedUsers);

    if (taskToEdit) {
      setItemType(taskToEdit.itemType || 'task');
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setAssigneeId(taskToEdit.assigneeId);
      setPriority(taskToEdit.priority);
      setCategory(taskToEdit.category);
      setReminderTime(taskToEdit.reminderTime || '');
      setEstimatedHours(taskToEdit.estimatedHours || 2.0);
      setDueDate(taskToEdit.dueDate);
      setSubtasks(taskToEdit.subtasks || []);
    } else {
      const current = getCurrentUser();
      setItemType(defaultType);
      setTitle('');
      setDescription('');
      setAssigneeId(authUser?.id || current?.id || loadedUsers[0]?.id || '');
      setPriority('routine');
      setCategory('Atelier & Craft');
      setReminderTime('');
      setEstimatedHours(2.0);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().split('T')[0]);
      setSubtasks([]);
    }
    setNewSubtaskTitle('');
  }, [isOpen, taskToEdit, defaultType, authUser]);

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
    'Atelier & Craft',
    'Systems & Engineering',
    'Archives & Research',
    'Dispatch & Logistics',
    'Mechanics & Precision',
  ];

  return (
    <div
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
        className="vintage-paper"
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
        {/* Modal Masthead */}
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
              Dispatch Docket • {itemType === 'routine' ? 'Daily Routine Ritual' : 'Daily Work Task'}
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
              {taskToEdit ? `Edit ${itemType === 'routine' ? 'Routine' : 'Task'} № ${taskToEdit.orderNumber}` : `Commission New ${itemType === 'routine' ? 'Daily Routine' : 'Daily Task'}`}
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
          <label className="vintage-label">Docket Classification *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                playTypewriterClick();
                setItemType('task');
              }}
              className={itemType === 'task' ? 'btn-brass' : 'btn-parchment'}
              style={{ padding: '0.65rem 1rem', fontSize: '0.8rem', justifyContent: 'center' }}
            >
              <CheckSquare size={15} />
              <span>Daily Task (Work Order)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTypewriterClick();
                setItemType('routine');
              }}
              className={itemType === 'routine' ? 'btn-brass' : 'btn-parchment'}
              style={{ padding: '0.65rem 1rem', fontSize: '0.8rem', justifyContent: 'center' }}
            >
              <Repeat size={15} />
              <span>Daily Routine (Habit / Ritual)</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="vintage-label">
              {itemType === 'routine' ? 'Routine Name / Workstation Habit *' : 'Task Specification Title *'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={itemType === 'routine' ? 'e.g. Morning lathe oiling & calibration check' : 'e.g. Calibrate astronomical escapement balance'}
              className="vintage-input"
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="vintage-label">Directives & Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions or notes for this item..."
              className="vintage-textarea"
            />
          </div>

          {/* Work Assign / Reminder Time Row */}
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
                  Work Assign / Reminder Time (Website Notification)
                </label>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
                  Website alerts you with a chime & notification at this exact scheduled time
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={16} style={{ color: 'var(--brass-gold)' }} />
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="vintage-input"
                  style={{ width: '135px', padding: '0.35rem 0.6rem', fontSize: '0.85rem', fontWeight: 600 }}
                />
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
              <label className="vintage-label">Urgency Seal</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="vintage-input"
              >
                <option value="routine">Routine Docket</option>
                <option value="urgent">Urgent Dispatch</option>
                <option value="opus">Priority Opus (Crucial)</option>
              </select>
            </div>

            <div>
              <label className="vintage-label">Department / Category</label>
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
              <label className="vintage-label">Scheduled Date</label>
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
              Checklist Sub-Steps ({subtasks.length} Defined)
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
                placeholder="Add step (e.g. Check hydraulic reservoir)..."
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
              <span>{taskToEdit ? 'Save Revisions' : `Commission ${itemType === 'routine' ? 'Routine' : 'Task'}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
