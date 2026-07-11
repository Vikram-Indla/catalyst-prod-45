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

/**
 * Guard evidence registry — single source of truth for which guards have
 * real evaluators vs. advisory-only (no evidence source).
 *
 * blockingSafe: false means enabling is_blocking=true on this guard will
 * never produce a real pass — it would freeze transitions indefinitely.
 * The runtime never hard-blocks when passed=null (only passed=false blocks).
 * This registry lets the admin UI warn before enabling blocking enforcement.
 */
export const GUARD_EVIDENCE_REGISTRY: Record<string, { evidence: 'real' | 'missing'; blockingSafe: boolean; note: string }> = {
  assignee_required:           { evidence: 'real',    blockingSafe: true,  note: 'checked against issueRow.assignee_account_id' },
  acceptance_criteria_present: { evidence: 'real',    blockingSafe: true,  note: 'checked against issueRow.description_text' },
  reason_required:             { evidence: 'real',    blockingSafe: true,  note: 'reason text collected in reason modal / audit' },
  test_coverage:               { evidence: 'real',    blockingSafe: true,  note: 'real count from tm_test_case_links (gateTransition)' },
  child_completion:            { evidence: 'real',    blockingSafe: true,  note: 'child issue completion % from ph_issues' },
  no_open_blocker_critical:    { evidence: 'real',    blockingSafe: true,  note: 'open flagged blocker count from ph_issues' },
  qa_signoff:                  { evidence: 'missing', blockingSafe: false, note: 'no qa sign-off table exists (tm_plan_approvals/tm_release_signoffs are scoped to test plans/TestHub releases, not generic work items — reusing them would check the wrong entity) — advisory only (passed: null)' },
  uat_signoff:                 { evidence: 'missing', blockingSafe: false, note: 'no UAT sign-off table exists — advisory only (passed: null)' },
  approval:                    { evidence: 'missing', blockingSafe: false, note: 'transition_approval_configs exists but is config-only (no decision/instance rows, no consuming code, status vocabulary from an unrelated prototype) — advisory only (passed: null)' },
  brd_attached:                { evidence: 'real',    blockingSafe: true,  note: 'ph_issue_attachments (issue_key-scoped) filename/mime heuristic — pdf/doc/docx or filename containing "brd" (gateTransition)' },
  release_readiness:           { evidence: 'missing', blockingSafe: false, note: 'no release readiness source — advisory only (passed: null)' },
  deployment_window:           { evidence: 'missing', blockingSafe: false, note: 'deploy_gate/deploy_summaries are CI-pipeline-scoped (global switch / per-CI-run), not per-work-item — advisory only (passed: null)' },
  deployment_evidence:         { evidence: 'missing', blockingSafe: false, note: 'no per-item deployment evidence source — advisory only (passed: null)' },
  smoke_evidence:              { evidence: 'missing', blockingSafe: false, note: 'no smoke test source — advisory only (passed: null)' },
  rca:                         { evidence: 'missing', blockingSafe: false, note: 'no RCA source — advisory only (passed: null)' },
  figma_attached:              { evidence: 'real',    blockingSafe: true,  note: 'ph_issue_attachments (issue_key-scoped) filename/content_url match on figma (gateTransition)' },
  required_field:              { evidence: 'missing', blockingSafe: false, note: 'field requirements table not yet evaluated in gate — advisory' },
  comment_required:            { evidence: 'real',    blockingSafe: true,  note: 'real count from ph_comments (FK to ph_issues.id, gateTransition)' },
  strategy_link_present:       { evidence: 'real',    blockingSafe: true,  note: 'idn_ideas.strategy_element_id IS NOT NULL — gate prevents Approve without strategy link (D7)' },
  scores_complete:             { evidence: 'real',    blockingSafe: true,  note: 'all active scoring model drivers have at least one score for the idea — checked against idn_idea_scores' },
  duplicate_review_complete:   { evidence: 'real',    blockingSafe: true,  note: 'duplicate suggestion (if present) has been reviewed — idn_ai_suggestions status <> proposed for duplicates' },
};

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

/**
 * Bridged entities (Defect/Incident): resolve the canonical status key for a
 * raw status (enum value / label / legacy) via the published version + remaps.
 */
export async function resolveBridgedKey(
  entityKey: EntityKey, projectKey: string | null | undefined, rawStatus: string | null | undefined,
): Promise<string | null> {
  try {
    const version = await resolveCanonicalVersion(entityKey, projectKey);
    if (!version) return null;
    return resolveKeyInVersion(version, rawStatus);
  } catch { return null; }
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
      case 'test_coverage': {
        // Real coverage from tm_test_case_links (count injected into issueRow).
        const cov = (issueRow as any)?._coverageCount;
        if (cov == null) return { ...base, passed: null, detail: 'no coverage data available' };
        const has = Number(cov) >= 1;
        return { ...base, passed: has, detail: has ? `${cov} linked test case(s)` : 'no linked test cases — coverage required' };
      }
      case 'qa_signoff':
        return { ...base, passed: null, detail: 'no qa sign-off evidence source (no qa_signoff table) — advisory' };
      case 'uat_signoff':
        return { ...base, passed: null, detail: 'no uat sign-off evidence source — advisory' };
      case 'child_completion': {
        // Injected by gateTransition after querying child rows.
        const pct = (issueRow as any)?._childCompletionPct;
        if (pct == null) return { ...base, passed: null, detail: 'child completion data not available — advisory' };
        const done = Number(pct) >= 100;
        return { ...base, passed: done, detail: done ? 'all children done' : `children not complete (${Math.round(pct)}%)` };
      }
      case 'no_open_blocker_critical': {
        // Injected by gateTransition after querying linked blocker issues.
        const blockers = (issueRow as any)?._openBlockerCount;
        if (blockers == null) return { ...base, passed: null, detail: 'no open-blocker evidence source — advisory' };
        const ok = Number(blockers) === 0;
        return { ...base, passed: ok, detail: ok ? 'no open critical blockers' : `${blockers} open critical blocker(s)` };
      }
      case 'approval':
        return { ...base, passed: null, detail: 'no approval workflow evidence source — advisory' };
      case 'brd_attached': {
        // Real evidence from ph_issue_attachments (2284 live rows on cyij),
        // injected by gateTransition. Heuristic: a document-type attachment
        // (pdf/doc/docx or filename containing "brd") is present.
        const count = (issueRow as any)?._brdAttachmentCount;
        if (count == null) return { ...base, passed: null, detail: 'no BRD attachment evidence available' };
        const has = Number(count) >= 1;
        return { ...base, passed: has, detail: has ? `${count} BRD-like attachment(s)` : 'no BRD document attached' };
      }
      case 'release_readiness':
        return { ...base, passed: null, detail: 'no release readiness evidence source — advisory' };
      case 'deployment_window':
        return { ...base, passed: null, detail: 'no deployment window evidence source — advisory' };
      case 'deployment_evidence':
        return { ...base, passed: null, detail: 'no deployment evidence source — advisory' };
      case 'smoke_evidence':
        return { ...base, passed: null, detail: 'no smoke test evidence source — advisory' };
      case 'rca':
        return { ...base, passed: null, detail: 'no RCA evidence source — advisory' };
      case 'figma_attached': {
        // Real evidence from ph_issue_attachments — matches a Figma URL or
        // filename, injected by gateTransition.
        const count = (issueRow as any)?._figmaAttachmentCount;
        if (count == null) return { ...base, passed: null, detail: 'no Figma attachment evidence available' };
        const has = Number(count) >= 1;
        return { ...base, passed: has, detail: has ? `${count} Figma attachment(s)` : 'no Figma link/file attached' };
      }
      case 'required_field':
        return { ...base, passed: null, detail: 'required field check not configured — advisory' };
      case 'strategy_link_present': {
        // Real evidence from idn_ideas.strategy_element_id, injected by
        // gateTransition (no extra query needed — it's a column on issueRow).
        const linked = (issueRow as any)?._strategyLinked;
        if (linked == null) return { ...base, passed: null, detail: 'no strategy-link evidence available' };
        return { ...base, passed: linked, detail: linked ? 'linked to a strategy element' : 'no strategy element linked' };
      }
      case 'scores_complete': {
        // Real evidence from idn_idea_scores vs the approved model's driver
        // count, injected by gateTransition.
        const complete = (issueRow as any)?._scoresComplete;
        const detail = (issueRow as any)?._scoresCompleteDetail;
        if (complete == null) return { ...base, passed: null, detail: 'no scoring evidence available' };
        return { ...base, passed: complete, detail: detail ?? (complete ? 'all drivers scored' : 'not all drivers scored') };
      }
      case 'duplicate_review_complete': {
        // Real evidence from idn_ai_suggestions (kind='duplicate', status='proposed'),
        // injected by gateTransition. Zero outstanding suggestions = nothing to
        // review = passes (Phase 4 AI copilot generates these; none yet is honest,
        // not a false failure).
        const outstanding = (issueRow as any)?._duplicateSuggestionsOutstanding;
        if (outstanding == null) return { ...base, passed: null, detail: 'no duplicate-review evidence available' };
        const ok = Number(outstanding) === 0;
        return { ...base, passed: ok, detail: ok ? 'no outstanding duplicate suggestions' : `${outstanding} duplicate suggestion(s) awaiting review` };
      }
      case 'comment_required': {
        // Real evidence from ph_comments (FK'd to ph_issues.id), injected by
        // gateTransition.
        const count = (issueRow as any)?._commentCount;
        if (count == null) return { ...base, passed: null, detail: 'no comment evidence available' };
        const has = Number(count) >= 1;
        return { ...base, passed: has, detail: has ? `${count} comment(s)` : 'no comments on this item' };
      }
      default:
        return { ...base, passed: null, detail: `guard type '${g.guardType}' has no evidence source — advisory` };
    }
  });
}

export interface GateResult {
  mode: EnforcementMode; blocked: boolean; message: string | null; auditId: string | null; reasonRequired: boolean;
  /** Per-guard pass/fail/advisory detail for the matched transition — additive,
   *  undefined on the two early-return paths (no version / no target status)
   *  where no transition was ever matched. Lets callers render an inline
   *  explain without a second round trip. */
  guardResults?: GuardEvaluation[];
}

export async function gateTransition(args: {
  entityKey: EntityKey; issueRow: any; toStatusRaw: string;
  reason?: string | null; reasonCode?: string | null; reasonText?: string | null;
  sourceSurface: string;
}): Promise<GateResult> {
  try {
    const projectKey = args.issueRow?.project_key ?? null;
    // effective reason: explicit code/text from the reason modal, or legacy string.
    const effReason = args.reasonText ?? args.reason ?? args.reasonCode ?? null;
    const version = await resolveCanonicalVersion(args.entityKey, projectKey);
    if (!version) return { mode: 'advisory', blocked: false, message: null, auditId: null, reasonRequired: false };

    const mode = await getEnforcementMode(projectKey, args.entityKey);
    const fromKey = resolveKeyInVersion(version, args.issueRow?.status);
    const toKey = resolveKeyInVersion(version, args.toStatusRaw);
    if (!toKey) return { mode, blocked: false, message: null, auditId: null, reasonRequired: false };

    const actor = await getActorContext(args.issueRow);
    const actorRole = actor.roles[0] ?? (actor.userId ? 'authenticated' : 'guest');

    const match = availableTransitions(version, fromKey).find((t) => t.to_status_key === toKey);
    const inMatrix = !!match;
    const allowedRoles = match?.roleGroups ?? [];

    const roleOk = allowedRoles.length === 0 || actor.roles.some((r) => allowedRoles.includes(r)) || actor.isAssignee || actor.isSuperAdmin;
    const superBypass = actor.isSuperAdmin;
    const bypassReasonOk = !superBypass || !!(effReason && effReason.trim());

    // Real test coverage: count linked test cases for entities with a
    // test_coverage guard on this transition (tm_test_case_links is polymorphic).
    if (match?.guards.some((g) => g.guardType === 'test_coverage') && args.issueRow?.id) {
      try {
        const { count } = await supabase
          .from('tm_test_case_links')
          .select('id', { count: 'exact', head: true })
          .eq('linked_item_type', args.entityKey)
          .eq('linked_item_id', args.issueRow.id);
        (args.issueRow as any)._coverageCount = count ?? 0;
      } catch { /* leave undefined → advisory */ }
    }
    // Real child completion: count incomplete children for child_completion guard.
    if (match?.guards.some((g) => g.guardType === 'child_completion') && args.issueRow?.id) {
      try {
        const issueKey: string | null = args.issueRow.issue_key ?? null;
        let totalQ: any, doneQ: any;
        if (args.entityKey === 'epic' && issueKey) {
          totalQ = await supabase.from('ph_issues').select('id', { count: 'exact', head: true }).eq('epic_key', issueKey).is('deleted_at', null);
          doneQ = await supabase.from('ph_issues').select('id', { count: 'exact', head: true }).eq('epic_key', issueKey).eq('status_category', 'done').is('deleted_at', null);
        } else {
          totalQ = await supabase.from('ph_issues').select('id', { count: 'exact', head: true }).eq('parent_id', args.issueRow.id).is('deleted_at', null);
          doneQ = await supabase.from('ph_issues').select('id', { count: 'exact', head: true }).eq('parent_id', args.issueRow.id).eq('status_category', 'done').is('deleted_at', null);
        }
        const total = totalQ.count ?? 0;
        const done = doneQ.count ?? 0;
        (args.issueRow as any)._childCompletionPct = total === 0 ? 100 : Math.round((done / total) * 100);
      } catch { /* leave undefined → advisory */ }
    }
    // Real open-blocker count: flag-linked or flagged critical items.
    if (match?.guards.some((g) => g.guardType === 'no_open_blocker_critical') && args.issueRow?.id) {
      try {
        const { count } = await supabase
          .from('ph_issues')
          .select('id', { count: 'exact', head: true })
          .eq('is_flagged', true)
          .eq('parent_id', args.issueRow.id)
          .is('deleted_at', null);
        (args.issueRow as any)._openBlockerCount = count ?? 0;
      } catch { /* leave undefined → advisory */ }
    }
    // Real BRD/Figma attachment evidence from ph_issue_attachments
    // (issue_key-scoped — 2284 live rows on cyij, Jira-synced).
    if (match?.guards.some((g) => g.guardType === 'brd_attached') && args.issueRow?.issue_key) {
      try {
        const { count } = await supabase
          .from('ph_issue_attachments')
          .select('id', { count: 'exact', head: true })
          .eq('issue_key', args.issueRow.issue_key)
          .or('filename.ilike.%brd%,mime_type.eq.application/pdf,mime_type.ilike.%wordprocessingml%,mime_type.eq.application/msword');
        (args.issueRow as any)._brdAttachmentCount = count ?? 0;
      } catch { /* leave undefined → advisory */ }
    }
    if (match?.guards.some((g) => g.guardType === 'figma_attached') && args.issueRow?.issue_key) {
      try {
        const { count } = await supabase
          .from('ph_issue_attachments')
          .select('id', { count: 'exact', head: true })
          .eq('issue_key', args.issueRow.issue_key)
          .or('filename.ilike.%figma%,content_url.ilike.%figma.com%');
        (args.issueRow as any)._figmaAttachmentCount = count ?? 0;
      } catch { /* leave undefined → advisory */ }
    }
    // Real comment evidence from ph_comments (FK'd to ph_issues.id).
    if (match?.guards.some((g) => g.guardType === 'comment_required') && args.issueRow?.id) {
      try {
        const { count } = await supabase
          .from('ph_comments')
          .select('id', { count: 'exact', head: true })
          .eq('work_item_id', args.issueRow.id);
        (args.issueRow as any)._commentCount = count ?? 0;
      } catch { /* leave undefined → advisory */ }
    }
    // Real strategy-link + scoring evidence for ideation's guards.
    if (args.entityKey === 'ideation' && args.issueRow) {
      if (match?.guards.some((g) => g.guardType === 'strategy_link_present')) {
        (args.issueRow as any)._strategyLinked = !!args.issueRow.strategy_element_id;
      }
      if (match?.guards.some((g) => g.guardType === 'scores_complete') && args.issueRow.id) {
        try {
          const { data: model } = await supabase
            .from('idn_scoring_models' as any)
            .select('id, version')
            .eq('status', 'approved')
            .maybeSingle();
          if (model) {
            const { count: driverCount } = await supabase
              .from('idn_scoring_drivers' as any)
              .select('id', { count: 'exact', head: true })
              .eq('model_id', (model as any).id);
            const { data: scoredDrivers } = await supabase
              .from('idn_idea_scores' as any)
              .select('driver_id')
              .eq('idea_id', args.issueRow.id)
              .eq('model_version', (model as any).version);
            const distinctScored = new Set((scoredDrivers ?? []).map((r: any) => r.driver_id)).size;
            const total = driverCount ?? 0;
            (args.issueRow as any)._scoresComplete = total > 0 && distinctScored >= total;
            (args.issueRow as any)._scoresCompleteDetail = `${distinctScored}/${total} drivers scored`;
          }
        } catch { /* leave undefined → advisory */ }
      }
      if (match?.guards.some((g) => g.guardType === 'duplicate_review_complete') && args.issueRow.id) {
        try {
          const { count } = await supabase
            .from('idn_ai_suggestions' as any)
            .select('id', { count: 'exact', head: true })
            .eq('idea_id', args.issueRow.id)
            .eq('kind', 'duplicate')
            .eq('status', 'proposed');
          (args.issueRow as any)._duplicateSuggestionsOutstanding = count ?? 0;
        } catch { /* leave undefined → advisory */ }
      }
    }
    const guardResults = evaluateGuardsReal(match, args.issueRow, effReason);
    const failingGuards = guardResults.filter((g) => g.isBlocking && g.passed === false);

    // Field requirements: evaluate on_transition requirements.
    const fieldReqs = await evaluateFieldRequirements({
      versionId: version.versionId, transitionId: match?.id ?? null, issueRow: args.issueRow,
    });

    let blocked = false;
    let missingGuard: string | null = null;
    let roleDecision: 'allow' | 'deny' | 'bypass' | 'waiver' | 'not_configured' = 'allow';

    if (!inMatrix) { blocked = true; missingGuard = 'transition_not_in_matrix'; roleDecision = 'deny'; }
    else if (!roleOk) { blocked = true; missingGuard = `role:${allowedRoles.join('|')}`; roleDecision = 'deny'; }
    else if (superBypass && failingGuards.length > 0) {
      if (bypassReasonOk) { blocked = false; roleDecision = 'bypass'; }
      else { blocked = true; missingGuard = 'bypass_requires_reason'; roleDecision = 'deny'; }
    }
    else if (failingGuards.length > 0) { blocked = true; missingGuard = failingGuards[0].guardType; roleDecision = 'deny'; }
    else if (!fieldReqs.passed) { blocked = true; missingGuard = `field_required:${fieldReqs.missingFields[0]}`; roleDecision = 'deny'; }
    // Transition exists in matrix but no roles configured — allow, but mark for audit clarity.
    if (!blocked && inMatrix && allowedRoles.length === 0) { roleDecision = 'not_configured'; }

    const wouldBlock = blocked;
    const enforce = mode === 'blocking';
    const tooltip = buildUnauthorizedTooltip({ currentRole: actorRole, entityType: args.entityKey, fromStatus: fromKey, toStatus: toKey, requiredRoles: allowedRoles, missingGuard });

    const auditId = await writeAdvisoryAudit({
      entityKey: args.entityKey, entityId: args.issueRow?.id, versionId: version.versionId,
      fromKey, toKey,
      evaluation: {
        allowed: !wouldBlock, roleDecision, allowedRoles, guardResults, missingGuard,
        fieldRequirements: fieldReqs,
        reasonRequired: !!match?.requires_reason, commentRequired: !!match?.requires_comment, bypassRequired: wouldBlock,
        tooltipBasis: {
          currentRole: actorRole, entityType: args.entityKey, fromStatus: fromKey, toStatus: toKey,
          requiredRoles: allowedRoles, missingGuard,
          resolvedRoles: actor.roles,
        },
      },
      sourceSurface: args.sourceSurface, reasonCode: args.reasonCode ?? null, reasonText: effReason, mode: enforce ? 'blocking' : 'advisory',
    });

    const reasonRequired = !!match?.requires_reason;
    return { mode, blocked: enforce && wouldBlock, message: enforce && wouldBlock ? tooltip : null, auditId, reasonRequired, guardResults };
  } catch (err) {
    console.warn('[canonical-workflow] gateTransition error — proceeding', err);
    return { mode: 'advisory', blocked: false, message: null, auditId: null, reasonRequired: false };
  }
}

/**
 * Evaluate ph_wf_field_requirements for a given transition.
 * Returns missingFields (fields marked 'required' but absent in issueRow).
 * Non-blocking on DB error — advisory.
 */
export async function evaluateFieldRequirements(args: {
  versionId: string;
  transitionId: string | null;
  issueRow: any;
}): Promise<{ passed: boolean; missingFields: string[] }> {
  if (!args.transitionId) return { passed: true, missingFields: [] };
  try {
    const { data, error } = await supabase
      .from('ph_wf_field_requirements')
      .select('field_key, requirement')
      .eq('version_id', args.versionId)
      .eq('transition_id', args.transitionId)
      .eq('scope', 'on_transition')
      .eq('requirement', 'required');
    if (error) return { passed: true, missingFields: [] };
    const missing = (data ?? [])
      .filter((r: any) => {
        const val = args.issueRow?.[r.field_key];
        return val === null || val === undefined || val === '';
      })
      .map((r: any) => r.field_key);
    return { passed: missing.length === 0, missingFields: missing };
  } catch {
    return { passed: true, missingFields: [] };
  }
}

/**
 * Pre-flight check: does this transition require a reason code / text?
 * Does NOT write an audit row. Use before list-surface status writes to
 * deny early with a clear message rather than silently passing.
 */
export async function checkReasonRequired(
  entityKey: EntityKey,
  projectKey: string | null | undefined,
  fromStatusRaw: string | null | undefined,
  toStatusRaw: string,
): Promise<{ reasonRequired: boolean }> {
  try {
    const version = await resolveCanonicalVersion(entityKey, projectKey);
    if (!version) return { reasonRequired: false };
    const fromKey = resolveKeyInVersion(version, fromStatusRaw ?? null);
    const toKey = resolveKeyInVersion(version, toStatusRaw) ?? slugStatus(toStatusRaw);
    if (!toKey) return { reasonRequired: false };
    const ev = evaluateTransition(version, entityKey, fromKey, toKey, { currentRole: null });
    return { reasonRequired: ev.reasonRequired };
  } catch { return { reasonRequired: false }; }
}

export async function recordAdvisoryStatusChange(args: {
  entityKey: EntityKey; entityId: string; projectKey?: string | null;
  fromStatusRaw: string | null; toStatusRaw: string; currentRole?: string | null; sourceSurface: string;
  reasonCode?: string | null; reasonText?: string | null;
}): Promise<{ reasonRequired: boolean } | null> {
  try {
    const version = await resolveCanonicalVersion(args.entityKey, args.projectKey);
    if (!version) return null;
    const fromKey = resolveKeyInVersion(version, args.fromStatusRaw);
    const toKey = resolveKeyInVersion(version, args.toStatusRaw) ?? slugStatus(args.toStatusRaw);
    if (!toKey) return null;
    const evaluation = evaluateTransition(version, args.entityKey, fromKey, toKey, { currentRole: args.currentRole ?? null });
    await writeAdvisoryAudit({
      entityKey: args.entityKey, entityId: args.entityId, versionId: version.versionId,
      fromKey, toKey, evaluation, sourceSurface: args.sourceSurface,
      reasonCode: args.reasonCode ?? null, reasonText: args.reasonText ?? null,
    });
    return { reasonRequired: evaluation.reasonRequired };
  } catch (err) { console.warn('[canonical-workflow] recordAdvisoryStatusChange skipped', err); return null; }
}
