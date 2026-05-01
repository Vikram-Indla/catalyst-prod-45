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
      gap: 6,
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
              display: 'inline-flex', alignItems: 'center', gap: 2,
              padding: '4px 8px',
              border: `0.5px solid ${isHov ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'rgba(15,23,42,.08)'}`,
              borderRadius: 20,
              background: isHov ? 'rgba(15,23,42,.04)' : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 150ms ease',
              outline: 'none',
              // m-01: scale on active/press
              transform: isPressed ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            <span>{emoji}</span>
            {count > 0 && <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, var(--ds-text-subtle, #475569))', fontWeight: 500 }}>{count}</span>}
          </button>
        );
      })}
      <button
        onClick={(e) => { e.stopPropagation(); onReact?.('add'); }}
        style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '4px 8px',
          border: '0.5px solid rgba(15,23,42,.08)',
          borderRadius: 20,
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 13,
          color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))',
        }}
      >
        +
      </button>

      <div style={{ flex: 1 }} />

      {onReply && (
        <button
          onClick={(e) => { e.stopPropagation(); onReply(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', fontFamily: 'var(--cp-font-body)' }}
        >
          Reply
        </button>
      )}
      {/* m-14: View thread with underline on hover */}
      {onViewThread && (
        <button
          onClick={(e) => { e.stopPropagation(); onViewThread(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', fontFamily: 'var(--cp-font-body)', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          View thread
        </button>
      )}
    </div>
  );
}
