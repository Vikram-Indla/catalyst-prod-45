import React, { useState } from 'react';
import { ReplayTheatreOverlay } from './ReplayTheatreOverlay';
import { SEED_BR_SCRIPT, SEED_EPIC_SCRIPT } from '@/lib/replay/theatre/seedData';
import type { TheatreScript } from '@/lib/replay/theatre/theatreTypes';

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

export function ReplayTitleChip({ itemKey, itemType, mode }: ReplayTitleChipProps) {
  const [open, setOpen] = useState(false);

  const script: TheatreScript = mode === 'product-br' ? SEED_BR_SCRIPT : SEED_EPIC_SCRIPT;

  return (
    <>
      <button
        className="replay-chip"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={`Replay lifecycle of ${itemKey}`}
        aria-label={`Open Replay for ${itemType} ${itemKey}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 4,
          border: 'none',
          background: '#EEF2FF',
          color: '#2E63D5',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
          lineHeight: 1.5,
          verticalAlign: 'middle',
        }}
      >
        ▶ Replay
      </button>

      {open && (
        <ReplayTheatreOverlay script={script} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
