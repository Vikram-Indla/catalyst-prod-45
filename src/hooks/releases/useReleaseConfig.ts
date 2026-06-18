/**
 * useReleaseConfig — admin-editable configuration for Release Operations.
 *
 * Source of truth: public.rh_config_options (option lists, keyed by config_key)
 * + public.rh_config_settings (module-level settings, jsonb values).
 *
 * Replaces the hardcoded enum arrays that lived in ReleaseSettingsPage. Every
 * consumer (create modals, lifecycle trackers, settings page) reads from here.
 * Writes are gated server-side by rh_is_manager(auth.uid()); the UI layer also
 * checks useReleaseOpsPermissions.canManage before exposing edit controls.
 *
 * NOTE: rh_config_* are not yet in the generated Supabase types, so the client
 * is cast to `any` for these table calls (same pattern as other recently-added
 * tables in this repo). Returned rows are typed via the interfaces below.
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

const db = supabase as any;

export type ConfigColorCategory = 'todo' | 'in_progress' | 'done' | 'terminal';

export interface RhConfigOption {
  id: string;
  config_key: string;
  value: string;
  label: string;
  color_category: ConfigColorCategory | null;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type RhConfigSettings = Record<string, unknown>;

export interface ReleaseConfig {
  /** options grouped by config_key, each list sorted by sort_order */
  options: Record<string, RhConfigOption[]>;
  /** settings keyed by their `key` column, value is the parsed jsonb */
  settings: RhConfigSettings;
}

export const RELEASE_CONFIG_QK = ['release-config'] as const;

/** The canonical config_key groups, with display metadata for the admin UI. */
export interface ConfigGroupMeta {
  key: string;
  label: string;
  description?: string;
  /** status-type groups render colour-category pickers and lock system rows */
  isStatus?: boolean;
}

export const CONFIG_GROUPS: Record<string, ConfigGroupMeta[]> = {
  release: [
    { key: 'release_type', label: 'Release types' },
    { key: 'target_env', label: 'Environments', description: 'Shared by releases, changes, and SOP steps.' },
    { key: 'release_status', label: 'Release statuses', description: 'System stages enforce the lifecycle order and cannot be deleted.', isStatus: true },
  ],
  change: [
    { key: 'change_type', label: 'Change types' },
    { key: 'deployment_category', label: 'Deployment categories' },
    { key: 'risk_level', label: 'Risk levels' },
    { key: 'change_status', label: 'Change statuses', description: 'System stages enforce the lifecycle order and cannot be deleted.', isStatus: true },
  ],
  sop: [
    { key: 'sop_step_type', label: 'SOP step types' },
    { key: 'approval_role', label: 'Approval roles', description: 'Sign-off roles available when adding approvers to a change.' },
    { key: 'signoff_status', label: 'Sign-off decisions', isStatus: true },
  ],
  freeze: [
    { key: 'freeze_status', label: 'Freeze statuses', isStatus: true },
    { key: 'override_policy', label: 'Override policy' },
    { key: 'applicability', label: 'Applicability' },
    { key: 'event_type', label: 'Production event types' },
    { key: 'deployment_result', label: 'Deployment results', isStatus: true },
  ],
};

export function useReleaseConfig() {
  return useQuery({
    queryKey: RELEASE_CONFIG_QK,
    queryFn: async (): Promise<ReleaseConfig> => {
      const [optsRes, setRes] = await Promise.all([
        db.from('rh_config_options').select('*').order('config_key').order('sort_order'),
        db.from('rh_config_settings').select('key, value'),
      ]);
      if (optsRes.error) throw new Error(optsRes.error.message);
      if (setRes.error) throw new Error(setRes.error.message);

      const options: Record<string, RhConfigOption[]> = {};
      for (const row of (optsRes.data || []) as RhConfigOption[]) {
        (options[row.config_key] ||= []).push(row);
      }
      const settings: RhConfigSettings = {};
      for (const row of (setRes.data || []) as { key: string; value: unknown }[]) {
        settings[row.key] = row.value;
      }
      return { options, settings };
    },
    staleTime: 60_000,
  });
}

/**
 * Realtime: invalidate the config query whenever rh_config_options or
 * rh_config_settings changes in Postgres, so edits made by one admin propagate
 * live to every open surface (other tabs / other users). Within a single
 * client, mutation onSuccess invalidation already covers this; this closes the
 * cross-client gap. Mount once where editing happens (the admin page).
 */
export function useReleaseConfigRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: RELEASE_CONFIG_QK });
    const channel = supabase
      .channel('rh-config-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_config_options' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_config_settings' }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

/** Active options for one config_key, sorted — the read path for consumers. */
export function useConfigOptions(configKey: string): RhConfigOption[] {
  const { data } = useReleaseConfig();
  return (data?.options[configKey] || []).filter((o) => o.is_active);
}

type OptionInput = Partial<RhConfigOption> & { config_key: string; value: string; label: string };

export function useReleaseConfigMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: RELEASE_CONFIG_QK });

  const upsertOption = useMutation({
    mutationFn: async (input: OptionInput) => {
      const payload = {
        config_key: input.config_key,
        value: input.value,
        label: input.label,
        color_category: input.color_category ?? null,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
      };
      const q = input.id
        ? db.from('rh_config_options').update(payload).eq('id', input.id).select('id').single()
        : db.from('rh_config_options').insert(payload).select('id').single();
      const { error } = await q;
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { invalidate(); catalystToast.success('Saved'); },
    onError: (e: Error) => catalystToast.error('Could not save', e.message),
  });

  const setActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db.from('rh_config_options').update({ is_active }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: Error) => catalystToast.error('Could not update', e.message),
  });

  const deleteOption = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('rh_config_options').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { invalidate(); catalystToast.success('Removed'); },
    onError: (e: Error) => catalystToast.error('Could not remove', e.message),
  });

  const reorder = useMutation({
    mutationFn: async (rows: { id: string; sort_order: number }[]) => {
      for (const r of rows) {
        const { error } = await db.from('rh_config_options').update({ sort_order: r.sort_order }).eq('id', r.id);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => catalystToast.error('Could not reorder', e.message),
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await db
        .from('rh_config_settings')
        .upsert({ key, value }, { onConflict: 'key' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { invalidate(); catalystToast.success('Saved'); },
    onError: (e: Error) => catalystToast.error('Could not save', e.message),
  });

  return { upsertOption, setActive, deleteOption, reorder, updateSetting };
}
