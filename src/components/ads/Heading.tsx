/**
 * Heading — Catalyst wrapper over @atlaskit/heading.
 *
 * Maps Catalyst typography scale (Display / Hero / H1..H6 / Body / Caption)
 * to Atlaskit's size tokens. The wrapper is the place to tighten the
 * allowed set — Atlaskit offers many sizes; Catalyst needs only these.
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
      {...(truncate ? { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } } : {})}
      testId={testId}
    >
      {children}
    </AkHeading>
  );
}
