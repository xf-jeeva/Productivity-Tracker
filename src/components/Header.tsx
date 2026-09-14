'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  getCurrentUser, 
  logout, 
  isSoundEnabled, 
  setSoundEnabled, 
  BUREAU_SYNC_EVENT,
  resetBureauData
} from '../lib/storage';
import { playTypewriterClick, playVintageBell } from '../lib/sound';
import { User } from '../types';
import VintageClock from './VintageClock';
import TokenPurseWidget from './TokenPurseWidget';
import ClaimRewardModal from './ClaimRewardModal';
import { 
  Volume2, 
  VolumeX, 
  Moon, 
  Sun, 
  PlusCircle, 
  LogOut, 
  LogIn, 
  ShieldAlert, 
  RotateCcw,
  User as UserIcon
} from 'lucide-react';

interface HeaderProps {
  onOpenNewTaskModal?: () => void;
}

export default function Header({ onOpenNewTaskModal }: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [theme, setTheme] = useState<'parchment' | 'nocturne'>('parchment');
  const [isClaimRewardOpen, setIsClaimRewardOpen] = useState<boolean>(false);


  useEffect(() => {
    const sync = () => {
      setCurrentUserState(getCurrentUser());
      setSoundOn(isSoundEnabled());
    };

    sync();
    window.addEventListener(BUREAU_SYNC_EVENT, sync);

    const currentTheme = document.documentElement.getAttribute('data-theme') === 'nocturne' ? 'nocturne' : 'parchment';
    setTheme(currentTheme);

    return () => window.removeEventListener(BUREAU_SYNC_EVENT, sync);
  }, []);

  const handleLogout = () => {
    playTypewriterClick();
    logout();
    router.push('/login');
  };

  const toggleSound = () => {
    const newState = !soundOn;
    setSoundOn(newState);
    setSoundEnabled(newState);
    if (newState) {
      setTimeout(() => playVintageBell(), 50);
    }
  };

  const toggleTheme = () => {
    playTypewriterClick();
    const newTheme = theme === 'parchment' ? 'nocturne' : 'parchment';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleReset = () => {
    if (confirm('Restore the Bureau archives, users, and tasks to factory state (admin / password)?')) {
      resetBureauData();
      playVintageBell();
    }
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-card)',
        borderBottom: '3px double var(--border-sepia-dark)',
        boxShadow: 'var(--paper-shadow)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Top Strip */}
      <div
        style={{
          borderBottom: '1px solid var(--border-sepia)',
          padding: '0.35rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--ink-secondary)',
          backgroundColor: 'var(--bg-parchment-deep)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span className="typewriter-text" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>
            REGISTRY FOLIO № 894-B
          </span>
          <span style={{ color: 'var(--ink-faint)' }}>•</span>
          <span style={{ letterSpacing: '0.04em' }}>CONFIDENTIAL TEAM DISPATCH</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute mechanical sounds' : 'Enable mechanical sounds'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: 'var(--ink-secondary)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {soundOn ? <Volume2 size={13} style={{ color: 'var(--brass-gold)' }} /> : <VolumeX size={13} />}
            <span>{soundOn ? 'SOUND ON' : 'MUTED'}</span>
          </button>

          <button
            onClick={toggleTheme}
            title="Toggle Parchment / Smoked Walnut theme"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: 'var(--ink-secondary)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {theme === 'parchment' ? <Moon size={13} /> : <Sun size={13} style={{ color: 'var(--brass-light)' }} />}
            <span>{theme === 'parchment' ? 'NOCTURNE' : 'PARCHMENT'}</span>
          </button>

          <button
            onClick={handleReset}
            title="Restore original sample records"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: 'var(--ink-muted)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <RotateCcw size={12} />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Main Masthead Banner */}
      <div
        style={{
          padding: '0.9rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Brand & Crest */}
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}
        >
          <img
            src="/bureau_crest.jpg"
            alt="The Daily Bureau Crest"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              border: '2px solid var(--brass-gold)',
              boxShadow: 'var(--paper-shadow)',
              objectFit: 'cover',
            }}
          />

          <div>
            <h1
              className="serif-display"
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                color: 'var(--ink-primary)',
              }}
            >
              The Daily Bureau
            </h1>
            <p
              className="typewriter-text"
              style={{
                fontSize: '0.72rem',
                color: 'var(--ink-secondary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: '0.15rem',
              }}
            >
              Team Work Tracker & Ledger • Est. 1889
            </p>
          </div>
        </Link>

        {/* Vintage Chronometer Widget */}
        <div
          style={{
            padding: '0.45rem 1rem',
            backgroundColor: 'var(--bg-parchment)',
            border: '1px solid var(--border-sepia)',
            borderRadius: '4px',
            boxShadow: 'var(--paper-inset)',
          }}
        >
          <VintageClock />
        </div>

        {/* User Status & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {currentUser && onOpenNewTaskModal && (
            <button
              onClick={() => {
                playTypewriterClick();
                onOpenNewTaskModal();
              }}
              className="btn-brass"
              style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }}
            >
              <PlusCircle size={15} />
              <span>Create Task</span>
            </button>
          )}

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {/* Token Purse Widget */}
              <TokenPurseWidget onOpenClaimModal={() => setIsClaimRewardOpen(true)} />

              {/* User Badge (Clickable Navigation) */}
              <Link
                href={currentUser.role === 'admin' ? '/admin' : '/'}
                className="vintage-paper"
                title={currentUser.role === 'admin' ? 'Go to Admin Oversight' : 'Go to My Work Desk'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.35rem 0.75rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '4px',
                  border: currentUser.role === 'admin' ? '1.5px solid var(--stamp-red)' : '1px solid var(--border-sepia)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid var(--brass-gold)',
                  }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--ink-primary)',
                      lineHeight: 1.2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>{currentUser.name}</span>
                    <span
                      className="typewriter-text"
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--ink-muted)',
                      }}
                    >
                      (@{currentUser.username})
                    </span>
                  </div>
                  <div
                    className="typewriter-text"
                    style={{
                      fontSize: '0.65rem',
                      color: currentUser.role === 'admin' ? 'var(--stamp-red)' : 'var(--stamp-blue)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {currentUser.role === 'admin' ? '★ Bureau Admin' : 'Team Member'}
                  </div>
                </div>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="btn-parchment"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
                title="Log out of workstation"
              >
                <LogOut size={14} style={{ color: 'var(--stamp-red)' }} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-brass"
              style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Claim Reward Modal */}
      <ClaimRewardModal
        isOpen={isClaimRewardOpen}
        onClose={() => setIsClaimRewardOpen(false)}
      />
    </header>
  );
}

