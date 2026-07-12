/**
 * Tooltip — Catalyst wrapper over @atlaskit/tooltip.
 *
 * Must be used for every keyboard-focusable action lacking a visible label
 * (icon-only buttons, status pills, truncated cell content). The a11y audit
 * gate in CI fails if a button has no label and no tooltip.
 */
import AkTooltip from '@atlaskit/tooltip';
import { type ReactNode } from 'react';

export type TooltipPosition =
  | 'auto'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-start'
  | 'top-end'
  | 'right-start'
  | 'right-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'mouse';

export interface TooltipProps {
  /** Tooltip text. Empty string renders no tooltip (short-circuit). */
  content: ReactNode;
  position?: TooltipPosition;
  /** Delay before showing on hover, ms. Default: 300 (Atlaskit default). */
  delay?: number;
  /** Forces the tooltip open — for Storybook/tests; avoid in product. */
  isOpen?: boolean;
  /** Truncate long content to a single line with ellipsis. */
  truncate?: boolean;
  testId?: string;
  children: ReactNode;
}

export function Tooltip({
  content,
  position = 'top',
  delay,
  isOpen,
  truncate,
  testId,
  children,
}: TooltipProps) {
  if (!content) return <>{children}</>;
  return (
    <AkTooltip
      content={content}
      position={position}
      delay={delay}
      tag="span"
      truncate={truncate}
      testId={testId}
      // isOpen prop kept optional — Atlaskit accepts it for controlled cases
      {...(isOpen !== undefined ? { isOpen } : {})}
    >
      {children}
    </AkTooltip>
  );
}
