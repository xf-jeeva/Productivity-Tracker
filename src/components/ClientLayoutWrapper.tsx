'use client';

import React, { useState } from 'react';
import Header from './Header';
import Navigation from './Navigation';
import TaskModal from './TaskModal';
import DailyLogModal from './DailyLogModal';
import NotificationManager from './NotificationManager';
import TokenAwardCelebration from './TokenAwardCelebration';
import CloudUserSync from './CloudUserSync';
import { Task } from '../types';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isFileLogModalOpen, setIsFileLogModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const handleOpenNewTask = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CloudUserSync />
      <NotificationManager />
      <TokenAwardCelebration />
      <Header onOpenNewTaskModal={handleOpenNewTask} />
      <Navigation />

      <main className="main-content-area">
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '3px double var(--border-sepia-dark)',
          backgroundColor: 'var(--bg-card-alt)',
          padding: '1.5rem',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--ink-secondary)',
          marginTop: '2rem',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className="typewriter-text" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>
            DAILY BUREAU • PRODUCTIVITY TRACKER & TEAM WORKSPACE
          </div>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.74rem' }}>
            Daily tasks, recurring routines, activity logs, and real-time team collaboration synced to cloud database.
          </p>
          <div style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', marginTop: '0.25rem' }}>
            Fast, secure, and production-ready productivity management.
          </div>
        </div>
      </footer>

      {/* Shared Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
      />

      <DailyLogModal
        isOpen={isFileLogModalOpen}
        onClose={() => setIsFileLogModalOpen(false)}
      />
    </div>
  );
}
