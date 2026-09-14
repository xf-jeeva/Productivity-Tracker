'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDailyLogs, getUsers, getCurrentUser, BUREAU_SYNC_EVENT } from '@/lib/storage';
import { DailyWorkLog, User } from '@/types';
import DailyLogModal from '@/components/DailyLogModal';
import { playTypewriterClick } from '@/lib/sound';
import { BookOpen, Calendar, Clock, PlusCircle, User as UserIcon, Feather, AlertTriangle, CheckCircle2, CheckSquare, Users, ShieldCheck } from 'lucide-react';

export default function DispatchLogPage() {
  const [logs, setLogs] = useState<DailyWorkLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setLogs(getDailyLogs());
      setUsers(getUsers());
      setCurrentUser(getCurrentUser());
    };

    sync();
    window.addEventListener(BUREAU_SYNC_EVENT, sync);
    return () => window.removeEventListener(BUREAU_SYNC_EVENT, sync);
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (selectedUserFilter !== 'all' && log.userId !== selectedUserFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Masthead Banner */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          borderTop: '4px solid var(--border-brass)',
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
          <div>
            <div
              className="typewriter-text"
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--brass-dark)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              The Daily Dispatch Archive • Shift Standups
            </div>
            <h2 className="serif-display" style={{ fontSize: '1.8rem', fontWeight: 800 }}>
              Chronological Daily Work Logs
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
              Historical archive of daily work submissions, accomplishments, and next-day agendas filed by team members.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link
              href="/"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="Go to My Work Desk"
            >
              <CheckSquare size={14} style={{ color: 'var(--brass-gold)' }} />
              <span>My Work Desk</span>
            </Link>

            <Link
              href="/team"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="Go to Team Roster"
            >
              <Users size={14} style={{ color: 'var(--stamp-blue)' }} />
              <span>Team Roster</span>
            </Link>

            {currentUser?.role === 'admin' && (
              <Link
                href="/admin"
                className="btn-parchment"
                style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
                title="Go to Admin Oversight"
              >
                <ShieldCheck size={14} style={{ color: 'var(--stamp-red)' }} />
                <span>Admin Oversight</span>
              </Link>
            )}

            <button
              onClick={() => {
                playTypewriterClick();
                setIsLogModalOpen(true);
              }}
              className="btn-brass"
              style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }}
            >
              <Feather size={15} />
              <span>File My Daily Standup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="vintage-paper"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className="vintage-label" style={{ margin: 0 }}>Filter by Personnel:</span>
          <select
            value={selectedUserFilter}
            onChange={(e) => {
              playTypewriterClick();
              setSelectedUserFilter(e.target.value);
            }}
            className="vintage-input"
            style={{ width: '200px', padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
          >
            <option value="all">Entire Bureau Team</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.department})
              </option>
            ))}
          </select>
        </div>

        <div className="typewriter-text" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
          RECORDED ARCHIVE ENTRIES: {filteredLogs.length}
        </div>
      </div>

      {/* Log Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const author = users.find((u) => u.id === log.userId);

            return (
              <div
                key={log.id}
                className="vintage-paper"
                style={{
                  padding: '1.5rem',
                  borderLeft: '4px solid var(--border-brass)',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    borderBottom: '1px solid var(--border-sepia)',
                    paddingBottom: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <img
                      src={author?.avatar}
                      alt={author?.name}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '1.5px solid var(--brass-gold)',
                        objectFit: 'cover',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{author?.name}</div>
                      <div className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                        {author?.title} • {author?.deskNumber}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--ink-secondary)' }}>
                      <Calendar size={14} style={{ color: 'var(--brass-gold)' }} />
                      <span>{log.date}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--ink-secondary)' }}>
                      <Clock size={14} style={{ color: 'var(--brass-gold)' }} />
                      <span>{log.hoursLogged} Hours Logged</span>
                    </div>

                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        backgroundColor: 'var(--bg-parchment)',
                        border: '1px solid var(--border-sepia-dark)',
                        borderRadius: '2px',
                        fontWeight: 700,
                      }}
                    >
                      DISPATCH № {log.logNumber}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                  {/* Accomplishments */}
                  <div>
                    <div
                      className="typewriter-text"
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--stamp-green)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Work Accomplished Today</span>
                    </div>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--ink-primary)', lineHeight: 1.6 }}>
                      {log.accomplishments.map((acc, idx) => (
                        <li key={idx} style={{ marginBottom: '0.3rem' }}>
                          {acc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Impediments & Next Focus */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {log.blockers && (
                      <div
                        style={{
                          backgroundColor: 'var(--stamp-red-bg)',
                          border: '1px dashed var(--stamp-red)',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '3px',
                          fontSize: '0.82rem',
                        }}
                      >
                        <div
                          className="typewriter-text"
                          style={{
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            color: 'var(--stamp-red)',
                            textTransform: 'uppercase',
                            marginBottom: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <AlertTriangle size={12} />
                          <span>Reported Impediment / Blocker</span>
                        </div>
                        <p style={{ color: 'var(--ink-primary)' }}>{log.blockers}</p>
                      </div>
                    )}

                    <div
                      style={{
                        backgroundColor: 'var(--bg-parchment)',
                        border: '1px solid var(--border-sepia)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '3px',
                        fontSize: '0.82rem',
                        marginTop: 'auto',
                      }}
                    >
                      <div
                        className="typewriter-text"
                        style={{
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          color: 'var(--brass-dark)',
                          textTransform: 'uppercase',
                          marginBottom: '0.2rem',
                        }}
                      >
                        Tomorrow's Primary Directive
                      </div>
                      <p style={{ color: 'var(--ink-primary)' }}>{log.nextFocus}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Signature */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    borderTop: '1px dashed var(--border-sepia)',
                    paddingTop: '0.5rem',
                  }}
                >
                  <span className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                    Attested by Artisan:
                  </span>
                  <span
                    className="serif-display"
                    style={{
                      fontStyle: 'italic',
                      fontWeight: 700,
                      color: 'var(--brass-dark)',
                      fontSize: '1rem',
                    }}
                  >
                    {author?.signature}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div
            className="vintage-paper"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              border: '2px dashed var(--border-sepia-dark)',
            }}
          >
            <BookOpen size={36} style={{ color: 'var(--border-brass)', margin: '0 auto 0.75rem' }} />
            <h3 className="serif-display" style={{ fontSize: '1.25rem' }}>
              No Standup Dispatches Found
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: '0.25rem' }}>
              No recorded daily work logs matching this filter.
            </p>
          </div>
        )}
      </div>

      <DailyLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />
    </div>
  );
}
