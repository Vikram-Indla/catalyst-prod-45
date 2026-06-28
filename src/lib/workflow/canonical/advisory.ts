/**
 * Advisory-mode helpers — pure functions (tooltip + audit payload builders).
 */
import type {
  EntityKey, TransitionEvaluationResult, WorkflowAuditPayload, WorkflowMode,
} from './contracts';

/** Locked unauthorized-tooltip wording. Do not reword. */
export function buildUnauthorizedTooltip(args: {
  currentRole: string | null; entityType: EntityKey; fromStatus: string | null;
  toStatus: string; requiredRoles: string[]; missingGuard: string | null;
}): string {
  const role = args.currentRole ?? 'guest';
  const from = args.fromStatus ?? '—';
  const required = args.requiredRoles.length ? args.requiredRoles.join(', ') : '—';
  const missing = args.missingGuard ?? 'none';
  return (
    `You are currently signed in as ${role}. ` +
    `Moving ${args.entityType} from ${from} to ${args.toStatus} ` +
    `requires ${required}. Missing requirement: ${missing}.`
  );
}

export function buildAuditPayload(input: {
  entityKey: EntityKey; entityId: string; projectId?: string | null; versionId?: string | null;
  actor?: string | null; mode: WorkflowMode; sourceSurface?: string | null;
  evaluation: TransitionEvaluationResult; reasonCode?: string | null; reasonText?: string | null;
}): WorkflowAuditPayload {
  const e = input.evaluation;
  return {
    entity_key: input.entityKey, entity_id: input.entityId, project_id: input.projectId ?? null,
    from_status_key: e.tooltipBasis.fromStatus, to_status_key: e.tooltipBasis.toStatus,
    version_id: input.versionId ?? null, actor: input.actor ?? null,
    actor_role: e.tooltipBasis.currentRole, allowed_roles: e.allowedRoles,
    role_decision: e.roleDecision, guard_results: e.guardResults, missing_guard: e.missingGuard ?? null,
    tooltip_basis: buildUnauthorizedTooltip(e.tooltipBasis), would_block: !e.allowed,
    bypass_required: e.bypassRequired, reason_code: input.reasonCode ?? null,
    reason_text: input.reasonText ?? null, mode: input.mode, source_surface: input.sourceSurface ?? null,
  };
}

export function wouldProceed(mode: WorkflowMode, ev: TransitionEvaluationResult): boolean {
  return mode === 'advisory' ? true : ev.allowed;
}
