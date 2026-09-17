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
        // Check if there is an auth code to exchange
        const hasCode = window.location.search.includes('code=');
        if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) {
            console.warn('exchangeCodeForSession notice:', error.message);
          }
        }

        // Verify active session exists
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Allow detectSessionInUrl a moment to complete if needed
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        setStatus('Fetching your clearance profile...');
        const user = await getAuthUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        setStatus(`Welcome, ${user.name}!`);
        // Default entry point is ALWAYS the main workstation desk (/)
        setTimeout(() => router.replace('/'), 500);
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
