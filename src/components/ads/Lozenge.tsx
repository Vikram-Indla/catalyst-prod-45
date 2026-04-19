/**
 * Lozenge — Catalyst wrapper over @atlaskit/lozenge.
 *
 * Two flavours exported from this file:
 *
 *   <Lozenge appearance="…">  generic Lozenge (used for hub badges and
 *                             everything that is NOT a status).
 *
 *   <StatusLozenge status={…}>  the 3-colour guardrail (CLAUDE.md §5).
 *                             Grey / Blue / Green — no other colour is
 *                             permitted in a status badge, ever. This
 *                             component refuses unknown statuses at the
 *                             type level.
 *
 * Keep these separate. Mixing concerns (e.g. allowing `appearance="red"`
 * inside a status badge) was the Catalyst-specific bug class we ship
 * defensively against.
 */
import AkLozenge from '@atlaskit/lozenge';
import { type ReactNode } from 'react';
import { forwardTestId } from './internal/forwardTestId';
import type { StatusCategory } from './internal/status';

// Re-export the type from this module so consumers of <StatusLozenge />
// can read both without reaching into internal/. toStatusCategory is NOT
// re-exported here (would break react-refresh/only-export-components) —
// it is re-exported from the ADS barrel instead.
export type { StatusCategory } from './internal/status';

/* ─────────────────────────────────────────────────────────────────
 * Generic Lozenge
 * ───────────────────────────────────────────────────────────────── */

export type LozengeAppearance =
  | 'default'
  | 'inprogress'
  | 'moved'
  | 'new'
  | 'removed'
  | 'success';

export interface LozengeProps {
  appearance?: LozengeAppearance;
  /** Bold (solid) vs subtle (pale) fill. Default: subtle. */
  isBold?: boolean;
  /** Max width before truncation. Default: Atlaskit's 200px. */
  maxWidth?: number | string;
  children: ReactNode;
  testId?: string;
}

export function Lozenge({
  appearance = 'default',
  isBold,
  maxWidth,
  children,
  testId,
}: LozengeProps) {
  return (
    <AkLozenge
      appearance={appearance}
      isBold={isBold}
      maxWidth={maxWidth}
      {...forwardTestId(testId)}
    >
      {children}
    </AkLozenge>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * StatusLozenge — the 3-colour guardrail (CLAUDE.md §5)
 * ───────────────────────────────────────────────────────────────── */

export interface StatusLozengeProps {
  /** Canonical status bucket. Drives the colour. */
  status: StatusCategory;
  /** Status label shown inside the lozenge — e.g. "IN PROGRESS". */
  children: ReactNode;
  /** Truncation threshold — matches Atlaskit default. */
  maxWidth?: number | string;
  testId?: string;
}

const CATEGORY_TO_APPEARANCE: Record<StatusCategory, LozengeAppearance> = {
  todo: 'default',       // grey
  inProgress: 'inprogress', // blue
  done: 'success',        // green
};

/**
 * StatusLozenge — StatusCategory-typed wrapper enforcing the 3-colour
 * guardrail. If you need a non-grey / non-blue / non-green status badge,
 * you don't — the design system rejects that use case.
 */
export function StatusLozenge({
  status,
  children,
  maxWidth,
  testId,
}: StatusLozengeProps) {
  return (
    <Lozenge
      appearance={CATEGORY_TO_APPEARANCE[status]}
      isBold={false}
      maxWidth={maxWidth}
      testId={testId}
    >
      {children}
    </Lozenge>
  );
}
