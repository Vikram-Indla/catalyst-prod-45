import React from 'react';
import { SmileyIcon, PlusIcon } from '../shared/Icon';
import type { ChatReaction } from '@/types/chat';

interface ReactionStripProps {
  reactions: ChatReaction[];
  onToggle: (emoji: string) => void;
  onAddReaction: () => void;
}

export function ReactionStrip({ reactions, onToggle, onAddReaction }: ReactionStripProps) {
  if (reactions.length === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
      }}
    >
      {reactions.map(r => (
        <ReactionPill key={r.emoji} reaction={r} onClick={() => onToggle(r.emoji)} />
      ))}
      <button
        type="button"
        aria-label="Add reaction"
        title="Add reaction"
        onClick={onAddReaction}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0,
          height: 'var(--cv2-reaction-pill-h)',
          padding: '0 8px',
          background: 'transparent',
          color: 'var(--cv2-text-subtle)',
          border: '1px solid var(--cv2-border)',
          borderRadius: 12,
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
        <SmileyIcon size={13} />
        <PlusIcon size={10} />
      </button>
    </div>
  );
}

function ReactionPill({ reaction, onClick }: { reaction: ChatReaction; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={reaction.reactedByMe}
      aria-label={`${reaction.emoji} ${reaction.count}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 'var(--cv2-reaction-pill-h)',
        padding: '0 8px',
        background: reaction.reactedByMe
          ? 'var(--cv2-bg-reaction-mine)'
          : 'var(--cv2-bg-reaction)',
        color: reaction.reactedByMe ? 'var(--cv2-text-link)' : 'var(--cv2-text)',
        border: `1px solid ${
          reaction.reactedByMe ? 'var(--cv2-accent)' : 'var(--cv2-border)'
        }`,
        borderRadius: 12,
        fontFamily: 'var(--cv2-font)',
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background var(--cv2-transition-fast)',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 'var(--ds-font-size-400)', lineHeight: 1 }}>
        {reaction.emoji}
      </span>
      <span>{reaction.count}</span>
    </button>
  );
}
