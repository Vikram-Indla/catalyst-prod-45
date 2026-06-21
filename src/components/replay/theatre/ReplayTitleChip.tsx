import React from 'react';

export interface ReplayTitleChipProps {
  itemKey: string;
  itemType: 'Business Request' | 'Epic';
  mode: 'product-br' | 'project-epic';
}

// CSS string for the hover-reveal behaviour — consumers inject this once
export const REPLAY_CHIP_CSS = `
.replay-title-hover-zone .replay-chip {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
.replay-title-hover-zone:hover .replay-chip {
  opacity: 1;
  pointer-events: auto;
}
`;

// Stub — portal-based ReplayTheatreOverlay permanently removed.
// Title-chip inline theatre integration is pending (future work item).
export function ReplayTitleChip({ itemKey, itemType }: ReplayTitleChipProps) {
  return (
    <button
      className="replay-chip"
      onClick={(e) => { e.stopPropagation(); }}
      title={`Replay lifecycle of ${itemKey}`}
      aria-label={`Open Replay for ${itemType} ${itemKey}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        border: 'none',
        background: 'var(--ds-background-neutral, #F1F2F4)',
        color: 'var(--ds-text-subtle, #42526E)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'default',
        fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
        lineHeight: 1.5,
        verticalAlign: 'middle',
        opacity: 0.5,
      }}
    >
      ▶ Replay
    </button>
  );
}
