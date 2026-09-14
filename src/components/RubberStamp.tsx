'use client';

import React from 'react';
import { CheckCircle2, ShieldCheck, Flame, Star, Clock, Trash2 } from 'lucide-react';

interface RubberStampProps {
  type: 'completed' | 'approved' | 'routine' | 'urgent' | 'opus' | 'pending' | 'deleted';
  text?: string;
  subtext?: string;
  animate?: boolean;
}

export default function RubberStamp({ type, text, subtext, animate = false }: RubberStampProps) {
  let label = text;
  let styleClass = '';
  let Icon = CheckCircle2;

  switch (type) {
    case 'completed':
      label = label || 'COMPLETED';
      styleClass = 'rubber-stamp-completed';
      Icon = CheckCircle2;
      break;
    case 'approved':
      label = label || 'CHIEF APPROVED';
      styleClass = 'rubber-stamp-approved';
      Icon = ShieldCheck;
      break;
    case 'opus':
      label = label || 'PRIORITY OPUS';
      styleClass = 'rubber-stamp-opus';
      Icon = Star;
      break;
    case 'urgent':
      label = label || 'URGENT DISPATCH';
      styleClass = 'rubber-stamp-urgent';
      Icon = Flame;
      break;
    case 'routine':
      label = label || 'ROUTINE';
      styleClass = 'rubber-stamp-routine';
      Icon = Clock;
      break;
    case 'deleted':
      label = label || 'DELETED';
      styleClass = 'rubber-stamp-urgent';
      Icon = Trash2;
      break;
    default:
      label = label || 'PENDING';
      styleClass = 'rubber-stamp-routine';
      Icon = Clock;
      break;
  }

  return (
    <div
      className={`rubber-stamp ${styleClass} ${animate ? 'animate-stamp' : ''}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.15rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem' }}>
        <Icon size={12} strokeWidth={2.5} />
        <span>{label}</span>
      </div>
      {subtext && (
        <span
          style={{
            fontSize: '0.58rem',
            letterSpacing: '0.04em',
            opacity: 0.85,
            fontWeight: 500,
          }}
        >
          {subtext}
        </span>
      )}
    </div>
  );
}
