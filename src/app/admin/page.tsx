'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  getCurrentUser, 
  getUsers, 
  getTasks, 
  createUser, 
  updateUserRole, 
  updateUserPassword,
  deleteUser,
  deleteTask,
  restoreTask,
  resetBureauData,
  BUREAU_SYNC_EVENT,
  getUserTasksBreakdown,
  getRewardClaims,
  updateRewardClaimStatus,
  getUserTokens,
  TOKEN_RUPEE_RATE,
  MIN_REDEEM_AMOUNT_RUPEES,
  MIN_REDEEM_TOKENS
} from '@/lib/storage';

import { User, Task, Role, RewardClaim } from '@/types';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import RubberStamp from '@/components/RubberStamp';
import { 
  playTypewriterClick, 
  playRubberStampSound, 
  playVintageBell,
  playCoinClink,
  playCoinRewardFanfare 
} from '@/lib/sound';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  UserPlus, 
  KeyRound, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Search, 
  Stamp, 
  Lock, 
  RotateCcw,
  LogIn,
  AlertCircle,
  FolderOpen,
  Coins,
  CreditCard,
  Gift,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  BookOpen
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewardClaims, setRewardClaims] = useState<RewardClaim[]>([]);

  // Selected user for task breakdown view ('all' or specific username)
  const [selectedUsername, setSelectedUsername] = useState<string>('all');
  const [taskCategoryTab, setTaskCategoryTab] = useState<'all' | 'created' | 'completed' | 'deleted'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Create User Form State
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('member');
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');

  // Change Admin Password State
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [newAdminPass, setNewAdminPass] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // User Decommission Modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string>('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Expanded columns state per user: { [user_columnKey]: boolean }
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

  const toggleColumnExpanded = (username: string, colKey: string) => {
    playTypewriterClick();
    const key = `${username}_${colKey}`;
    setExpandedColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    const sync = () => {
      setCurrentUser(getCurrentUser());
      setUsers(getUsers());
      setTasks(getTasks());
      setRewardClaims(getRewardClaims());
    };

    sync();
    window.addEventListener(BUREAU_SYNC_EVENT, sync);
    return () => window.removeEventListener(BUREAU_SYNC_EVENT, sync);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Handle Approve Reward Claim
  const handleApproveClaim = (claimId: string) => {
    playRubberStampSound();
    setTimeout(() => playCoinRewardFanfare(), 120);
    updateRewardClaimStatus(claimId, 'approved', 'Disbursed by Bureau Chief via Treasury.', currentUser?.username || 'admin');
  };

  // Handle Reject Reward Claim
  const handleRejectClaim = (claimId: string) => {
    playTypewriterClick();
    updateRewardClaimStatus(claimId, 'rejected', 'Claim rejected; tokens refunded to member.', currentUser?.username || 'admin');
  };

  // Handle Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');
    setCreateUserSuccess('');

    const res = createUser({
      username: newUsername,
      password: newPassword,
      name: newName.trim() || newUsername.trim(),
      role: newRole,
    });

    if (!res.success) {
      setCreateUserError(res.error || 'Failed to create user.');
      return;
    }

    playRubberStampSound();
    setCreateUserSuccess(`User @${res.user?.username} successfully registered with role: ${res.user?.role}.`);
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewRole('member');
    setTimeout(() => {
      setCreateUserSuccess('');
      setIsCreateUserOpen(false);
    }, 2000);
  };


  // Handle Role Change / Fix
  const handleRoleChange = (userId: string, targetRole: Role) => {
    playTypewriterClick();
    updateUserRole(userId, targetRole);
  };

  // Handle Change Admin Password
  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newAdminPass.trim()) return;

    playTypewriterClick();
    updateUserPassword(currentUser.id, newAdminPass.trim());
    setChangePassSuccess('Admin password updated successfully!');
    setNewAdminPass('');
    setTimeout(() => {
      setChangePassSuccess('');
      setIsChangePassOpen(false);
    }, 2000);
  };

  // Handle Decommission / Delete User Initiation
  const handleInitiateDelete = (user: User) => {
    playTypewriterClick();
    if (user.username.toLowerCase() === 'admin') {
      alert('The Bureau Master Administrator (@admin) cannot be deleted.');
      return;
    }
    setUserToDelete(user);
  };

  // Confirm and execute decommission
  const handleConfirmDelete = (targetUser: User) => {
    playRubberStampSound();
    const res = deleteUser(targetUser.id);
    if (res.success) {
      const updated = getUsers();
      setUsers(updated);
      if (selectedUsername.toLowerCase() === targetUser.username.toLowerCase()) {
        setSelectedUsername('all');
      }
      setDeleteNotice(`User @${targetUser.username} (${targetUser.name}) was successfully decommissioned from the Bureau Registry.`);
      setUserToDelete(null);
      setTimeout(() => setDeleteNotice(''), 5000);
    } else {
      alert(res.error || 'Failed to decommission user.');
      setUserToDelete(null);
    }
  };

  // Confirm and execute full reset
  const handleConfirmReset = () => {
    playRubberStampSound();
    resetBureauData();
    setSelectedUsername('all');
    setDeleteNotice('Bureau Ledger and registry have been completely reset to a fresh slate.');
    setIsResetModalOpen(false);
    setTimeout(() => setDeleteNotice(''), 5000);
  };

  // If user is not admin
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '520px', margin: '4rem auto', textAlign: 'center' }}>
        <div
          className="vintage-paper"
          style={{
            padding: '2.5rem',
            borderTop: '5px solid var(--stamp-red)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <ShieldAlert size={48} style={{ color: 'var(--stamp-red)', margin: '0 auto 1rem' }} />
          <h2 className="serif-display" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            Administrative Ledger Restricted
          </h2>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            This page is restricted to Bureau Administrators. Please log in with the administrator account (<code style={{ background: 'var(--bg-parchment)', padding: '0.1rem 0.3rem' }}>admin / password</code>).
          </p>
          <Link href="/login" className="btn-brass" style={{ padding: '0.65rem 1.5rem' }}>
            <LogIn size={16} />
            <span>Go to Admin Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  // Active users list to inspect
  const displayUsers = selectedUsername === 'all' 
    ? users 
    : users.filter((u) => u.username.toLowerCase() === selectedUsername.toLowerCase());

  return (
    <div>
      {/* Master Masthead Banner */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.75rem',
          marginBottom: '1.5rem',
          borderTop: '5px solid var(--stamp-red)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div className="seal-badge" style={{ width: '56px', height: '56px', fontSize: '1.35rem' }}>
              ADM
            </div>

            <div>
              <div
                className="typewriter-text"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--stamp-red)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Office of the Bureau Chief • Master Oversight Registry
              </div>
              <h2
                className="serif-display"
                style={{
                  fontSize: '1.95rem',
                  fontWeight: 800,
                  color: 'var(--ink-primary)',
                  lineHeight: 1.2,
                }}
              >
                Admin Oversight Dashboard
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                Manage team users, fix user roles, and inspect all created, completed, and deleted tasks separated by username.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link
              href="/"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="Return to active tasks desk"
            >
              <CheckSquare size={14} style={{ color: 'var(--brass-gold)' }} />
              <span>My Work Desk</span>
            </Link>

            <Link
              href="/team"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="View all team personnel"
            >
              <Users size={14} style={{ color: 'var(--stamp-blue)' }} />
              <span>Team Roster</span>
            </Link>

            <Link
              href="/dispatch-log"
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
              title="View master dispatch log"
            >
              <BookOpen size={14} style={{ color: 'var(--ink-secondary)' }} />
              <span>Dispatch Logs</span>
            </Link>

            <button
              onClick={() => {
                playTypewriterClick();
                setIsCreateUserOpen(!isCreateUserOpen);
              }}
              className="btn-brass"
              style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }}
            >
              <UserPlus size={15} />
              <span>{isCreateUserOpen ? 'Close User Form' : 'Create New User'}</span>
            </button>

            <button
              onClick={() => {
                playTypewriterClick();
                setIsChangePassOpen(!isChangePassOpen);
              }}
              className="btn-parchment"
              style={{ padding: '0.55rem 0.95rem', fontSize: '0.78rem' }}
            >
              <KeyRound size={14} style={{ color: 'var(--brass-gold)' }} />
              <span>Change Passkey</span>
            </button>

            <button
              onClick={() => {
                playTypewriterClick();
                setIsResetModalOpen(true);
              }}
              className="btn-parchment"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem', color: 'var(--stamp-red)', borderColor: 'var(--stamp-red)' }}
              title="Reset all tasks and data to fresh"
            >
              <RotateCcw size={14} style={{ color: 'var(--stamp-red)' }} />
              <span>Reset Fresh</span>
            </button>
          </div>
        </div>

        {deleteNotice && (
          <div
            style={{
              backgroundColor: 'var(--stamp-green-bg)',
              border: '2px solid var(--stamp-green)',
              color: 'var(--stamp-green)',
              padding: '0.85rem 1.25rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              boxShadow: 'var(--paper-shadow)',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{deleteNotice}</span>
          </div>
        )}

        {/* Change Password Drawer */}
        {isChangePassOpen && (
          <form
            onSubmit={handleChangeAdminPassword}
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              backgroundColor: 'var(--bg-parchment)',
              border: '1px solid var(--border-brass)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label className="vintage-label">New Admin Password</label>
              <input
                type="password"
                required
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                placeholder="Enter new password (default was 'password')"
                className="vintage-input"
              />
            </div>
            <button type="submit" className="btn-brass" style={{ marginTop: '1.1rem' }}>
              Update Passkey
            </button>
            {changePassSuccess && (
              <div style={{ color: 'var(--stamp-green)', fontSize: '0.8rem', fontWeight: 600 }}>
                {changePassSuccess}
              </div>
            )}
          </form>
        )}

        {/* Create User Drawer */}
        {isCreateUserOpen && (
          <form
            onSubmit={handleCreateUser}
            style={{
              marginTop: '1.25rem',
              padding: '1.25rem',
              backgroundColor: 'var(--bg-parchment)',
              border: '2px solid var(--border-brass)',
              borderRadius: '4px',
            }}
          >
            <div
              className="typewriter-text"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--brass-dark)',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <UserPlus size={15} />
              <span>Register New User Credentials</span>
            </div>

            {createUserError && (
              <div
                style={{
                  backgroundColor: 'var(--stamp-red-bg)',
                  border: '1px solid var(--stamp-red)',
                  color: 'var(--stamp-red)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '3px',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                }}
              >
                {createUserError}
              </div>
            )}

            {createUserSuccess && (
              <div
                style={{
                  backgroundColor: 'var(--stamp-green-bg)',
                  border: '1px solid var(--stamp-green)',
                  color: 'var(--stamp-green)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '3px',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                }}
              >
                {createUserSuccess}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <label className="vintage-label">Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  className="vintage-input"
                />
              </div>

              <div>
                <label className="vintage-label">Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. pass123"
                  className="vintage-input"
                />
              </div>

              <div>
                <label className="vintage-label">Full Name / Display Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="vintage-input"
                />
              </div>

              <div>
                <label className="vintage-label">Assigned Role *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="vintage-input"
                >
                  <option value="member">Team Member</option>
                  <option value="admin">Bureau Administrator</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsCreateUserOpen(false)}
                className="btn-parchment"
              >
                Cancel
              </button>
              <button type="submit" className="btn-brass">
                <Stamp size={14} />
                <span>Confirm & Create User</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* User Roster & Role Fixing Table */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.25rem',
          marginBottom: '2rem',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div
          className="ruled-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <h3 className="serif-display" style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              Team Users & Role Assignment
            </h3>
            <p className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              The administrator can assign and fix user roles directly from this registry
            </p>
          </div>
          <div className="typewriter-text" style={{ fontSize: '0.75rem', color: 'var(--brass-dark)', fontWeight: 700 }}>
            {users.length} REGISTERED ACCOUNTS
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <thead>
              <tr
                className="typewriter-text"
                style={{
                  borderBottom: '2px solid var(--border-sepia-dark)',
                  textAlign: 'left',
                  fontSize: '0.72rem',
                  color: 'var(--ink-secondary)',
                  backgroundColor: 'var(--bg-parchment)',
                }}
              >
                <th style={{ padding: '0.65rem 0.75rem' }}>USERNAME</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>PASSWORD</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>FULL NAME</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>ROLE ACCESS</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>TOKEN PURSE (₹2/ea)</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>REGISTERED DATE</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const uTokens = getUserTokens(user.username);
                return (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid var(--border-sepia)',
                      backgroundColor: selectedUsername.toLowerCase() === user.username.toLowerCase() ? 'var(--bg-card-alt)' : 'transparent',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>
                      <span className="typewriter-text" style={{ color: 'var(--brass-dark)' }}>
                        @{user.username}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <code
                        className="typewriter-text"
                        style={{
                          padding: '0.2rem 0.45rem',
                          backgroundColor: 'var(--bg-parchment-deep)',
                          border: '1px dashed var(--border-brass)',
                          borderRadius: '3px',
                          fontSize: '0.78rem',
                          color: 'var(--ink-primary)',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                        title="Account Password"
                      >
                        <KeyRound size={11} style={{ color: 'var(--brass-gold)' }} />
                        <span>{user.password}</span>
                      </code>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {user.name}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {/* Role Fixer Dropdown */}
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                        className="vintage-input"
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          width: '130px',
                          border: user.role === 'admin' ? '1px solid var(--stamp-red)' : '1px solid var(--border-sepia-dark)',
                          fontWeight: 600,
                          color: user.role === 'admin' ? 'var(--stamp-red)' : 'var(--ink-primary)',
                        }}
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          backgroundColor: 'var(--brass-glow)',
                          color: 'var(--brass-dark)',
                          border: '1px solid var(--border-brass)',
                          borderRadius: '3px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span>🪙</span>
                        <span>{uTokens.balance} Tokens</span>
                        <span style={{ color: 'var(--stamp-green)', fontWeight: 800 }}>₹{uTokens.rupeeWorth}</span>
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: 'var(--ink-muted)', fontSize: '0.75rem' }}>
                      {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            playTypewriterClick();
                            setSelectedUsername(selectedUsername === user.username ? 'all' : user.username);
                          }}
                          className={selectedUsername === user.username ? 'btn-brass' : 'btn-parchment'}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                          title={`Filter dispatches to @${user.username}`}
                        >
                          {selectedUsername === user.username ? 'Viewing Below' : `Inspect @${user.username}`}
                        </button>

                        {user.username.toLowerCase() !== 'admin' ? (
                          <button
                            type="button"
                            onClick={() => handleInitiateDelete(user)}
                            className="btn-parchment"
                            style={{
                              padding: '0.3rem 0.55rem',
                              fontSize: '0.72rem',
                              color: 'var(--stamp-red)',
                              borderColor: 'var(--stamp-red)',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              cursor: 'pointer',
                            }}
                            title={`Decommission and delete @${user.username}`}
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--ink-muted)',
                              fontStyle: 'italic',
                              padding: '0.3rem 0.5rem',
                            }}
                            title="Master bureau account cannot be deleted"
                          >
                            Master
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== BUREAU TREASURY & REWARD CLAIMS LEDGER ==================== */}
      <div
        className="vintage-paper"
        style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          backgroundColor: 'var(--bg-card)',
          borderTop: '4px solid var(--brass-gold)',
        }}
      >
        <div
          className="ruled-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="vintage-coin" style={{ width: '42px', height: '42px', fontSize: '1.2rem' }}>
              <div className="vintage-coin-inner">₹</div>
            </div>
            <div>
              <h3 className="serif-display" style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                Bureau Treasury & Reward Claims Ledger
              </h3>
              <p className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'uppercase', margin: 0 }}>
                Audited payout requisitions (1 Token = ₹{TOKEN_RUPEE_RATE} • Min. Cashout: {MIN_REDEEM_TOKENS} Tokens / ₹{MIN_REDEEM_AMOUNT_RUPEES}) • Bureau Chief Approval Authority
              </p>

            </div>
          </div>

          <span
            className="typewriter-text"
            style={{
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              backgroundColor: 'var(--brass-glow)',
              color: 'var(--brass-dark)',
              border: '1px solid var(--border-brass)',
              borderRadius: '3px',
            }}
          >
            {rewardClaims.filter((c) => c.status === 'pending').length} PENDING PAYOUTS
          </span>
        </div>

        {/* Treasury Metrics Overview */}
        {(() => {
          const totalCirculating = users.reduce((acc, u) => acc + getUserTokens(u.username).balance, 0);
          const totalLiability = totalCirculating * TOKEN_RUPEE_RATE;
          const totalPaid = rewardClaims
            .filter((c) => c.status === 'approved')
            .reduce((acc, c) => acc + c.rupeeAmount, 0);
          const pendingAmount = rewardClaims
            .filter((c) => c.status === 'pending')
            .reduce((acc, c) => acc + c.rupeeAmount, 0);

          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                className="vintage-paper"
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-parchment)',
                  borderBottom: '3px solid var(--brass-gold)',
                }}
              >
                <div className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
                  CIRCULATING TOKENS
                </div>
                <div className="serif-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brass-dark)' }}>
                  {totalCirculating} Tokens
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
                  Across all {users.length} registered accounts
                </div>
              </div>

              <div
                className="vintage-paper"
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-parchment)',
                  borderBottom: '3px solid var(--stamp-red)',
                }}
              >
                <div className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
                  OUTSTANDING LIABILITY
                </div>
                <div className="serif-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--stamp-red)' }}>
                  ₹{totalLiability}.00
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
                  Tokens waiting to be redeemed
                </div>
              </div>

              <div
                className="vintage-paper"
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-parchment)',
                  borderBottom: '3px solid var(--stamp-blue)',
                }}
              >
                <div className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
                  PENDING CLAIMS QUEUE
                </div>
                <div className="serif-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--stamp-blue)' }}>
                  ₹{pendingAmount}.00
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
                  {rewardClaims.filter((c) => c.status === 'pending').length} claim(s) awaiting approval
                </div>
              </div>

              <div
                className="vintage-paper"
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-parchment)',
                  borderBottom: '3px solid var(--stamp-green)',
                }}
              >
                <div className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
                  TOTAL DISBURSED & PAID
                </div>
                <div className="serif-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--stamp-green)' }}>
                  ₹{totalPaid}.00
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
                  Settled via UPI, Bank & Vouchers
                </div>
              </div>
            </div>
          );
        })()}

        {/* Claims Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <thead>
              <tr
                className="typewriter-text"
                style={{
                  borderBottom: '2px solid var(--border-sepia-dark)',
                  textAlign: 'left',
                  fontSize: '0.72rem',
                  color: 'var(--ink-secondary)',
                  backgroundColor: 'var(--bg-parchment)',
                }}
              >
                <th style={{ padding: '0.65rem 0.75rem' }}>CLAIM №</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>DATE FILED</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>APPLICANT</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>TOKENS</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>CASH PAYOUT (₹)</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>CHANNEL & DETAILS</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>STATUS</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>ACTION DISPATCH</th>
              </tr>
            </thead>
            <tbody>
              {rewardClaims.map((claim) => (
                <tr
                  key={claim.id}
                  style={{
                    borderBottom: '1px solid var(--border-sepia)',
                    backgroundColor: claim.status === 'pending' ? 'var(--bg-parchment-deep)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    № {claim.claimNumber}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', color: 'var(--ink-muted)', fontSize: '0.75rem' }}>
                    {new Date(claim.requestedAt).toLocaleDateString()} {new Date(claim.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <strong>{claim.userName}</strong>
                    <div className="typewriter-text" style={{ fontSize: '0.68rem', color: 'var(--brass-dark)' }}>
                      @{claim.username}
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.4rem',
                        backgroundColor: 'var(--brass-glow)',
                        color: 'var(--brass-dark)',
                        borderRadius: '3px',
                        fontWeight: 700,
                      }}
                    >
                      {claim.tokensRedeemed} Tokens
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--stamp-green)', fontSize: '0.9rem' }}>
                    ₹{claim.rupeeAmount}.00
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '2px',
                        backgroundColor: 'var(--bg-parchment)',
                        border: '1px solid var(--border-sepia)',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginRight: '0.4rem',
                      }}
                    >
                      {claim.payoutMethod}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--ink-primary)' }}>
                      {claim.payoutDetails}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '3px',
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor:
                          claim.status === 'approved'
                            ? 'var(--stamp-green-bg)'
                            : claim.status === 'rejected'
                            ? 'var(--stamp-red-bg)'
                            : 'var(--stamp-amber-bg)',
                        color:
                          claim.status === 'approved'
                            ? 'var(--stamp-green)'
                            : claim.status === 'rejected'
                            ? 'var(--stamp-red)'
                            : 'var(--stamp-amber)',
                        border: `1px solid ${
                          claim.status === 'approved'
                            ? 'var(--stamp-green)'
                            : claim.status === 'rejected'
                            ? 'var(--stamp-red)'
                            : 'var(--stamp-amber)'
                        }`,
                      }}
                    >
                      {claim.status === 'approved' ? '✓ APPROVED & PAID' : claim.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                    {claim.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleApproveClaim(claim.id)}
                          className="btn-brass"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                          title="Approve payout and mark as disbursed"
                        >
                          <Stamp size={12} />
                          <span>Approve & Pay</span>
                        </button>
                        <button
                          onClick={() => handleRejectClaim(claim.id)}
                          className="btn-parchment"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', color: 'var(--stamp-red)' }}
                          title="Reject and refund tokens back to applicant"
                        >
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                        Audited by @{claim.reviewedBy || 'admin'}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Oversight Section (Separated by Username) */}

      <div style={{ marginBottom: '2.5rem' }}>
        <div
          className="ruled-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h3 className="serif-display" style={{ fontSize: '1.45rem', fontWeight: 800 }}>
              Task Oversight by Username
            </h3>
            <p className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              Tasks categorized into Created Tasks, Completed Tasks, and Deleted Tasks per User
            </p>
          </div>

          {/* User filter selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="vintage-label" style={{ margin: 0 }}>Filter User:</span>
            <select
              value={selectedUsername}
              onChange={(e) => {
                playTypewriterClick();
                setSelectedUsername(e.target.value);
              }}
              className="vintage-input"
              style={{ width: '180px', padding: '0.4rem 0.6rem', fontSize: '0.76rem' }}
            >
              <option value="all">All Users (Breakdown)</option>
              {users.map((u) => (
                <option key={u.id} value={u.username}>
                  @{u.username} ({u.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick User Dossier Selector Chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            flexWrap: 'wrap',
            marginBottom: '1.25rem',
            padding: '0.65rem 0.85rem',
            backgroundColor: 'var(--bg-parchment-deep)',
            border: '1px solid var(--border-sepia)',
            borderRadius: '4px',
          }}
        >
          <span className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)', fontWeight: 700, marginRight: '0.25rem' }}>
            DOSSIER QUICK JUMP:
          </span>
          <button
            onClick={() => {
              playTypewriterClick();
              setSelectedUsername('all');
            }}
            className={selectedUsername === 'all' ? 'btn-brass' : 'btn-parchment'}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
          >
            All Personnel ({users.length})
          </button>
          {users.map((u) => {
            const b = getUserTasksBreakdown(u.username);
            const total = b.createdTasks.length + b.routines.length + b.completedTasks.length;
            const isSel = selectedUsername.toLowerCase() === u.username.toLowerCase();
            return (
              <button
                key={u.id}
                onClick={() => {
                  playTypewriterClick();
                  setSelectedUsername(u.username);
                }}
                className={isSel ? 'btn-brass' : 'btn-parchment'}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
              >
                @{u.username} <span style={{ opacity: 0.75, fontSize: '0.68rem' }}>({total})</span>
              </button>
            );
          })}
        </div>

        {/* Render Breakdown per Username */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {displayUsers.map((user) => {
            const breakdown = getUserTasksBreakdown(user.username);
            const createdCount = breakdown.createdTasks.length;
            const routinesCount = breakdown.routines.length;
            const completedCount = breakdown.completedTasks.length;
            const deletedCount = breakdown.deletedTasks.length;

            const INITIAL_LIMIT = 2;

            const isCreatedExpanded = !!expandedColumns[`${user.username}_created`];
            const visibleCreated = isCreatedExpanded ? breakdown.createdTasks : breakdown.createdTasks.slice(0, INITIAL_LIMIT);
            const remainingCreated = createdCount - visibleCreated.length;

            const isRoutinesExpanded = !!expandedColumns[`${user.username}_routines`];
            const visibleRoutines = isRoutinesExpanded ? breakdown.routines : breakdown.routines.slice(0, INITIAL_LIMIT);
            const remainingRoutines = routinesCount - visibleRoutines.length;

            const isCompletedExpanded = !!expandedColumns[`${user.username}_completed`];
            const visibleCompleted = isCompletedExpanded ? breakdown.completedTasks : breakdown.completedTasks.slice(0, INITIAL_LIMIT);
            const remainingCompleted = completedCount - visibleCompleted.length;

            const isDeletedExpanded = !!expandedColumns[`${user.username}_deleted`];
            const visibleDeleted = isDeletedExpanded ? breakdown.deletedTasks : breakdown.deletedTasks.slice(0, INITIAL_LIMIT);
            const remainingDeleted = deletedCount - visibleDeleted.length;

            return (
              <div
                key={user.id}
                className="vintage-paper"
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--bg-card)',
                  borderTop: user.role === 'admin' ? '3px solid var(--stamp-red)' : '3px solid var(--brass-gold)',
                }}
              >
                {/* User Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '2px solid var(--border-sepia)',
                    paddingBottom: '0.75rem',
                    marginBottom: '1.25rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="seal-badge" style={{ width: '40px', height: '40px', fontSize: '0.95rem' }}>
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 className="serif-display" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                          User: @{user.username}
                        </h4>
                        <span
                          className="typewriter-text"
                          style={{
                            fontSize: '0.62rem',
                            padding: '0.1rem 0.4rem',
                            backgroundColor: user.role === 'admin' ? 'var(--stamp-red-bg)' : 'var(--stamp-blue-bg)',
                            color: user.role === 'admin' ? 'var(--stamp-red)' : 'var(--stamp-blue)',
                            borderRadius: '2px',
                            fontWeight: 700,
                          }}
                        >
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                        {user.name} • {user.department || 'Atelier & Craft'}
                      </div>
                    </div>
                  </div>

                  {/* Summary Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: 'var(--bg-parchment)',
                        border: '1px solid var(--border-sepia-dark)',
                        borderRadius: '3px',
                      }}
                    >
                      Tasks: <strong>{createdCount}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: 'var(--brass-glow)',
                        color: 'var(--brass-dark)',
                        border: '1px solid var(--border-brass)',
                        borderRadius: '3px',
                      }}
                    >
                      Routines: <strong>{routinesCount}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: 'var(--stamp-green-bg)',
                        color: 'var(--stamp-green)',
                        border: '1px solid var(--stamp-green)',
                        borderRadius: '3px',
                      }}
                    >
                      Completed: <strong>{completedCount}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: 'var(--stamp-red-bg)',
                        color: 'var(--stamp-red)',
                        border: '1px solid var(--stamp-red)',
                        borderRadius: '3px',
                      }}
                    >
                      Deleted: <strong>{deletedCount}</strong>
                    </span>
                  </div>
                </div>

                {/* 4 Distinct Columns: Daily Tasks, Routines, Completed (Separate), Deleted */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem',
                    alignItems: 'start',
                  }}
                >
                  {/* Column 1: Daily Tasks (Active) */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-parchment)',
                      border: '1px solid var(--border-sepia)',
                      borderRadius: '4px',
                      padding: '0.85rem',
                    }}
                  >
                    <div
                      className="typewriter-text"
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--stamp-blue)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '2px solid var(--stamp-blue)',
                        paddingBottom: '0.4rem',
                        marginBottom: '0.65rem',
                      }}
                    >
                      <span>1. Daily Tasks</span>
                      <span>({createdCount})</span>
                    </div>

                    {breakdown.createdTasks.length > 0 ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                            maxHeight: isCreatedExpanded ? '440px' : 'none',
                            overflowY: isCreatedExpanded ? 'auto' : 'visible',
                            paddingRight: isCreatedExpanded ? '0.25rem' : 0,
                          }}
                        >
                          {visibleCreated.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              showAssignee={false}
                              onEdit={(t) => {
                                setTaskToEdit(t);
                                setIsTaskModalOpen(true);
                              }}
                            />
                          ))}
                        </div>

                        {createdCount > INITIAL_LIMIT && (
                          <button
                            onClick={() => toggleColumnExpanded(user.username, 'created')}
                            className="btn-parchment"
                            style={{
                              width: '100%',
                              marginTop: '0.5rem',
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              backgroundColor: 'var(--bg-parchment-deep)',
                              border: '1px dashed var(--stamp-blue)',
                              cursor: 'pointer',
                            }}
                          >
                            {isCreatedExpanded ? (
                              <>
                                <ChevronUp size={13} />
                                <span>Fold Daily Tasks (Show Less)</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={13} />
                                <span>Show More (+{remainingCreated} more)</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontStyle: 'italic', padding: '0.75rem 0', textAlign: 'center' }}>
                        No active daily tasks.
                      </div>
                    )}
                  </div>

                  {/* Column 2: Daily Routines (Active) */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-parchment)',
                      border: '1px solid var(--border-sepia)',
                      borderRadius: '4px',
                      padding: '0.85rem',
                    }}
                  >
                    <div
                      className="typewriter-text"
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--brass-dark)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '2px solid var(--border-brass)',
                        paddingBottom: '0.4rem',
                        marginBottom: '0.65rem',
                      }}
                    >
                      <span>2. Daily Routines</span>
                      <span>({routinesCount})</span>
                    </div>

                    {breakdown.routines.length > 0 ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                            maxHeight: isRoutinesExpanded ? '440px' : 'none',
                            overflowY: isRoutinesExpanded ? 'auto' : 'visible',
                            paddingRight: isRoutinesExpanded ? '0.25rem' : 0,
                          }}
                        >
                          {visibleRoutines.map((routine) => (
                            <TaskCard
                              key={routine.id}
                              task={routine}
                              showAssignee={false}
                              onEdit={(t) => {
                                setTaskToEdit(t);
                                setIsTaskModalOpen(true);
                              }}
                            />
                          ))}
                        </div>

                        {routinesCount > INITIAL_LIMIT && (
                          <button
                            onClick={() => toggleColumnExpanded(user.username, 'routines')}
                            className="btn-parchment"
                            style={{
                              width: '100%',
                              marginTop: '0.5rem',
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              backgroundColor: 'var(--bg-parchment-deep)',
                              border: '1px dashed var(--border-brass)',
                              cursor: 'pointer',
                            }}
                          >
                            {isRoutinesExpanded ? (
                              <>
                                <ChevronUp size={13} />
                                <span>Fold Routines (Show Less)</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={13} />
                                <span>Show More (+{remainingRoutines} more)</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontStyle: 'italic', padding: '0.75rem 0', textAlign: 'center' }}>
                        No active daily routines.
                      </div>
                    )}
                  </div>

                  {/* Column 3: Completed Tasks (Saved Separately) */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-parchment)',
                      border: '1px solid var(--border-sepia)',
                      borderRadius: '4px',
                      padding: '0.85rem',
                    }}
                  >
                    <div
                      className="typewriter-text"
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--stamp-green)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '2px solid var(--stamp-green)',
                        paddingBottom: '0.4rem',
                        marginBottom: '0.65rem',
                      }}
                    >
                      <span>3. Completed Archive</span>
                      <span>({completedCount})</span>
                    </div>

                    {breakdown.completedTasks.length > 0 ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                            maxHeight: isCompletedExpanded ? '440px' : 'none',
                            overflowY: isCompletedExpanded ? 'auto' : 'visible',
                            paddingRight: isCompletedExpanded ? '0.25rem' : 0,
                          }}
                        >
                          {visibleCompleted.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              showAssignee={false}
                              onEdit={(t) => {
                                setTaskToEdit(t);
                                setIsTaskModalOpen(true);
                              }}
                            />
                          ))}
                        </div>

                        {completedCount > INITIAL_LIMIT && (
                          <button
                            onClick={() => toggleColumnExpanded(user.username, 'completed')}
                            className="btn-parchment"
                            style={{
                              width: '100%',
                              marginTop: '0.5rem',
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              backgroundColor: 'var(--bg-parchment-deep)',
                              border: '1px dashed var(--stamp-green)',
                              cursor: 'pointer',
                            }}
                          >
                            {isCompletedExpanded ? (
                              <>
                                <ChevronUp size={13} />
                                <span>Fold Completed (Show Less)</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={13} />
                                <span>Show More (+{remainingCompleted} more)</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontStyle: 'italic', padding: '0.75rem 0', textAlign: 'center' }}>
                        No completed items.
                      </div>
                    )}
                  </div>

                  {/* Column 4: Deleted Tasks */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-parchment)',
                      border: '1px solid var(--border-sepia)',
                      borderRadius: '4px',
                      padding: '0.85rem',
                    }}
                  >
                    <div
                      className="typewriter-text"
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--stamp-red)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '2px solid var(--stamp-red)',
                        paddingBottom: '0.4rem',
                        marginBottom: '0.65rem',
                      }}
                    >
                      <span>4. Deleted Archive</span>
                      <span>({deletedCount})</span>
                    </div>

                    {breakdown.deletedTasks.length > 0 ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                            maxHeight: isDeletedExpanded ? '440px' : 'none',
                            overflowY: isDeletedExpanded ? 'auto' : 'visible',
                            paddingRight: isDeletedExpanded ? '0.25rem' : 0,
                          }}
                        >
                          {visibleDeleted.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              showAssignee={false}
                            />
                          ))}
                        </div>

                        {deletedCount > INITIAL_LIMIT && (
                          <button
                            onClick={() => toggleColumnExpanded(user.username, 'deleted')}
                            className="btn-parchment"
                            style={{
                              width: '100%',
                              marginTop: '0.5rem',
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              backgroundColor: 'var(--bg-parchment-deep)',
                              border: '1px dashed var(--stamp-red)',
                              cursor: 'pointer',
                            }}
                          >
                            {isDeletedExpanded ? (
                              <>
                                <ChevronUp size={13} />
                                <span>Fold Deleted (Show Less)</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={13} />
                                <span>Show More (+{remainingDeleted} more)</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontStyle: 'italic', padding: '0.75rem 0', textAlign: 'center' }}>
                        No deleted tasks.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
      />

      {/* Vintage Decommission User Confirmation Modal */}
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
              maxWidth: '480px',
              padding: '1.75rem',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--paper-shadow-lg)',
              border: '3px solid var(--stamp-red)',
              borderRadius: '4px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--stamp-red)',
                paddingBottom: '0.75rem',
              }}
            >
              <div
                className="seal-badge"
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: 'var(--stamp-red-bg)',
                  color: 'var(--stamp-red)',
                  border: '2px solid var(--stamp-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <div
                  className="typewriter-text"
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--stamp-red)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  BUREAU CREDENTIAL REVOCATION
                </div>
                <h3 className="serif-display" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                  Decommission User @{userToDelete.username}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              Are you sure you want to permanently decommission <strong>{userToDelete.name}</strong> (<span className="typewriter-text">@{userToDelete.username}</span>)? This will erase their active access passkey (<code className="typewriter-text">{userToDelete.password}</code>) from the registry.
            </p>

            <div
              style={{
                backgroundColor: 'var(--stamp-red-bg)',
                border: '1px dashed var(--stamp-red)',
                padding: '0.75rem',
                borderRadius: '3px',
                marginBottom: '1.25rem',
                fontSize: '0.78rem',
                color: 'var(--stamp-red)',
                fontWeight: 600,
              }}
            >
              ⚠️ Permanent action: this account cannot be recovered once removed.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="btn-parchment"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                Cancel & Retain
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(userToDelete)}
                className="btn-brass"
                style={{
                  padding: '0.5rem 1.15rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--stamp-red)',
                  borderColor: 'var(--stamp-red)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Trash2 size={14} />
                <span>Confirm & Delete User</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset to Fresh State Confirmation Modal */}
      {isResetModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 20, 16, 0.72)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={() => setIsResetModalOpen(false)}
        >
          <div
            className="vintage-paper"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              backgroundColor: 'var(--bg-card)',
              borderTop: '5px solid var(--stamp-red)',
              boxShadow: 'var(--paper-shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: 'var(--stamp-red-bg)',
                  color: 'var(--stamp-red)',
                  border: '2px solid var(--stamp-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RotateCcw size={20} />
              </div>
              <div>
                <div
                  className="typewriter-text"
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--stamp-red)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  BUREAU SYSTEM RE-INITIALIZATION
                </div>
                <h3 className="serif-display" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                  Reset Ledger to Fresh Slate
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              This will wipe all existing tasks, routines, logs, and claims, resetting the Bureau to a 100% fresh registry. Master Administrator (<code className="typewriter-text">@admin / password</code>) is preserved.
            </p>

            <div
              style={{
                backgroundColor: 'var(--stamp-red-bg)',
                border: '1px dashed var(--stamp-red)',
                padding: '0.75rem',
                borderRadius: '3px',
                marginBottom: '1.25rem',
                fontSize: '0.78rem',
                color: 'var(--stamp-red)',
                fontWeight: 600,
              }}
            >
              ⚠️ All temporary test tasks, routines, and records will be purged.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="btn-parchment"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="btn-brass"
                style={{
                  padding: '0.5rem 1.15rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--stamp-red)',
                  borderColor: 'var(--stamp-red)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <RotateCcw size={14} />
                <span>Confirm & Reset Fresh</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
