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

/* ─────────────────────────────────────────────────────────────────
 * LegacyBadge — shadcn Badge → Atlaskit Lozenge compatibility shim
 *
 * Drop-in replacement for `@/components/ui/badge`. Lets us migrate
 * 359+ call sites atomically (import swap only) while consolidating
 * on Atlaskit. New code should prefer <StatusLozenge> or <Lozenge>.
 *
 * Mapping rules:
 *   • status / approval terminals (success, complete, approved, ready,
 *     passed) → Lozenge appearance="success" (green)
 *   • in-motion (active, info, primary, review) → appearance="inprogress" (blue)
 *   • idle / skipped (draft, muted, secondary, skipped, not-run,
 *     deprecated) → appearance="default" (grey)
 *   • destructive (danger, destructive, error, critical, failed,
 *     rejected) → appearance="removed" (red)
 *   • warning / blocked → appearance="moved" (yellow)
 *   • new → appearance="new" (purple — Atlaskit's "new" token, NOT §7
 *     AI purple; Atlaskit owns the new-indicator semantic here)
 *   • teal / outline / default / link / ghost → "default"
 *
 * Emits a one-time console warning so legacy call sites are traceable
 * during migration.
 * ───────────────────────────────────────────────────────────────── */

export type LegacyBadgeVariant =
  | 'default' | 'secondary' | 'outline' | 'primary' | 'teal' | 'purple'
  | 'success' | 'warning' | 'danger' | 'destructive' | 'info' | 'error'
  | 'critical' | 'muted' | 'draft' | 'active' | 'complete' | 'approved'
  | 'rejected' | 'blocked' | 'ready' | 'review' | 'deprecated'
  | 'passed' | 'failed' | 'skipped' | 'not-run' | 'ai' | 'new' | 'link'
  | 'ghost';

const VARIANT_TO_APPEARANCE: Record<LegacyBadgeVariant, LozengeAppearance> = {
  // Terminal / success family (green)
  success: 'success',
  complete: 'success',
  approved: 'success',
  ready: 'success',
  passed: 'success',

  // In-motion family (blue)
  active: 'inprogress',
  info: 'inprogress',
  primary: 'inprogress',
  review: 'inprogress',

  // Idle / neutral family (grey)
  default: 'default',
  secondary: 'default',
  outline: 'default',
  muted: 'default',
  draft: 'default',
  skipped: 'default',
  'not-run': 'default',
  deprecated: 'default',
  teal: 'default',
  link: 'default',
  ghost: 'default',

  // Destructive family (red)
  danger: 'removed',
  destructive: 'removed',
  error: 'removed',
  critical: 'removed',
  failed: 'removed',
  rejected: 'removed',

  // Warning / blocked family (yellow)
  warning: 'moved',
  blocked: 'moved',

  // Atlaskit "new" / "purple" semantics
  new: 'new',
  purple: 'new',
  ai: 'new',
};

export interface LegacyBadgeProps {
  variant?: LegacyBadgeVariant;
  children: ReactNode;
  /** Pass-through: rendered inside the Lozenge for extra classes. */
  className?: string;
  /** Bold (solid) vs subtle fill. Default: subtle. */
  isBold?: boolean;
  maxWidth?: number | string;
  testId?: string;
}

/**
 * LegacyBadge — drop-in replacement for shadcn Badge. Internally renders
 * an Atlaskit Lozenge with the mapped appearance.
 */
export function LegacyBadge({
  variant = 'default',
  children,
  className,
  isBold,
  maxWidth,
  testId,
}: LegacyBadgeProps) {
  const appearance = VARIANT_TO_APPEARANCE[variant] ?? 'default';
  // className is accepted for call-site compatibility but the Atlaskit
  // Lozenge handles its own styling — we wrap in a span for the class
  // hook so consumers can override spacing/margin on the outer element.
  if (className) {
    return (
      <span className={className} data-testid={testId ? `${testId}-wrapper` : undefined}>
        <Lozenge appearance={appearance} isBold={isBold} maxWidth={maxWidth} testId={testId}>
          {children}
        </Lozenge>
      </span>
    );
  }
  return (
    <Lozenge appearance={appearance} isBold={isBold} maxWidth={maxWidth} testId={testId}>
      {children}
    </Lozenge>
  );
}
