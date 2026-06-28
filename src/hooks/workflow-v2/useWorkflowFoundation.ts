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

export interface EnforcementRow { project_key: string | null; entity_key: string; mode: string; version_no: number | null; reason: string | null; enabled_at: string | null; }
export function useEnforcementConfig() {
  return useQuery({ queryKey: [...KEY, 'enforcement'], queryFn: async (): Promise<EnforcementRow[]> => {
    const { data, error } = await supabase.from('ph_wf_enforcement_config')
      .select('mode, reason, enabled_at, entity_key, ph_projects(key), ph_wf_versions(version_no)').order('enabled_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ project_key: r.ph_projects?.key ?? null, entity_key: r.entity_key, mode: r.mode, version_no: r.ph_wf_versions?.version_no ?? null, reason: r.reason, enabled_at: r.enabled_at }));
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
