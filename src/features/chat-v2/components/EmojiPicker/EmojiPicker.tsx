import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchIcon, SmileyIcon } from '../shared/Icon';
import { FREQUENTLY_USED, SECTIONS, searchEmojis } from './emojiData';

interface EmojiPickerProps {
  /** Where to position the picker (relative to its anchor). */
  anchor?: 'bubble' | 'composer' | 'reaction' | 'center';
  anchorRect?: DOMRect | null;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

const PICKER_WIDTH = 340;
const PICKER_HEIGHT = 460;

export function EmojiPicker({ anchor = 'center', anchorRect, onPick, onClose }: EmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('frequent');

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const results = useMemo(() => searchEmojis(query), [query]);

  const position = computePosition(anchor, anchorRect);

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Emoji picker"
      style={{
        position: 'fixed',
        ...position,
        width: PICKER_WIDTH,
        height: PICKER_HEIGHT,
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-lg)',
        boxShadow: 'var(--cv2-shadow-modal)',
        zIndex: 'var(--cv2-popover-z, 1100)' as any,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--cv2-font)',
      }}
    >
      <CategoryBar
        activeSection={activeSection}
        onChange={setActiveSection}
      />
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--cv2-divider)' }}>
        <SearchField value={query} onChange={setQuery} />
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 8,
        }}
      >
        {query.trim() ? (
          <EmojiGroup
            label={`Results for "${query.trim()}"`}
            entries={results}
            onPick={onPick}
          />
        ) : (
          <>
            <EmojiGroup label="Frequently Used" entries={FREQUENTLY_USED} onPick={onPick} />
            {SECTIONS.map(s => (
              <EmojiGroup key={s.id} label={s.label} entries={s.entries} onPick={onPick} />
            ))}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function computePosition(
  anchor: NonNullable<EmojiPickerProps['anchor']>,
  rect: DOMRect | null | undefined,
): React.CSSProperties {
  if (anchor === 'center' || !rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  // Default: anchor below; flip above if not enough room.
  let top = rect.bottom + 8;
  if (top + PICKER_HEIGHT > vh - 12) top = Math.max(12, rect.top - PICKER_HEIGHT - 8);
  let left = rect.right - PICKER_WIDTH;
  if (left < 12) left = 12;
  if (left + PICKER_WIDTH > vw - 12) left = vw - PICKER_WIDTH - 12;
  return { top, left };
}

function CategoryBar({
  activeSection,
  onChange,
}: {
  activeSection: string;
  onChange: (id: string) => void;
}) {
  const allSections = [
    { id: 'frequent', emoji: '🔎' },
    ...SECTIONS.map(s => ({ id: s.id, emoji: s.emoji })),
  ];
  return (
    <div
      role="tablist"
      aria-label="Categories"
      style={{
        display: 'flex',
        gap: 0,
        padding: '6px 8px',
        borderBottom: '1px solid var(--cv2-divider)',
      }}
    >
      {allSections.map(s => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={activeSection === s.id}
          onClick={() => onChange(s.id)}
          title={s.id}
          style={{
            flex: 1,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderBottom: activeSection === s.id
              ? '2px solid var(--cv2-accent)'
              : '2px solid transparent',
            color: 'var(--cv2-text)',
            fontSize: 15,
            cursor: 'pointer',
            transition: 'background var(--cv2-transition-fast)',
          }}
        >
          {s.id === 'frequent' ? <SearchIcon size={13} /> : <span aria-hidden="true">{s.emoji}</span>}
        </button>
      ))}
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        padding: '0 10px',
        border: '1px solid var(--cv2-accent)',
        borderRadius: 'var(--cv2-radius-sm)',
        background: 'var(--cv2-bg-input)',
      }}
    >
      <SearchIcon size={14} style={{ color: 'var(--cv2-text-muted)' }} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search all emoji"
        autoFocus
        style={{
          flex: 1,
          background: 'transparent',
          color: 'var(--cv2-text)',
          fontFamily: 'var(--cv2-font)',
          fontSize: 13,
          border: 'none',
          outline: 'none',
        }}
      />
    </label>
  );
}

function EmojiGroup({
  label,
  entries,
  onPick,
}: {
  label: string;
  entries: { emoji: string; name: string }[];
  onPick: (emoji: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontFamily: 'var(--cv2-font)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--cv2-text-strong)',
          padding: '4px 4px 6px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 2,
        }}
      >
        {entries.map(en => (
          <button
            key={en.emoji + en.name}
            type="button"
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onPick(en.emoji); }}
            title={en.name}
            aria-label={en.name}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              fontSize: 20,
              lineHeight: 1,
              cursor: 'pointer',
              transition: 'background var(--cv2-transition-fast)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <span aria-hidden="true">{en.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
