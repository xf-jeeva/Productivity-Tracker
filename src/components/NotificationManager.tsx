'use client';

import React, { useEffect, useState } from 'react';
import { getTasks, markTaskNotified, rolloverDailyRoutines, BUREAU_SYNC_EVENT } from '../lib/storage';
import { playVintageBell, playTypewriterClick } from '../lib/sound';
import { Task } from '../types';
import { Bell, BellRing, X, Clock, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface ActiveAlert {
  id: string;
  task: Task;
  timeStr: string;
  alertType: 'warning_10min' | 'due_now' | 'rollover_notice';
  message: string;
}

// Calculate HH:mm 10 minutes before the given time string
function getTenMinutesBefore(timeStr: string): string {
  const parts = timeStr.split(':');
  if (parts.length < 2) return '';
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return '';
  let totalMin = h * 60 + m - 10;
  if (totalMin < 0) totalMin += 24 * 60;
  const outH = Math.floor(totalMin / 60);
  const outM = totalMin % 60;
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

export default function NotificationManager() {
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // 1. Check & perform daily routine rollover for new day immediately on mount
    const initialRollover = rolloverDailyRoutines();
    if (initialRollover.rolledOverCount > 0) {
      setActiveAlerts((prev) => [
        {
          id: `rollover-${Date.now()}`,
          task: { id: 'sys-rollover', title: 'Daily Routines Reset for Today', itemType: 'routine' } as Task,
          timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          alertType: 'rollover_notice',
          message: `${initialRollover.rolledOverCount} completed routine(s) have reset back into your active daily checklist for today.`,
        },
        ...prev,
      ]);
    }

    let lastCheckedDate = typeof window !== 'undefined' ? new Date().toLocaleDateString('en-CA') : '';

    const checkReminders = () => {
      if (typeof window === 'undefined') return;

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentHHmm = `${hours}:${minutes}`;
      const todayStr = now.toLocaleDateString('en-CA');

      // ── Midnight check: If date rolled over past 12:00 AM ──
      if (todayStr !== lastCheckedDate) {
        lastCheckedDate = todayStr;
        const res = rolloverDailyRoutines();
        if (res.rolledOverCount > 0) {
          playVintageBell();
          setActiveAlerts((prev) => [
            {
              id: `rollover-${Date.now()}`,
              task: { id: 'sys-rollover', title: '12:00 AM Midnight Rollover', itemType: 'routine' } as Task,
              timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              alertType: 'rollover_notice',
              message: `${res.rolledOverCount} daily routine(s) have reset into your active daily tasks for the new day!`,
            },
            ...prev,
          ]);
        }
      }

      const allTasks = getTasks();

      // Only evaluate active tasks with scheduled reminder times
      const activeTimedTasks = allTasks.filter(
        (t) => t.status !== 'completed' && t.status !== 'deleted' && t.reminderTime
      );

      activeTimedTasks.forEach((task) => {
        const reminderTime = task.reminderTime!;
        const tenMinBefore = getTenMinutesBefore(reminderTime);

        const key10Min = `bureau_alert_10min_${task.id}_${todayStr}`;
        const keyDueNow = `bureau_alert_due_${task.id}_${todayStr}`;

        // ── STAGE 1: 10-Minute Advance Notice ─────────────────────────────────
        if (currentHHmm === tenMinBefore && !localStorage.getItem(key10Min)) {
          localStorage.setItem(key10Min, '1');
          playVintageBell();

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('⏰ 10-Minute Dispatch Notice • The Daily Bureau', {
                body: `"${task.title}" starts in 10 minutes (at ${reminderTime}). Prepare your workspace!`,
                icon: '/bureau_crest.jpg',
              });
            } catch {
              // Ignore fallback
            }
          }

          setActiveAlerts((prev) => [
            {
              id: `alert-10m-${task.id}-${Date.now()}`,
              task,
              timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              alertType: 'warning_10min',
              message: `Scheduled for ${reminderTime} — starts in exactly 10 minutes.`,
            },
            ...prev,
          ]);
        }

        // ── STAGE 2: Reminder Time Reached (Due Now) ──────────────────────────
        if (currentHHmm === reminderTime && !localStorage.getItem(keyDueNow)) {
          localStorage.setItem(keyDueNow, '1');
          markTaskNotified(task.id, todayStr);
          playVintageBell();

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('🚨 Dispatch Time Reached! • The Daily Bureau', {
                body: `"${task.title}" is due now (${reminderTime})! Added to your active pending attention list.`,
                icon: '/bureau_crest.jpg',
              });
            } catch {
              // Ignore fallback
            }
          }

          setActiveAlerts((prev) => [
            {
              id: `alert-due-${task.id}-${Date.now()}`,
              task,
              timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              alertType: 'due_now',
              message: `Scheduled work time reached (${reminderTime}). Marked for immediate attention on your desk.`,
            },
            ...prev,
          ]);
        }
      });
    };

    // Check immediately and every 5 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 5000);

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
            padding: '0.45rem 1.5rem',
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
            <span>Enable website notifications to receive timed dispatch alerts (10 min before & when due) directly on your screen.</span>
          </div>
          <button
            onClick={requestPermission}
            className="btn-brass"
            style={{ padding: '0.2rem 0.65rem', fontSize: '0.7rem' }}
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
            maxWidth: '400px',
            width: '90%',
          }}
        >
          {activeAlerts.map((alert) => {
            const is10Min = alert.alertType === 'warning_10min';
            const isRollover = alert.alertType === 'rollover_notice';
            const borderCol = isRollover
              ? 'var(--stamp-green)'
              : is10Min
              ? 'var(--brass-gold)'
              : 'var(--stamp-red)';
            const headerCol = isRollover
              ? 'var(--stamp-green)'
              : is10Min
              ? 'var(--brass-dark)'
              : 'var(--stamp-red)';

            return (
              <div
                key={alert.id}
                className="vintage-paper"
                style={{
                  padding: '1rem',
                  borderLeft: `5px solid ${borderCol}`,
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
                    marginBottom: '0.35rem',
                  }}
                >
                  <div
                    className="typewriter-text"
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: headerCol,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isRollover ? (
                      <>
                        <Sparkles size={13} />
                        <span>MIDNIGHT 12:00 AM ROLLOVER • {alert.timeStr}</span>
                      </>
                    ) : is10Min ? (
                      <>
                        <Clock size={13} />
                        <span>10-MIN ADVANCE NOTICE • DUE AT {alert.task.reminderTime}</span>
                      </>
                    ) : (
                      <>
                        <BellRing size={13} />
                        <span>DISPATCH TIME REACHED • DUE NOW ({alert.task.reminderTime})</span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => dismissAlert(alert.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink-muted)',
                      cursor: 'pointer',
                      padding: '0.2rem',
                    }}
                    title="Dismiss alert"
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
                    lineHeight: 1.25,
                  }}
                >
                  {alert.task.title}
                </h4>

                <p style={{ fontSize: '0.76rem', color: 'var(--ink-secondary)', marginBottom: '0.4rem', lineHeight: 1.4 }}>
                  {alert.message}
                </p>

                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--ink-muted)',
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
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: 'var(--ink-secondary)',
                    }}
                  >
                    {alert.task.itemType === 'routine' ? 'Daily Routine' : 'Daily Task'}
                  </span>
                  <span>{alert.task.orderNumber ? `Dispatch № ${alert.task.orderNumber}` : 'System Routine'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
