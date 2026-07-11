/**
 * Canonical Versioned Workflow — contracts (type/interface definitions).
 * Mirrors the ph_wf_* schema. No runtime logic.
 */

export type EntityKey =
  | 'business_request' | 'product_milestone' | 'epic' | 'feature' | 'story'
  | 'subtask' | 'defect' | 'incident' | 'release' | 'sprint' | 'task'
  | 'test_case' | 'test_plan' | 'test_cycle' | 'test_run' | 'ideation';

export type WorkflowMode = 'advisory' | 'blocking';
export type WorkflowStatusCategory = 'todo' | 'in_progress' | 'done';
export type WorkflowLifecycle = 'draft' | 'published' | 'superseded' | 'archived';
export type TransitionType =
  | 'forward' | 'backward' | 'exception' | 'reopen' | 'cancel' | 'reject' | 'defer' | 'rollback';
export type GuardType =
  | 'required_field' | 'approval' | 'brd_attached' | 'figma_attached'
  | 'acceptance_criteria_present' | 'assignee_required' | 'child_completion'
  | 'test_coverage' | 'qa_signoff' | 'uat_signoff' | 'no_open_blocker_critical'
  | 'release_readiness' | 'deployment_window' | 'deployment_evidence' | 'rca'
  | 'reason_required' | 'comment_required' | 'smoke_evidence'
  | 'strategy_link_present' | 'scores_complete' | 'duplicate_review_complete';
export type RoleDecision = 'allow' | 'deny' | 'bypass' | 'waiver';
export type AdapterStorageOption = 'native' | 'A' | 'A_lite' | 'A_projection';

export interface WorkflowStatusDefinition {
  statusKey: string; displayLabel: string; category: WorkflowStatusCategory;
  lifecycleGroup?: string | null; sortOrder: number; colorToken: string;
  isInitial: boolean; isTerminal: boolean; isException: boolean;
  supportsReopen: boolean; requiresReason: boolean;
}
export interface TransitionRoleRule {
  roleGroup: string; allowAssignee: boolean; allowReporter: boolean;
  allowSuperAdminBypass: boolean; bypassRequiresReason: boolean;
}
export interface TransitionGuardRule {
  guardType: GuardType; params: Record<string, unknown>; isBlocking: boolean; waiverAllowed: boolean;
}
export interface WorkflowTransitionDefinition {
  id: string; fromStatusKey: string | null; toStatusKey: string;
  transitionType: TransitionType; requiresReason: boolean; requiresComment: boolean;
  roles: TransitionRoleRule[]; guards: TransitionGuardRule[];
}
export interface ResolvedWorkflowVersion {
  versionId: string; templateId: string; entityKey: EntityKey; versionNo: number;
  lifecycle: WorkflowLifecycle; statuses: WorkflowStatusDefinition[];
  transitions: WorkflowTransitionDefinition[];
}
export interface GuardEvaluation {
  guardType: GuardType; passed: boolean | null; isBlocking: boolean;
  waiverAllowed: boolean; detail?: string;
}
export interface TransitionEvaluationResult {
  allowed: boolean; roleDecision: RoleDecision; allowedRoles: string[];
  guardResults: GuardEvaluation[]; missingGuard?: string | null;
  reasonRequired: boolean; commentRequired: boolean; bypassRequired: boolean;
  tooltipBasis: {
    currentRole: string | null; entityType: EntityKey; fromStatus: string | null;
    toStatus: string; requiredRoles: string[]; missingGuard: string | null;
  };
}
export interface WorkflowAuditPayload {
  entity_key: EntityKey; entity_id: string; project_id?: string | null;
  from_status_key?: string | null; to_status_key: string; version_id?: string | null;
  actor?: string | null; actor_role?: string | null; allowed_roles?: string[];
  role_decision: RoleDecision; guard_results: GuardEvaluation[];
  missing_guard?: string | null; tooltip_basis?: string | null; would_block?: boolean;
  bypass_required?: boolean; reason_code?: string | null; reason_text?: string | null;
  mode: WorkflowMode; source_surface?: string | null;
}
export interface TransitionReason { code?: string | null; text?: string | null; }
export interface CanonicalWorkflowAdapter {
  readonly entityKey: EntityKey; readonly storageOption: AdapterStorageOption; readonly mode: WorkflowMode;
  resolveWorkflowVersion(projectId: string, entityKey: EntityKey): Promise<ResolvedWorkflowVersion | null>;
  getCurrentStatus(entityKey: EntityKey, entityId: string): Promise<string | null>;
  getAvailableTransitions(entityKey: EntityKey, entityId: string, userId: string): Promise<WorkflowTransitionDefinition[]>;
  evaluateTransition(entityKey: EntityKey, entityId: string, toStatusKey: string, userId: string): Promise<TransitionEvaluationResult>;
  applyTransition(entityKey: EntityKey, entityId: string, toStatusKey: string, userId: string, reason?: TransitionReason): Promise<{ ok: boolean; auditId?: string; blockedReason?: string }>;
  getStatusCategory(entityKey: EntityKey, statusKey: string, workflowVersionId: string): Promise<WorkflowStatusCategory | null>;
  writeAudit(event: WorkflowAuditPayload): Promise<string | null>;
}
export interface DomainAdapterConfig {
  entityKey: EntityKey; table: string; statusColumn: string;
  workflowKeyColumn: string | null; storageOption: AdapterStorageOption;
  enumCompatMap?: Record<string, string>;
}
