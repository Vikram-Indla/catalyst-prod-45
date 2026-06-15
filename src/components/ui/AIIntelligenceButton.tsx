/**
 * AIIntelligenceButton (DEPRECATED) — replaced by CatyIconCTA
 *
 * Kept for backward compatibility. All new usage should import CatyIconCTA instead.
 * This will be removed in a future cleanup cycle.
 *
 * CatyIconCTA provides the image-2 style: cat icon toggle, no sparkle, no rainbow.
 */
import React from 'react';
import { CatyIconCTA } from '@/components/ui/CatyIconCTA';

export interface AIIntelligenceButtonProps {
  label?: string;
  isActive?: boolean;
  isLoading?: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  tooltip?: string;
}

export function AIIntelligenceButton({
  label = 'Ask Caty',
  isActive = false,
  isLoading = false,
  onClick,
  className,
  disabled = false,
  tooltip = 'Ask Caty about this view',
}: AIIntelligenceButtonProps) {
  return (
    <CatyIconCTA
      tooltip={tooltip}
      onClick={onClick}
      isLoading={isLoading}
      disabled={disabled}
      size={20}
      className={className}
    />
  );
}
