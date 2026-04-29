/**
 * Heading — Catalyst wrapper over @atlaskit/heading.
 *
 * Pure pass-through. Atlaskit owns colour, typography, and dark-mode flip
 * via its own bundled theme CSS (loaded by AdsThemeProvider, see Phase 11).
 *
 * The wrapper exists ONLY to tighten the allowed `size` set — Atlaskit
 * offers many sizes; Catalyst standardises on these — and to expose a
 * stable Catalyst-owned props surface so future Atlaskit majors can be
 * absorbed at one file.
 *
 * History (kept for the next dev who wonders why the wrapper looks bare):
 *   Phase 4 added a span-pin that forced `color: var(--cp-text-primary)`.
 *   The intent was to flip headings on theme change without remount. But
 *   it also overrode Atlaskit's intent-aware colour resolution (e.g.
 *   `color.text.inverse` on bold backgrounds) which broke ADS conformance.
 *   Phase 12 (2026-04-29) removed the pin. Now that Phase 11 unblocked
 *   Atlaskit's bundled dark theme, the SDK flips correctly natively —
 *   no override needed.
 */
import AkHeading from '@atlaskit/heading';
import { type ReactNode } from 'react';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type HeadingSize = 'xxlarge' | 'xlarge' | 'large' | 'medium' | 'small' | 'xsmall' | 'xxsmall';

export interface HeadingProps {
  /** Semantic level — affects the rendered tag, not the size. */
  as?: HeadingLevel;
  /** Typography scale — Atlaskit's `size`. */
  size?: HeadingSize;
  /** Truncate overflow with ellipsis. */
  truncate?: boolean;
  testId?: string;
  children: ReactNode;
}

export function Heading({
  as = 'h2',
  size = 'medium',
  truncate,
  testId,
  children,
}: HeadingProps) {
  return (
    <AkHeading
      as={as}
      size={size}
      testId={testId}
      {...(truncate
        ? { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }
        : {})}
    >
      {children}
    </AkHeading>
  );
}
