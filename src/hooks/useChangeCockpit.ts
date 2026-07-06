/**
 * useChangeCockpit — Phase 3 aggregate read model for the Change Detail cockpit.
 *
 * One parallel batch that answers everything the cockpit surfaces: linked
 * releases, owners/participants, SOP readiness, sign-off readiness, freeze
 * conflict, emergency override, incidents/defects, and production event.
 * Read-only; actions live in their own mutation hooks. Untyped rh_* tables use
 * the repo's `as any` convention (types.ts intentionally not regenerated).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const TECHNICAL_CATEGORIES = ['frontend', 'backend', 'integration', 'database', 'configuration'];

export interface CockpitRelease {
  id: string; name: string | null; status: string | null; slug: string | null;
  targetEnv: string | null; plannedReleaseDate: string | null; readinessPct: number | null;
  productId: string | null; releaseManagerId: string | null;
}
export interface CockpitPerson { id: string; name: string; role: string }
export interface CockpitSop {
  total: number; mandatory: number; technical: number; commitRequired: number;
  evidenceRequired: number; assigned: number; done: number; blocked: number; failed: number;
  running: { title: string; role: string | null } | null;
  next: { title: string; plannedStartAt: string | null } | null;
}
export interface CockpitSignoffs {
  changeTotal: number; releaseTotal: number; pending: number; approved: number;
  rejected: number; overridden: number; blockingRole: string | null;
  nextDue: string | null; overdue: boolean;
}
export interface CockpitFreeze {
  conflict: boolean; window: { name: string; targetEnv: string | null; startAt: string | null; endAt: string | null; reason: string | null } | null;
  overrideApproved: boolean;
}
export interface CockpitOverride {
  exists: boolean; status: string | null; reason: string | null; bypassedGate: string | null;
  requestedBy: string | null; approvedBy: string | null; approvedAt: string | null;
}
export interface CockpitIssue { id: string; kind: 'incident' | 'defect'; key: string | null; title: string | null; severity: string | null; status: string | null; sopStepId: string | null; createdAt: string | null }
export interface CockpitProdEvent {
  exists: boolean; id: string | null; eventKey: string | null; result: string | null;
  plannedStartAt: string | null; plannedEndAt: string | null; actualStartAt: string | null;
  actualEndAt: string | null; overrunMinutes: number | null; executedBy: string | null;
}
export interface ChangeCockpit {
  releases: CockpitRelease[];
  owners: CockpitPerson[];
  sop: CockpitSop;
  signoffs: CockpitSignoffs;
  freeze: CockpitFreeze;
  override: CockpitOverride;
  issues: CockpitIssue[];
  prodEvent: CockpitProdEvent;
  isTechnical: boolean;
  isProduction: boolean;
  isUnlinkedProduction: boolean;
}

export const useChangeCockpit = (change: any) =>
  useQuery({
    queryKey: ['release-hub', 'changes', change?.id, 'cockpit'],
    enabled: !!change?.id,
    queryFn: async (): Promise<ChangeCockpit> => {
      const changeId: string = change.id;

      const [linkRes, sopRes, coRes, roRes, freezeRes, ovrRes, incRes, defRes, peRes] = await Promise.all([
        supabase.from('rh_change_release_links')
          .select('rh_releases(id, name, status, slug, target_env, planned_release_date, readiness_pct, product_id, release_manager_id)')
          .eq('change_id', changeId).is('unlinked_at', null),
        supabase.from('rh_sop_steps').select('*').eq('change_id', changeId).order('step_no'),
        supabase.from('rh_change_signoffs').select('*').eq('change_id', changeId),
        supabase.from('rh_release_signoffs' as any).select('*').eq('release_id', change.release_id ?? '00000000-0000-0000-0000-000000000000'),
        supabase.from('rh_freeze_windows').select('*'),
        supabase.from('rh_emergency_overrides' as any).select('*').eq('change_id', changeId).order('requested_at', { ascending: false }),
        supabase.from('incidents').select('id, incident_key, title, severity, status, source_sop_step_id, created_at').eq('source_change_id', changeId),
        supabase.from('tm_defects').select('id, defect_key, title, severity, status, source_sop_step_id, created_at').eq('source_change_id', changeId),
        supabase.from('rh_production_events').select('*').eq('change_id', changeId).order('deployed_at', { ascending: false }).limit(1),
      ]);

      const releases: CockpitRelease[] = (linkRes.data ?? []).map((l: any) => {
        const r = l.rh_releases; return r ? {
          id: r.id, name: r.name, status: r.status, slug: r.slug, targetEnv: r.target_env,
          plannedReleaseDate: r.planned_release_date, readinessPct: r.readiness_pct,
          productId: r.product_id, releaseManagerId: r.release_manager_id,
        } : null;
      }).filter(Boolean) as CockpitRelease[];

      // ── owners: change-level roles + SOP-step assignees, resolved to names
      const roleIds: Array<[string | null, string]> = [
        [change.change_manager_id, 'Change manager'],
        [change.release_manager_id, 'Release manager'],
        [change.technical_lead_id, 'Technical lead'],
        [change.qa_owner_id, 'QA / validation owner'],
      ];
      const sopSteps = (sopRes.data ?? []) as any[];
      sopSteps.forEach((s) => { if (s.owner_id) roleIds.push([s.owner_id, prettyRole(s.assigned_role) ?? 'Execution owner']); });
      const wantIds = [...new Set(roleIds.map(([id]) => id).filter(Boolean))] as string[];
      const nameById: Record<string, string> = {};
      if (wantIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', wantIds);
        (profs ?? []).forEach((p: any) => { nameById[p.id] = p.full_name || p.email || 'Unknown'; });
      }
      const seenPerson = new Set<string>();
      const owners: CockpitPerson[] = [];
      roleIds.forEach(([id, role]) => {
        if (!id) return;
        const k = `${id}:${role}`; if (seenPerson.has(k)) return; seenPerson.add(k);
        owners.push({ id, name: nameById[id] ?? 'Unknown', role });
      });

      // ── SOP summary
      const running = sopSteps.find((s) => s.status === 'in_progress');
      const next = sopSteps.find((s) => s.status === 'pending' || s.status === 'ready');
      const sop: CockpitSop = {
        total: sopSteps.length,
        mandatory: sopSteps.filter((s) => s.is_mandatory).length,
        technical: sopSteps.filter((s) => s.is_technical_step).length,
        commitRequired: sopSteps.filter((s) => s.commit_required).length,
        evidenceRequired: sopSteps.filter((s) => s.evidence_required).length,
        assigned: sopSteps.filter((s) => s.owner_id).length,
        done: sopSteps.filter((s) => s.status === 'done').length,
        blocked: sopSteps.filter((s) => s.status === 'blocked').length,
        failed: sopSteps.filter((s) => s.status === 'failed').length,
        running: running ? { title: running.title, role: prettyRole(running.assigned_role) } : null,
        next: next ? { title: next.title, plannedStartAt: next.planned_start_at } : null,
      };

      // ── sign-offs (change + release)
      const changeSo = (coRes.data ?? []) as any[];
      const relSo = ((roRes as any).data ?? []) as any[];
      const allSo = [...changeSo, ...relSo];
      const pendingSo = allSo.filter((s) => s.status === 'pending');
      const blocking = pendingSo[0];
      const dues = pendingSo.map((s) => s.due_date).filter(Boolean).sort();
      const signoffs: CockpitSignoffs = {
        changeTotal: changeSo.length, releaseTotal: relSo.length,
        pending: pendingSo.length,
        approved: allSo.filter((s) => s.status === 'approved' || s.status === 'auto_approved').length,
        rejected: allSo.filter((s) => s.status === 'rejected').length,
        overridden: allSo.filter((s) => s.status === 'overridden' || s.status === 'bypassed').length,
        blockingRole: blocking ? (blocking.signoff_role ?? blocking.stage ?? null) : null,
        nextDue: dues[0] ?? null,
        overdue: dues.length ? new Date(dues[0]).getTime() < Date.now() : false,
      };

      // ── freeze conflict (client-side eval — foundation for a service later)
      const isProduction = change.target_env === 'production';
      const isTechnical = TECHNICAL_CATEGORIES.includes(change.deployment_category ?? '');
      const winStart = change.window_start ?? change.planned_start_at;
      const winEnd = change.window_end ?? change.planned_end_at;
      const freezeRows = (freezeRes.data ?? []) as any[];
      const conflictWin = freezeRows.find((f) => {
        const active = f.is_active !== false && f.status !== 'ended';
        const envMatch = !f.target_env || f.target_env === 'all' || f.target_env === change.target_env;
        const fS = new Date(f.start_at ?? f.start_date).getTime();
        const fE = new Date(f.end_at ?? f.end_date).getTime();
        const cS = winStart ? new Date(winStart).getTime() : Date.now();
        const cE = winEnd ? new Date(winEnd).getTime() : cS;
        return active && envMatch && cS <= fE && cE >= fS;
      });
      const overrides = ((ovrRes as any).data ?? []) as any[];
      const activeOverride = overrides.find((o) => o.status === 'approved') ?? overrides[0] ?? null;
      const freeze: CockpitFreeze = {
        conflict: !!conflictWin,
        window: conflictWin ? { name: conflictWin.name, targetEnv: conflictWin.target_env, startAt: conflictWin.start_at ?? conflictWin.start_date, endAt: conflictWin.end_at ?? conflictWin.end_date, reason: conflictWin.reason } : null,
        overrideApproved: overrides.some((o) => o.status === 'approved' && (o.bypassed_gate ?? '').startsWith('freeze')),
      };

      const override: CockpitOverride = {
        exists: change.is_emergency_override === true || overrides.length > 0,
        status: activeOverride?.status ?? (change.is_emergency_override ? 'flagged' : null),
        reason: activeOverride?.reason ?? change.override_reason ?? null,
        bypassedGate: activeOverride?.bypassed_gate ?? null,
        requestedBy: activeOverride?.requested_by ? (nameById[activeOverride.requested_by] ?? null) : null,
        approvedBy: activeOverride?.approved_by ?? change.override_approver_id ?? null,
        approvedAt: activeOverride?.approved_at ?? null,
      };

      const issues: CockpitIssue[] = [
        ...((incRes.data ?? []) as any[]).map((i) => ({ id: i.id, kind: 'incident' as const, key: i.incident_key, title: i.title, severity: String(i.severity ?? ''), status: String(i.status ?? ''), sopStepId: i.source_sop_step_id, createdAt: i.created_at })),
        ...((defRes.data ?? []) as any[]).map((d) => ({ id: d.id, kind: 'defect' as const, key: d.defect_key, title: d.title, severity: String(d.severity ?? ''), status: String(d.status ?? ''), sopStepId: d.source_sop_step_id, createdAt: d.created_at })),
      ];

      const pe = ((peRes.data ?? []) as any[])[0];
      const prodEvent: CockpitProdEvent = pe ? {
        exists: true, id: pe.id, eventKey: pe.event_key, result: pe.deployment_status ?? pe.deployment_result,
        plannedStartAt: pe.planned_start_at, plannedEndAt: pe.planned_end_at, actualStartAt: pe.actual_start_at,
        actualEndAt: pe.actual_end_at, overrunMinutes: pe.overrun_minutes, executedBy: pe.deployed_by ?? null,
      } : { exists: false, id: null, eventKey: null, result: null, plannedStartAt: null, plannedEndAt: null, actualStartAt: null, actualEndAt: null, overrunMinutes: null, executedBy: null };

      const isUnlinkedProduction = isProduction && releases.length === 0 && !change.release_id;

      return { releases, owners, sop, signoffs, freeze, override, issues, prodEvent, isTechnical, isProduction, isUnlinkedProduction };
    },
  });

function prettyRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
