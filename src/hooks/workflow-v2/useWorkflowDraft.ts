/**
 * Versioned Canonical Workflow (ph_wf_*) — draft editing hooks.
 *
 * Every mutation goes through the SECURITY DEFINER RPCs from
 * 20260702130000_ph_wf_draft_crud.sql / 20260702140000_ph_wf_lifecycle.sql:
 * admin-asserted, draft-only, audited to ph_wf_admin_audit. The draft row set
 * IS the save buffer — there is no client-side unsaved state, so navigation
 * away is always safe and the published version stays untouched until an
 * explicit publish.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const KEY = ['wf-v2'] as const;

export interface DraftStatusInput {
  status_key: string;
  display_label?: string;
  category?: 'todo' | 'in_progress' | 'done';
  lifecycle_group?: string | null;
  sort_order?: number;
  color_token?: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  is_exception?: boolean;
  supports_reopen?: boolean;
  requires_reason?: boolean;
}

export interface DraftTransitionInput {
  id?: string;
  from_status_key?: string | null; // null/undefined = global "any-from"
  to_status_key: string;
  transition_type?: string;
  requires_reason?: boolean;
  requires_comment?: boolean;
  sort_order?: number;
}

export interface TransitionRoleInput {
  role_group: string;
  allow_assignee?: boolean;
  allow_reporter?: boolean;
  allow_super_admin_bypass?: boolean;
  bypass_requires_reason?: boolean;
}

export interface TransitionGuardInput {
  guard_type: string;
  params?: Record<string, unknown>;
  is_blocking?: boolean;
  waiver_allowed?: boolean;
  sort_order?: number;
}

export interface ValidationResult {
  ok: boolean;
  issues: { code: string; detail: string }[];
}

export interface PublishResult {
  ok: boolean;
  published_version_id: string;
  superseded_version_id: string | null;
  statuses_removed: string[];
  scheme_entries_repointed: number;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as T;
}

function useInvalidateVersion() {
  const qc = useQueryClient();
  return (versionId?: string) => {
    qc.invalidateQueries({ queryKey: [...KEY, 'versions'] });
    if (versionId) {
      qc.invalidateQueries({ queryKey: [...KEY, 'statuses', versionId] });
      qc.invalidateQueries({ queryKey: [...KEY, 'transitions', versionId] });
      qc.invalidateQueries({ queryKey: [...KEY, 'roles-guards', versionId] });
      qc.invalidateQueries({ queryKey: [...KEY, 'field-requirements', versionId] });
      qc.invalidateQueries({ queryKey: [...KEY, 'validate', versionId] });
    }
  };
}

/** Clone the published version (or start blank) into a draft. Idempotent:
 *  an existing open draft for the entity is returned instead of forked. */
export function useCreateDraft() {
  const invalidate = useInvalidateVersion();
  return useMutation({
    mutationFn: (input: { entityKey?: string; fromVersionId?: string }) =>
      rpc<string>('ph_wf_create_draft', {
        p_entity_key: input.entityKey ?? null,
        p_from_version_id: input.fromVersionId ?? null,
      }),
    onSuccess: (draftId) => invalidate(draftId),
  });
}

export function useUpsertDraftStatus(versionId: string) {
  const invalidate = useInvalidateVersion();
  return useMutation({
    mutationFn: (status: DraftStatusInput) =>
      rpc<string>('ph_wf_upsert_draft_status', { p_version_id: versionId, p_status: status }),
    onSuccess: () => invalidate(versionId),
  });
}

export function useDeleteDraftStatus(versionId: string) {
  const invalidate = useInvalidateVersion();
  return useMutation({
    mutationFn: (input: { statusKey: string; rewireTo?: string | null }) =>
      rpc<number>('ph_wf_delete_draft_status', {
        p_version_id: versionId,
        p_status_key: input.statusKey,
        p_rewire_to: input.rewireTo ?? null,
      }),
    onSuccess: () => invalidate(versionId),
  });
}

export function useUpsertDraftTransition(versionId: string) {
  const invalidate = useInvalidateVersion();
  return useMutation({
    mutationFn: (transition: DraftTransitionInput) =>
      rpc<string>('ph_wf_upsert_draft_transition', { p_version_id: versionId, p_transition: transition }),
    onSuccess: () => invalidate(versionId),
  });
}

export function useDeleteDraftTransition(versionId: string) {
  const invalidate = useInvalidateVersion();
  return useMutation({
    mutationFn: (transitionId: string) =>
      rpc<void>('ph_wf_delete_draft_transition', { p_transition_id: transitionId }),
    onSuccess: () => invalidate(versionId),
  });
}

export function useSetTransitionRoles(versionId: string) {
  const invalidate = useInvalidateVersion();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { transitionId: string; roles: TransitionRoleInput[] }) =>
      rpc<number>('ph_wf_set_transition_roles', { p_transition_id: input.transitionId, p_roles: input.roles }),
    onSuccess: (_n, input) => {
      invalidate(versionId);
      qc.invalidateQueries({ queryKey: [...KEY, 'transition-detail', input.transitionId] });
    },
  });
}

export function useSetTransitionGuards(versionId: string) {
  const invalidate = useInvalidateVersion();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { transitionId: string; guards: TransitionGuardInput[] }) =>
      rpc<number>('ph_wf_set_transition_guards', { p_transition_id: input.transitionId, p_guards: input.guards }),
    onSuccess: (_n, input) => {
      invalidate(versionId);
      qc.invalidateQueries({ queryKey: [...KEY, 'transition-detail', input.transitionId] });
    },
  });
}

export function useSetFieldRequirements(versionId: string) {
  const invalidate = useInvalidateVersion();
  return useMutation({
    mutationFn: (reqs: { scope: string; status_key?: string | null; transition_id?: string | null; field_key: string; requirement: string }[]) =>
      rpc<number>('ph_wf_set_field_requirements', { p_version_id: versionId, p_reqs: reqs }),
    onSuccess: () => invalidate(versionId),
  });
}

export function useDiscardDraft() {
  const invalidate = useInvalidateVersion();
  return useMutation({
    mutationFn: (versionId: string) => rpc<void>('ph_wf_discard_draft', { p_version_id: versionId }),
    onSuccess: () => invalidate(),
  });
}

/** Structural validation of a draft (initial/terminal/dangling/reachability). */
export function useValidateDraft(versionId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'validate', versionId],
    enabled: !!versionId,
    queryFn: () => rpc<ValidationResult>('ph_wf_validate_draft', { p_version_id: versionId }),
  });
}

/** Publish a draft. `remaps` maps each removed status_key to its replacement;
 *  the RPC refuses to publish while any removed status lacks a remap. */
export function usePublishVersion() {
  const invalidate = useInvalidateVersion();
  return useMutation({
    mutationFn: (input: { versionId: string; remaps?: Record<string, string> }) =>
      rpc<PublishResult>('ph_wf_publish_version', {
        p_version_id: input.versionId,
        p_remaps: input.remaps ?? {},
      }),
    onSuccess: (_res, input) => invalidate(input.versionId),
  });
}

export function useApplyScheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { schemeId: string; projectId: string }) =>
      rpc<void>('ph_wf_apply_scheme', { p_scheme_id: input.schemeId, p_project_id: input.projectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'assignments'] });
      qc.invalidateQueries({ queryKey: [...KEY, 'scheme-entries'] });
    },
  });
}

/** Batched live-item status move for ph_issues-backed entities. Returns count. */
export function useReassignStatuses() {
  return useMutation({
    mutationFn: (input: { entityKey: string; fromStatus: string; toStatusKey: string; projectId?: string }) =>
      rpc<number>('ph_wf_reassign_statuses', {
        p_entity_key: input.entityKey,
        p_from_status: input.fromStatus,
        p_to_status_key: input.toStatusKey,
        p_project_id: input.projectId ?? null,
      }),
  });
}

export interface TransitionRoleRow {
  id: string;
  transition_id: string;
  role_group: string;
  allow_assignee: boolean;
  allow_reporter: boolean;
  allow_super_admin_bypass: boolean;
  bypass_requires_reason: boolean;
}
export interface TransitionGuardRow {
  id: string;
  transition_id: string;
  guard_type: string;
  params: Record<string, unknown>;
  is_blocking: boolean;
  waiver_allowed: boolean;
  sort_order: number;
}

/** Full roles + guards for one transition (property panel). */
export function useTransitionDetail(transitionId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'transition-detail', transitionId],
    enabled: !!transitionId,
    queryFn: async (): Promise<{ roles: TransitionRoleRow[]; guards: TransitionGuardRow[] }> => {
      const [rolesRes, guardsRes] = await Promise.all([
        supabase
          .from('ph_wf_transition_roles')
          .select('*')
          .eq('transition_id', transitionId as string),
        supabase
          .from('ph_wf_transition_guards')
          .select('*')
          .eq('transition_id', transitionId as string)
          .order('sort_order'),
      ]);
      if (rolesRes.error) throw rolesRes.error;
      if (guardsRes.error) throw guardsRes.error;
      return {
        roles: (rolesRes.data ?? []) as TransitionRoleRow[],
        guards: (guardsRes.data ?? []) as TransitionGuardRow[],
      };
    },
  });
}

/** Persist diagram node positions on a draft (UI metadata only). */
export function useSaveDraftLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { versionId: string; layout: Record<string, { x: number; y: number }> }) => {
      const { error } = await supabase
        .from('ph_wf_versions')
        .update({ layout: input.layout } as never)
        .eq('id', input.versionId)
        .eq('lifecycle', 'draft');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'versions'] }),
  });
}
