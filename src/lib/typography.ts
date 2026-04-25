/**
 * Catalyst typography — Atlaskit maximum-contrast pattern.
 *
 * Validated against Jira's live DOM (For You / BAU-5648 Mention card,
 * 2026-04-24). The pattern is:
 *
 *   • ONE weight for body text (400), everywhere.
 *   • Hierarchy comes from COLOR, never from weight.
 *   • Exactly two body sizes: 14/20 for primary text, 12/16 for meta.
 *   • Letter-spacing 0 on body; headings get a tiny negative (-0.003em).
 *
 * This is how Jira achieves its dense, scannable feel — saturated primary
 * (#292A2E) next to saturated subtle (#505258) at the SAME weight, rather
 * than bolding author names or cramming weights 500/600/700 on top of each
 * other. Catalyst's previous "dense = bold" strategy read as faded because
 * Inter's apparent weight is lighter than Atlassian Sans and the boldness
 * made hierarchy jittery.
 *
 * Every new surface should import these constants instead of writing
 * `font: '600 14px/20px Inter, ...'` inline. That way the pattern ripples
 * across the app from one file.
 *
 * Usage
 * ─────
 *   import { type, text } from '@/lib/typography';
 *
 *   <span style={{ ...type.body, color: text.primary }}>Vikram</span>
 *   <span style={{ ...type.body, color: text.subtle }}>edited this issue</span>
 *   <div style={{ ...type.meta, color: text.subtle }}>
 *     Senaei BAU · BAU-5648 · 13 hours ago
 *   </div>
 *
 * Jira-measured reference values (hex fallbacks only — token() is the
 * source of truth when Atlaskit provides one):
 *   color.text                rgb(41,42,46)   #292A2E
 *   color.text.subtle         rgb(80,82,88)   #505258
 *   color.text.subtlest       rgb(107,110,118) #6B6E76
 */
import { token } from '@atlaskit/tokens';

const FONT_STACK = 'var(--ds-font-family-body)';

export const type = {
  /** Display heading — page titles ("For you", hub names). 20/24/500. */
  display: {
    font: `500 20px/24px ${FONT_STACK}`,
    letterSpacing: '-0.003em',
  } as const,

  /** Section heading — card labels ("Reply to mentions"). 16/20/600. */
  h4: {
    font: `600 16px/20px ${FONT_STACK}`,
    letterSpacing: '-0.003em',
  } as const,

  /** Default body text — 14/20/400. Use EVERYWHERE for primary content. */
  body: {
    font: `400 14px/20px ${FONT_STACK}`,
    letterSpacing: 0,
  } as const,

  /** Body at 500 — sparingly, only for table headers, kbd, tab labels. */
  bodyStrong: {
    font: `500 14px/20px ${FONT_STACK}`,
    letterSpacing: 0,
  } as const,

  /** Meta row — 12/16/400. Key · Time · Breadcrumbs. */
  meta: {
    font: `400 12px/16px ${FONT_STACK}`,
    letterSpacing: 0,
  } as const,

  /** UI chip label — 11/16/500 uppercase (StatusLozenge sibling). */
  chip: {
    font: `500 11px/16px ${FONT_STACK}`,
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
  } as const,
} as const;

/**
 * Color hierarchy for text. These are the ONLY three text colors you
 * should need for normal UI. Reserve brand/state colors (link, danger,
 * success) for cases where the text role itself carries semantic meaning.
 */
export const text = {
  /** Primary — headlines, names, values, action text. */
  primary: token('color.text', '#172B4D'),

  /** Subtle — verbs, meta, labels, placeholders-within-context. */
  subtle: token('color.text.subtle', '#44546F'),

  /** Subtlest — placeholder, disabled-but-readable, ghost text. */
  subtlest: token('color.text.subtlest', '#626F86'),

  /** Link — only for genuine hyperlinks. */
  link: token('color.link', '#0C66E4'),

  /** Inverse — on dark surfaces. */
  inverse: token('color.text.inverse', '#FFFFFF'),

  /** Danger — error copy, destructive labels. */
  danger: token('color.text.danger', '#C9372C'),

  /** Success — confirmation copy, completed states. */
  success: token('color.text.success', '#216E4E'),

  /** Warning — caution labels. */
  warning: token('color.text.warning', '#A54800'),

  /** Discovery — AI / purple category accents. */
  discovery: token('color.text.discovery', '#5E4DB2'),
} as const;

/**
 * Pairing helpers — the 90% of the time you want both size and color in
 * one spread, like:
 *
 *   <span style={styles.bodySubtle}>mentioned you on</span>
 *   <span style={styles.bodyPrimary}>Muhammad Ayaz</span>
 */
export const styles = {
  displayPrimary: { ...type.display, color: text.primary } as const,
  h4Primary: { ...type.h4, color: text.primary } as const,
  bodyPrimary: { ...type.body, color: text.primary } as const,
  bodySubtle: { ...type.body, color: text.subtle } as const,
  bodySubtlest: { ...type.body, color: text.subtlest } as const,
  metaSubtle: { ...type.meta, color: text.subtle } as const,
  metaSubtlest: { ...type.meta, color: text.subtlest } as const,
  link: { ...type.body, color: text.link } as const,
} as const;
