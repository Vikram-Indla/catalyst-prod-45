/**
 * TruncateCell — single-line ellipsis + hover tooltip for dense tables.
 *
 * Why this exists
 * ───────────────
 * Dashboard list widgets (top-10 incidents, defects, activity) render tabular
 * data inside narrow grid columns (sometimes span=1 ≈ 380px). When a Title
 * cell contains a 60-char summary, free-flowing wrap inflates rows from the
 * canonical 36px (CLAUDE.md §4) to 3–5 lines, destroying scanability.
 *
 * Pattern used by Jira dashboards, Linear, Notion, GitHub Projects: force
 * single-line ellipsis on the display, escape to full text via tooltip on
 * hover/keyboard-focus.
 *
 * Caught Apr 19, 2026 (BAU Dashboard — QA Defects in span=1 wrapped titles
 * to 5 lines). See docs/design/BAU-Dashboard-Atlaskit-Conversion.md §6
 * (text-wrap addendum).
 *
 * Accessibility
 * ─────────────
 * The underlying ADS Tooltip opens on hover AND keyboard focus, so users
 * who tab-navigate also get the full content via the tooltip. Screen readers
 * read the full `text` (it's in the DOM — CSS clips, it does not truncate).
 *
 * Usage
 * ─────
 *   <TruncateCell text={inc.title} />
 *
 *   // Custom typography — rare; prefer default
 *   <TruncateCell
 *     text={inc.title}
 *     style={{ fontSize: 13, fontWeight: 650 }}
 *   />
 *
 *   // Tooltip off (text is short; usually don't need this escape)
 *   <TruncateCell text={shortLabel} disableTooltip />
 */
import { type CSSProperties, type ReactNode } from 'react';
import { token } from '@atlaskit/tokens';
import { Tooltip, type TooltipPosition } from './Tooltip';
import { forwardTestId } from './internal/forwardTestId';

export interface TruncateCellProps {
  /**
   * Full string. Used for both the clipped display (CSS text-overflow) and
   * the hover/focus tooltip. Pass the raw title — do NOT pre-truncate.
   */
  text: string;
  /**
   * Override the tooltip content. Useful when you want to add context (e.g.
   * "BAU-5408: Backoffice - ...") while the visible row shows only the
   * summary. If omitted, falls back to `text`.
   */
  tooltipContent?: ReactNode;
  /**
   * Skip the tooltip entirely — for cells whose text is guaranteed short.
   * Default: false (tooltip always rendered, Atlaskit's Tooltip short-circuits
   * when hover never happens, so the perf cost is ~0).
   */
  disableTooltip?: boolean;
  /**
   * Tooltip position. Default: 'top'. Use 'mouse' for very tight rows if
   * 'top' overlaps the row above.
   */
  tooltipPosition?: TooltipPosition;
  /**
   * Additional typography overrides — merged over the canonical defaults.
   * Prefer leaving this unset to keep every table aligned.
   * Defaults: fontSize 13, color `color.text`, no font-weight (inherits).
   */
  style?: CSSProperties;
  /** Test selector forwarded to the outer span. */
  testId?: string;
}

export function TruncateCell({
  text,
  tooltipContent,
  disableTooltip,
  tooltipPosition = 'top',
  style,
  testId,
}: TruncateCellProps) {
  const clipped = (
    <span
      {...forwardTestId(testId)}
      style={{
        display: 'block',
        maxWidth: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: 13,
        color: token('color.text'),
        ...style,
      }}
    >
      {text}
    </span>
  );

  if (disableTooltip || !text) return clipped;

  return (
    <Tooltip content={tooltipContent ?? text} position={tooltipPosition}>
      {clipped}
    </Tooltip>
  );
}
