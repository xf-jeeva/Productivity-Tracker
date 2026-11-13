'use client';

// OAuth Callback Page
// Supabase redirects here after Google login completes.
// Fast session resolution and instant redirect to dashboard.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { setCurrentUser, getUsers } from '@/lib/storage';
import { User } from '@/types';
import { ShieldAlert, RotateCcw } from 'lucide-react';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('Verifying credentials...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const processCallback = async () => {
      if (!supabase) {
        setErrorMessage('Database connection is not configured.');
        return;
      }

      try {
        const fullUrl = window.location.href;
        const url = new URL(fullUrl);

        // Check for error parameters in query or hash
        const hashStr = window.location.hash ? window.location.hash.substring(1) : '';
        const hashParams = new URLSearchParams(hashStr);

        const errorDesc =
          url.searchParams.get('error_description') ||
          url.searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error');

        if (errorDesc) {
          console.error('OAuth redirect error:', errorDesc);
          if (active) {
            setErrorMessage(`Authentication error: ${errorDesc.replace(/\+/g, ' ')}`);
          }
          return;
        }

        // 1. Check for PKCE authorization code in query string
        const code = url.searchParams.get('code');
        if (code) {
          setStatus('Establishing secure session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('exchangeCodeForSession note:', exchangeError.message);
          }
        }

        // 2. Check for implicit tokens in hash fragment (#access_token=...&refresh_token=...)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          setStatus('Restoring credentials...');
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        // 3. Verify that an active session exists
        let session = (await supabase.auth.getSession()).data.session;
        if (!session) {
          for (let i = 0; i < 6; i++) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            if (!active) return;
            const check = await supabase.auth.getSession();
            if (check.data.session) {
              session = check.data.session;
              break;
            }
          }
        }

        setStatus('Loading profile...');
        const user = await getAuthUser();

        if (!user) {
          console.warn('No user session resolved after callback.');
          if (active) {
            setErrorMessage('Unable to establish verified session. Please try signing in again.');
          }
          return;
        }

        // 4. Force-save to local storage so My Tasks has instant access
        const username = user.email ? user.email.split('@')[0] : user.id;
        const mappedUser: User = {
          id: user.id,
          username,
          password: '',
          name: user.name || username,
          email: user.email,
          role: user.role,
          avatar: user.avatarUrl || undefined,
          title: user.role === 'admin' ? 'Administrator' : 'Team Member',
          department: 'Operations',
          deskNumber: `Desk ${user.id.slice(0, 4).toUpperCase()}`,
          createdAt: new Date().toISOString(),
        };

        const users = getUsers();
        const existingIdx = users.findIndex(
          (u) => u.id === user.id || u.username.toLowerCase() === username.toLowerCase()
        );
        if (existingIdx >= 0) {
          users[existingIdx] = {
            ...users[existingIdx],
            id: user.id,
            name: mappedUser.name,
            avatar: mappedUser.avatar || users[existingIdx].avatar,
            role: user.role,
            email: user.email,
            title: mappedUser.title,
          };
          localStorage.setItem('daily_bureau_users_v3', JSON.stringify(users));
        } else {
          users.push(mappedUser);
          localStorage.setItem('daily_bureau_users_v3', JSON.stringify(users));
        }
        setCurrentUser(mappedUser);

        if (!active) return;
        setStatus(`Sign-in approved. Welcome, ${user.name}!`);

        // Fast redirection
        setTimeout(() => {
          window.location.replace('/');
        }, 150);
      } catch (err: unknown) {
        console.error('Callback error:', err);
        if (active) {
          const msg = err instanceof Error ? err.message : 'Unknown authentication error';
          setErrorMessage(msg);
        }
      }
    };

    processCallback();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        gap: '1.5rem',
        padding: '2rem 1rem',
        textAlign: 'center',
      }}
    >
      <img
        src="/bureau_crest.jpg"
        alt="Daily Bureau"
        style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #d4a853' }}
      />

      {errorMessage ? (
        <div
          className="vintage-paper"
          style={{
            maxWidth: '460px',
            padding: '1.75rem',
            borderTop: '4px solid var(--stamp-red)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--stamp-red)', marginBottom: '0.75rem' }}>
            <ShieldAlert size={24} />
            <span className="typewriter-text" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>SIGN-IN FAILED</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {errorMessage}
          </p>
          <Link
            href="/login"
            className="btn-brass"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RotateCcw size={15} />
            <span>Return to Sign In</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="typewriter-text" style={{ fontSize: '0.88rem', letterSpacing: '0.1em', color: 'var(--ink-secondary)' }}>
            {status.toUpperCase()}
          </div>
          <div style={{ width: '220px', height: '3px', backgroundColor: 'var(--border-sepia)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                backgroundColor: '#d4a853',
                borderRadius: '2px',
                animation: 'progress 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </>
      )}

      <style>{`@keyframes progress { 0%{width:0;margin-left:0} 50%{width:70%;margin-left:15%} 100%{width:0;margin-left:100%} }`}</style>
    </div>
  );
}
