/**
 * CatyIconCTA — unified cat-icon toggle for all Caty interfaces across Catalyst.
 *
 * Replaces: AIIntelligenceButton, CatyRainbowCTA, ImproveButton, sparkle CTAs
 *
 * Pattern (image 2 parity):
 *   - Cat head icon (CatyHead from CatyButton)
 *   - No label, no sparkle, no rainbow border
 *   - Simple icon button that toggles/opens Caty interface
 *   - Loading state: spinner replaces icon
 *   - Tooltip on hover describes action ("Ask Caty", "Improve", etc.)
 *
 * Usage:
 *   <CatyIconCTA
 *     tooltip="Ask Caty about this work"
 *     isLoading={isGenerating}
 *     onClick={() => openCatyPanel()}
 *     size={24}
 *   />
 */
import React from 'react';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import { CatyHead } from '@/components/for-you/atlaskit/CatyButton';

export interface CatyIconCTAProps {
  /** Tooltip text on hover/focus. Required for accessibility. */
  tooltip: string;
  /** Click handler — opens Caty interface or toggles visibility. */
  onClick: () => void;
  /** Show spinner while Caty is generating. */
  isLoading?: boolean;
  /** Icon size in pixels. Defaults to 24. */
  size?: number;
  /** HTML class for styling. */
  className?: string;
  /** Disabled state. */
  disabled?: boolean;
}

export function CatyIconCTA({
  tooltip,
  onClick,
  isLoading = false,
  size = 24,
  className = '',
  disabled = false,
}: CatyIconCTAProps) {
  return (
    <Tooltip content={isLoading ? 'Caty is thinking…' : tooltip}>
      <button
        type="button"
        onClick={disabled || isLoading ? undefined : onClick}
        aria-label={tooltip}
        aria-busy={isLoading || undefined}
        disabled={disabled}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size + 4,
          height: size + 4,
          padding: 2,
          border: 'none',
          borderRadius: 6,
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'background 150ms ease',
        }}
        onMouseEnter={e => {
          if (!disabled && !isLoading) {
            e.currentTarget.style.background = 'var(--ds-background-neutral-subtle, #F7F8F9)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {isLoading ? (
          <Spinner size="small" />
        ) : (
          <CatyHead size={size} title={tooltip} />
        )}
      </button>
    </Tooltip>
  );
}
