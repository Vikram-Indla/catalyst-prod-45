/**
 * MessageReactions — display reactions as emoji chips.
 * - Groups reactions by emoji
 * - Shows count badge
 * - "Reacted by me" highlight (blue)
 * - Hover tooltip: "Alice, Bob, +2 others reacted with ❤️"
 * - Click to toggle your reaction (add/remove)
 * - Requires name+ID mapping for each reactor (fetched separately)
 */
import React, { useState, useRef, useEffect } from 'react';
import type { ChatReaction } from '@/types/chat';

interface Reactor {
  userId: string;
  userName: string;
}

export interface MessageReactionsProps {
  reactions: ChatReaction[];
  onToggle: (emoji: string) => void;
  currentUserId?: string | null;
  reactorsByEmoji?: Map<string, Reactor[]>; // emoji -> [{ userId, userName }, ...]
}

export function MessageReactions({
  reactions,
  onToggle,
  currentUserId,
  reactorsByEmoji,
}: MessageReactionsProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="cc-reacts">
      {reactions.map((r) => (
        <ReactionChip
          key={r.emoji}
          emoji={r.emoji}
          count={r.count}
          reactedByMe={r.reactedByMe}
          onToggle={() => onToggle(r.emoji)}
          reactors={reactorsByEmoji?.get(r.emoji) ?? []}
        />
      ))}
    </div>
  );
}

function ReactionChip({
  emoji,
  count,
  reactedByMe,
  onToggle,
  reactors,
}: {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  onToggle: () => void;
  reactors: Reactor[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip on click-outside
  useEffect(() => {
    if (!showTooltip) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        chipRef.current &&
        !chipRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  // Get chip position — right-anchor tooltip when near viewport right edge.
  const chipRect = chipRef.current?.getBoundingClientRect();
  const tooltipTop = chipRect ? chipRect.bottom + 8 : 'auto';
  const viewW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const chipRight = chipRect ? chipRect.right : viewW;
  const tooltipWouldOverflow = chipRight + 200 > viewW - 8;
  const tooltipLeft = tooltipWouldOverflow ? 'auto' : (chipRect ? chipRect.left : 'auto');
  const tooltipRight = tooltipWouldOverflow ? (viewW - chipRight) : 'auto';

  // Build reactor list for tooltip
  const reactorList = reactors.slice(0, 3).map((r) => r.userName).join(', ');
  const otherCount = Math.max(0, reactors.length - 3);
  const tooltipText = otherCount > 0
    ? `${reactorList}, +${otherCount} other${otherCount === 1 ? '' : 's'} reacted with ${emoji}`
    : `${reactorList} reacted with ${emoji}`;

  return (
    <div className="cc-react-wrapper" style={{ position: 'relative' }}>
      <button
        ref={chipRef}
        type="button"
        className={`cc-react${reactedByMe ? ' is-mine' : ''}`}
        onClick={onToggle}
        onMouseEnter={(e) => {
          setShowTooltip(true);
          const el = e.currentTarget;
          el.style.background = reactedByMe
            ? 'var(--ds-background-information)'
            : 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
        }}
        onMouseLeave={(e) => {
          setShowTooltip(false);
          const el = e.currentTarget;
          el.style.background = reactedByMe
            ? 'var(--ds-background-information-subtle)'
            : 'var(--ds-background-neutral-subtle)';
        }}
        aria-pressed={reactedByMe}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          background: reactedByMe
            ? 'var(--ds-background-information-subtle)'
            : 'var(--ds-background-neutral-subtle)',
          border: reactedByMe
            ? '1px solid var(--ds-border-information)'
            : '1px solid var(--ds-border)',
          borderRadius: 12,
          cursor: 'pointer',
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 500,
          color: 'var(--ds-text)',
          transition: 'all 100ms',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 'var(--ds-font-size-500)' }}>{emoji}</span>
        <span>{count}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && reactors.length > 0 && (
        <div
          ref={tooltipRef}
          className="cc-react-tooltip"
          role="tooltip"
          style={{
            position: 'fixed',
            top: tooltipTop,
            left: tooltipLeft,
            right: tooltipRight,
            zIndex: 1001,
            background: 'var(--ds-surface-overlay)',
            border: `1px solid var(--ds-border)`,
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 'var(--ds-font-size-200)',
            color: 'var(--ds-text)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.13))',
          }}
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
}
