'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getTasks, markTaskNotified, rolloverDailyRoutines, BUREAU_SYNC_EVENT } from '../lib/storage';
import { playVintageBell, playTypewriterClick, unlockAudioContext } from '../lib/sound';
import { Task } from '../types';
import { Bell, BellRing, X, Clock, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';

interface ActiveAlert {
  id: string;
  task: Task;
  timeStr: string;
  alertType: 'warning_10min' | 'due_now' | 'rollover_notice';
  message: string;
}

// Robustly parse time string (HH:mm, H:mm, etc.) into total minutes from midnight
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

// Format minutes from midnight to HH:mm string
export function formatMinutesToHHmm(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function NotificationManager() {
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [testSent, setTestSent] = useState(false);
  const lastCheckedDateRef = useRef<string>('');

  // Update permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const triggerTestAlert = useCallback(() => {
    unlockAudioContext();
    playVintageBell();

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification('🔔 Dispatch System Active • The Daily Bureau', {
          body: 'Chime & desktop notification verified! Timed reminders will alert 10 min before and right when due.',
          icon: '/bureau_crest.jpg',
          tag: 'bureau-test-alert',
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn('Native notification error:', err);
      }
    }

    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);

    setActiveAlerts((prev) => [
      {
        id: `test-${Date.now()}`,
        task: {
          id: 'sys-test',
          title: 'Mechanical Bell & Dispatch Notification Test',
          itemType: 'task',
          orderNumber: 100,
          reminderTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        } as Task,
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        alertType: 'due_now',
        message: 'Acoustic bell chime and visual telegram toast verified operational. Your scheduled reminders will trigger automatically.',
      },
      ...prev,
    ]);
  }, []);

  useEffect(() => {
    lastCheckedDateRef.current = new Date().toLocaleDateString('en-CA');

    // 1. Daily routine rollover on mount
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

    const checkReminders = () => {
      if (typeof window === 'undefined') return;

      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA');
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // ── Midnight check: If date rolled over past 12:00 AM ──
      if (todayStr !== lastCheckedDateRef.current) {
        lastCheckedDateRef.current = todayStr;
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
        const reminderMinutes = parseTimeToMinutes(task.reminderTime);
        if (reminderMinutes === null) return;

        const cleanReminderTime = formatMinutesToHHmm(reminderMinutes);
        const key10Min = `bureau_alert_10min_${task.id}_${cleanReminderTime}_${todayStr}`;
        const keyDueNow = `bureau_alert_due_${task.id}_${cleanReminderTime}_${todayStr}`;

        // Minutes until scheduled time:
        const diffToReminder = (reminderMinutes - currentMinutes + 1440) % 1440;

        // ── STAGE 1: 10-Minute Advance Notice ─────────────────────────────────
        // Trigger if current time is within 1 to 10 minutes prior to reminder time
        if (
          diffToReminder > 0 &&
          diffToReminder <= 10 &&
          !localStorage.getItem(key10Min) &&
          !localStorage.getItem(keyDueNow)
        ) {
          localStorage.setItem(key10Min, '1');
          unlockAudioContext();
          playVintageBell();

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const notif = new Notification('⏰ 10-Minute Dispatch Notice • The Daily Bureau', {
                body: `"${task.title}" starts in ${diffToReminder} min (at ${cleanReminderTime}). Prepare your workspace!`,
                icon: '/bureau_crest.jpg',
                tag: `bureau-10m-${task.id}`,
              });
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            } catch {
              // Fallback silently
            }
          }

          setActiveAlerts((prev) => [
            {
              id: `alert-10m-${task.id}-${Date.now()}`,
              task,
              timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              alertType: 'warning_10min',
              message: `Scheduled for ${cleanReminderTime} — starts in ${diffToReminder} minute(s).`,
            },
            ...prev,
          ]);
        }

        // ── STAGE 2: Scheduled Time Reached (TIME HIT / DUE NOW) ───────────────
        // Trigger when current time reaches or has reached scheduled time today.
        // We use a 60-minute window (currentMinutes >= reminderMinutes && diff <= 60)
        // so that even if the browser tab was throttled, minimized, or machine slept,
        // the notification fires immediately when active.
        const isTimeHit = currentMinutes >= reminderMinutes && (currentMinutes - reminderMinutes) <= 60;

        if (isTimeHit && !localStorage.getItem(keyDueNow) && task.lastNotifiedDate !== todayStr) {
          localStorage.setItem(keyDueNow, '1');
          localStorage.setItem(key10Min, '1'); // Suppress stale 10-minute alert
          markTaskNotified(task.id, todayStr);
          unlockAudioContext();
          playVintageBell();

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const notif = new Notification('🚨 Dispatch Time Reached! • The Daily Bureau', {
                body: `"${task.title}" is due now (${cleanReminderTime})! Added to your active pending attention list.`,
                icon: '/bureau_crest.jpg',
                tag: `bureau-due-${task.id}`,
                requireInteraction: true,
              });
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            } catch {
              // Fallback silently
            }
          }

          setActiveAlerts((prev) => [
            {
              id: `alert-due-${task.id}-${Date.now()}`,
              task,
              timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              alertType: 'due_now',
              message: `Scheduled work time reached (${cleanReminderTime}). Marked for immediate attention on your desk.`,
            },
            ...prev,
          ]);
        }
      });
    };

    // Run check immediately on mount
    checkReminders();

    // Check every 2.5 seconds for pinpoint accuracy
    const interval = setInterval(checkReminders, 2500);

    // Watchdog event listeners: react immediately when tasks change or user returns to tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkReminders();
      }
    };
    const handleFocus = () => checkReminders();
    const handleSync = () => checkReminders();

    window.addEventListener(BUREAU_SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener(BUREAU_SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const requestPermission = async () => {
    playTypewriterClick();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          playVintageBell();
          new Notification('🔔 Reminders Activated • The Daily Bureau', {
            body: 'You will receive advance notices (10 min before) and chime alerts when scheduled dispatch times are hit.',
            icon: '/bureau_crest.jpg',
          });
        }
      } catch (err) {
        console.warn('Error requesting notification permission:', err);
      }
    }
  };

  const dismissAlert = (id: string) => {
    playTypewriterClick();
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <>
      {/* Top Notification Status Bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={requestPermission}
              className="btn-brass"
              style={{ padding: '0.2rem 0.65rem', fontSize: '0.7rem' }}
            >
              Enable Reminders
            </button>
            <button
              onClick={triggerTestAlert}
              className="btn-parchment"
              style={{ padding: '0.2rem 0.65rem', fontSize: '0.7rem' }}
              title="Test chime sound and toast alert"
            >
              Test Alert
            </button>
          </div>
        </div>
      )}

      {notificationPermission === 'denied' && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            borderBottom: '1px solid #f87171',
            padding: '0.35rem 1.5rem',
            fontSize: '0.72rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={13} />
            <span>Desktop notifications are currently blocked in your browser. Click the site settings icon in the address bar to Allow notifications for timed alerts.</span>
          </div>
          <button
            onClick={triggerTestAlert}
            className="btn-parchment"
            style={{ padding: '0.15rem 0.5rem', fontSize: '0.68rem' }}
          >
            Test Sound Chime
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
                        <span>DISPATCH TIME REACHED • DUE NOW ({alert.task.reminderTime || alert.timeStr})</span>
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
