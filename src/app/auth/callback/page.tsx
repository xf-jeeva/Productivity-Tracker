'use client';

// OAuth Callback Page
// Supabase redirects here after Google login completes.
// This page processes the auth tokens and redirects to the correct page.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing sign-in...');

  useEffect(() => {
    const processCallback = async () => {
      if (!supabase) {
        router.replace('/login');
        return;
      }

      try {
        // 1. Extract authorization code from URL search params
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          setStatus('Exchanging security clearance code...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn('exchangeCodeForSession notice:', error.message);
          }
        }

        // 2. Poll for session to stabilize
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          for (let i = 0; i < 8; i++) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            const check = await supabase.auth.getSession();
            if (check.data.session) {
              session = check.data.session;
              break;
            }
          }
        }

        setStatus('Verifying personnel credentials...');
        const user = await getAuthUser();

        if (!user) {
          console.warn('Session could not be established after callback, redirecting to login');
          router.replace('/login');
          return;
        }

        setStatus(`Clearance Approved. Welcome, ${user.name}!`);
        // Clean entry point to My Work Desk
        setTimeout(() => {
          window.location.href = '/';
        }, 300);
      } catch (err) {
        console.error('Callback processing error:', err);
        router.replace('/login');
      }
    };

    processCallback();
  }, [router]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', gap: '1.5rem',
    }}>
      <img
        src="/bureau_crest.jpg"
        alt="The Daily Bureau"
        style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #d4a853' }}
      />
      <div className="typewriter-text" style={{ fontSize: '0.85rem', letterSpacing: '0.1em', color: 'var(--ink-secondary)' }}>
        {status.toUpperCase()}
      </div>
      <div style={{ width: '200px', height: '3px', backgroundColor: 'var(--border-sepia)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', backgroundColor: '#d4a853',
          borderRadius: '2px',
          animation: 'progress 1.5s ease-in-out infinite',
        }} />
      </div>
      <style>{`@keyframes progress { 0%{width:0;margin-left:0} 50%{width:70%;margin-left:15%} 100%{width:0;margin-left:100%} }`}</style>
    </div>
  );
}
