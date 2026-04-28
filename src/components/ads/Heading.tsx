/**
 * Heading — Catalyst wrapper over @atlaskit/heading.
 *
 * Maps Catalyst typography scale (Display / Hero / H1..H6 / Body / Caption)
 * to Atlaskit's size tokens. The wrapper is the place to tighten the
 * allowed set — Atlaskit offers many sizes; Catalyst needs only these.
 *
 * Phase 4 (2026-04-28) — dark mode color
 * ──────────────────────────────────────
 * Atlaskit's `<Heading>` uses `token('color.text')` internally. In v13 that
 * token resolves to a STATIC inlined hex at the moment the component renders
 * — it does NOT re-resolve on theme change. So a Heading mounted while the
 * tab is in light stays at #292A2E even after the user flips to dark, until
 * the component re-mounts. Worse, with the customColors map silently dropped
 * (CLAUDE.md Phase 2 lesson), even fresh renders get the light-mode hex.
 *
 * Fix: wrap in a `<span>` that pins `color` to a CSS-var-backed bridge
 * token. The variable is read at every paint, so the heading flips the
 * instant `<html data-theme>` changes — no remount needed. Consumers can
 * override via `color` prop on a per-call basis (e.g. inverse on a dark
 * banner). Default is `text.primary` which is the right choice for ~95%
 * of headings.
 */
import AkHeading from '@atlaskit/heading';
import { type CSSProperties, type ReactNode } from 'react';
import { adsTokens, cp, type AdsToken } from '@/theme/ads/tokens';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type HeadingSize = 'xxlarge' | 'xlarge' | 'large' | 'medium' | 'small' | 'xsmall' | 'xxsmall';

export interface HeadingProps {
  /** Semantic level — affects the rendered tag, not the size. */
  as?: HeadingLevel;
  /** Typography scale — Atlaskit's `size`. */
  size?: HeadingSize;
  /** Truncate overflow with ellipsis. */
  truncate?: boolean;
  /**
   * Override the heading colour. Pass an `adsTokens.text.*` token. Default
   * is `text.primary` which resolves to `#0F172A` light / `#EDEDED` dark via
   * the `--cp-text-primary` CSS variable.
   */
  color?: AdsToken;
  testId?: string;
  children: ReactNode;
}

export function Heading({
  as = 'h2',
  size = 'medium',
  truncate,
  color = adsTokens.text.primary,
  testId,
  children,
}: HeadingProps) {
  // Wrapper span owns the colour so the heading flips on theme change.
  // Atlaskit Heading inherits `color` from its ancestor, so this works
  // without bypassing AkHeading's typography styles.
  const wrapperStyle: CSSProperties = {
    color: cp(color),
    display: truncate ? 'block' : 'contents',
    ...(truncate
      ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
      : {}),
  };
  return (
    <span style={wrapperStyle}>
      <AkHeading as={as} size={size} testId={testId}>
        {children}
      </AkHeading>
    </span>
  );
}
