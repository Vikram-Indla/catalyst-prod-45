/**
 * AIIntelligenceButton — canonical "Ask Caty" pill CTA.
 *
 * Visual (2026-05-31 unified): WHITE pill with 4-point sparkle icon (✦)
 * wrapped in a static 2px conic-gradient rainbow border. Matches the
 * panel-header digest CTA and AskCatalystPill style for one consistent
 * AI affordance across the entire app — no more solid-blue ⚡ variant.
 *
 * Visual rules:
 *   - ALWAYS wrapped in the static rainbow border (animation:none)
 *   - White background, dark text — never blue/inverse
 *   - Sparkle (✦) icon, NOT lightning bolt — sparkle = AI universally
 *   - No rotation, no shimmer, no motion on the gradient
 *
 * Idle:    white pill with ✦ icon + label inside rainbow border
 * Loading: spinner replaces icon, label flips to "Thinking…",
 *          button non-interactive (disabled + aria-busy)
 *
 * Label defaults to "Ask Caty". Callers should pass a verb-qualified
 * label when the context is specific, e.g.:
 *   - <AIIntelligenceButton label="Ask Caty - Profile" />  (R360)
 *   - <AIIntelligenceButton label="Ask Caty - Triage" />   (future)
 *
 * CLAUDE.md ENTERPRISE UI GUARDRAIL carve-out applies.
 */
import React from 'react';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';

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
        // White pill — matches panel-header digest CTA + AskCatalystPill.
        // Single source of visual truth for AI affordances across the app.
        background: isInert
          ? token('color.background.disabled', '#F1F2F4')
          : token('elevation.surface', '#FFFFFF'),
        color: isInert
          ? token('color.text.disabled', '#8590A2')
          : token('color.text', '#172B4D'),
        border: 'none',
        borderRadius: 18,
        padding: '0 14px',
        height: 28,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 'normal',
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
          e.currentTarget.style.background = token('elevation.surface.hovered', '#F1F2F4');
        }
      }}
      onMouseLeave={e => {
        if (!isInert) {
          e.currentTarget.style.background = token('elevation.surface', '#FFFFFF');
        }
      }}
    >
      {isLoading
        ? <Spinner size="xsmall" />
        : (
          // 4-point sparkle — canonical AI glyph (matches digest CTA).
          <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
            <path d="M7 0.5L8.5 5.2L13 7L8.5 8.8L7 13.5L5.5 8.8L1 7L5.5 5.2Z" />
          </svg>
        )}
      {isLoading ? 'Thinking…' : label}
    </button>
  );

  // Always-on static rainbow border: marks this CTA as the AI affordance.
  // No rotation, no animation — pure colour treatment.
  const button = (
    <div
      style={{
        display: 'inline-flex',
        padding: 2,
        borderRadius: 20,
        background: STATIC_RAINBOW,
      }}
    >
      {innerButton}
    </div>
  );

  return tooltip
    ? <Tooltip content={isLoading ? 'Caty is thinking…' : tooltip}>{button}</Tooltip>
    : button;
}
