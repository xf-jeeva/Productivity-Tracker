'use client';

import React, { useEffect, useState } from 'react';
import { TOKEN_AWARD_EVENT, TOKEN_RUPEE_RATE } from '@/lib/storage';
import { playCoinClink } from '@/lib/sound';
import confetti from 'canvas-confetti';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';

interface AwardEventDetail {
  taskId?: string;
  taskTitle: string;
  tokensAwarded: number;
  rupeeValue: number;
  newBalance: number;
}

export default function TokenAwardCelebration() {
  const [awardData, setAwardData] = useState<AwardEventDetail | null>(null);

  useEffect(() => {
    const handleTokenAward = (e: Event) => {
      const customEvent = e as CustomEvent<AwardEventDetail>;
      if (!customEvent.detail) return;

      setAwardData(customEvent.detail);
      playCoinClink();

      // Confetti with rich metallic brass, gold, and emerald sparkles
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6, x: 0.5 },
        colors: ['#d8a658', '#b38234', '#fcedbd', '#1d5236', '#872016'],
        disableForReducedMotion: true,
      });

      const timer = setTimeout(() => {
        setAwardData(null);
      }, 4200);

      return () => clearTimeout(timer);
    };

    window.addEventListener(TOKEN_AWARD_EVENT, handleTokenAward);
    return () => window.removeEventListener(TOKEN_AWARD_EVENT, handleTokenAward);
  }, []);

  if (!awardData) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: '480px',
        width: '92%',
        animation: 'tokenFloatUp 4.2s ease-in-out forwards',
        pointerEvents: 'auto',
      }}
      onClick={() => setAwardData(null)}
    >
      <div
        className="vintage-paper"
        style={{
          padding: '1.2rem 1.5rem',
          border: '2px solid var(--brass-gold)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4), 0 0 20px var(--brass-glow)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        {/* Close hint */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAwardData(null);
          }}
          style={{
            position: 'absolute',
            top: '0.4rem',
            right: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink-muted)',
            padding: '0.2rem',
          }}
        >
          <X size={14} />
        </button>

        {/* 3D Spinning Brass Medallion */}
        <div
          className="vintage-coin coin-spin-anim"
          style={{
            width: '62px',
            height: '62px',
            fontSize: '1.8rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 0 16px rgba(216, 166, 88, 0.6)',
          }}
        >
          <div className="vintage-coin-inner">
            <span>₹</span>
          </div>
        </div>

        {/* Award Details */}
        <div style={{ flex: 1 }}>
          <div
            className="typewriter-text"
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: 'var(--stamp-green)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '0.2rem',
            }}
          >
            <Sparkles size={12} style={{ color: 'var(--brass-gold)' }} />
            <span>SPECIAL BUREAU REWARD BOUNTY</span>
          </div>

          <div
            className="serif-display"
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--ink-primary)',
              lineHeight: 1.15,
            }}
          >
            +{awardData.tokensAwarded} Special Token Earned!
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginTop: '0.25rem' }}>
            Work completed on <span style={{ fontStyle: 'italic', fontWeight: 600 }}>&ldquo;{awardData.taskTitle}&rdquo;</span>.
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginTop: '0.45rem',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span
              style={{
                color: 'var(--stamp-green)',
                fontWeight: 700,
                backgroundColor: 'var(--stamp-green-bg)',
                padding: '0.15rem 0.45rem',
                borderRadius: '3px',
                border: '1px solid var(--stamp-green)',
              }}
            >
              +₹{awardData.rupeeValue}.00 INR
            </span>
            <span style={{ color: 'var(--ink-muted)' }}>
              New Balance: <strong>{awardData.newBalance} Tokens</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
