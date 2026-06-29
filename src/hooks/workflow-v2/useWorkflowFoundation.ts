/**
 * Versioned Canonical Workflow (ph_wf_*) — admin read hooks + safe draft create.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type WfVersion = Database['public']['Tables']['ph_wf_versions']['Row'];
export type WfScheme = Database['public']['Tables']['ph_wf_schemes']['Row'];
export type WfSchemeEntry = Database['public']['Tables']['ph_wf_scheme_entries']['Row'];
export type WfSchemeAssignment = Database['public']['Tables']['ph_wf_scheme_assignments']['Row'];
export type WfVersionStatus = Database['public']['Tables']['ph_wf_version_statuses']['Row'];
export type WfVersionTransition = Database['public']['Tables']['ph_wf_version_transitions']['Row'];
export type WfAudit = Database['public']['Tables']['ph_wf_audit']['Row'];

const KEY = ['wf-v2'] as const;

export function useWfVersions() {
  return useQuery({
    queryKey: [...KEY, 'versions'],
    queryFn: async (): Promise<(WfVersion & { template_name: string | null })[]> => {
      const { data, error } = await supabase.from('ph_wf_versions')
        .select('*, ph_workflow_templates(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, template_name: r.ph_workflow_templates?.name ?? null }));
    },
  });
}
export function useWfSchemes() {
  return useQuery({ queryKey: [...KEY, 'schemes'], queryFn: async (): Promise<WfScheme[]> => {
    const { data, error } = await supabase.from('ph_wf_schemes').select('*').order('name'); if (error) throw error; return data ?? [];
  } });
}
export function useWfSchemeEntries() {
  return useQuery({ queryKey: [...KEY, 'scheme-entries'], queryFn: async (): Promise<WfSchemeEntry[]> => {
    const { data, error } = await supabase.from('ph_wf_scheme_entries').select('*').order('entity_key'); if (error) throw error; return data ?? [];
  } });
}
export function useWfSchemeAssignments() {
  return useQuery({ queryKey: [...KEY, 'assignments'], queryFn: async (): Promise<(WfSchemeAssignment & { scheme_name: string | null })[]> => {
    const { data, error } = await supabase.from('ph_wf_scheme_assignments').select('*, ph_wf_schemes(name)').order('assigned_at', { ascending: false });
    if (error) throw error; return (data ?? []).map((r: any) => ({ ...r, scheme_name: r.ph_wf_schemes?.name ?? null }));
  } });
}
export function useWfVersionStatuses(versionId: string | null) {
  return useQuery({ queryKey: [...KEY, 'statuses', versionId], enabled: !!versionId, queryFn: async (): Promise<WfVersionStatus[]> => {
    const { data, error } = await supabase.from('ph_wf_version_statuses').select('*').eq('version_id', versionId as string).order('sort_order'); if (error) throw error; return data ?? [];
  } });
}
export function useWfVersionTransitions(versionId: string | null) {
  return useQuery({ queryKey: [...KEY, 'transitions', versionId], enabled: !!versionId, queryFn: async (): Promise<WfVersionTransition[]> => {
    const { data, error } = await supabase.from('ph_wf_version_transitions').select('*').eq('version_id', versionId as string).order('sort_order'); if (error) throw error; return data ?? [];
  } });
}
export function useWfAudit(limit = 50) {
  return useQuery({ queryKey: [...KEY, 'audit', limit], queryFn: async (): Promise<WfAudit[]> => {
    const { data, error } = await supabase.from('ph_wf_audit').select('*').order('at', { ascending: false }).limit(limit); if (error) throw error; return data ?? [];
  } });
}

export type WfReasonCode = Database['public']['Tables']['ph_wf_reason_codes']['Row'];
/** Reason codes for canonical transitions (global = version_id null). */
export function useReasonCodes() {
  return useQuery({
    queryKey: [...KEY, 'reason-codes'],
    queryFn: async (): Promise<WfReasonCode[]> => {
      const { data, error } = await supabase.from('ph_wf_reason_codes')
        .select('*').order('transition_type', { ascending: true }).order('code', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface EnforcementRow { id: string; project_key: string | null; entity_key: string; mode: string; version_no: number | null; reason: string | null; enabled_at: string | null; workflow_version_id: string | null; }
export function useEnforcementConfig() {
  return useQuery({ queryKey: [...KEY, 'enforcement'], queryFn: async (): Promise<EnforcementRow[]> => {
    const { data, error } = await supabase.from('ph_wf_enforcement_config')
      .select('id, mode, reason, enabled_at, entity_key, workflow_version_id, ph_projects(key), ph_wf_versions(version_no)').order('enabled_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ id: r.id, project_key: r.ph_projects?.key ?? null, entity_key: r.entity_key, mode: r.mode, version_no: r.ph_wf_versions?.version_no ?? null, reason: r.reason, enabled_at: r.enabled_at, workflow_version_id: r.workflow_version_id ?? null }));
  } });
}

export interface MigrationPreviewRow { legacy_status: string; proposed_key: string | null; item_count: number; mapped: boolean; }
export function useMigrationPreview(entity: string) {
  return useQuery({ queryKey: [...KEY, 'migration-preview', entity], queryFn: async (): Promise<MigrationPreviewRow[]> => {
    const { data, error } = await supabase.rpc('ph_wf_migration_preview' as any, { p_entity: entity } as any); if (error) throw error; return (data ?? []) as MigrationPreviewRow[];
  } });
}

export function useWfTemplates() {
  return useQuery({ queryKey: [...KEY, 'templates'], queryFn: async () => {
    const { data, error } = await supabase.from('ph_workflow_templates').select('id, name, work_item_type').order('work_item_type'); if (error) throw error; return data ?? [];
  } });
}

export function useCreateDraftVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { templateId: string; entityKey: string }) => {
      const { data: existing, error: exErr } = await supabase.from('ph_wf_versions').select('version_no').eq('template_id', input.templateId).order('version_no', { ascending: false }).limit(1);
      if (exErr) throw exErr;
      const nextNo = (existing?.[0]?.version_no ?? 0) + 1;
      const { data, error } = await supabase.from('ph_wf_versions').insert({ template_id: input.templateId, entity_key: input.entityKey, version_no: nextNo, lifecycle: 'draft' }).select('*').single();
      if (error) throw error; return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'versions'] }),
  });
}

// ── Roles + guards per version (for Transitions admin view) ─────────────────
export interface WfTransitionRole { transition_id: string; role_group: string; }
export interface WfTransitionGuard { transition_id: string; guard_type: string; is_blocking: boolean; waiver_allowed: boolean; }

export function useWfVersionRolesAndGuards(versionId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'roles-guards', versionId],
    enabled: !!versionId,
    queryFn: async (): Promise<{ roles: WfTransitionRole[]; guards: WfTransitionGuard[] }> => {
      const { data: transitions, error: tErr } = await supabase
        .from('ph_wf_version_transitions').select('id').eq('version_id', versionId as string);
      if (tErr) throw tErr;
      const ids = (transitions ?? []).map((t: any) => t.id);
      if (ids.length === 0) return { roles: [], guards: [] };
      const [{ data: roles, error: rErr }, { data: guards, error: gErr }] = await Promise.all([
        supabase.from('ph_wf_transition_roles').select('transition_id, role_group').in('transition_id', ids),
        supabase.from('ph_wf_transition_guards').select('transition_id, guard_type, is_blocking, waiver_allowed').in('transition_id', ids),
      ]);
      if (rErr) throw rErr;
      if (gErr) throw gErr;
      return { roles: (roles ?? []) as WfTransitionRole[], guards: (guards ?? []) as WfTransitionGuard[] };
    },
  });
}

// ── Filtered audit ───────────────────────────────────────────────────────────
export interface AuditFilterParams {
  entityKey?: string;
  sourceSurface?: string;
  mode?: string;
  roleDecision?: string;
  wouldBlock?: boolean;
  limit?: number;
}
export function useWfAuditFiltered(filters: AuditFilterParams) {
  return useQuery({
    queryKey: [...KEY, 'audit-filtered', filters],
    queryFn: async (): Promise<WfAudit[]> => {
      let q = supabase.from('ph_wf_audit').select('*').order('at', { ascending: false });
      if (filters.entityKey) q = (q as any).eq('entity_key', filters.entityKey);
      if (filters.sourceSurface) q = (q as any).eq('source_surface', filters.sourceSurface);
      if (filters.mode) q = (q as any).eq('mode', filters.mode);
      if (filters.roleDecision) q = (q as any).eq('role_decision', filters.roleDecision);
      if (filters.wouldBlock != null) q = (q as any).eq('would_block', filters.wouldBlock);
      q = (q as any).limit(filters.limit ?? 100);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WfAudit[];
    },
  });
}

// ── Health / coverage summary ────────────────────────────────────────────────
export interface EntityHealthSummary {
  entityKey: string;
  versionCount: number;
  publishedVersionId: string | null;
  schemeEntryCount: number;
  projectAssignmentCount: number;
  blockingConfigCount: number;
  recentAuditCount: number;
}

export function useWfHealthSummary() {
  return useQuery({
    queryKey: [...KEY, 'health-summary'],
    queryFn: async (): Promise<EntityHealthSummary[]> => {
      const ENTITIES = ['story', 'epic', 'feature', 'subtask', 'defect', 'incident', 'release', 'business_request', 'product_milestone'];
      const [{ data: versions }, { data: entries }, { data: assignments }, { data: enforcement }, { data: auditRows }] = await Promise.all([
        supabase.from('ph_wf_versions').select('entity_key, lifecycle, id'),
        supabase.from('ph_wf_scheme_entries').select('entity_key, version_id, ph_wf_scheme_assignments(id)').limit(500),
        supabase.from('ph_wf_scheme_assignments').select('id').limit(500),
        supabase.from('ph_wf_enforcement_config').select('entity_key, mode'),
        supabase.from('ph_wf_audit').select('entity_key').order('at', { ascending: false }).limit(200),
      ]);
      return ENTITIES.map((ek): EntityHealthSummary => {
        const ev = (versions ?? []).filter((v: any) => v.entity_key === ek);
        const published = ev.find((v: any) => v.lifecycle === 'published');
        const ee = (entries ?? []).filter((e: any) => e.entity_key === ek);
        const uniqueProjects = new Set(
          (ee as any[]).flatMap((e) =>
            (e.ph_wf_scheme_assignments ?? []).map((a: any) => a.id)
          )
        );
        const enfRows = (enforcement ?? []).filter((r: any) => r.entity_key === ek && r.mode === 'blocking');
        const auditCount = (auditRows ?? []).filter((a: any) => a.entity_key === ek).length;
        return {
          entityKey: ek,
          versionCount: ev.length,
          publishedVersionId: published?.id ?? null,
          schemeEntryCount: ee.length,
          projectAssignmentCount: uniqueProjects.size,
          blockingConfigCount: enfRows.length,
          recentAuditCount: auditCount,
        };
      });
    },
  });
}

// ── Admin audit write helper ─────────────────────────────────────────────────
async function writeAdminAudit(action: string, targetKind: string, targetId: string, diff: object) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ph_wf_admin_audit' as any).insert({
      action, target_kind: targetKind, target_ids: [targetId],
      actor: user?.id ?? null, diff_json: diff,
    } as any);
  } catch { /* non-blocking — admin audit write failure never blocks the main action */ }
}

// ── Toggle reason code active/inactive ──────────────────────────────────────
export function useToggleReasonCodeActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentIsActive }: { id: string; currentIsActive: boolean }) => {
      const newActive = !currentIsActive;
      const { error } = await supabase.from('ph_wf_reason_codes').update({ is_active: newActive } as any).eq('id', id);
      if (error) throw error;
      await writeAdminAudit('reason_code_toggled', 'reason_code', id, { before: { is_active: currentIsActive }, after: { is_active: newActive } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'reason-codes'] }),
  });
}

// ── Toggle enforcement mode (advisory ↔ blocking) with safety pre-flight ────
export interface EnforcementToggleInput {
  configId: string;
  entityKey: string;
  currentMode: string;
  versionId: string | null;
}

/** Returns list of unsafe blocking guards for the given version, or [] if safe. */
export async function checkEnforcementBlockingSafe(versionId: string): Promise<string[]> {
  const { GUARD_EVIDENCE_REGISTRY } = await import('@/lib/workflow/canonical/runtime');
  const { data: transitions, error: tErr } = await supabase.from('ph_wf_version_transitions').select('id').eq('version_id', versionId);
  if (tErr || !transitions?.length) return [];
  const ids = transitions.map((t: any) => t.id);
  const { data: guards, error: gErr } = await supabase.from('ph_wf_transition_guards').select('guard_type, is_blocking').in('transition_id', ids);
  if (gErr) return [];
  const unsafe: string[] = [];
  for (const g of (guards ?? [])) {
    if ((g as any).is_blocking) {
      const reg = GUARD_EVIDENCE_REGISTRY[(g as any).guard_type];
      if (!reg || !reg.blockingSafe) unsafe.push((g as any).guard_type);
    }
  }
  return [...new Set(unsafe)];
}

export function useSetEnforcementMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EnforcementToggleInput) => {
      const newMode = input.currentMode === 'blocking' ? 'advisory' : 'blocking';
      if (newMode === 'blocking' && input.versionId) {
        const unsafe = await checkEnforcementBlockingSafe(input.versionId);
        if (unsafe.length > 0) {
          throw new Error(`Cannot enable blocking: guards without evidence source — ${unsafe.join(', ')}`);
        }
      }
      const { error } = await supabase.from('ph_wf_enforcement_config').update({ mode: newMode } as any).eq('id', input.configId);
      if (error) throw error;
      await writeAdminAudit('enforcement_mode_toggled', 'enforcement_config', input.configId, {
        before: { mode: input.currentMode }, after: { mode: newMode },
      });
      return newMode;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'enforcement'] }),
  });
}
