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

  const handleOpenEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CloudUserSync />
      <NotificationManager />
      <TokenAwardCelebration />
      <Header

        onOpenNewTaskModal={handleOpenNewTask}
      />
      <Navigation />

      <main className="main-content-area">
        {children}
      </main>

      {/* Vintage Footer */}
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
            THE DAILY BUREAU • MASTER DISPATCH & HOROLOGICAL WORKS ARCHIVE
          </div>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.72rem' }}>
            Confidential registry for team daily productivity and master craftsmanship tracking. All work orders and daily standups are filed with permanent ledger numbers.
          </p>
          <div style={{ fontSize: '0.68rem', color: 'var(--ink-faint)', marginTop: '0.25rem' }}>
            Bureau Registry № 894-B • Certified Mechanical Precision
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
