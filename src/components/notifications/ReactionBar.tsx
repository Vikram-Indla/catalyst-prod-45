import { useState } from "react";

const REACTIONS = ['👍', '👏', '🔥', '❤️'];

interface ReactionBarProps {
  reactions?: Record<string, number>;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onViewThread?: () => void;
}

export default function ReactionBar({ reactions = {}, onReact, onReply, onViewThread }: ReactionBarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
      fontFamily: 'var(--cp-font-body)',
    }}>
      {REACTIONS.map(emoji => {
        const count = reactions[emoji] || 0;
        const isHov = hovered === emoji;
        const isPressed = pressed === emoji;
        return (
          <button
            key={emoji}
            onClick={(e) => { e.stopPropagation(); onReact?.(emoji); }}
            onMouseEnter={() => setHovered(emoji)}
            onMouseLeave={() => { setHovered(null); setPressed(null); }}
            onMouseDown={() => setPressed(emoji)}
            onMouseUp={() => setPressed(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 0,
              padding: '4px 8px',
              border: `0.5px solid ${isHov ? 'var(--ds-link)' : 'var(--ds-border)'}`,
              borderRadius: 20,
              background: isHov ? 'var(--ds-background-neutral-subtle-hovered)' : 'transparent',
              cursor: 'pointer',
              fontSize: 'var(--ds-font-size-300)',
              transition: 'all 150ms ease',
              outline: 'none',
              transform: isPressed ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            <span>{emoji}</span>
            {count > 0 && <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)', fontWeight: 500 }}>{count}</span>}
          </button>
        );
      })}
      <button
        aria-label="Add a reaction"
        onClick={(e) => { e.stopPropagation(); onReact?.('add'); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28,
          padding: 0,
          border: 'var(--ds-border) 1px solid',
          borderRadius: '50%',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--ds-text-subtlest)',
        }}
      >
        {/* smiley-add glyph — @atlaskit/icon path for emoji-add */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="9" cy="10" r="1" fill="currentColor"/>
          <circle cx="15" cy="10" r="1" fill="currentColor"/>
          <path d="M8 15s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M17 5h4M19 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      <div style={{ flex: 1 }} />

      {onReply && (
        <button
          onClick={(e) => { e.stopPropagation(); onReply(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontFamily: 'var(--cp-font-body)' }}
        >
          Reply
        </button>
      )}
      {/* m-14: View thread with underline on hover */}
      {onViewThread && (
        <button
          onClick={(e) => { e.stopPropagation(); onViewThread(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', fontFamily: 'var(--cp-font-body)', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          View thread
        </button>
      )}
    </div>
  );
}
