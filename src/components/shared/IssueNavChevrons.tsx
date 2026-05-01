/**
 * IssueNavChevrons — Canonical Prev/Next navigation chevrons for issue
 * detail surfaces (CatalystView*, IssueContentView / AllWork).
 *
 * Styling is pixel-matched to Jira Cloud (verified via computer-use
 * screenshot of digital-transformation.atlassian.net, 2026-04-19):
 *   - 28 × 28 button
 *   - 1px var(--ds-border, #DFE1E6) border at rest (subtle, NOT borderless ghost)
 *   - 4px border radius
 *   - #42526E icon at rest, #C1C7D0 when disabled
 *   - hover: bg var(--ds-surface-sunken, #F4F5F7), border #C1C7D0
 *   - 4px gap between prev/next
 *
 * Up = previous work item, Down = next work item (Atlassian convention).
 *
 * API — agnostic to caller: consumers pass pre-resolved disabled state
 * and optional tooltips. The component does NOT know about navigation
 * lists / indices — callers compute those and hand in plain callbacks.
 *
 * Replaces:
 *   - CatalystViewBase inline 60-line IIFE (Apr 2026)
 *   - IssueContentView `.awNavArrow` usage + allwork.css class
 *   - any future ad-hoc chevron buttons
 */
import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface IssueNavChevronsProps {
  onPrev?: () => void;
  onNext?: () => void;
  /** Disable prev chevron (no previous item). */
  prevDisabled?: boolean;
  /** Disable next chevron (no next item). */
  nextDisabled?: boolean;
  /** Title/aria label for prev chevron (e.g. "Previous work item 'BAU-5421'"). */
  prevTooltip?: string;
  /** Title/aria label for next chevron (e.g. "Next work item 'BAU-5423'"). */
  nextTooltip?: string;
  /** Extra wrapper style overrides (rare). */
  style?: React.CSSProperties;
  /** Wrapper className for CSS scoping. */
  className?: string;
}

const BTN_BASE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, padding: 0,
  background: 'var(--ds-surface, var(--ds-surface, #FFFFFF))', border: '1px solid #DFE1E6', borderRadius: 4,
  transition: 'background 0.15s, border-color 0.15s',
};

function ChevronButton({
  onClick, disabled, tooltip, direction,
}: {
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
  direction: 'prev' | 'next';
}) {
  const Icon = direction === 'prev' ? ChevronUp : ChevronDown;
  const fallbackTitle = direction === 'prev'
    ? (disabled ? 'No previous work item' : 'Previous work item')
    : (disabled ? 'No next work item' : 'Next work item');
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip ?? fallbackTitle}
      aria-label={tooltip ?? fallbackTitle}
      style={{
        ...BTN_BASE,
        color: disabled ? '#C1C7D0' : '#42526E',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))';
          e.currentTarget.style.borderColor = '#C1C7D0';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--ds-surface, var(--ds-surface, #FFFFFF))';
        e.currentTarget.style.borderColor = 'var(--ds-border, var(--ds-border, #DFE1E6))';
      }}
    >
      <Icon size={16} />
    </button>
  );
}

export function IssueNavChevrons({
  onPrev, onNext, prevDisabled, nextDisabled, prevTooltip, nextTooltip,
  style, className,
}: IssueNavChevronsProps) {
  return (
    <div
      className={className}
      role="group"
      aria-label="Navigate between work items"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}
    >
      <ChevronButton
        direction="prev"
        onClick={onPrev}
        disabled={prevDisabled || !onPrev}
        tooltip={prevTooltip}
      />
      <ChevronButton
        direction="next"
        onClick={onNext}
        disabled={nextDisabled || !onNext}
        tooltip={nextTooltip}
      />
    </div>
  );
}

export default IssueNavChevrons;
