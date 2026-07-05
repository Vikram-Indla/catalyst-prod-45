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
      aria-label={`${reaction.emoji} ${reaction.count}${reaction.reactedByMe ? ', including you' : ''}`}
      title={reaction.reactedByMe ? 'You reacted — click to remove' : 'Click to react'}
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
        font: 'var(--ds-font-body-small)',
        fontWeight: 600,
        cursor: 'pointer',
        // Subtle lift on hover — the Slack micro-delight. transform is
        // GPU-composited so it never reflows the message row.
        transition: 'background var(--cv2-transition-fast), transform var(--cv2-transition-fast), border-color var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        if (!reaction.reactedByMe) {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cv2-border-strong)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        if (!reaction.reactedByMe) {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cv2-border)';
        }
      }}
    >
      <span aria-hidden="true" style={{ font: 'var(--ds-font-body)', lineHeight: 1 }}>
        {reaction.emoji}
      </span>
      <span>{reaction.count}</span>
    </button>
  );
}
