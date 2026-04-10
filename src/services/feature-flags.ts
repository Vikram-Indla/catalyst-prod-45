/**
 * featureFlagService — Data access layer for the Feature Flags admin module.
 * All queries go through Supabase. Zero mock data.
 */

import { supabase, typedQuery } from '@/integrations/supabase/client';
import type {
  FeatureFlag,
  FeatureFlagTogglePayload,
  FeatureFlagAuditEntry,
  FeatureFlagStats,
  EnvironmentScope,
  ModuleCategory,
} from '@/types/feature-flags';

/** Map a raw DB row + nested deps into the FeatureFlag interface */
function toFeatureFlag(row: Record<string, unknown>): FeatureFlag {
  const deps = Array.isArray(row.dependencies)
    ? (row.dependencies as Record<string, unknown>[]).map((d) => ({
        module_key: String(d.depends_on_key ?? ''),
        dependency_type: (d.dependency_type ?? 'requires') as 'requires' | 'recommended',
        description: String(d.description ?? ''),
      }))
    : [];

  return {
    id: String(row.id),
    module_key: String(row.module_key),
    module_name: String(row.module_name ?? row.label ?? ''),
    description: String(row.description ?? ''),
    category: (row.category ?? 'Operations') as ModuleCategory,
    status: (row.status ?? 'draft') as FeatureFlag['status'],
    enabled: Boolean(row.enabled ?? row.is_enabled),
    environment: (row.environment ?? 'production') as EnvironmentScope,
    route: String(row.route ?? ''),
    icon_name: String(row.icon_name ?? row.icon ?? 'Box'),
    icon_color: String(row.icon_color ?? 'neutral'),
    dependencies: deps,
    updated_at: String(row.updated_at ?? ''),
    updated_by: String(row.updated_by ?? ''),
    updated_by_name: String(row.updated_by_name ?? 'System'),
    created_at: String(row.created_at ?? row.updated_at ?? ''),
    sort_order: Number(row.sort_order ?? 0),
  };
}

export const featureFlagService = {
  async getAll(environment: EnvironmentScope = 'production'): Promise<FeatureFlag[]> {
    const { data, error } = await typedQuery('feature_flags')
      .select(`
        *,
        dependencies:feature_flag_dependencies(
          depends_on_key,
          dependency_type,
          description
        )
      `)
      .eq('environment', environment)
      .order('category')
      .order('sort_order');

    if (error) throw error;
    return (data ?? []).map(toFeatureFlag);
  },

  async toggle(
    payload: FeatureFlagTogglePayload,
    userName: string = 'Admin',
    userId?: string,
  ): Promise<FeatureFlag> {
    const updatePayload: Record<string, unknown> = {
      enabled: payload.enabled,
      is_enabled: payload.enabled,
      status: payload.enabled ? 'live' : 'draft',
      updated_by_name: userName,
    };
    if (userId) updatePayload.updated_by = userId;

    const { data, error } = await typedQuery('feature_flags')
      .update(updatePayload)
      .eq('id', payload.id)
      .eq('environment', payload.environment)
      .select()
      .single();

    if (error) throw error;
    return toFeatureFlag(data);
  },

  async bulkToggle(
    enabled: boolean,
    environment: EnvironmentScope = 'production',
    userName: string = 'Admin',
    userId?: string,
  ): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      enabled,
      is_enabled: enabled,
      status: enabled ? 'live' : 'draft',
      updated_by_name: userName,
    };
    if (userId) updatePayload.updated_by = userId;

    const { error } = await typedQuery('feature_flags')
      .update(updatePayload)
      .eq('environment', environment);

    if (error) throw error;

    // Manual audit entry for bulk action
    await typedQuery('feature_flag_audit').insert({
      flag_module_key: '_all_modules',
      action: enabled ? 'bulk_enabled' : 'bulk_disabled',
      environment,
      performed_by: userId ?? null,
      performed_by_name: userName,
    });
  },

  async getAuditLog(flagId?: string, limit = 50): Promise<FeatureFlagAuditEntry[]> {
    let query = typedQuery('feature_flag_audit')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (flagId) query = query.eq('flag_id', flagId);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      flag_id: String(row.flag_id ?? ''),
      action: row.action as FeatureFlagAuditEntry['action'],
      performed_by: String(row.performed_by ?? ''),
      performed_by_name: String(row.performed_by_name ?? 'System'),
      performed_at: String(row.performed_at ?? ''),
      environment: (row.environment ?? 'production') as EnvironmentScope,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
    }));
  },

  async getStats(environment: EnvironmentScope = 'production'): Promise<FeatureFlagStats> {
    const { data, error } = await typedQuery('feature_flags')
      .select('category, enabled')
      .eq('environment', environment);

    if (error) throw error;

    const flags = (data ?? []) as { category: string; enabled: boolean }[];
    const byCategory = {} as Record<ModuleCategory, { total: number; enabled: number }>;

    flags.forEach((f) => {
      const cat = f.category as ModuleCategory;
      if (!byCategory[cat]) byCategory[cat] = { total: 0, enabled: 0 };
      byCategory[cat].total++;
      if (f.enabled) byCategory[cat].enabled++;
    });

    return {
      total: flags.length,
      enabled: flags.filter((f) => f.enabled).length,
      disabled: flags.filter((f) => !f.enabled).length,
      by_category: byCategory,
    };
  },

  async getDependents(moduleKey: string): Promise<string[]> {
    const { data, error } = await typedQuery('feature_flag_dependencies')
      .select('flag_id, depends_on_key')
      .eq('depends_on_key', moduleKey)
      .eq('dependency_type', 'requires');

    if (error) throw error;
    if (!data?.length) return [];

    const flagIds = (data as { flag_id: string }[]).map((d) => d.flag_id);
    const { data: flags, error: flagsErr } = await typedQuery('feature_flags')
      .select('module_name')
      .in('id', flagIds);

    if (flagsErr) throw flagsErr;
    return (flags ?? []).map((f: { module_name: string }) => f.module_name);
  },
};
