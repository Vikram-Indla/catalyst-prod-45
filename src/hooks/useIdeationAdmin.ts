/**
 * Ideation · Admin reads — CAT-IDEATION-REBUILD-20260709-001 Phase 3 S3.
 *
 * Read-only this slice: active scoring model + drivers, and the ideation
 * role-permission matrix. No write paths — see Plan Lock non-scope.
 */
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';

export interface ScoringDriverRow {
  id: string;
  key: string;
  label_en: string;
  label_ar: string | null;
  weight: number;
  scale_min: number;
  scale_max: number;
  direction: 'higher_better' | 'lower_better';
  order_index: number;
}

export interface ScoringModelSummary {
  id: string;
  name: string;
  slug: string;
  version: number;
  status: string;
  drivers: ScoringDriverRow[];
}

export function useIdeationActiveScoringModel() {
  return useQuery({
    queryKey: ['ideation', 'admin', 'active-scoring-model'],
    queryFn: async (): Promise<ScoringModelSummary | null> => {
      const { data: model, error } = await typedQuery('idn_scoring_models')
        .select('id, name, slug, version, status')
        .eq('status', 'approved')
        .maybeSingle();
      if (error) throw error;
      if (!model) return null;

      const { data: drivers, error: driverErr } = await typedQuery('idn_scoring_drivers')
        .select('id, key, label_en, label_ar, weight, scale_min, scale_max, direction, order_index')
        .eq('model_id', model.id)
        .order('order_index');
      if (driverErr) throw driverErr;

      return { ...model, drivers: (drivers ?? []) as ScoringDriverRow[] } as ScoringModelSummary;
    },
    staleTime: 60_000,
  });
}

export interface RolePermissionRow {
  role_code: string;
  access_level: 'full' | 'view' | 'hidden';
}

export function useIdeationRoleMatrix() {
  return useQuery({
    queryKey: ['ideation', 'admin', 'role-matrix'],
    queryFn: async (): Promise<RolePermissionRow[]> => {
      const { data, error } = await typedQuery('admin_role_module_permissions')
        .select('role_code, access_level')
        .eq('module_key', 'ideation')
        .order('role_code');
      if (error) throw error;
      return (data ?? []) as RolePermissionRow[];
    },
    staleTime: 60_000,
  });
}
