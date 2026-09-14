'use client';

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export default function VintageClock() {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [secondsDeg, setSecondsDeg] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Vintage time format: 09:42:18 PM
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );

      // Vintage formal date: "Monday, September 13th, 2026"
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const day = now.getDate();
      const month = now.toLocaleDateString('en-US', { month: 'long' });
      const year = now.getFullYear();

      const suffix = (d: number) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
        }
      };

      setDateStr(`${dayName}, ${month} ${day}${suffix(day)}, ${year}`);
      setSecondsDeg((now.getSeconds() / 60) * 360);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
      {/* Miniature mechanical dial */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '2px solid var(--brass-gold)',
          backgroundColor: 'var(--bg-card)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)',
        }}
        title="Chronometer escapement"
      >
        {/* Center pivot */}
        <div
          style={{
            width: '4px',
            height: '4px',
            backgroundColor: 'var(--brass-dark)',
            borderRadius: '50%',
            zIndex: 2,
          }}
        />
        {/* Second hand */}
        <div
          style={{
            position: 'absolute',
            width: '1px',
            height: '12px',
            backgroundColor: 'var(--stamp-red)',
            bottom: '15px',
            left: '14px',
            transformOrigin: 'bottom center',
            transform: `rotate(${secondsDeg}deg)`,
            transition: 'transform 0.1s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
            zIndex: 1,
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          className="typewriter-text"
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'var(--ink-primary)',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          {timeStr || '12:00:00 PM'}
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {dateStr || 'Chronometer Synchronizing...'}
        </span>
      </div>
    </div>
  );
}
