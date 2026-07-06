/**
 * Repository table enrichment — tm_case_table_v2 (CAT-TESTHUB-V2 slice C2).
 *
 * One query per project for the 13-column repository table: type, origin,
 * sprint/release context, designer, latest run and open-defect counts come
 * from the DB view (LATERAL joins server-side — no client N+1).
 */
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';

export interface CaseTableV2Row {
  id: string;
  project_id: string;
  case_key: string;
  title: string;
  status: string;
  origin: 'manual' | 'ai' | 'hybrid';
  is_ai_generated: boolean;
  folder_id: string | null;
  folder_name: string | null;
  folder_path: string | null;
  case_type: string | null;
  sprint_id: string | null;
  sprint_name: string | null;
  sprint_slug: string | null;
  release_id: string | null;
  release_name: string | null;
  release_slug: string | null;
  assigned_to: string | null;
  designer_name: string | null;
  designer_avatar: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  latest_run_status: string | null;
  latest_run_at: string | null;
  open_defects: number;
}

export function useCaseTableV2(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-table-v2', projectId],
    queryFn: async (): Promise<Map<string, CaseTableV2Row>> => {
      if (!projectId) return new Map();
      const { data, error } = await typedQuery('tm_case_table_v2')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      const map = new Map<string, CaseTableV2Row>();
      for (const row of (data ?? []) as CaseTableV2Row[]) {
        map.set(row.id, row);
      }
      return map;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}
