/**
 * CatyRainbowCTA (DEPRECATED) — replaced by CatyButton
 *
 * Kept for backward compatibility. All new usage should use CatyButton instead.
 * This will be removed in a future cleanup cycle.
 *
 * CatyButton provides the image-2 style: cat icon + label, no rainbow.
 */
import React from 'react';
import { CatyButton } from './CatyButton';

interface CatyRainbowCTAProps {
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  align?: 'left' | 'right';
}

export function CatyRainbowCTA({ label, onClick, isLoading, align = 'right' }: CatyRainbowCTAProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      paddingBlockStart: 8,
      paddingBlockEnd: 16,
    }}>
      <CatyButton label={label} onClick={onClick} loading={isLoading} />
    </div>
  );
}
