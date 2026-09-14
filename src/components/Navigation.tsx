'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentUser, BUREAU_SYNC_EVENT } from '../lib/storage';
import { playTypewriterClick } from '../lib/sound';
import { User } from '../types';
import { CheckSquare, ShieldCheck, Lock, Users, BookOpen } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const sync = () => {
      setCurrentUser(getCurrentUser());
    };
    sync();
    window.addEventListener(BUREAU_SYNC_EVENT, sync);
    return () => window.removeEventListener(BUREAU_SYNC_EVENT, sync);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const navItems = [
    {
      href: '/',
      label: 'My Work Desk',
      icon: CheckSquare,
      badge: currentUser ? `@${currentUser.username}` : 'Workstation',
    },
    {
      href: '/team',
      label: 'Team Roster',
      icon: Users,
      badge: 'Personnel',
    },
    {
      href: '/dispatch-log',
      label: 'Dispatch Ledger',
      icon: BookOpen,
      badge: 'Logs',
    },
    {
      href: '/admin',
      label: 'Admin Oversight',
      icon: ShieldCheck,
      badge: isAdmin ? 'Admin Access' : 'Admin Only',
      adminOnly: true,
    },
  ];

  return (
    <nav
      style={{
        backgroundColor: 'var(--bg-card-alt)',
        borderBottom: '1px solid var(--border-sepia)',
        padding: '0 1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => playTypewriterClick()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.1rem',
                fontSize: '0.84rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                borderBottom: isActive ? '3px solid var(--brass-gold)' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                position: 'relative',
                whiteSpace: 'nowrap',
                backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
              }}
            >
              <Icon
                size={16}
                style={{
                  color: isActive ? 'var(--brass-gold)' : 'var(--ink-muted)',
                }}
              />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className="typewriter-text"
                  style={{
                    fontSize: '0.62rem',
                    padding: '0.1rem 0.4rem',
                    backgroundColor: isActive ? 'var(--brass-glow)' : 'var(--bg-parchment-deep)',
                    color: item.adminOnly && !isAdmin ? 'var(--stamp-red)' : isActive ? 'var(--brass-dark)' : 'var(--ink-muted)',
                    borderRadius: '2px',
                    border: '1px solid var(--border-sepia)',
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
