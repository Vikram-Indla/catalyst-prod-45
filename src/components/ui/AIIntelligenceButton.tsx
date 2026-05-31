/**
 * AIIntelligenceButton — "Ask Caty" pill CTA that opens the Catalyst AI
 * (CATY) intelligence panel for the current context.
 *
 * Idle:    brand-blue pill with ⚡ icon + "Ask Caty" label
 * Loading: @atlaskit/spinner replaces the icon, label becomes "Loading…",
 *          button becomes non-interactive (aria-busy=true, disabled).
 *
 * ENTERPRISE RULE: NO spinning/rotating containers, NO rainbow borders,
 * NO conic-gradient effects. This is the only approved loading pattern.
 */
import React from 'react';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import { Zap } from '@/lib/atlaskit-icons';

export interface AIIntelligenceButtonProps {
  /** Visible label. Defaults to "Ask Caty". */
  label?: string;
  isActive?: boolean;
  /** Show spinner + "Loading…" while CATY is generating. */
  isLoading?: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  /** Hover/keyboard-focus tooltip. Defaults to "Ask Caty about this view". */
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
  const isInert = disabled || isLoading;

  const button = (
    <button
      onClick={isInert ? undefined : onClick}
      className={className}
      disabled={isInert}
      aria-label={isLoading ? 'Loading…' : tooltip}
      aria-busy={isLoading || undefined}
      style={{
        background: isInert
          ? 'var(--ds-background-disabled, #F1F2F4)'
          : 'var(--ds-background-information-bold, #0052CC)',
        color: isInert
          ? 'var(--ds-text-disabled, #8590A2)'
          : 'var(--ds-text-inverse, #FFFFFF)',
        border: 'none',
        borderRadius: 20,
        padding: '0 16px',
        height: 32,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.3px',
        cursor: isInert ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'background 150ms ease, opacity 150ms ease',
        fontFamily: 'var(--cp-font-body)',
      }}
      onMouseEnter={e => {
        if (!isInert) {
          e.currentTarget.style.filter = 'brightness(1.08)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = '';
      }}
    >
      {isLoading
        ? <Spinner size="small" appearance="invert" />
        : <Zap size={13} strokeWidth={2.2} />}
      {isLoading ? 'Loading…' : label}
    </button>
  );

  return tooltip ? <Tooltip content={isLoading ? 'Loading…' : tooltip}>{button}</Tooltip> : button;
}
