/**
 * AIIntelligenceButton — "Ask Caty" pill CTA that opens the Catalyst AI
 * (CATY) intelligence panel for the current context.
 *
 * Idle:    brand-blue pill with ⚡ icon + "Ask Caty" label
 * Loading: STATIC rainbow border (no rotation, no animation) wraps the
 *          button + Spinner replaces icon + label flips to "Thinking…".
 *          Static rainbow border is the carve-out exception to the
 *          CLAUDE.md ENTERPRISE UI GUARDRAIL, permitted ONLY on
 *          AI-branded CTAs to signal AI processing.
 *
 * ENTERPRISE RULE: NO spinning/rotating containers. The rainbow border
 * is purely static — only the background gradient is rendered.
 */
import React from 'react';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import { Zap } from '@/lib/atlaskit-icons';

export interface AIIntelligenceButtonProps {
  /** Visible label. Defaults to "Ask Caty". */
  label?: string;
  isActive?: boolean;
  /** Show static rainbow border + spinner + "Thinking…" while CATY processes. */
  isLoading?: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  /** Hover/keyboard-focus tooltip. Defaults to "Ask Caty about this view". */
  tooltip?: string;
}

const STATIC_RAINBOW = `conic-gradient(
  from 0deg,
  #FF3CAC 0deg,
  #784BA0 60deg,
  #2B86C5 120deg,
  #00C9FF 180deg,
  #92FE9D 240deg,
  #FFD700 300deg,
  #FF3CAC 360deg
)`;

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

  const innerButton = (
    <button
      onClick={isInert ? undefined : onClick}
      className={className}
      disabled={isInert}
      aria-label={isLoading ? 'Caty is thinking…' : tooltip}
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
      {isLoading ? 'Thinking…' : label}
    </button>
  );

  // When loading: wrap in a 2px static rainbow padding-border.
  // No rotation, no animation — pure colour treatment to signal AI processing.
  const button = isLoading ? (
    <div
      style={{
        display: 'inline-flex',
        padding: 2,
        borderRadius: 22,
        background: STATIC_RAINBOW,
      }}
    >
      {innerButton}
    </div>
  ) : (
    innerButton
  );

  return tooltip
    ? <Tooltip content={isLoading ? 'Caty is thinking…' : tooltip}>{button}</Tooltip>
    : button;
}
