/**
 * ReleaseOpsLozenges — canonical status/risk/flag badges for Release Ops.
 * Wraps the canonical ads `Lozenge` (which owns its ADS-token colours) so change
 * lifecycle status, risk, and flags render as proper Atlaskit lozenges instead
 * of hand-styled spans. Reuse everywhere a change status/risk/flag is shown.
 */
import React from 'react';
import { Lozenge, type LozengeAppearance } from '@/components/ads/Lozenge';

const label = (v: string | null | undefined) => (!v ? '' : v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

const CHANGE_STATUS: Record<string, LozengeAppearance> = {
  draft: 'default', new: 'default', assessing: 'new', ready_for_approval: 'new', approved: 'new', scheduled: 'inprogress',
  implementing: 'inprogress', in_uat: 'inprogress', validating: 'inprogress', in_beta: 'inprogress',
  implemented: 'success', in_production: 'success', closed: 'success', done: 'success',
  failed: 'removed', rolled_back: 'removed', cancelled: 'removed',
};
export function ChangeStatusLozenge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
  return <Lozenge appearance={CHANGE_STATUS[status.toLowerCase()] ?? 'default'}>{label(status)}</Lozenge>;
}

// Escalation ladder — red is reserved for critical alone, yellow for high;
// medium/low are informational, not alarms (green "success" on low risk read
// as a good-state signal, which risk is not).
const RISK: Record<string, LozengeAppearance> = { critical: 'removed', high: 'moved', medium: 'default', low: 'default' };
export function RiskLozenge({ risk }: { risk: string | null }) {
  if (!risk) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
  return <Lozenge appearance={RISK[risk.toLowerCase()] ?? 'default'}>{label(risk)}</Lozenge>;
}

const FLAG: Record<string, LozengeAppearance> = { 'unlinked prod': 'removed', emergency: 'moved', failed: 'removed', blocked: 'removed', rollback: 'removed' };
export function FlagLozenge({ label: text }: { label: string }) {
  return <Lozenge appearance={FLAG[text.toLowerCase()] ?? 'default'}>{text}</Lozenge>;
}
