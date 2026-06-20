/**
 * Release Operations — lifecycle + scheduling guards (Phase 15).
 *
 * Enforced in the service/hook layer (called by useUpdateReleaseStatus /
 * useUpdateChangeStatus / board drag). RLS already gates WHO may write a row;
 * these guards gate WHAT transition is allowed:
 *   - valid stage transitions (forward / one-step-back / cancel / rollback)
 *   - freeze-conflict block on scheduling
 *   - approval-gating (a production change cannot schedule/implement until all
 *     its sign-offs are approved, unless an emergency override is set)
 *   - production-needs-change (a production release cannot deploy with no
 *     linked change)
 *
 * NOTE: this is the functional enforcement layer, not a security boundary. A
 * DB trigger could mirror these rules server-side — a hardening follow-up.
 */
import { supabase } from '@/integrations/supabase/client';

export interface GuardResult { ok: boolean; reason?: string }

// ── Stage orders ─────────────────────────────────────────────────────
export const RELEASE_STAGES = [
  'draft', 'in_progress', 'qa', 'beta', 'production',
];
export const CHANGE_STAGES = [
  'draft', 'assessing', 'ready_for_approval', 'approved', 'scheduled',
  'implementing', 'validating', 'implemented', 'closed',
];
const RELEASE_TERMINAL = ['rolled_back', 'cancelled'];
const CHANGE_TERMINAL = ['failed', 'rolled_back', 'cancelled'];

// Legacy → canonical stage aliasing (lenient: legacy data isn't blocked).
// Maps all old 9-stage values and other aliases to the new 5-stage model.
const RELEASE_ALIAS: Record<string, string> = {
  // pre-migration legacy names
  todo: 'draft', planning: 'draft', planned: 'draft',
  in_readiness: 'in_progress', ready_for_signoff: 'in_progress',
  approved: 'qa', scheduled: 'qa',
  deploying: 'beta', monitoring: 'beta',
  completed: 'production', released: 'production', done: 'production',
};
const CHANGE_ALIAS: Record<string, string> = { new: 'draft', in_uat: 'implementing', in_beta: 'validating', in_production: 'implemented', done: 'closed' };

/**
 * A transition is allowed when: same stage (no-op), one step forward, one step
 * back (rework), or into a terminal state. Unknown/legacy from-states are
 * permissive so existing rows can always be corrected.
 */
function canTransition(stages: string[], terminal: string[], alias: Record<string, string>, from: string, to: string): boolean {
  if (from === to) return true;
  if (terminal.includes(to)) return true;       // cancel / rollback / fail from anywhere
  const f = alias[from] ?? from;
  const t = alias[to] ?? to;
  const fi = stages.indexOf(f);
  const ti = stages.indexOf(t);
  if (fi === -1 || ti === -1) return true;       // legacy/unknown → permissive
  return ti === fi + 1 || ti === fi - 1;         // forward or one-step-back
}

export function canReleaseTransition(from: string, to: string): boolean {
  return canTransition(RELEASE_STAGES, RELEASE_TERMINAL, RELEASE_ALIAS, from, to);
}
export function canChangeTransition(from: string, to: string): boolean {
  return canTransition(CHANGE_STAGES, CHANGE_TERMINAL, CHANGE_ALIAS, from, to);
}

const envMatch = (winEnv: string | null, itemEnv: string | null) => !winEnv || winEnv === 'all' || winEnv === itemEnv;

/** Is `date` inside any freeze window matching `env`? Returns the window name. */
async function freezeConflict(env: string | null, date: string | null): Promise<string | null> {
  if (!date) return null;
  const t = new Date(date).getTime();
  const { data } = await supabase.from('rh_freeze_windows').select('name, start_date, end_date, target_env');
  for (const w of data ?? []) {
    if (!envMatch((w as any).target_env, env)) continue;
    const s = new Date((w as any).start_date).getTime();
    const e = new Date((w as any).end_date).getTime();
    if (t >= s && t <= e) return (w as any).name as string;
  }
  return null;
}

// ── Release transition validation ────────────────────────────────────
export async function validateReleaseTransition(releaseId: string, toStatus: string): Promise<GuardResult> {
  const { data: rel } = await supabase
    .from('rh_releases')
    .select('id, status, target_env, target_date, planned_release_date')
    .eq('id', releaseId)
    .maybeSingle();
  if (!rel) return { ok: false, reason: 'Release not found' };
  const r = rel as any;

  if (!canReleaseTransition(r.status, toStatus)) {
    return { ok: false, reason: `Cannot move from ${r.status.replace(/_/g, ' ')} to ${toStatus.replace(/_/g, ' ')}` };
  }

  // Freeze-conflict block on staging/production deployments.
  if (toStatus === 'beta' || toStatus === 'production') {
    const date = r.planned_release_date ?? r.target_date;
    const fw = await freezeConflict(r.target_env, date);
    if (fw) return { ok: false, reason: `Release date falls in freeze window "${fw}". Reschedule or lift the freeze.` };
  }

  // Production-needs-change: a production release cannot deploy with no change.
  if ((toStatus === 'beta' || toStatus === 'production') && r.target_env === 'production') {
    const { count } = await supabase.from('rh_changes').select('*', { count: 'exact', head: true }).eq('release_id', releaseId);
    if (!count) {
      const { count: linkCount } = await supabase.from('rh_change_release_links').select('*', { count: 'exact', head: true }).eq('release_id', releaseId).is('unlinked_at', null);
      if (!linkCount) return { ok: false, reason: 'A production release needs at least one linked change before it can be scheduled.' };
    }
  }

  return { ok: true };
}

// ── Change transition validation ─────────────────────────────────────
export async function validateChangeTransition(changeId: string, toStatus: string): Promise<GuardResult> {
  const { data: chg } = await supabase
    .from('rh_changes')
    .select('id, status, target_env, window_start, deployment_date, is_emergency_override')
    .eq('id', changeId)
    .maybeSingle();
  if (!chg) return { ok: false, reason: 'Change not found' };
  const c = chg as any;

  if (!canChangeTransition(c.status, toStatus)) {
    return { ok: false, reason: `Cannot move from ${c.status.replace(/_/g, ' ')} to ${toStatus.replace(/_/g, ' ')}` };
  }

  // Freeze-conflict block on scheduling.
  if (toStatus === 'scheduled') {
    const date = c.window_start ?? c.deployment_date;
    const fw = await freezeConflict(c.target_env, date);
    if (fw) return { ok: false, reason: `Change window falls in freeze window "${fw}". Reschedule or lift the freeze.` };
  }

  // Approval-gating: a production change cannot schedule/implement until all
  // its sign-offs are approved (emergency override excepted).
  if ((toStatus === 'scheduled' || toStatus === 'implementing') && c.target_env === 'production' && !c.is_emergency_override) {
    const { data: signoffs } = await supabase.from('rh_change_signoffs').select('status').eq('change_id', changeId);
    const rows = signoffs ?? [];
    const pending = rows.filter((s: any) => s.status !== 'approved');
    if (rows.length > 0 && pending.length > 0) {
      return { ok: false, reason: `${pending.length} sign-off${pending.length === 1 ? '' : 's'} still pending. All approvals are required before a production change can proceed (or set an emergency override).` };
    }
  }

  return { ok: true };
}
