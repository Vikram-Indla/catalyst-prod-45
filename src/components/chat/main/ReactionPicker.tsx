/**
 * ReactionPicker — emoji selection UI for messages.
 * - Quick reactions (6 presets): always visible as a horizontal row
 * - Emoji picker button: opens FloatingMenu with emoji grid + search
 * - Click emoji to react; handler is onEmojiPick(emoji)
 * - Portal: absolutely positioned below the trigger, click-outside closes
 */
import React, { useState, useRef, useEffect } from 'react';

// 6 quick reaction presets
const QUICK_REACTIONS = ['👍', '❤️', '😄', '🎉', '👀', '🙏'];

// Popular emojis organized by category (grid: 8 cols)
const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩'],
  gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎'],
  objects: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💝'],
  nature: ['⭐', '✨', '⚡', '🔥', '💧', '🌟', '💫', '✴️', '⚪', '⚫', '🟡', '🟢', '🔵', '🟣', '🟤', '🟥'],
};

export interface ReactionPickerProps {
  onEmojiPick: (emoji: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

export function ReactionPicker({
  onEmojiPick,
  isOpen = false,
  onClose,
  triggerRef,
}: ReactionPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys');
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click-outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  // Focus search input when picker opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Get trigger position — right-anchor so picker stays inside viewport when
  // triggered from the bottom-right dock. 320px picker width + 8px margin.
  const triggerRect = triggerRef?.current?.getBoundingClientRect();
  const PICKER_W = 320;
  const viewW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const triggerRight = triggerRect ? triggerRect.right : viewW;
  // Open to the left if too close to the right edge; otherwise open normally.
  const wouldOverflow = triggerRight + PICKER_W > viewW - 8;
  const top = triggerRect ? triggerRect.bottom + 8 : 'auto';
  const left = wouldOverflow ? 'auto' : (triggerRect ? triggerRect.left : 'auto');
  const right = wouldOverflow ? (viewW - triggerRight) : 'auto';

  // Filter emojis by search term
  const filteredEmojis = searchTerm.trim()
    ? Object.values(EMOJI_CATEGORIES).flat().filter((e) => {
      // Simple substring match on emoji visual representation
      return e.toLowerCase().includes(searchTerm.toLowerCase());
    })
    : EMOJI_CATEGORIES[activeCategory];

  return (
    <div
      ref={pickerRef}
      className="cc-reaction-picker"
      role="menu"
      style={{
        position: 'fixed',
        top,
        left,
        right,
        zIndex: 1000,
        background: 'var(--ds-surface-overlay)',
        border: `1px solid var(--ds-border)`,
        borderRadius: 8,
        boxShadow: '0 4px 12px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.13))',
        width: 320,
        maxHeight: 420,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Search input */}
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search emoji…"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          if (e.target.value.trim()) setActiveCategory('smileys');
        }}
        className="cc-reaction-search"
        style={{
          padding: '8px 12px',
          border: 'none',
          borderBottom: `1px solid var(--ds-border)`,
          fontSize: 'var(--ds-font-size-400)',
          fontFamily: 'var(--ds-font-family-body, -apple-system, sans-serif)',
          outline: 'none',
        }}
      />

      {/* Quick reactions row (always visible above emoji grid) */}
      {!searchTerm && (
        <div
          className="cc-quick-reactions"
          style={{
            display: 'flex',
            padding: '8px 12px',
            gap: 4,
            borderBottom: `1px solid var(--ds-border)`,
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          {QUICK_REACTIONS.map((emo) => (
            <button
              key={emo}
              type="button"
              className="cc-quick-reaction-btn"
              onClick={() => {
                onEmojiPick(emo);
                onClose?.();
              }}
              style={{
                padding: '4px',
                background: 'transparent',
                border: 'none',
                fontSize: 'var(--ds-font-size-700)',
                cursor: 'pointer',
                borderRadius: 4,
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = 'transparent';
              }}
              aria-label={`React with ${emo}`}
            >
              {emo}
            </button>
          ))}
        </div>
      )}

      {/* Category tabs (hidden when searching) */}
      {!searchTerm && (
        <div
          className="cc-emoji-tabs"
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: `1px solid var(--ds-border)`,
            padding: '4px 8px',
            overflowX: 'auto',
          }}
        >
          {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`cc-emoji-tab ${activeCategory === cat ? 'is-active' : ''}`}
              style={{
                padding: '4px 8px',
                background: activeCategory === cat ? 'var(--ds-background-neutral)' : 'transparent',
                border: 'none',
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: activeCategory === cat ? 600 : 400,
                cursor: 'pointer',
                borderRadius: 4,
                color: activeCategory === cat ? 'var(--ds-text)' : 'var(--ds-text-subtle)',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div
        className="cc-emoji-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 4,
          padding: '8px 12px',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {filteredEmojis.map((emo) => (
          <button
            key={emo}
            type="button"
            className="cc-emoji-btn"
            onClick={() => {
              onEmojiPick(emo);
              onClose?.();
            }}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              fontSize: 'var(--ds-font-size-700)',
              cursor: 'pointer',
              borderRadius: 4,
              transition: 'background 100ms',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
            }}
            aria-label={`React with ${emo}`}
          >
            {emo}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredEmojis.length === 0 && (
        <div
          style={{
            padding: '24px 12px',
            textAlign: 'center',
            color: 'var(--ds-text-subtle)',
            fontSize: 'var(--ds-font-size-400)',
          }}
        >
          No emoji found for "{searchTerm}"
        </div>
      )}
    </div>
  );
}
