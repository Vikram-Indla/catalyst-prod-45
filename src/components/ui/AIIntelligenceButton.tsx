/**
 * AIIntelligenceButton — ADS brand-blue pill that opens the Catalyst AI
 * (CATY) intelligence panel for the current context. Pairs with the
 * sparkle / "Ask Caty" affordances elsewhere in the app so every AI
 * surface reads as the same entity.
 *
 * Tooltip default: "Ask Caty about this view". Override with `tooltip`
 * when the calling surface has a more specific framing (e.g. "Ask Caty
 * about Vikram's week"). Design-critique 2026-05-17 H10 P1 — "Intelligence"
 * alone failed the "what does this button do?" test; the tooltip resolves
 * it without changing the visible label.
 */
import React from 'react';
import Tooltip from '@atlaskit/tooltip';
import { Zap } from '@/lib/atlaskit-icons';

export interface AIIntelligenceButtonProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  /** Hover/keyboard-focus tooltip. Defaults to "Ask Caty about this view". */
  tooltip?: string;
}

export function AIIntelligenceButton({
  label,
  isActive = false,
  onClick,
  className,
  disabled = false,
  tooltip = 'Ask Caty about this view',
}: AIIntelligenceButtonProps) {
  const button = (
    <button
      onClick={disabled ? undefined : onClick}
      className={className}
      disabled={disabled}
      aria-label={tooltip}
      style={{
        background: disabled
          ? 'var(--ds-text-subtlest, #94A3B8)'
          : 'var(--ds-text-brand, #2563EB)',
        color: 'var(--ds-surface, #FFFFFF)',
        border: 'none',
        borderRadius: 20,
        padding: '0 16px',
        height: 32,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 200ms ease',
        fontFamily: 'var(--cp-font-body)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.03)';
        e.currentTarget.style.boxShadow = '0 0 0 6px rgba(37,99,235,0.15)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <Zap size={13} strokeWidth={2.2} />
      {label}
    </button>
  );

  return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button;
}
