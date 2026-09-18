'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { signOut, isMasterAdmin } from '../lib/auth';
import { 
  isSoundEnabled, 
  setSoundEnabled, 
  resetBureauData
} from '../lib/storage';
import { playTypewriterClick, playVintageBell } from '../lib/sound';
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
  RotateCcw,
  Menu,
  X,
  CheckSquare,
  Users,
  BookOpen,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onOpenNewTaskModal?: () => void;
}

export default function Header({ onOpenNewTaskModal }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [theme, setTheme] = useState<'parchment' | 'nocturne'>('parchment');
  const [isClaimRewardOpen, setIsClaimRewardOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  const isAdmin = isMasterAdmin(user?.email);

  useEffect(() => {
    setMounted(true);
    setSoundOn(isSoundEnabled());
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'nocturne' ? 'nocturne' : 'parchment';
    setTheme(currentTheme);
  }, []);

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    playTypewriterClick();
    setIsMobileMenuOpen(false);
    await signOut();
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
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'My Work Desk', icon: CheckSquare, badge: 'Desk' },
    { href: '/team', label: 'Team Roster', icon: Users, badge: 'Personnel' },
    { href: '/dispatch-log', label: 'Dispatch Ledger', icon: BookOpen, badge: 'Ledger' },
    ...(isAdmin
      ? [{ href: '/admin', label: 'Admin Oversight', icon: ShieldCheck, badge: '★ Admin', adminOnly: true }]
      : []),
  ];

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
      {/* Top Strip (Desktop Only) */}
      <div
        className="desktop-top-strip"
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
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        {/* Brand & Crest */}
        <Link
          href="/"
          onClick={() => playTypewriterClick()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', minWidth: 0 }}
        >
          <img
            src="/bureau_crest.jpg"
            alt="The Daily Bureau Crest"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '2px solid var(--brass-gold)',
              boxShadow: 'var(--paper-shadow)',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />

          <div style={{ minWidth: 0 }}>
            <h1
              className="serif-display brand-title-text"
              style={{
                fontSize: '1.55rem',
                fontWeight: 800,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                color: 'var(--ink-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              The Daily Bureau
            </h1>
            <p
              className="typewriter-text brand-sub-text"
              style={{
                fontSize: '0.7rem',
                color: 'var(--ink-secondary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginTop: '0.1rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Team Work Tracker & Ledger
            </p>
          </div>
        </Link>

        {/* Vintage Chronometer Widget (Desktop) */}
        <div
          className="desktop-header-actions"
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

        {/* User Status & Action Controls (Desktop) */}
        <div className="desktop-header-actions" style={{ alignItems: 'center', gap: '0.85rem' }}>
          {mounted && user && onOpenNewTaskModal && (
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

          {mounted && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {/* Token Purse Widget */}
              <TokenPurseWidget onOpenClaimModal={() => setIsClaimRewardOpen(true)} />

              {/* User Badge */}
              <Link
                href="/"
                className="vintage-paper"
                title="Go to My Work Desk"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.35rem 0.75rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '4px',
                  border: user.role === 'admin' ? '1.5px solid var(--stamp-red)' : '1px solid var(--border-sepia)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--brass-gold)' }}
                  />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--brass-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-primary)', lineHeight: 1.2 }}>
                    {user.name}
                  </div>
                  <div className="typewriter-text" style={{ fontSize: '0.65rem', color: user.role === 'admin' ? 'var(--stamp-red)' : 'var(--stamp-blue)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {user.role === 'admin' ? '★ Bureau Admin' : 'Team Member'}
                  </div>
                </div>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="btn-parchment"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
                title="Log out"
              >
                <LogOut size={14} style={{ color: 'var(--stamp-red)' }} />
                <span>Logout</span>
              </button>
            </div>
          ) : mounted ? (
            <Link
              href="/login"
              className="btn-brass"
              style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </Link>
          ) : null}
        </div>

        {/* Mobile Header Right Controls: Token chip + New button + HAMBURGER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {mounted && user && (
            <div className="mobile-hamburger-btn" style={{ display: 'none', alignItems: 'center', gap: '0.45rem' }}>
              <TokenPurseWidget onOpenClaimModal={() => setIsClaimRewardOpen(true)} />
              {onOpenNewTaskModal && (
                <button
                  onClick={() => {
                    playTypewriterClick();
                    onOpenNewTaskModal();
                  }}
                  className="btn-brass"
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.74rem' }}
                  title="New Task"
                >
                  <PlusCircle size={14} />
                  <span>New</span>
                </button>
              )}
            </div>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => {
              playTypewriterClick();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="mobile-hamburger-btn btn-parchment"
            style={{
              padding: '0.45rem 0.65rem',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label={isMobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            title="Open Bureau Directory & Menu"
          >
            {isMobileMenuOpen ? <X size={20} style={{ color: 'var(--stamp-red)' }} /> : <Menu size={20} style={{ color: 'var(--brass-dark)' }} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Hamburger Slide-Out Drawer ─────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop overlay */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(20, 16, 12, 0.72)',
              backdropFilter: 'blur(3px)',
              animation: 'fadeInBackdrop 0.2s ease-out',
            }}
            onClick={() => {
              playTypewriterClick();
              setIsMobileMenuOpen(false);
            }}
          />

          {/* Slide-out Drawer Panel */}
          <div
            className="vintage-paper"
            style={{
              position: 'relative',
              width: 'min(360px, 88vw)',
              height: '100%',
              backgroundColor: 'var(--bg-card)',
              borderLeft: '3px double var(--border-sepia-dark)',
              boxShadow: 'var(--paper-shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              zIndex: 1001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '1.1rem 1.25rem',
                borderBottom: '2px solid var(--border-sepia-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-parchment-deep)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img
                  src="/bureau_crest.jpg"
                  alt="Bureau Seal"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    border: '1.5px solid var(--brass-gold)',
                    objectFit: 'cover',
                  }}
                />
                <div>
                  <div className="serif-display" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink-primary)', lineHeight: 1.1 }}>
                    The Daily Bureau
                  </div>
                  <div className="typewriter-text" style={{ fontSize: '0.62rem', color: 'var(--brass-dark)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Directory & Dispatch
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  playTypewriterClick();
                  setIsMobileMenuOpen(false);
                }}
                className="btn-parchment"
                style={{ padding: '0.35rem 0.55rem' }}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              {/* User Profile Card (if logged in) */}
              {mounted && user ? (
                <div
                  className="vintage-paper"
                  style={{
                    padding: '0.85rem',
                    backgroundColor: 'var(--bg-parchment)',
                    border: user.role === 'admin' ? '1.5px solid var(--stamp-red)' : '1px solid var(--border-sepia)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--brass-gold)' }}
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--brass-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email}
                      </div>
                      <span
                        className="typewriter-text"
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '2px',
                          backgroundColor: user.role === 'admin' ? 'var(--stamp-red-bg)' : 'var(--bg-card)',
                          color: user.role === 'admin' ? 'var(--stamp-red)' : 'var(--stamp-blue)',
                          border: '1px solid var(--border-sepia)',
                          display: 'inline-block',
                          marginTop: '0.2rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        {user.role === 'admin' ? '★ Bureau Administrator' : 'Field Operative'}
                      </span>
                    </div>
                  </div>

                  {/* Token & Cashout Button in Drawer */}
                  <button
                    onClick={() => {
                      playTypewriterClick();
                      setIsMobileMenuOpen(false);
                      setIsClaimRewardOpen(true);
                    }}
                    className="btn-brass"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.74rem',
                      justifyContent: 'center',
                    }}
                  >
                    <span>🪙 Open Treasury Purse (Claim INR)</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-brass"
                  style={{ width: '100%', padding: '0.65rem', justifyContent: 'center', fontSize: '0.82rem' }}
                >
                  <LogIn size={15} />
                  <span>Sign In with Google</span>
                </Link>
              )}

              {/* Quick Commission Button */}
              {user && onOpenNewTaskModal && (
                <button
                  onClick={() => {
                    playTypewriterClick();
                    setIsMobileMenuOpen(false);
                    onOpenNewTaskModal();
                  }}
                  className="btn-brass"
                  style={{ width: '100%', padding: '0.65rem', justifyContent: 'center', fontSize: '0.8rem' }}
                >
                  <PlusCircle size={15} />
                  <span>+ Commission New Work Order</span>
                </button>
              )}

              {/* Navigation Links Group */}
              <div>
                <div
                  className="typewriter-text"
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--brass-dark)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '0.5rem',
                    paddingLeft: '0.25rem',
                  }}
                >
                  Bureau Sections
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {navLinks.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          playTypewriterClick();
                          setIsMobileMenuOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          backgroundColor: isActive ? 'var(--brass-glow)' : 'var(--bg-parchment)',
                          border: isActive ? '1.5px solid var(--brass-gold)' : '1px solid var(--border-sepia)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Icon
                            size={18}
                            style={{
                              color: item.adminOnly ? 'var(--stamp-red)' : isActive ? 'var(--brass-dark)' : 'var(--ink-secondary)',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: isActive ? 700 : 500,
                              color: item.adminOnly ? 'var(--stamp-red)' : 'var(--ink-primary)',
                            }}
                          >
                            {item.label}
                          </span>
                        </div>

                        {item.badge && (
                          <span
                            className="typewriter-text"
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '2px',
                              backgroundColor: item.adminOnly ? 'var(--stamp-red-bg)' : 'var(--bg-card)',
                              color: item.adminOnly ? 'var(--stamp-red)' : 'var(--ink-muted)',
                              border: '1px solid var(--border-sepia)',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Horological Chronometer Widget */}
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-parchment)',
                  border: '1px solid var(--border-sepia)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VintageClock />
              </div>

              {/* Workstation Controls */}
              <div>
                <div
                  className="typewriter-text"
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '0.5rem',
                    paddingLeft: '0.25rem',
                  }}
                >
                  Workstation Environment
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    onClick={toggleSound}
                    className="btn-parchment"
                    style={{ padding: '0.5rem', fontSize: '0.74rem', justifyContent: 'center' }}
                  >
                    {soundOn ? <Volume2 size={14} style={{ color: 'var(--brass-gold)' }} /> : <VolumeX size={14} />}
                    <span>{soundOn ? 'SOUND ON' : 'MUTED'}</span>
                  </button>

                  <button
                    onClick={toggleTheme}
                    className="btn-parchment"
                    style={{ padding: '0.5rem', fontSize: '0.74rem', justifyContent: 'center' }}
                  >
                    {theme === 'parchment' ? <Moon size={14} /> : <Sun size={14} style={{ color: 'var(--brass-light)' }} />}
                    <span>{theme === 'parchment' ? 'NOCTURNE' : 'PARCHMENT'}</span>
                  </button>
                </div>

                <button
                  onClick={handleReset}
                  className="btn-parchment"
                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.45rem', fontSize: '0.72rem', color: 'var(--ink-muted)', justifyContent: 'center' }}
                >
                  <RotateCcw size={12} />
                  <span>Restore Factory Sample Ledger</span>
                </button>
              </div>

              {/* Logout Button (if logged in) */}
              {user && (
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px dashed var(--border-sepia)' }}>
                  <button
                    onClick={handleLogout}
                    className="btn-parchment"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      fontSize: '0.8rem',
                      color: 'var(--stamp-red)',
                      justifyContent: 'center',
                      border: '1px solid var(--stamp-red)',
                    }}
                  >
                    <LogOut size={15} style={{ color: 'var(--stamp-red)' }} />
                    <span>Sign Out of Desk</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claim Reward Modal */}
      <ClaimRewardModal
        isOpen={isClaimRewardOpen}
        onClose={() => setIsClaimRewardOpen(false)}
      />
    </header>
  );
}
