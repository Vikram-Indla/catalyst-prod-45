/**
 * Canonical workflow RUNTIME — resolver + evaluation + enforcement gate + audit.
 *
 * Resolves the published ph_wf_* version for an (entity, project), computes
 * available transitions, evaluates a requested transition (real role + guard
 * checks), resolves enforcement mode (advisory|blocking) per project+entity,
 * and writes an audit row via the security-definer ph_wf_write_audit RPC.
 *
 * Advisory: never blocks (logs would_block). Blocking (scoped via
 * ph_wf_enforcement_config): gateTransition returns blocked=true so callers
 * throw and the status is not persisted / the kanban card reverts.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  EntityKey, TransitionEvaluationResult, WorkflowStatusCategory, WorkflowMode, GuardEvaluation,
} from './contracts';
import { buildUnauthorizedTooltip } from './advisory';

export interface ResolvedVersion {
  versionId: string;
  entityKey: string;
  versionNo: number;
  statuses: {
    status_key: string; display_label: string; category: WorkflowStatusCategory;
    is_initial: boolean; is_terminal: boolean; is_exception: boolean;
    supports_reopen: boolean; requires_reason: boolean; sort_order: number; color_token: string;
  }[];
  transitions: {
    id: string; from_status_key: string | null; to_status_key: string;
    transition_type: string; requires_reason: boolean; requires_comment: boolean;
    roleGroups: string[]; guards: { guardType: string; isBlocking: boolean; waiverAllowed: boolean }[];
  }[];
  /** legacy status text -> canonical key (ph_wf_status_remaps). */
  remaps: Record<string, string>;
}

/** lowercase + non-alnum→underscore: "In Development" -> "in_development". */
export function slugStatus(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** Resolve raw (canonical key | display label | legacy text | slug) -> canonical key. */
export function resolveKeyInVersion(version: ResolvedVersion, raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (version.statuses.some((s) => s.status_key === raw)) return raw;
  const byLabel = version.statuses.find((s) => s.display_label === raw);
  if (byLabel) return byLabel.status_key;
  if (version.remaps[raw]) return version.remaps[raw];
  const slug = slugStatus(raw);
  if (slug && version.statuses.some((s) => s.status_key === slug)) return slug;
  return null;
}

export async function resolveCanonicalVersion(
  entityKey: EntityKey, projectKey?: string | null,
): Promise<ResolvedVersion | null> {
  let versionId: string | null = null;

  if (projectKey) {
    const { data } = await supabase.from('ph_projects').select('id').eq('key', projectKey).maybeSingle();
    const projectId = (data as any)?.id ?? null;
    if (projectId) {
      const { data: asg } = await supabase
        .from('ph_wf_scheme_assignments').select('scheme_id').eq('project_id', projectId).maybeSingle();
      if ((asg as any)?.scheme_id) {
        const { data: entry } = await supabase
          .from('ph_wf_scheme_entries').select('version_id')
          .eq('scheme_id', (asg as any).scheme_id).eq('entity_key', entityKey).maybeSingle();
        versionId = (entry as any)?.version_id ?? null;
      }
    }
  }
  if (!versionId) {
    const { data: scheme } = await supabase.from('ph_wf_schemes').select('id').eq('is_default', true).maybeSingle();
    if ((scheme as any)?.id) {
      const { data: entry } = await supabase
        .from('ph_wf_scheme_entries').select('version_id')
        .eq('scheme_id', (scheme as any).id).eq('entity_key', entityKey).maybeSingle();
      versionId = (entry as any)?.version_id ?? null;
    }
  }
  if (!versionId) return null;

  const [{ data: ver }, { data: statuses }, { data: transitions }, { data: remaps }] = await Promise.all([
    supabase.from('ph_wf_versions').select('id, entity_key, version_no, lifecycle').eq('id', versionId).maybeSingle(),
    supabase.from('ph_wf_version_statuses').select('*').eq('version_id', versionId).order('sort_order'),
    supabase.from('ph_wf_version_transitions').select('id, from_status_key, to_status_key, transition_type, requires_reason, requires_comment').eq('version_id', versionId).order('sort_order'),
    supabase.from('ph_wf_status_remaps').select('old_status_key, new_status_key').eq('to_version_id', versionId).eq('entity_key', entityKey),
  ]);
  if (!ver || (ver as any).lifecycle !== 'published') return null;

  const transitionIds = (transitions ?? []).map((t: any) => t.id);
  const [{ data: roles }, { data: guards }] = transitionIds.length
    ? await Promise.all([
        supabase.from('ph_wf_transition_roles').select('transition_id, role_group').in('transition_id', transitionIds),
        supabase.from('ph_wf_transition_guards').select('transition_id, guard_type, is_blocking, waiver_allowed').in('transition_id', transitionIds),
      ])
    : [{ data: [] }, { data: [] }];

  const rolesByT: Record<string, string[]> = {};
  (roles ?? []).forEach((r: any) => { (rolesByT[r.transition_id] ??= []).push(r.role_group); });
  const guardsByT: Record<string, { guardType: string; isBlocking: boolean; waiverAllowed: boolean }[]> = {};
  (guards ?? []).forEach((g: any) => {
    (guardsByT[g.transition_id] ??= []).push({ guardType: g.guard_type, isBlocking: g.is_blocking, waiverAllowed: g.waiver_allowed });
  });
  const remapMap: Record<string, string> = {};
  (remaps ?? []).forEach((r: any) => { remapMap[r.old_status_key] = r.new_status_key; });

  return {
    versionId, entityKey: (ver as any).entity_key, versionNo: (ver as any).version_no,
    statuses: (statuses ?? []) as any,
    transitions: (transitions ?? []).map((t: any) => ({ ...t, roleGroups: rolesByT[t.id] ?? [], guards: guardsByT[t.id] ?? [] })) as any,
    remaps: remapMap,
  };
}

export function availableTransitions(version: ResolvedVersion, fromKey: string | null) {
  return version.transitions.filter((t) => t.from_status_key === fromKey || t.from_status_key === null);
}

export function statusCategory(version: ResolvedVersion, statusKey: string | null): WorkflowStatusCategory | null {
  if (!statusKey) return null;
  return version.statuses.find((s) => s.status_key === statusKey)?.category ?? null;
}

export function categoryForRawStatus(version: ResolvedVersion, rawStatus: string | null | undefined): WorkflowStatusCategory | null {
  const k = resolveKeyInVersion(version, rawStatus);
  return k ? statusCategory(version, k) : null;
}

export async function resolveCanonicalCategory(
  entityKey: EntityKey, projectKey: string | null | undefined, rawStatus: string,
): Promise<WorkflowStatusCategory | null> {
  try {
    const version = await resolveCanonicalVersion(entityKey, projectKey);
    if (!version) return null;
    return categoryForRawStatus(version, rawStatus);
  } catch { return null; }
}

export function evaluateTransition(
  version: ResolvedVersion, entityKey: EntityKey, fromKey: string | null, toKey: string,
  ctx: { currentRole: string | null },
): TransitionEvaluationResult {
  const match = availableTransitions(version, fromKey).find((t) => t.to_status_key === toKey);
  const toStatus = version.statuses.find((s) => s.status_key === toKey) ?? null;
  const allowed = !!match;
  const allowedRoles = match?.roleGroups ?? [];
  const guardResults: GuardEvaluation[] = (match?.guards ?? []).map((g) => ({
    guardType: g.guardType as GuardEvaluation['guardType'], passed: true, isBlocking: g.isBlocking, waiverAllowed: g.waiverAllowed, detail: 'advisory — not enforced',
  }));
  const roleMismatch = allowed && allowedRoles.length > 0 && !!ctx.currentRole && !allowedRoles.includes(ctx.currentRole);
  const missingGuard = !match ? 'transition_not_in_matrix' : roleMismatch ? `role:${allowedRoles.join('|')}` : null;
  return {
    allowed: allowed && !roleMismatch,
    roleDecision: !allowed ? 'deny' : roleMismatch ? 'deny' : 'allow',
    allowedRoles, guardResults, missingGuard,
    reasonRequired: !!match?.requires_reason || !!toStatus?.requires_reason,
    commentRequired: !!match?.requires_comment,
    bypassRequired: !allowed || roleMismatch,
    tooltipBasis: { currentRole: ctx.currentRole, entityType: entityKey, fromStatus: fromKey, toStatus: toKey, requiredRoles: allowedRoles, missingGuard },
  };
}

export async function writeAdvisoryAudit(input: {
  entityKey: EntityKey; entityId: string; projectId?: string | null; versionId?: string | null;
  fromKey: string | null; toKey: string; evaluation: TransitionEvaluationResult;
  sourceSurface: string; reasonCode?: string | null; reasonText?: string | null; mode?: WorkflowMode;
}): Promise<string | null> {
  const e = input.evaluation;
  const payload = {
    entity_key: input.entityKey, entity_id: input.entityId, project_id: input.projectId ?? null,
    from_status_key: input.fromKey, to_status_key: input.toKey, version_id: input.versionId ?? null,
    actor_role: e.tooltipBasis.currentRole, allowed_roles: e.allowedRoles, role_decision: e.roleDecision,
    guard_results: e.guardResults, missing_guard: e.missingGuard ?? null,
    tooltip_basis: buildUnauthorizedTooltip(e.tooltipBasis), would_block: !e.allowed,
    bypass_required: e.bypassRequired, reason_code: input.reasonCode ?? null, reason_text: input.reasonText ?? null,
    mode: input.mode ?? 'advisory', source_surface: input.sourceSurface,
  };
  try {
    const { data, error } = await supabase.rpc('ph_wf_write_audit' as any, { payload } as any);
    if (error) { console.warn('[canonical-workflow] audit failed', error.message); return null; }
    return (data as any) ?? null;
  } catch (err) { console.warn('[canonical-workflow] audit threw', err); return null; }
}

// ── Enforcement (advisory|blocking) + real role/guard evaluation ─────────────
export type EnforcementMode = WorkflowMode;

export async function getEnforcementMode(projectKey: string | null | undefined, entityKey: EntityKey): Promise<EnforcementMode> {
  if (!projectKey) return 'advisory';
  const { data: proj } = await supabase.from('ph_projects').select('id').eq('key', projectKey).maybeSingle();
  if (!(proj as any)?.id) return 'advisory';
  const { data } = await supabase.from('ph_wf_enforcement_config').select('mode')
    .eq('project_id', (proj as any).id).eq('entity_key', entityKey).maybeSingle();
  return ((data as any)?.mode as EnforcementMode) ?? 'advisory';
}

export interface ActorContext { userId: string | null; roles: string[]; isSuperAdmin: boolean; isAssignee: boolean; isReporter: boolean; }

export async function getActorContext(issueRow: any): Promise<ActorContext> {
  let userId: string | null = null;
  try { const { data } = await supabase.auth.getUser(); userId = data?.user?.id ?? null; } catch { /* unauth */ }
  let roles: string[] = [];
  if (userId) {
    const { data } = await supabase.from('user_product_roles').select('product_roles(code)').eq('user_id', userId);
    roles = (data ?? []).map((r: any) => r.product_roles?.code).filter(Boolean);
  }
  return {
    userId, roles, isSuperAdmin: roles.includes('super_admin'),
    isAssignee: !!userId && issueRow?.assignee_account_id === userId,
    isReporter: !!userId && issueRow?.reporter_account_id === userId,
  };
}

/** Real guard evaluation against live Story data. passed=null => not enforced. */
export function evaluateGuardsReal(
  transition: ResolvedVersion['transitions'][number] | undefined, issueRow: any, reason: string | null | undefined,
): GuardEvaluation[] {
  if (!transition) return [];
  return transition.guards.map((g): GuardEvaluation => {
    const base = { guardType: g.guardType as GuardEvaluation['guardType'], isBlocking: g.isBlocking, waiverAllowed: g.waiverAllowed };
    switch (g.guardType) {
      case 'assignee_required': {
        const has = !!(issueRow?.assignee_account_id || issueRow?.assignee_display_name);
        return { ...base, passed: has, detail: has ? 'assignee present' : 'no assignee set' };
      }
      case 'acceptance_criteria_present': {
        const has = !!(issueRow?.description_text && String(issueRow.description_text).trim());
        return { ...base, passed: has, detail: has ? 'description present (AC source)' : 'no acceptance criteria / description' };
      }
      case 'reason_required': {
        const has = !!(reason && reason.trim());
        return { ...base, passed: has, detail: has ? 'reason provided' : 'reason required' };
      }
      case 'qa_signoff': case 'uat_signoff': case 'test_coverage':
        return { ...base, passed: null, detail: 'no evidence source — advisory until Test Hub slice' };
      default:
        return { ...base, passed: null, detail: 'not evaluated' };
    }
  });
}

export interface GateResult { mode: EnforcementMode; blocked: boolean; message: string | null; auditId: string | null; }

export async function gateTransition(args: {
  entityKey: EntityKey; issueRow: any; toStatusRaw: string; reason?: string | null; sourceSurface: string;
}): Promise<GateResult> {
  try {
    const projectKey = args.issueRow?.project_key ?? null;
    const version = await resolveCanonicalVersion(args.entityKey, projectKey);
    if (!version) return { mode: 'advisory', blocked: false, message: null, auditId: null };

    const mode = await getEnforcementMode(projectKey, args.entityKey);
    const fromKey = resolveKeyInVersion(version, args.issueRow?.status);
    const toKey = resolveKeyInVersion(version, args.toStatusRaw);
    if (!toKey) return { mode, blocked: false, message: null, auditId: null };

    const actor = await getActorContext(args.issueRow);
    const actorRole = actor.roles[0] ?? (actor.userId ? 'authenticated' : 'guest');

    const match = availableTransitions(version, fromKey).find((t) => t.to_status_key === toKey);
    const inMatrix = !!match;
    const allowedRoles = match?.roleGroups ?? [];

    const roleOk = allowedRoles.length === 0 || actor.roles.some((r) => allowedRoles.includes(r)) || actor.isAssignee || actor.isSuperAdmin;
    const superBypass = actor.isSuperAdmin;
    const bypassReasonOk = !superBypass || !!(args.reason && args.reason.trim());

    const guardResults = evaluateGuardsReal(match, args.issueRow, args.reason);
    const failingGuards = guardResults.filter((g) => g.isBlocking && g.passed === false);

    let blocked = false;
    let missingGuard: string | null = null;
    let roleDecision: 'allow' | 'deny' | 'bypass' | 'waiver' = 'allow';

    if (!inMatrix) { blocked = true; missingGuard = 'transition_not_in_matrix'; roleDecision = 'deny'; }
    else if (!roleOk) { blocked = true; missingGuard = `role:${allowedRoles.join('|')}`; roleDecision = 'deny'; }
    else if (superBypass && failingGuards.length > 0) {
      if (bypassReasonOk) { blocked = false; roleDecision = 'bypass'; }
      else { blocked = true; missingGuard = 'bypass_requires_reason'; roleDecision = 'deny'; }
    }
    else if (failingGuards.length > 0) { blocked = true; missingGuard = failingGuards[0].guardType; roleDecision = 'deny'; }

    const wouldBlock = blocked;
    const enforce = mode === 'blocking';
    const tooltip = buildUnauthorizedTooltip({ currentRole: actorRole, entityType: args.entityKey, fromStatus: fromKey, toStatus: toKey, requiredRoles: allowedRoles, missingGuard });

    const auditId = await writeAdvisoryAudit({
      entityKey: args.entityKey, entityId: args.issueRow?.id, versionId: version.versionId,
      fromKey, toKey,
      evaluation: {
        allowed: !wouldBlock, roleDecision, allowedRoles, guardResults, missingGuard,
        reasonRequired: !!match?.requires_reason, commentRequired: !!match?.requires_comment, bypassRequired: wouldBlock,
        tooltipBasis: { currentRole: actorRole, entityType: args.entityKey, fromStatus: fromKey, toStatus: toKey, requiredRoles: allowedRoles, missingGuard },
      },
      sourceSurface: args.sourceSurface, reasonText: args.reason ?? null, mode: enforce ? 'blocking' : 'advisory',
    });

    return { mode, blocked: enforce && wouldBlock, message: enforce && wouldBlock ? tooltip : null, auditId };
  } catch (err) {
    console.warn('[canonical-workflow] gateTransition error — proceeding', err);
    return { mode: 'advisory', blocked: false, message: null, auditId: null };
  }
}

export async function recordAdvisoryStatusChange(args: {
  entityKey: EntityKey; entityId: string; projectKey?: string | null;
  fromStatusRaw: string | null; toStatusRaw: string; currentRole?: string | null; sourceSurface: string;
}): Promise<void> {
  try {
    const version = await resolveCanonicalVersion(args.entityKey, args.projectKey);
    if (!version) return;
    const fromKey = resolveKeyInVersion(version, args.fromStatusRaw);
    const toKey = resolveKeyInVersion(version, args.toStatusRaw) ?? slugStatus(args.toStatusRaw);
    if (!toKey) return;
    const evaluation = evaluateTransition(version, args.entityKey, fromKey, toKey, { currentRole: args.currentRole ?? null });
    await writeAdvisoryAudit({
      entityKey: args.entityKey, entityId: args.entityId, versionId: version.versionId,
      fromKey, toKey, evaluation, sourceSurface: args.sourceSurface,
    });
  } catch (err) { console.warn('[canonical-workflow] recordAdvisoryStatusChange skipped', err); }
}
