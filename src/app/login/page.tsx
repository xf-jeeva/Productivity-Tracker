'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser, signInWithGoogle } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    // If already signed in, go to their page immediately
    getAuthUser().then((user) => {
      if (user) {
        router.replace('/');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle(); // Redirects to Google → comes back to /auth/callback
    } catch (err) {
      setError('Failed to open Google sign-in. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="typewriter-text" style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', letterSpacing: '0.1em' }}>
          CHECKING SESSION...
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '420px', margin: '4rem auto', padding: '0 1rem' }}>
      <div
        className="vintage-paper"
        style={{
          padding: '2.75rem 2.5rem',
          borderTop: '5px solid var(--brass-gold)',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--paper-shadow-lg)',
          textAlign: 'center',
        }}
      >
        {/* Header */}
        <img
          src="/bureau_crest.jpg"
          alt="The Daily Bureau"
          style={{
            width: '72px', height: '72px', borderRadius: '50%',
            border: '2.5px solid var(--brass-gold)', objectFit: 'cover',
            margin: '0 auto 1rem', display: 'block',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        />

        <div className="typewriter-text" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brass-dark)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
          Personnel Verification Desk
        </div>
        <h2 className="serif-display" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.5rem' }}>
          The Daily Bureau
        </h2>
        <p style={{ fontSize: '0.83rem', color: 'var(--ink-secondary)', marginBottom: '2rem', lineHeight: 1.55 }}>
          Your personal productivity workstation. Sign in with your Google account to access your desk, tasks, and routines.
        </p>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: 'var(--stamp-red-bg)', border: '1px solid var(--stamp-red)',
            borderRadius: '4px', padding: '0.6rem 0.85rem', marginBottom: '1.25rem',
            fontSize: '0.78rem', color: 'var(--stamp-red)', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <ShieldAlert size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Supabase not configured warning */}
        {!isSupabaseConfigured && (
          <div style={{
            backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px',
            padding: '0.65rem 0.85rem', marginBottom: '1.25rem',
            fontSize: '0.78rem', color: '#92400e',
          }}>
            ⚠️ Supabase is not configured. Set environment variables to enable Google login.
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading || !isSupabaseConfigured}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            width: '100%', padding: '0.85rem 1.5rem',
            backgroundColor: loading ? '#f5f5f5' : 'white',
            border: '2px solid #e5e7eb', borderRadius: '6px',
            cursor: loading || !isSupabaseConfigured ? 'not-allowed' : 'pointer',
            fontSize: '0.92rem', fontWeight: 600, color: '#374151',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            opacity: !isSupabaseConfigured ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!loading && isSupabaseConfigured) {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {loading ? (
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#6b7280' }} />
          ) : (
            /* Google icon SVG */
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          <span>{loading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div style={{ margin: '1.75rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-sepia)' }} />
          <span className="typewriter-text" style={{ fontSize: '0.65rem', color: 'var(--ink-muted)', letterSpacing: '0.06em' }}>BUREAU REGISTRY</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-sepia)' }} />
        </div>

        <p style={{ fontSize: '0.74rem', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          By signing in, your work desk and tasks are stored securely in your account. 
          Only you can see your personal data.
        </p>
        <p style={{ fontSize: '0.74rem', color: 'var(--ink-muted)', marginTop: '0.5rem' }}>
          First person to sign in becomes the <strong>Bureau Administrator</strong>.
        </p>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
