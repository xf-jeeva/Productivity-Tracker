'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/storage';
import { playRubberStampSound, playTypewriterClick } from '@/lib/sound';
import { KeyRound, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    const res = login(username, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication rejected.');
      return;
    }

    playRubberStampSound();

    if (res.user?.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/');
    }
  };

  const handleFillAdmin = () => {
    playTypewriterClick();
    setUsername('admin');
    setPassword('password');
    setErrorMsg('');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto' }}>
      <div
        className="vintage-paper"
        style={{
          padding: '2.5rem',
          borderTop: '5px solid var(--brass-gold)',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--paper-shadow-lg)',
        }}
      >
        {/* Banner */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '1.75rem',
            borderBottom: '3px double var(--border-sepia-dark)',
            paddingBottom: '1.25rem',
          }}
        >
          <img
            src="/bureau_crest.jpg"
            alt="The Daily Bureau Crest"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '2px solid var(--brass-gold)',
              boxShadow: 'var(--paper-shadow)',
              objectFit: 'cover',
              margin: '0 auto 0.75rem',
              display: 'block',
            }}
          />
          <div
            className="typewriter-text"
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--brass-dark)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Personnel Verification & Access Desk
          </div>
          <h2
            className="serif-display"
            style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}
          >
            Sign In to Workstation
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.35rem' }}>
            Enter your official credentials to access your daily tasks or administrative ledger.
          </p>
        </div>

        {/* Quick Fill Preset Credentials */}
        <div
          style={{
            backgroundColor: 'var(--bg-parchment)',
            border: '1px dashed var(--border-brass)',
            borderRadius: '4px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span className="typewriter-text" style={{ fontWeight: 700, color: 'var(--stamp-red)' }}>
                BUREAU ADMIN:
              </span>{' '}
              <span className="typewriter-text">admin</span> / <span className="typewriter-text">password</span>
            </div>
            <button
              type="button"
              onClick={handleFillAdmin}
              className="btn-parchment"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
            >
              <Sparkles size={12} style={{ color: 'var(--stamp-red)' }} />
              <span>Fill Admin</span>
            </button>
          </div>

          <div style={{ borderTop: '1px dashed var(--border-sepia)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span className="typewriter-text" style={{ fontWeight: 700, color: 'var(--stamp-blue)' }}>
                TEAM ARTISAN:
              </span>{' '}
              <span className="typewriter-text">arthur</span> / <span className="typewriter-text">password</span>
            </div>
            <button
              type="button"
              onClick={() => {
                playTypewriterClick();
                setUsername('arthur');
                setPassword('password');
                setErrorMsg('');
              }}
              className="btn-parchment"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
            >
              <Sparkles size={12} style={{ color: 'var(--stamp-blue)' }} />
              <span>Fill Arthur</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: 'var(--stamp-red-bg)',
              border: '1px solid var(--stamp-red)',
              borderRadius: '4px',
              padding: '0.65rem 0.85rem',
              marginBottom: '1.25rem',
              fontSize: '0.8rem',
              color: 'var(--stamp-red)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="vintage-label">Artisan or Officer Username *</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or arthur"
              className="vintage-input"
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label className="vintage-label">Authorization Passkey / Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="vintage-input"
            />
          </div>

          <button
            type="submit"
            className="btn-brass"
            style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
          >
            <KeyRound size={16} />
            <span>Sign In to Workstation</span>
            <ArrowRight size={15} />
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <Link
              href="/"
              className="typewriter-text"
              style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', textDecoration: 'underline' }}
            >
              ← Return to Master Work Desk
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
