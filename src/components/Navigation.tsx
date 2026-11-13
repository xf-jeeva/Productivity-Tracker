'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { isMasterAdmin } from '../lib/auth';
import { playTypewriterClick } from '../lib/sound';
import { CheckSquare, ShieldCheck, Users, BookOpen } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isAdmin = isMasterAdmin(user?.email);

  const navItems = [
    {
      href: '/',
      label: 'My Tasks',
      icon: CheckSquare,
      badge: user ? `@${user.email ? user.email.split('@')[0] : user.name}` : 'Tasks',
    },
    {
      href: '/team',
      label: 'Team',
      icon: Users,
      badge: 'Members',
    },
    {
      href: '/dispatch-log',
      label: 'Activity Log',
      icon: BookOpen,
      badge: 'Logs',
    },
    ...(isAdmin
      ? [
          {
            href: '/admin',
            label: 'Admin Dashboard',
            icon: ShieldCheck,
            badge: 'Admin Access',
            adminOnly: true,
          },
        ]
      : []),
  ];

  return (
    <nav
      className="desktop-nav-strip"
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
                textDecoration: 'none',
                color: isActive ? 'var(--brass-dark)' : 'var(--ink-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                borderBottom: isActive ? '3px solid var(--brass-gold)' : '3px solid transparent',
                backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon
                size={16}
                style={{
                  color: isActive ? 'var(--brass-dark)' : 'var(--ink-muted)',
                }}
              />
              <span>{item.label}</span>

              {item.badge && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '2px',
                    backgroundColor: isActive ? 'var(--brass-glow)' : 'var(--bg-parchment-deep)',
                    color: isActive ? 'var(--brass-dark)' : 'var(--ink-muted)',
                    letterSpacing: '0.04em',
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
