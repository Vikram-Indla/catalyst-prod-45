/**
 * ReleaseHub V2 — Main data hook
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getHealthLevel } from '@/lib/releases/health-calculator';

export type ReleaseStatusV2 =
  | 'planned' | 'planning' | 'development' | 'staging'
  | 'testing' | 'uat' | 'released' | 'archived';

export type ReleaseHealthLevel = 'critical' | 'at_risk' | 'healthy';

export interface ReleaseV2 {
  id: string;
  name: string;
  version: string;
  status: ReleaseStatusV2;
  health_score: number;
  health_level: ReleaseHealthLevel;
  start_date: string | null;
  target_date: string | null;
  release_date: string | null;
  progress: number;
  test_cases_total: number;
  test_cases_passed: number;
  test_cases_failed: number;
  test_cases_skipped: number;
  defects_open: number;
  blocker_defects: number;
  critical_defects: number;
  major_defects: number;
  minor_defects: number;
  coverage_percent: number;
  stories_with_tests: number;
  total_stories: number;
  total_gates: number;
  passing_gates: number;
  scope_creep_percent: number;
  days_until_target: number;
  owner_name: string | null;
  owner_initials: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export type ViewMode = 'cards' | 'timeline' | 'table';

export interface ReleaseFiltersV2 {
  search: string;
  status: ReleaseStatusV2[];
  health: ReleaseHealthLevel[];
}

const COLUMNS = `
  id, name, version, status, description, start_date, target_date,
  release_date, progress, health, health_score, is_blocked,
  owner_id, project_id, test_cases_total, test_cases_passed,
  test_cases_failed, test_cases_skipped, defects_open,
  blocker_defects, critical_defects, major_defects, minor_defects,
  coverage_percent, stories_with_tests, total_stories,
  total_gates, passing_gates, scope_creep_percent,
  created_at, updated_at,
  owner:profiles!releases_owner_id_fkey(id, full_name, avatar_url)
`;

export function useReleasesV2(
  filters: ReleaseFiltersV2,
  sortField: string = 'health_score',
  sortDir: 'asc' | 'desc' = 'asc'
) {
  return useQuery({
    queryKey: ['releases-v2', filters, sortField, sortDir],
    queryFn: async (): Promise<ReleaseV2[]> => {
      let query = supabase
        .from('releases')
        .select(COLUMNS)
        .is('deleted_at', null);

      if (filters.search) {
        const s = filters.search.replace(/[%_\\(),."']/g, '');
        if (s.length > 0) {
          query = query.or(`name.ilike.%${s}%,version.ilike.%${s}%`);
        }
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status as any[]);
      }

      if (filters.health.length > 0) {
        // Map health levels to score ranges
        const conditions: string[] = [];
        for (const h of filters.health) {
          if (h === 'critical') conditions.push('and(health_score.gte.0,health_score.lt.50)');
          else if (h === 'at_risk') conditions.push('and(health_score.gte.50,health_score.lt.85)');
          else conditions.push('and(health_score.gte.85,health_score.lte.100)');
        }
        // Use health enum fallback
        query = query.in('health', filters.health);
      }

      query = query.order(sortField, { ascending: sortDir === 'asc' });

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return (data || []).map((r: any) => {
        const score = r.health_score ?? (
          r.health === 'critical' ? 25 : r.health === 'at_risk' ? 55 : 85
        );
        const daysUntilTarget = r.target_date
          ? Math.ceil((new Date(r.target_date).getTime() - Date.now()) / 86400000)
          : 999;

        return {
          id: r.id,
          name: r.name,
          version: r.version || 'v1.0',
          status: (r.status || 'planned') as ReleaseStatusV2,
          health_score: score,
          health_level: getHealthLevel(score),
          start_date: r.start_date,
          target_date: r.target_date,
          release_date: r.release_date,
          progress: r.progress ?? 0,
          test_cases_total: r.test_cases_total ?? 0,
          test_cases_passed: r.test_cases_passed ?? 0,
          test_cases_failed: r.test_cases_failed ?? 0,
          test_cases_skipped: r.test_cases_skipped ?? 0,
          defects_open: r.defects_open ?? 0,
          blocker_defects: r.blocker_defects ?? 0,
          critical_defects: r.critical_defects ?? 0,
          major_defects: r.major_defects ?? 0,
          minor_defects: r.minor_defects ?? 0,
          coverage_percent: r.coverage_percent ?? 0,
          stories_with_tests: r.stories_with_tests ?? 0,
          total_stories: r.total_stories ?? 0,
          total_gates: r.total_gates ?? 0,
          passing_gates: r.passing_gates ?? 0,
          scope_creep_percent: r.scope_creep_percent ?? 0,
          days_until_target: daysUntilTarget,
          owner_name: r.owner?.full_name || null,
          owner_initials: r.owner?.full_name
            ? r.owner.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            : null,
          owner_id: r.owner_id,
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
      });
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
