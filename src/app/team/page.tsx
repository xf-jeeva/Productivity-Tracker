'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUsers, getTasks, addUser, deleteUser, setCurrentUser, getCurrentUser, BUREAU_SYNC_EVENT } from '@/lib/storage';
import { getAllProfiles, isMasterAdmin } from '@/lib/auth';
import { useAuth } from '@/components/AuthProvider';
import { User, Department, Task } from '@/types';
import { playRubberStampSound, playTypewriterClick } from '@/lib/sound';
import { Users, UserPlus, Award, CheckCircle2, Clock, X, Stamp, Trash2, ShieldCheck, CheckSquare, BookOpen } from 'lucide-react';

export default function TeamRosterPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUserLocal] = useState<User | null>(null);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string>('');

  // New user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<Department>('Atelier & Craft');
  const [deskNumber, setDeskNumber] = useState('');
  const [signature, setSignature] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');

  useEffect(() => {
    const sync = async () => {
      const raw = getUsers().filter((u) => u.id !== 'usr-admin' && u.username?.toLowerCase() !== 'admin' && u.email?.toLowerCase() !== 'admin@dailybureau.org');
      setUsers(raw);
      setTasks(getTasks());
      setCurrentUserLocal(getCurrentUser());

      try {
        const cloudProfiles = await getAllProfiles();
        if (cloudProfiles && cloudProfiles.length > 0) {
          const profileIds = new Set(cloudProfiles.map((p) => p.id));
          const formatted: User[] = cloudProfiles
            .filter((p) => p.id !== 'usr-admin' && p.email?.toLowerCase() !== 'admin@dailybureau.org')
            .map((p) => {
              const username = p.email ? p.email.split('@')[0] : p.id;
              const existing = raw.find((u) => u.id === p.id || u.username.toLowerCase() === username.toLowerCase());
              const isAdm = isMasterAdmin(p.email);
              return {
                id: p.id,
                username: existing?.username || username,
                password: '',
                name: p.name || username,
                email: p.email,
                role: isAdm ? 'admin' : 'member',
                avatar: p.avatarUrl || existing?.avatar,
                title: existing?.title || (isAdm ? 'Chief Bureau Administrator' : 'Field Operative'),
                department: existing?.department || 'Dispatch & Logistics',
                deskNumber: existing?.deskNumber || `DK-${p.id.slice(0, 4).toUpperCase()}`,
                createdAt: existing?.createdAt || new Date().toISOString(),
              };
            });
          const merged = [
            ...formatted,
            ...raw.filter((u) => !profileIds.has(u.id)),
          ];
          setUsers(merged);
        }
      } catch (e) {
        console.warn('Team roster cloud sync note:', e);
      }
    };

    sync();
    window.addEventListener(BUREAU_SYNC_EVENT, sync);
    return () => window.removeEventListener(BUREAU_SYNC_EVENT, sync);
  }, []);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    playRubberStampSound();

    const generatedUsername = name.trim().toLowerCase().replace(/\s+/g, '.');
    const newUser: User = {
      id: `usr-${Date.now()}`,
      username: generatedUsername,
      password: 'password123',
      name: name.trim(),
      email: email.trim(),
      title: title.trim() || 'Journeyman Artisan',
      department,
      role,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      deskNumber: deskNumber.trim() || 'Desk No. 16 — South Atelier',
      signature: signature.trim() || `${name[0]}. ${name.split(' ').pop()}`,
      createdAt: new Date().toISOString(),
    };

    addUser(newUser);
    setIsNewUserModalOpen(false);

    // Reset form
    setName('');
    setEmail('');
    setTitle('');
    setDeskNumber('');
    setSignature('');
  };

  const handleSwitchUser = (user: User) => {
    playTypewriterClick();
    setCurrentUser(user);
  };

  const handleConfirmDelete = (targetUser: User) => {
    playRubberStampSound();
    const res = deleteUser(targetUser.id);
    if (res.success) {
      setUsers(getUsers());
      setDeleteNotice(`User @${targetUser.username} (${targetUser.name}) has been decommissioned.`);
      setUserToDelete(null);
      setTimeout(() => setDeleteNotice(''), 4500);
    } else {
      alert(res.error || 'Failed to delete user.');
      setUserToDelete(null);
    }
  };

  return (
    <div>
      {/* Masthead Banner */}
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
              Personnel Register • Roll of Artisans & Officers
            </div>
            <h2 className="serif-display" style={{ fontSize: '1.8rem', fontWeight: 800 }}>
              Bureau Personnel Roster
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.15rem' }}>
              Full staff register of craftspeople, systems engineers, and administrative inspectors.
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
              href="/dispatch-log"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="Go to Dispatch Ledger"
            >
              <BookOpen size={14} style={{ color: 'var(--ink-secondary)' }} />
              <span>Dispatch Logs</span>
            </Link>

            {isMasterAdmin(authUser?.email || currentUser?.email) && (
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
                setIsNewUserModalOpen(true);
              }}
              className="btn-brass"
              style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }}
            >
              <UserPlus size={15} />
              <span>Induct New Member</span>
            </button>
          </div>
        </div>

        {deleteNotice && (
          <div
            style={{
              backgroundColor: 'var(--stamp-green-bg)',
              border: '2px solid var(--stamp-green)',
              color: 'var(--stamp-green)',
              padding: '0.75rem 1rem',
              borderRadius: '4px',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{deleteNotice}</span>
          </div>
        )}
      </div>

      {/* Team Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {users.map((user) => {
          const userTasks = tasks.filter((t) => t.assigneeId === user.id);
          const completedTasks = userTasks.filter((t) => t.status === 'completed');
          const isCurrent = currentUser?.id === user.id;

            const isOfficerAdmin = isMasterAdmin(user.email);
            return (
              <div
                key={user.id}
                className="vintage-paper"
                style={{
                  padding: '1.5rem',
                  borderTop: isOfficerAdmin ? '3px solid var(--stamp-red)' : '3px solid var(--brass-gold)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  backgroundColor: isCurrent ? 'var(--bg-card-alt)' : 'var(--bg-card)',
                }}
              >
                {/* Personnel Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '2px solid var(--brass-gold)',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 className="serif-display" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                        {user.name}
                      </h3>
                      {isOfficerAdmin && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '0.1rem 0.4rem',
                            backgroundColor: 'var(--stamp-red-bg)',
                            color: 'var(--stamp-red)',
                            borderRadius: '2px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          CHIEF ADMIN
                        </span>
                      )}
                  </div>
                  <div className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--brass-dark)', fontWeight: 600 }}>
                    {user.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Station Info */}
              <div
                style={{
                  backgroundColor: 'var(--bg-parchment)',
                  border: '1px solid var(--border-sepia)',
                  borderRadius: '3px',
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div>
                  <strong className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-secondary)' }}>
                    DEPARTMENT:
                  </strong>{' '}
                  <span>{user.department}</span>
                </div>
                <div>
                  <strong className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-secondary)' }}>
                    WORKSTATION:
                  </strong>{' '}
                  <span>{user.deskNumber}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed var(--border-sepia)', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
                  <span className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-secondary)' }}>
                    ATTESTED SIGNATURE:
                  </span>
                  <span className="serif-display" style={{ fontStyle: 'italic', fontWeight: 700, color: 'var(--brass-dark)' }}>
                    {user.signature}
                  </span>
                </div>
              </div>

              {/* Work Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--stamp-green-bg)',
                    border: '1px solid var(--stamp-green)',
                    borderRadius: '2px',
                    padding: '0.5rem',
                    textAlign: 'center',
                    color: 'var(--stamp-green)',
                  }}
                >
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{completedTasks.length}</div>
                  <div style={{ fontSize: '0.65rem' }}>COMPLETED ORDERS</div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-parchment)',
                    border: '1px solid var(--border-sepia)',
                    borderRadius: '2px',
                    padding: '0.5rem',
                    textAlign: 'center',
                    color: 'var(--ink-secondary)',
                  }}
                >
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{userTasks.length}</div>
                  <div style={{ fontSize: '0.65rem' }}>TOTAL ASSIGNED</div>
                </div>
              </div>

              {/* Action */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-sepia)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleSwitchUser(user)}
                  className={isCurrent ? 'btn-brass' : 'btn-parchment'}
                  style={{ flex: 1, fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  {isCurrent ? '✓ Active Workstation' : `Switch Persona (${user.name.split(' ')[0]})`}
                </button>
                {isMasterAdmin(authUser?.email || currentUser?.email) && !isMasterAdmin(user.email) && (
                  <button
                    type="button"
                    onClick={() => {
                      playTypewriterClick();
                      setUserToDelete(user);
                    }}
                    className="btn-parchment"
                    style={{ padding: '0.45rem 0.65rem', color: 'var(--stamp-red)', borderColor: 'var(--stamp-red)', cursor: 'pointer' }}
                    title={`Decommission user @${user.username}`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Induct New Member Modal */}
      {isNewUserModalOpen && (
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
          onClick={() => setIsNewUserModalOpen(false)}
        >
          <div
            className="vintage-paper"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '1.75rem',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--paper-shadow-lg)',
              border: '2px solid var(--border-sepia-dark)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                borderBottom: '3px double var(--border-sepia)',
                paddingBottom: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <div className="typewriter-text" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brass-dark)', textTransform: 'uppercase' }}>
                  Induction Registry • Bureau Form 12
                </div>
                <h2 className="serif-display" style={{ fontSize: '1.45rem', fontWeight: 700 }}>
                  Induct New Team Member
                </h2>
              </div>
              <button onClick={() => setIsNewUserModalOpen(false)} className="btn-parchment" style={{ padding: '0.35rem 0.55rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="vintage-label">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Thomasina Vance"
                  className="vintage-input"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="vintage-label">Bureau Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. thomasina.v@dailybureau.org"
                  className="vintage-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="vintage-label">Official Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Precision Machinist"
                    className="vintage-input"
                  />
                </div>

                <div>
                  <label className="vintage-label">Bureau Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="vintage-input"
                  >
                    <option value="Atelier & Craft">Atelier & Craft</option>
                    <option value="Systems & Engineering">Systems & Engineering</option>
                    <option value="Archives & Research">Archives & Research</option>
                    <option value="Dispatch & Logistics">Dispatch & Logistics</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="vintage-label">Desk / Station Allocation</label>
                  <input
                    type="text"
                    value={deskNumber}
                    onChange={(e) => setDeskNumber(e.target.value)}
                    placeholder="e.g. Desk No. 15 — South Bay"
                    className="vintage-input"
                  />
                </div>

                <div>
                  <label className="vintage-label">Attested Signature Script</label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="e.g. T. Vance, Appr."
                    className="vintage-input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="vintage-label">System Role Access</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
                  className="vintage-input"
                >
                  <option value="member">Team Member (Artisan / Engineer)</option>
                  <option value="admin">Bureau Administrator (Full Master Access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-sepia)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setIsNewUserModalOpen(false)} className="btn-parchment">
                  Cancel
                </button>
                <button type="submit" className="btn-brass">
                  <Stamp size={15} />
                  <span>Seal Induction Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decommission Modal */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(20, 16, 12, 0.78)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setUserToDelete(null)}
        >
          <div
            className="vintage-paper"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '1.75rem',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--paper-shadow-lg)',
              border: '3px solid var(--stamp-red)',
              borderRadius: '4px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '2px solid var(--stamp-red)', paddingBottom: '0.75rem' }}>
              <div className="seal-badge" style={{ width: '40px', height: '40px', backgroundColor: 'var(--stamp-red-bg)', color: 'var(--stamp-red)', border: '2px solid var(--stamp-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} />
              </div>
              <div>
                <div className="typewriter-text" style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--stamp-red)', textTransform: 'uppercase' }}>
                  REVOKE PERSONNEL CREDENTIALS
                </div>
                <h3 className="serif-display" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                  Decommission @{userToDelete.username}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to decommission <strong>{userToDelete.name}</strong> from the bureau personnel register?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setUserToDelete(null)} className="btn-parchment" style={{ padding: '0.5rem 1rem' }}>
                Cancel & Retain
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(userToDelete)}
                className="btn-brass"
                style={{
                  padding: '0.5rem 1.15rem',
                  backgroundColor: 'var(--stamp-red)',
                  borderColor: 'var(--stamp-red)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Trash2 size={14} />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
