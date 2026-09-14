'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getCurrentUser } from '@/lib/storage';
import { fetchCloudUsers, ensureAdminExists } from '@/lib/cloudUsers';
import { playRubberStampSound } from '@/lib/sound';
import { KeyRound, ShieldAlert, ArrowRight, BookOpen, Loader2 } from 'lucide-react';

const USERS_KEY = 'daily_bureau_users_v3';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [checking, setChecking] = useState(true);   // session check
  const [syncing, setSyncing] = useState(false);     // syncing users from Supabase before login
  const [isLoading, setIsLoading] = useState(false); // submit button loading

  useEffect(() => {
    const init = async () => {
      // 1. If already logged in — go straight to their page
      const user = getCurrentUser();
      if (user) {
        router.replace(user.role === 'admin' ? '/admin' : '/');
        return;
      }

      // 2. Pre-sync Supabase users into localStorage so login works immediately
      try {
        setSyncing(true);
        // Ensure the default admin row exists in Supabase (fixes invalid credential on fresh DB)
        await ensureAdminExists();
        const cloudUsers = await fetchCloudUsers();
        if (cloudUsers && cloudUsers.length > 0) {
          // Merge cloud users into localStorage
          const stored = localStorage.getItem(USERS_KEY);
          const localUsers = stored ? JSON.parse(stored) : [];
          const cloudIds = new Set(cloudUsers.map((u: {id: string}) => u.id));
          const localOnly = localUsers.filter((u: {id: string}) => !cloudIds.has(u.id));
          localStorage.setItem(USERS_KEY, JSON.stringify([...cloudUsers, ...localOnly]));
        }
      } catch {
        // Supabase not configured or offline — login with local users only
      } finally {
        setSyncing(false);
        setChecking(false);
      }
    };

    init();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      setIsLoading(false);
      return;
    }

    const res = login(username.trim(), password.trim());
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid username or password.');
      setIsLoading(false);
      return;
    }

    playRubberStampSound();
    router.push(res.user?.role === 'admin' ? '/admin' : '/');
  };

  // Loading / session check screen
  if (checking) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem' }}>
        <div className="typewriter-text" style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', letterSpacing: '0.1em' }}>
          {syncing ? 'SYNCING BUREAU REGISTRY...' : 'AUTHENTICATING...'}
        </div>
        <div style={{ width: '180px', height: '2px', backgroundColor: 'var(--border-sepia)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: 'var(--brass-gold)', animation: 'loadingBar 1.4s ease-in-out infinite', borderRadius: '2px' }} />
        </div>
        <style>{`@keyframes loadingBar { 0%{width:0;margin-left:0} 50%{width:60%;margin-left:20%} 100%{width:0;margin-left:100%} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto', padding: '0 1rem' }}>
      <div
        className="vintage-paper"
        style={{
          padding: '2.5rem',
          borderTop: '5px solid var(--brass-gold)',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--paper-shadow-lg)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '3px double var(--border-sepia-dark)', paddingBottom: '1.25rem' }}>
          <img
            src="/bureau_crest.jpg"
            alt="The Daily Bureau"
            style={{
              width: '64px', height: '64px', borderRadius: '50%',
              border: '2px solid var(--brass-gold)', boxShadow: 'var(--paper-shadow)',
              objectFit: 'cover', margin: '0 auto 0.75rem', display: 'block',
            }}
          />
          <div className="typewriter-text" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brass-dark)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Personnel Verification Desk
          </div>
          <h2 className="serif-display" style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>
            Sign In to Workstation
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.35rem' }}>
            Enter your username and password to access your daily tasks.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            backgroundColor: 'var(--stamp-red-bg)', border: '1px solid var(--stamp-red)',
            borderRadius: '4px', padding: '0.65rem 0.85rem', marginBottom: '1.25rem',
            fontSize: '0.8rem', color: 'var(--stamp-red)', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="vintage-label">Username *</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="vintage-input"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label className="vintage-label">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="vintage-input"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-brass"
            disabled={isLoading}
            style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', opacity: isLoading ? 0.75 : 1 }}
          >
            {isLoading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /><span>Signing In...</span></>
              : <><KeyRound size={16} /><span>Sign In to Workstation</span><ArrowRight size={15} /></>
            }
          </button>
        </form>

        {/* Help note */}
        <div style={{
          marginTop: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-parchment)',
          border: '1px dashed var(--border-sepia)', borderRadius: '4px',
          fontSize: '0.76rem', color: 'var(--ink-secondary)', textAlign: 'center', lineHeight: 1.5,
        }}>
          <BookOpen size={13} style={{ display: 'inline', marginRight: '0.35rem', color: 'var(--brass-dark)' }} />
          Don&apos;t have an account? Contact your Bureau Administrator to get your credentials.
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
