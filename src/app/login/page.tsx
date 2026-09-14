'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getCurrentUser } from '@/lib/storage';
import { playRubberStampSound } from '@/lib/sound';
import { KeyRound, ShieldAlert, ArrowRight, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [checking, setChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect immediately
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.replace(user.role === 'admin' ? '/admin' : '/');
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="typewriter-text" style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', letterSpacing: '0.1em' }}>
          AUTHENTICATING...
        </div>
      </div>
    );
  }

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
    if (res.user?.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/');
    }
  };

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
            style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}
          >
            <KeyRound size={16} />
            <span>{isLoading ? 'Signing In...' : 'Sign In to Workstation'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Help note */}
        <div style={{
          marginTop: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-parchment)',
          border: '1px dashed var(--border-sepia)', borderRadius: '4px',
          fontSize: '0.76rem', color: 'var(--ink-secondary)', textAlign: 'center', lineHeight: 1.5,
        }}>
          <BookOpen size={13} style={{ display: 'inline', marginRight: '0.35rem', color: 'var(--brass-dark)' }} />
          Don't have an account? Contact your Bureau Administrator to get your credentials.
        </div>
      </div>
    </div>
  );
}
