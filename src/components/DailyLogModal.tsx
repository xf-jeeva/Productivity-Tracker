'use client';

import React, { useState } from 'react';
import { getCurrentUser, submitDailyLog } from '../lib/storage';
import { playRubberStampSound, playVintageBell, playTypewriterClick } from '../lib/sound';
import confetti from 'canvas-confetti';
import { X, Plus, Trash2, CheckCircle2, Feather, Clock } from 'lucide-react';

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyLogModal({ isOpen, onClose }: DailyLogModalProps) {
  const currentUser = getCurrentUser();
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [hoursLogged, setHoursLogged] = useState(7.5);
  const [accomplishments, setAccomplishments] = useState<string[]>([
    'Completed priority work orders assigned on desk today.',
  ]);
  const [newAccomp, setNewAccomp] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextFocus, setNextFocus] = useState('');

  if (!isOpen) return null;

  const handleAddAccomp = () => {
    if (!newAccomp.trim()) return;
    playTypewriterClick();
    setAccomplishments([...accomplishments, newAccomp.trim()]);
    setNewAccomp('');
  };

  const handleRemoveAccomp = (idx: number) => {
    playTypewriterClick();
    setAccomplishments(accomplishments.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accomplishments.length === 0 || !nextFocus.trim()) return;

    playRubberStampSound();
    setTimeout(() => playVintageBell(), 200);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#b38234', '#1d5236', '#a42a1f', '#d8a658'],
    });

    submitDailyLog({
      userId: currentUser?.id || 'usr-1',
      date,
      accomplishments,
      blockers: blockers.trim() || undefined,
      nextFocus: nextFocus.trim(),
      hoursLogged: Number(hoursLogged),
    });

    onClose();
  };

  return (
    <div
      className="modal-overlay-responsive"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 16, 12, 0.72)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <div
        className="vintage-paper modal-card-responsive"
        style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--paper-shadow-lg)',
          border: '2px solid var(--border-sepia-dark)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '3px double var(--border-sepia)',
            paddingBottom: '0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div
              className="typewriter-text"
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--brass-dark)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              The Daily Gazette • End of Shift Dispatch Log
            </div>
            <h2
              className="serif-display"
              style={{
                fontSize: '1.45rem',
                fontWeight: 700,
                color: 'var(--ink-primary)',
                marginTop: '0.15rem',
              }}
            >
              File Daily Work & Standup Dispatch
            </h2>
          </div>

          <button onClick={onClose} className="btn-parchment" style={{ padding: '0.35rem 0.55rem' }}>
            <X size={16} />
          </button>
        </div>

        {/* Member Signature Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-parchment)',
            border: '1px solid var(--border-sepia)',
            borderRadius: '4px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <img
              src={currentUser?.avatar}
              alt={currentUser?.name}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1.5px solid var(--brass-gold)',
                objectFit: 'cover',
              }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{currentUser?.name}</div>
              <div className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                {currentUser?.title}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="typewriter-text" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
              Official Sign:
            </div>
            <div
              className="serif-display"
              style={{
                fontStyle: 'italic',
                fontWeight: 700,
                color: 'var(--brass-dark)',
                fontSize: '0.95rem',
              }}
            >
              {currentUser?.signature}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <label className="vintage-label">Log Record Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="vintage-input"
              />
            </div>

            <div>
              <label className="vintage-label">Total Hours Dedicated Today</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                required
                value={hoursLogged}
                onChange={(e) => setHoursLogged(parseFloat(e.target.value) || 0)}
                className="vintage-input"
              />
            </div>
          </div>

          {/* Accomplishments */}
          <div
            style={{
              border: '1px solid var(--border-sepia)',
              borderRadius: '4px',
              padding: '1rem',
              marginBottom: '1.25rem',
              backgroundColor: 'var(--bg-parchment)',
            }}
          >
            <label className="vintage-label" style={{ marginBottom: '0.5rem' }}>
              Key Accomplishments & Completed Tasks Today *
            </label>

            {accomplishments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {accomplishments.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0.65rem',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '3px',
                      border: '1px solid var(--border-sepia)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={13} style={{ color: 'var(--stamp-green)' }} />
                      <span>{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAccomp(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--stamp-red)',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newAccomp}
                onChange={(e) => setNewAccomp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAccomp();
                  }
                }}
                placeholder="Log an accomplishment (e.g. Assembled chronometer mainspring)..."
                className="vintage-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddAccomp}
                className="btn-parchment"
                style={{ padding: '0.5rem 0.85rem' }}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Blockers & Obstacles */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="vintage-label">Blockers, Delays or Material Impediments (Optional)</label>
            <textarea
              rows={2}
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="e.g. Awaiting arrival of brass ingot shipment from Sheffield foundry..."
              className="vintage-textarea"
            />
          </div>

          {/* Tomorrow's Focus */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="vintage-label">Tomorrow's Primary Objective & Agenda *</label>
            <input
              type="text"
              required
              value={nextFocus}
              onChange={(e) => setNextFocus(e.target.value)}
              placeholder="e.g. Conduct pressure leak test on pneumatic telegraph station 5..."
              className="vintage-input"
            />
          </div>

          {/* Footer actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              borderTop: '1px solid var(--border-sepia)',
              paddingTop: '1rem',
            }}
          >
            <button type="button" onClick={onClose} className="btn-parchment">
              Cancel
            </button>
            <button type="submit" className="btn-brass">
              <Feather size={15} />
              <span>Submit & Seal Dispatch Log</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
