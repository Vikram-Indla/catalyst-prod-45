/**
 * DEPRECATED — CatalystStatusPill has been folded into the canonical
 * `StatusLozengeDropdown` (interactive) + `StatusLozenge` (visual) pair at
 * `@/components/shared/StatusLozenge`. This file is now a thin back-compat
 * shim mapping the old API to the new one.
 *
 * Migration:
 *   - `<CatalystStatusPill ... />`                  → `<StatusLozengeDropdown ... />`
 *   - `<CatalystStatusPill interactive={false} />`  → `<StatusLozenge ... />`
 *   - `compact` prop                                → `size="sm"`
 *
 * Slated for removal once all consumers migrate (CAT-ADS-STATUSPILL-UNIFY-20260629-001).
 */
import React from 'react';
import { StatusLozengeDropdown, type StatusLozengeDropdownProps } from '@/components/shared/StatusLozenge';

interface CatalystStatusPillProps extends Omit<StatusLozengeDropdownProps, 'size'> {
  /** @deprecated Use `size="sm"` on StatusLozengeDropdown instead. */
  compact?: boolean;
}

export function CatalystStatusPill({ compact, ...rest }: CatalystStatusPillProps) {
  return <StatusLozengeDropdown {...rest} size={compact ? 'sm' : 'md'} />;
}

export default CatalystStatusPill;
