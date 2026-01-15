// =====================================================
// USE ALL RELEASES HOOK
// Fetches releases with filtering, sorting, pagination
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release, ReleasesFilter, ReleasesSort, ReleaseStatus, ReleaseHealth } from '@/types/releases';

interface UseAllReleasesOptions {
  filter: ReleasesFilter;
  sort: ReleasesSort;
  page: number;
  pageSize: number;
  projectId?: string;
}

export function useAllReleases({ filter, sort, page, pageSize, projectId }: UseAllReleasesOptions) {
  return useQuery({
    queryKey: ['all-releases', filter, sort, page, projectId],
    queryFn: async () => {
      let query = supabase
        .from('releases')
        .select(`
          *,
          owner:profiles!releases_owner_id_fkey(id, full_name, avatar_url)
        `, { count: 'exact' });
      
      // Apply project filter if provided
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      // Apply status filter - cast to any to bypass strict enum typing
      if (filter.status.length > 0 && filter.status.length < 5) {
        query = query.in('status', filter.status as any);
      }
      
      // Apply health filter
      if (filter.health.length > 0) {
        query = query.in('health', filter.health);
      }
      
      // Apply search
      if (filter.search) {
        query = query.or(`name.ilike.%${filter.search}%,version.ilike.%${filter.search}%`);
      }
      
      // Apply sorting
      query = query.order(sort.column, { ascending: sort.direction === 'asc' });
      
      // Apply pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Map data to Release type with defaults
      const releases: Release[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        version: r.version || 'v1.0',
        description: r.description || r.notes,
        status: (r.status as ReleaseStatus) || 'planning',
        start_date: r.start_date,
        target_date: r.target_date,
        release_date: r.release_date,
        progress: r.progress ?? r.readiness_pct ?? 0,
        health: (r.health as ReleaseHealth) || 'none',
        is_blocked: r.is_blocked ?? false,
        blocked_reason: r.blocked_reason,
        owner_id: r.owner_id,
        owner: r.owner,
        project_id: r.project_id,
        release_vehicle_id: r.release_vehicle_id,
        test_cases_total: r.test_cases_total ?? 0,
        test_cases_passed: r.test_cases_passed ?? 0,
        defects_open: r.defects_open ?? 0,
        coverage_percent: r.coverage_percent ?? 0,
        created_at: r.created_at,
        updated_at: r.updated_at,
        created_by: r.created_by,
        readiness_pct: r.readiness_pct,
        notes: r.notes,
      }));
      
      return {
        releases,
        total: count ?? 0,
      };
    },
  });
}
