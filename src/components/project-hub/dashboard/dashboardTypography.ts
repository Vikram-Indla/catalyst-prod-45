/**
 * dashboardTypography — single source of truth for the Project Hub
 * Dashboard's text scale.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  WHY THIS FILE EXISTS
 * ═══════════════════════════════════════════════════════════════════════
 * Pre-Apr 26, 2026 the dashboard widgets used 9 distinct fontSize values
 * sprinkled across ~80 inline-style declarations: 10, 11, 12, 13, 14, 15,
 * 16, 22, 28. Two of those (13, 15) and the larger custom (28) are NOT in
 * Atlaskit's canonical body/heading token set — pure drift.
 *
 * This file collapses dashboard typography to **5 named constants**, each
 * mapped to a single Atlaskit canonical px value:
 *
 *   LABEL  → 11px / 16px / 500   — KPI labels, footers, mini meta
 *                                   (= font.body.small)
 *   SMALL  → 12px / 16px / 400   — secondary table cell text, compact rows
 *                                   (between LABEL and BODY)
 *   BODY   → 14px / 20px / 400   — primary cell text, row labels
 *                                   (= font.body)
 *   STRONG → 14px / 20px / 600   — emphasised body (counts, names)
 *                                   (= font.body / weight 600)
 *   TITLE  → 16px / 24px / 500   — row titles, emphasised body
 *                                   (= font.body.large)
 *   H_NUM  → 24px / 28px / 600   — KPI strip headline numbers
 *                                   (= font.heading.xlarge)
 *
 * Widget chrome (card title, subtitle, section headers) flows through
 * Atlaskit `<Heading>` / `<Text>` primitives and is NOT this file's
 * concern. This file owns the inline-style spans inside widget bodies.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  GUARDRAIL
 * ═══════════════════════════════════════════════════════════════════════
 * The ESLint canonical-icon-+-tokens directive will eventually be
 * extended to ban raw `fontSize: <number>` literals in
 * src/components/project-hub/dashboard/widgets/**, forcing every
 * declaration to import from this file. Until that lands the convention
 * is: NEW dashboard code MUST import from here. Existing inline
 * fontSize:N callsites are debt to be swept opportunistically.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { token } from '@atlaskit/tokens';
import type { CSSProperties } from 'react';

/** KPI strip mini-labels, footers, meta text. Atlaskit `font.body.small`. */
export const LABEL: CSSProperties = {
  fontSize: 11,
  lineHeight: '16px',
  fontWeight: 500,
  color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
};

/** Secondary table cell text, compact rows — between LABEL and BODY. */
export const SMALL: CSSProperties = {
  fontSize: 12,
  lineHeight: '16px',
  fontWeight: 400,
  color: token('color.text', 'var(--ds-text)'),
};

/** Emphasised compact text — bold counts in compact rows. */
export const SMALL_STRONG: CSSProperties = {
  fontSize: 12,
  lineHeight: '16px',
  fontWeight: 600,
  color: token('color.text', 'var(--ds-text)'),
};

/** Primary body text — row labels, status text, the default voice. */
export const BODY: CSSProperties = {
  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 400,
  color: token('color.text', 'var(--ds-text)'),
};

/** Emphasised body — counts, names, sortable cell highlights. */
export const STRONG: CSSProperties = {
  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 600,
  color: token('color.text', 'var(--ds-text)'),
};

/** Row titles, table cell titles, emphasised secondary heading. */
export const TITLE: CSSProperties = {
  fontSize: 16,
  lineHeight: '24px',
  fontWeight: 500,
  color: token('color.text', 'var(--ds-text)'),
};

/** KPI strip headline numbers. Atlaskit `font.heading.xlarge`. */
export const H_NUM: CSSProperties = {
  fontSize: 24,
  lineHeight: '28px',
  fontWeight: 600,
  color: token('color.text', 'var(--ds-text)'),
  fontVariantNumeric: 'tabular-nums',
};

/** Mono-spaced variant for issue keys and tabular numerics. */
export const MONO: CSSProperties = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontVariantNumeric: 'tabular-nums',
};

/** Subtle text colour — for secondary meta. Pair with BODY/LABEL. */
export const SUBTLE: CSSProperties = {
  color: token('color.text.subtle', 'var(--ds-icon)'),
};

/** Subtlest text colour — for tertiary meta + captions. */
export const SUBTLEST: CSSProperties = {
  color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
};

/** Truncation primitive — display:block + overflow + ellipsis. Combine
 *  with BODY/TITLE for cells that must clip at column boundaries. */
export const TRUNCATE: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
