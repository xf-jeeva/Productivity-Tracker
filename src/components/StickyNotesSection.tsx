'use client';

import React, { useState, useRef, useEffect } from 'react';
import { StickyNote, StickyColor } from '../types';
import {
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
} from '../lib/storage';
import { playTypewriterClick } from '../lib/sound';
import { Plus, Trash2, Pin, PinOff, Palette, Check } from 'lucide-react';

const COLOR_MAP: Record<StickyColor, { bg: string; border: string; header: string; text: string }> = {
  yellow:  { bg: '#fef9c3', border: '#f59e0b', header: '#fde68a', text: '#78350f' },
  green:   { bg: '#dcfce7', border: '#22c55e', header: '#bbf7d0', text: '#14532d' },
  blue:    { bg: '#dbeafe', border: '#3b82f6', header: '#bfdbfe', text: '#1e3a8a' },
  pink:    { bg: '#fce7f3', border: '#ec4899', header: '#fbcfe8', text: '#831843' },
  orange:  { bg: '#ffedd5', border: '#f97316', header: '#fed7aa', text: '#7c2d12' },
  purple:  { bg: '#f3e8ff', border: '#a855f7', header: '#e9d5ff', text: '#4c1d95' },
};

const ALL_COLORS: StickyColor[] = ['yellow', 'green', 'blue', 'pink', 'orange', 'purple'];

interface StickyNoteCardProps {
  note: StickyNote;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<StickyNote, 'content' | 'color' | 'pinned'>>) => void;
}

function StickyNoteCard({ note, onDelete, onUpdate }: StickyNoteCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [showPalette, setShowPalette] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const colors = COLOR_MAP[note.color];

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== note.content) {
      onUpdate(note.id, { content: trimmed });
    } else if (!trimmed) {
      setDraft(note.content);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setDraft(note.content);
      setEditing(false);
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  const timeAgo = () => {
    const diff = Date.now() - new Date(note.updatedAt).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
  };

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '3px',
        boxShadow: `3px 4px 10px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '160px',
        position: 'relative',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: note.pinned ? 'rotate(0deg)' : undefined,
        animation: 'noteAppear 0.25s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px) rotate(0.5deg)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `5px 8px 18px rgba(0,0,0,0.18)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) rotate(0deg)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `3px 4px 10px rgba(0,0,0,0.12)`;
      }}
    >
      {/* Pin indicator */}
      {note.pinned && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: '#dc2626',
          border: '2px solid #991b1b',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 2,
        }} />
      )}

      {/* Note Header / Action Bar */}
      <div style={{
        backgroundColor: colors.header,
        padding: '0.35rem 0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${colors.border}`,
        borderRadius: '1px 1px 0 0',
      }}>
        <span style={{ fontSize: '0.62rem', color: colors.text, opacity: 0.65, fontFamily: 'var(--font-mono)' }}>
          {timeAgo()}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
          {/* Color palette button */}
          <button
            onClick={() => { playTypewriterClick(); setShowPalette(!showPalette); }}
            title="Change color"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', display: 'flex', color: colors.text, opacity: 0.7 }}
          >
            <Palette size={12} />
          </button>

          {/* Color picker dropdown */}
          {showPalette && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '0',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '0.4rem',
              display: 'flex',
              gap: '0.3rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 10,
            }}>
              {ALL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { onUpdate(note.id, { color: c }); setShowPalette(false); playTypewriterClick(); }}
                  title={c}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: COLOR_MAP[c].bg,
                    border: `2px solid ${note.color === c ? COLOR_MAP[c].border : 'transparent'}`,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {note.color === c && <Check size={8} color={COLOR_MAP[c].border} />}
                </button>
              ))}
            </div>
          )}

          {/* Pin button */}
          <button
            onClick={() => { playTypewriterClick(); onUpdate(note.id, { pinned: !note.pinned }); }}
            title={note.pinned ? 'Unpin' : 'Pin to top'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', display: 'flex', color: note.pinned ? '#dc2626' : colors.text, opacity: note.pinned ? 1 : 0.7 }}
          >
            {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>

          {/* Delete button */}
          <button
            onClick={() => { playTypewriterClick(); onDelete(note.id); }}
            title="Delete note"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', display: 'flex', color: '#dc2626', opacity: 0.6 }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Note Content */}
      <div style={{ flex: 1, padding: '0.65rem 0.75rem', cursor: 'text' }} onClick={() => setEditing(true)}>
        {editing ? (
          <textarea
            ref={textRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              minHeight: '100px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '0.83rem',
              lineHeight: 1.55,
              color: colors.text,
              fontFamily: 'var(--font-serif, Georgia, serif)',
            }}
          />
        ) : (
          <p style={{
            fontSize: '0.83rem',
            lineHeight: 1.55,
            color: colors.text,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            minHeight: '80px',
            fontFamily: 'var(--font-serif, Georgia, serif)',
          }}>
            {note.content || <span style={{ opacity: 0.45, fontStyle: 'italic' }}>Click to write...</span>}
          </p>
        )}
      </div>

      {editing && (
        <div style={{ padding: '0.25rem 0.5rem 0.4rem', textAlign: 'right' }}>
          <span style={{ fontSize: '0.6rem', color: colors.text, opacity: 0.5 }}>Ctrl+Enter to save • Esc to cancel</span>
        </div>
      )}
    </div>
  );
}

// ─── New Note Quick-Add Card ───────────────────────────────────────────────
function NewNoteCard({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [active, setActive] = useState(false);
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<StickyColor>('yellow');
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (active && textRef.current) textRef.current.focus();
  }, [active]);

  const handleCreate = () => {
    const trimmed = content.trim();
    if (!trimmed) { setActive(false); setContent(''); return; }
    createStickyNote(userId, trimmed, selectedColor);
    playTypewriterClick();
    setContent('');
    setActive(false);
    onCreated();
  };

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        style={{
          backgroundColor: '#fefce8',
          border: '2px dashed #f59e0b',
          borderRadius: '3px',
          minHeight: '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          color: '#92400e',
          width: '100%',
          transition: 'background 0.15s, transform 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fef3c7';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.01)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fefce8';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        <Plus size={28} style={{ color: '#f59e0b', opacity: 0.8 }} />
        <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', opacity: 0.7 }}>
          ADD NOTE
        </span>
      </button>
    );
  }

  const colors = COLOR_MAP[selectedColor];
  return (
    <div style={{
      backgroundColor: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: '3px',
      boxShadow: '3px 4px 10px rgba(0,0,0,0.12)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Color picker header */}
      <div style={{
        backgroundColor: colors.header,
        padding: '0.4rem 0.6rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: colors.text, opacity: 0.7 }}>Color:</span>
        {ALL_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedColor(c)}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: COLOR_MAP[c].bg,
              border: `2px solid ${selectedColor === c ? COLOR_MAP[c].border : 'rgba(0,0,0,0.1)'}`,
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      <textarea
        ref={textRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setActive(false); setContent(''); }
          if (e.key === 'Enter' && e.ctrlKey) handleCreate();
        }}
        placeholder="Write your note here..."
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          padding: '0.65rem 0.75rem',
          minHeight: '100px',
          fontSize: '0.83rem',
          lineHeight: 1.55,
          color: colors.text,
          fontFamily: 'var(--font-serif, Georgia, serif)',
        }}
      />

      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0.6rem', justifyContent: 'flex-end', borderTop: `1px solid ${colors.border}` }}>
        <button onClick={() => { setActive(false); setContent(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: colors.text, opacity: 0.6 }}>
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!content.trim()}
          style={{
            backgroundColor: colors.border,
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            padding: '0.3rem 0.75rem',
            fontSize: '0.72rem',
            cursor: content.trim() ? 'pointer' : 'not-allowed',
            opacity: content.trim() ? 1 : 0.5,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}
        >
          + ADD NOTE
        </button>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────
interface StickyNotesSectionProps {
  userId: string;
}

export default function StickyNotesSection({ userId }: StickyNotesSectionProps) {
  const [notes, setNotes] = useState<StickyNote[]>([]);

  const load = () => setNotes(getStickyNotes(userId));

  useEffect(() => {
    load();
  }, [userId]);

  const handleDelete = (id: string) => {
    deleteStickyNote(id);
    load();
  };

  const handleUpdate = (id: string, updates: Partial<Pick<StickyNote, 'content' | 'color' | 'pinned'>>) => {
    updateStickyNote(id, updates);
    load();
  };

  return (
    <div>
      {/* Section Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        paddingBottom: '0.65rem',
        borderBottom: '2px solid var(--border-sepia-dark)',
      }}>
        <div>
          <div className="typewriter-text" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Section 3 • Bureau Memos
          </div>
          <h3 className="serif-display" style={{ fontSize: '1.35rem', fontWeight: 800 }}>
            Sticky Notes ({notes.length})
          </h3>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
          Click any note to edit • Ctrl+Enter to save
        </span>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
        Personal memos and quick reminders. Only visible to you. Pin important notes to keep them at the top.
      </p>

      {/* Notes Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '1rem',
      }}>
        {notes.map((note) => (
          <StickyNoteCard
            key={note.id}
            note={note}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
        <NewNoteCard userId={userId} onCreated={load} />
      </div>

      <style>{`
        @keyframes noteAppear {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
