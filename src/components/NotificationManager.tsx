'use client';

import React, { useEffect, useState } from 'react';
import { getTasks, markTaskNotified, BUREAU_SYNC_EVENT, isSoundEnabled } from '../lib/storage';
import { playVintageBell, playTypewriterClick } from '../lib/sound';
import { Task } from '../types';
import { Bell, BellRing, X, Clock, CheckCircle2 } from 'lucide-react';

interface ActiveAlert {
  id: string;
  task: Task;
  timeStr: string;
}

export default function NotificationManager() {
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    const checkReminders = () => {
      if (typeof window === 'undefined') return;

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentHHmm = `${hours}:${minutes}`;
      const todayStr = now.toISOString().split('T')[0];

      const allTasks = getTasks();
      const dueReminders = allTasks.filter((task) => {
        if (task.status === 'completed' || task.status === 'deleted') return false;
        if (!task.reminderTime) return false;
        if (task.lastNotifiedDate === todayStr) return false;

        // Check time match
        return task.reminderTime === currentHHmm;
      });

      dueReminders.forEach((task) => {
        // Mark task notified for today
        markTaskNotified(task.id, todayStr);

        // 1. Trigger audio chime
        playVintageBell();

        // 2. Trigger browser notification if allowed
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('The Daily Bureau • Work Dispatch Reminder', {
              body: `Time for: ${task.title} (${task.itemType === 'routine' ? 'Daily Routine' : 'Daily Task'})`,
              icon: '/bureau_crest.jpg',
            });
          } catch {
            // fallback
          }
        }

        // 3. Add to floating in-app alert banner
        const alertObj: ActiveAlert = {
          id: `${task.id}-${Date.now()}`,
          task,
          timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setActiveAlerts((prev) => [alertObj, ...prev]);
      });
    };

    // Check immediately and every 8 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 8000);

    return () => clearInterval(interval);
  }, []);

  const requestPermission = async () => {
    playTypewriterClick();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        playVintageBell();
      }
    }
  };

  const dismissAlert = (id: string) => {
    playTypewriterClick();
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <>
      {/* Optional Top Prompt if browser notification not enabled */}
      {notificationPermission === 'default' && (
        <div
          style={{
            backgroundColor: 'var(--bg-parchment-deep)',
            borderBottom: '1px solid var(--border-brass)',
            padding: '0.4rem 1.5rem',
            fontSize: '0.75rem',
            color: 'var(--ink-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={13} style={{ color: 'var(--brass-gold)' }} />
            <span>Enable website notifications to receive timed dispatch and routine reminders directly on your screen.</span>
          </div>
          <button
            onClick={requestPermission}
            className="btn-brass"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
          >
            Enable Reminders
          </button>
        </div>
      )}

      {/* Floating In-App Vintage Telegram Alert Toasts */}
      {activeAlerts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxWidth: '380px',
            width: '90%',
          }}
        >
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className="vintage-paper"
              style={{
                padding: '1rem',
                borderLeft: alert.task.itemType === 'routine' ? '4px solid var(--brass-gold)' : '4px solid var(--stamp-red)',
                backgroundColor: 'var(--bg-card)',
                boxShadow: 'var(--paper-shadow-lg)',
                animation: 'stampSlam 0.3s ease-out',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '0.4rem',
                }}
              >
                <div
                  className="typewriter-text"
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: alert.task.itemType === 'routine' ? 'var(--brass-dark)' : 'var(--stamp-red)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    textTransform: 'uppercase',
                  }}
                >
                  <BellRing size={13} />
                  <span>
                    TELEGRAPH DISPATCH REMINDER • {alert.timeStr}
                  </span>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              <h4
                className="serif-display"
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--ink-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                {alert.task.title}
              </h4>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--ink-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{
                    padding: '0.1rem 0.35rem',
                    backgroundColor: 'var(--bg-parchment)',
                    border: '1px solid var(--border-sepia)',
                    borderRadius: '2px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                  }}
                >
                  {alert.task.itemType === 'routine' ? 'Daily Routine' : 'Daily Task'}
                </span>
                <span>Assigned work time reached.</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
