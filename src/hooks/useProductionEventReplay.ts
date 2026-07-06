/**
 * useProductionEventReplay — Phase 9 aggregate for the full-page deployment
 * replay. Reconstructs a production event's complete history: release/change
 * context, scope snapshot (preferred) or reconstruction, SOP execution timeline,
 * commit + evidence ledgers, sign-off + override + freeze trails, incident/defect
 * trail (by production-event / change / SOP-step lineage), a deterministic
 * executive narrative, and result/closure. Read-only — never mutates history.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mapSopStep, type SopStepFull } from '@/hooks/useSopRunbook';

const TECH = ['frontend', 'backend', 'integration', 'database', 'configuration'];

export interface ReplayGate { scope: 'change' | 'release'; role: string | null; status: string; approverName: string | null; dueDate: string | null; decidedAt: string | null; comment: string | null; overdue: boolean }
export interface ReplayIssue { id: string; kind: 'incident' | 'defect'; key: string | null; title: string | null; severity: string | null; status: string | null; sopStepId: string | null; createdAt: string | null; viaProductionEvent: boolean }
export interface ProductionEventReplay {
  found: boolean;
  event: any;
  eventKey: string | null; title: string | null; result: string | null; env: string | null; eventLevel: string | null;
  plannedStartAt: string | null; plannedEndAt: string | null; actualStartAt: string | null; actualEndAt: string | null;
  durationMinutes: number | null; overrunMinutes: number | null; executedByName: string | null; approvedByName: string | null;
  release: { id: string; name: string; version: string | null; slug: string | null; productName: string | null; targetEnv: string | null; status: string | null; releaseManagerName: string | null; productOwnerName: string | null } | null;
  change: { id: string; chgNumber: string; title: string; slug: string | null; risk: string | null; changeType: string | null; deploymentCategory: string | null; targetEnv: string | null; status: string | null; changeManagerName: string | null; isEmergency: boolean; isUnlinkedProduction: boolean } | null;
  steps: SopStepFull[];
  scope: { source: 'snapshot' | 'reconstructed' | 'none'; brs: number; sprints: number; workItems: number };
  gates: ReplayGate[];
  override: { status: string; reason: string | null; bypassedGate: string | null; requestedByName: string | null; approvedByName: string | null; approvedAt: string | null } | null;
  freeze: { conflict: boolean; name: string | null; reason: string | null; overrideApproved: boolean };
  issues: ReplayIssue[];
  summary: string;
  closure: { result: string; openIncidents: number; openDefects: number; reason: string };
}

const OPEN = (s: string | null) => !!s && !/^(resolved|closed|done|cancelled)$/i.test(s);
const CRIT = (s: string | null) => !!s && /^(sev1|sev2|critical|high|p1|p2)$/i.test(s);

export const useProductionEventReplay = (eventKey: string) =>
  useQuery({
    queryKey: ['release-hub', 'production-event-replay', eventKey],
    enabled: !!eventKey,
    queryFn: async (): Promise<ProductionEventReplay> => {
      // resolve by event_key, else by id
      let { data: ev } = await supabase.from('rh_production_events').select('*').eq('event_key', eventKey).maybeSingle();
      if (!ev) { const r = await supabase.from('rh_production_events').select('*').eq('id', eventKey).maybeSingle(); ev = r.data; }
      if (!ev) return emptyReplay();
      const e: any = ev;

      const [relRes, chRes, stepRes, freezeRes, ovrRes, incRes, defRes] = await Promise.all([
        e.release_id ? supabase.from('rh_releases').select('*').eq('id', e.release_id).maybeSingle() : Promise.resolve({ data: null }),
        e.change_id ? supabase.from('rh_changes').select('*').eq('id', e.change_id).maybeSingle() : Promise.resolve({ data: null }),
        e.change_id ? supabase.from('rh_sop_steps').select('*').eq('change_id', e.change_id).order('step_no') : Promise.resolve({ data: [] as any[] }),
        supabase.from('rh_freeze_windows').select('*'),
        e.change_id ? supabase.from('rh_emergency_overrides' as any).select('*').eq('change_id', e.change_id) : Promise.resolve({ data: [] as any[] }),
        supabase.from('incidents').select('id, incident_key, title, severity, status, source_sop_step_id, source_change_id, source_production_event_id, created_at').or(`source_production_event_id.eq.${e.id}${e.change_id ? `,source_change_id.eq.${e.change_id}` : ''}`),
        supabase.from('tm_defects').select('id, defect_key, title, severity, status, source_sop_step_id, source_change_id, source_production_event_id, created_at').or(`source_production_event_id.eq.${e.id}${e.change_id ? `,source_change_id.eq.${e.change_id}` : ''}`),
      ]);
      const rel: any = (relRes as any).data; const ch: any = (chRes as any).data;
      const stepRows = ((stepRes as any).data ?? []) as any[];

      // sign-offs
      const [csoRes, rsoRes] = await Promise.all([
        e.change_id ? supabase.from('rh_change_signoffs').select('*').eq('change_id', e.change_id) : Promise.resolve({ data: [] as any[] }),
        e.release_id ? supabase.from('rh_release_signoffs' as any).select('*').eq('release_id', e.release_id) : Promise.resolve({ data: [] as any[] }),
      ]);
      const chSo = ((csoRes as any).data ?? []) as any[]; const relSo = ((rsoRes as any).data ?? []) as any[];

      // profiles
      const pIds = [...new Set([e.executed_by, e.deployed_by, rel?.release_manager_id, rel?.product_owner_id, ch?.change_manager_id, ...stepRows.map((s) => s.owner_id), ...chSo.map((s) => s.assigned_to), ...relSo.map((s) => s.assigned_to)].filter(Boolean))] as string[];
      const nameById: Record<string, string> = {};
      if (pIds.length) { const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', pIds); (data ?? []).forEach((p: any) => { nameById[p.id] = p.full_name || p.email || 'Unknown'; }); }
      let productName: string | null = null;
      if (rel?.product_id) { const { data: pr } = await supabase.from('products').select('name').eq('id', rel.product_id).maybeSingle(); productName = (pr as any)?.name ?? null; }

      const steps = stepRows.map((s) => mapSopStep(s, s.owner_id ? nameById[s.owner_id] ?? null : null));

      const gates: ReplayGate[] = [
        ...relSo.map((s) => gate(s, 'release', nameById)),
        ...chSo.map((s) => gate(s, 'change', nameById)),
      ];
      const overrides = ((ovrRes as any).data ?? []) as any[];
      const activeOvr = overrides.find((o) => o.status === 'approved') ?? overrides[0] ?? null;
      const override = activeOvr ? { status: activeOvr.status, reason: activeOvr.reason, bypassedGate: activeOvr.bypassed_gate, requestedByName: activeOvr.requested_by ? nameById[activeOvr.requested_by] ?? null : null, approvedByName: activeOvr.approved_by ? nameById[activeOvr.approved_by] ?? null : null, approvedAt: activeOvr.approved_at } : (ch?.is_emergency_override ? { status: 'flagged', reason: ch.override_reason, bypassedGate: null, requestedByName: null, approvedByName: null, approvedAt: null } : null);

      // freeze
      const freezeRows = ((freezeRes as any).data ?? []) as any[];
      const winStart = e.planned_start_at ?? ch?.window_start; const winEnd = e.planned_end_at ?? ch?.window_end;
      const fWin = freezeRows.find((f) => {
        const active = f.is_active !== false && f.status !== 'ended';
        const envMatch = !f.target_env || f.target_env === 'all' || f.target_env === e.target_env;
        const fS = new Date(f.start_at ?? f.start_date).getTime(); const fE = new Date(f.end_at ?? f.end_date).getTime();
        const cS = winStart ? new Date(winStart).getTime() : (e.actual_start_at ? new Date(e.actual_start_at).getTime() : Date.now());
        const cE = winEnd ? new Date(winEnd).getTime() : cS;
        return active && envMatch && cS <= fE && cE >= fS;
      });
      const freeze = { conflict: !!fWin, name: fWin?.name ?? null, reason: fWin?.reason ?? null, overrideApproved: overrides.some((o) => o.status === 'approved' && (o.bypassed_gate ?? '').startsWith('freeze')) || ch?.is_emergency_override === true };

      const issues: ReplayIssue[] = [
        ...((incRes as any).data ?? []).map((i: any) => ({ id: i.id, kind: 'incident' as const, key: i.incident_key, title: i.title, severity: String(i.severity ?? ''), status: String(i.status ?? ''), sopStepId: i.source_sop_step_id, createdAt: i.created_at, viaProductionEvent: i.source_production_event_id === e.id })),
        ...((defRes as any).data ?? []).map((d: any) => ({ id: d.id, kind: 'defect' as const, key: d.defect_key, title: d.title, severity: String(d.severity ?? ''), status: String(d.status ?? ''), sopStepId: d.source_sop_step_id, createdAt: d.created_at, viaProductionEvent: d.source_production_event_id === e.id })),
      ];

      // scope
      let scopeSrc: 'snapshot' | 'reconstructed' | 'none' = 'none'; let brs = 0, sprints = 0, workItems = 0;
      const wiSnap = e.work_items_snapshot, brSnap = e.business_requests_snapshot;
      if (Array.isArray(wiSnap) || Array.isArray(brSnap)) { scopeSrc = 'snapshot'; workItems = Array.isArray(wiSnap) ? wiSnap.length : 0; brs = Array.isArray(brSnap) ? brSnap.length : 0; }
      else if (e.release_id) {
        scopeSrc = 'reconstructed';
        const [b, sp, wi] = await Promise.all([
          supabase.from('rh_release_brs').select('id', { count: 'exact', head: true }).eq('release_id', e.release_id),
          supabase.from('rh_release_sprints').select('id', { count: 'exact', head: true }).eq('release_id', e.release_id),
          supabase.from('rh_release_work_items').select('id', { count: 'exact', head: true }).eq('release_id', e.release_id),
        ]);
        brs = (b as any).count ?? 0; sprints = (sp as any).count ?? 0; workItems = (wi as any).count ?? 0;
      }

      const result = e.deployment_result ?? e.deployment_status ?? 'unknown';
      const openInc = issues.filter((i) => i.kind === 'incident' && OPEN(i.status)).length;
      const openDef = issues.filter((i) => i.kind === 'defect' && OPEN(i.status)).length;
      const critOpen = issues.filter((i) => OPEN(i.status) && CRIT(i.severity)).length;

      const commitSteps = steps.filter((s) => s.frontendCommit || s.backendCommit || s.integrationCommit || s.databaseCommit || s.configurationCommit);
      const evidenceSteps = steps.filter((s) => s.evidenceUrl);
      const overran = e.overrun_minutes != null ? e.overrun_minutes > 0 : (e.planned_end_at && e.actual_end_at && new Date(e.actual_end_at) > new Date(e.planned_end_at));

      const summary = buildSummary({ e, rel, ch, productName, result, steps, gates, override, freeze, openInc, openDef, critOpen, overran, commitSteps: commitSteps.length, evidenceSteps: evidenceSteps.length,
        executedBy: e.executed_by ? nameById[e.executed_by] : (e.deployed_by ?? null), approvedBy: gates.find((g) => g.status === 'approved')?.approverName ?? null });

      const closure = {
        result,
        openIncidents: openInc, openDefects: openDef,
        reason: result === 'success' && critOpen > 0 ? `Marked success but ${critOpen} critical issue(s) remain open` :
          result === 'partial' ? 'Partial success — some steps incomplete or skipped' :
          result === 'failed' || result === 'rollback' ? 'Deployment did not complete cleanly — see failed/rollback steps' :
          result === 'unknown' ? 'Result not recorded — replay is incomplete' : 'Deployment completed',
      };

      return {
        found: true, event: e, eventKey: e.event_key, title: e.title, result, env: e.target_env, eventLevel: e.event_level,
        plannedStartAt: e.planned_start_at, plannedEndAt: e.planned_end_at, actualStartAt: e.actual_start_at, actualEndAt: e.actual_end_at,
        durationMinutes: e.duration_minutes, overrunMinutes: e.overrun_minutes,
        executedByName: e.executed_by ? nameById[e.executed_by] ?? null : (e.deployed_by ?? null),
        approvedByName: gates.find((g) => g.status === 'approved')?.approverName ?? null,
        release: rel ? { id: rel.id, name: rel.name, version: rel.version, slug: rel.slug, productName, targetEnv: rel.target_env, status: rel.status, releaseManagerName: rel.release_manager_id ? nameById[rel.release_manager_id] ?? null : null, productOwnerName: rel.product_owner_id ? nameById[rel.product_owner_id] ?? null : null } : null,
        change: ch ? { id: ch.id, chgNumber: ch.chg_number, title: ch.title, slug: ch.slug, risk: ch.risk_level, changeType: ch.change_type, deploymentCategory: ch.deployment_category, targetEnv: ch.target_env, status: ch.status, changeManagerName: ch.change_manager_id ? nameById[ch.change_manager_id] ?? null : null, isEmergency: ch.is_emergency_override === true, isUnlinkedProduction: ch.target_env === 'production' && !ch.release_id && !e.release_id } : null,
        steps, scope: { source: scopeSrc, brs, sprints, workItems }, gates, override, freeze, issues, summary, closure,
      };
    },
  });

function gate(s: any, scope: 'change' | 'release', nameById: Record<string, string>): ReplayGate {
  return { scope, role: s.signoff_role ?? s.stage, status: s.status, approverName: s.assigned_to ? nameById[s.assigned_to] ?? null : null, dueDate: s.due_date, decidedAt: s.decided_at ?? s.actioned_at, comment: s.comment, overdue: s.status === 'pending' && s.due_date != null && new Date(s.due_date).getTime() < Date.now() };
}

function buildSummary(x: any): string {
  const { e, rel, ch, productName, result, steps, override, freeze, openInc, openDef, critOpen, overran, commitSteps, evidenceSteps, executedBy, approvedBy } = x;
  const done = steps.filter((s: SopStepFull) => s.status === 'done').length;
  const failed = steps.filter((s: SopStepFull) => s.status === 'failed' || s.status === 'blocked').length;
  const what = ch ? `${ch.chg_number} — ${ch.title}` : (rel ? rel.name : e.title);
  const parts: string[] = [];
  parts.push(`${what} was deployed to ${e.target_env ?? 'production'}${productName ? ` (${productName})` : ''}${rel && ch ? `, under release ${rel.name}` : ''}.`);
  parts.push(`Outcome: ${String(result).toUpperCase()}. ${done}/${steps.length} SOP steps completed${failed ? `, ${failed} failed/blocked` : ''}; ${commitSteps} step(s) captured commits, ${evidenceSteps} captured evidence.`);
  if (executedBy) parts.push(`Executed by ${executedBy}${approvedBy ? `, approved by ${approvedBy}` : ''}.`);
  if (overran) parts.push('Execution overran its planned window.');
  if (override?.status === 'approved' || (freeze.conflict && freeze.overrideApproved)) parts.push('An emergency override was used to bypass a gate — see the override trail.');
  if (freeze.conflict) parts.push(`Deployed during freeze window${freeze.name ? ` "${freeze.name}"` : ''}${freeze.overrideApproved ? ' (override approved)' : ' (unresolved)'}.`);
  if (openInc || openDef) parts.push(`${openInc} open incident(s) and ${openDef} open defect(s)${critOpen ? `, ${critOpen} critical` : ''} are linked to this deployment.`);
  else parts.push('No incidents or defects were raised during this deployment.');
  return parts.join(' ');
}

function emptyReplay(): ProductionEventReplay {
  return { found: false, event: null, eventKey: null, title: null, result: null, env: null, eventLevel: null, plannedStartAt: null, plannedEndAt: null, actualStartAt: null, actualEndAt: null, durationMinutes: null, overrunMinutes: null, executedByName: null, approvedByName: null, release: null, change: null, steps: [], scope: { source: 'none', brs: 0, sprints: 0, workItems: 0 }, gates: [], override: null, freeze: { conflict: false, name: null, reason: null, overrideApproved: false }, issues: [], summary: '', closure: { result: 'unknown', openIncidents: 0, openDefects: 0, reason: '' } };
}

export { TECH };
