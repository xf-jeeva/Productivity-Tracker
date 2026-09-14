'use client';

import React, { useEffect, useState } from 'react';
import { 
  getCurrentUser, 
  getUserTokens, 
  BUREAU_SYNC_EVENT, 
  TOKEN_AWARD_EVENT, 
  TOKEN_RUPEE_RATE,
  MIN_REDEEM_AMOUNT_RUPEES,
  MIN_REDEEM_TOKENS 
} from '@/lib/storage';

import { playTypewriterClick } from '@/lib/sound';
import { Coins, Sparkles, ArrowRight } from 'lucide-react';

interface TokenPurseWidgetProps {
  onOpenClaimModal?: () => void;
  variant?: 'compact' | 'expanded';
}

export default function TokenPurseWidget({ onOpenClaimModal, variant = 'compact' }: TokenPurseWidgetProps) {
  const [tokens, setTokens] = useState({ balance: 0, totalEarned: 0, totalRedeemed: 0, rupeeWorth: 0 });
  const [isPulsing, setIsPulsing] = useState(false);
  const currentUser = getCurrentUser();

  useEffect(() => {
    const updateTokens = () => {
      const user = getCurrentUser();
      if (user) {
        setTokens(getUserTokens(user.username));
      }
    };

    updateTokens();

    const handleSync = () => updateTokens();
    const handleAward = () => {
      updateTokens();
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 1200);
    };

    window.addEventListener(BUREAU_SYNC_EVENT, handleSync);
    window.addEventListener(TOKEN_AWARD_EVENT, handleAward);

    return () => {
      window.removeEventListener(BUREAU_SYNC_EVENT, handleSync);
      window.removeEventListener(TOKEN_AWARD_EVENT, handleAward);
    };
  }, []);

  if (!currentUser) return null;

  const isEligible = tokens.balance >= MIN_REDEEM_TOKENS;

  if (variant === 'expanded') {
    return (
      <div
        className={`vintage-paper ${isPulsing ? 'token-pulse-glow' : ''}`}
        style={{
          padding: '1.25rem',
          borderTop: '4px solid var(--brass-gold)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="vintage-coin" style={{ width: '38px', height: '38px', fontSize: '1.1rem' }}>
              <div className="vintage-coin-inner">₹</div>
            </div>
            <div>
              <div
                className="typewriter-text"
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--brass-dark)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Special Bureau Tokens
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--ink-secondary)' }}>
                Rate: <strong>1 Token = ₹{TOKEN_RUPEE_RATE}</strong> • Min. Cashout: <strong>{MIN_REDEEM_TOKENS} Tokens (₹{MIN_REDEEM_AMOUNT_RUPEES})</strong>
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              padding: '0.2rem 0.55rem',
              backgroundColor: isEligible ? 'var(--stamp-green-bg)' : 'var(--brass-glow)',
              color: isEligible ? 'var(--stamp-green)' : 'var(--brass-dark)',
              border: isEligible ? '1px solid var(--stamp-green)' : '1px solid var(--border-brass)',
              borderRadius: '3px',
              fontWeight: 700,
            }}
          >
            {isEligible ? 'CASHOUT ELIGIBLE (₹500+)' : `MIN. ${MIN_REDEEM_TOKENS} TOKENS (₹${MIN_REDEEM_AMOUNT_RUPEES})`}
          </span>
        </div>


        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div className="serif-display" style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--brass-dark)', lineHeight: 1 }}>
              {tokens.balance}{' '}
              <span style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink-secondary)' }}>
                Tokens
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--stamp-green)', fontWeight: 700, marginTop: '0.25rem' }}>
              Worth ₹{tokens.rupeeWorth}.00 INR
            </div>
          </div>

          {onOpenClaimModal && (
            <button
              onClick={() => {
                playTypewriterClick();
                onOpenClaimModal();
              }}
              className="btn-brass"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.76rem' }}
            >
              <Sparkles size={13} />
              <span>Claim Reward</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Compact Header Pill
  return (
    <button
      onClick={() => {
        playTypewriterClick();
        if (onOpenClaimModal) onOpenClaimModal();
      }}
      title={`Token Balance: ${tokens.balance} Tokens (Worth ₹${tokens.rupeeWorth}.00). Click to Claim Rewards!`}
      className={`vintage-paper ${isPulsing ? 'token-pulse-glow' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.55rem',
        padding: '0.3rem 0.75rem',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '20px',
        border: '1.5px solid var(--border-brass)',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      <div className="vintage-coin" style={{ width: '24px', height: '24px', fontSize: '0.75rem' }}>
        <div className="vintage-coin-inner">₹</div>
      </div>

      <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
        <div
          className="typewriter-text"
          style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            color: 'var(--brass-dark)',
            letterSpacing: '0.04em',
          }}
        >
          {tokens.balance} <span style={{ fontSize: '0.65rem' }}>TOKENS</span>
        </div>
        <div
          style={{
            fontSize: '0.66rem',
            color: 'var(--stamp-green)',
            fontWeight: 700,
          }}
        >
          ₹{tokens.rupeeWorth} (₹{TOKEN_RUPEE_RATE}/ea)
        </div>
      </div>

      <div
        style={{
          marginLeft: '0.2rem',
          padding: '0.15rem 0.4rem',
          backgroundColor: 'var(--brass-glow)',
          borderRadius: '3px',
          fontSize: '0.62rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--brass-dark)',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.2rem',
        }}
      >
        <span>CLAIM</span>
        <ArrowRight size={10} />
      </div>
    </button>
  );
}
