/**
 * useBatchBusinessRequestHealth — fetches health status for multiple BRs in one query.
 * Returns a Map<brId, healthStatus> keyed by BR UUID.
 * Used in product all-work view to power the "Health" filter facet.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeDatePulseViolations } from '@/lib/date-pulse/DatePulseEngine';
import { computeHealthStatus } from '@/lib/date-pulse/HealthStatusEngine';
import type { BusinessRequest, WorkItem } from '@/types/date-pulse';

export function useBatchBusinessRequestHealth(brIds: string[]) {
  const key = brIds.slice().sort().join(',');
  return useQuery<Map<string, string>>({
    queryKey: ['batchBRHealth', key],
    enabled: brIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const result = new Map<string, string>();
      if (!brIds.length) return result;

      const { data: brs } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, end_date, process_step, release_id, created_at, updated_at')
        .in('id', brIds);

      if (!brs?.length) return result;

      const { data: linkedRows } = await (supabase as any)
        .from('ph_issues')
        .select('id, issue_key, issue_type, project_key, status, due_date, created_at, updated_at, parent_key, severity, business_request_id')
        .in('business_request_id', brIds)
        .limit(2000);

      const linkedByBR = new Map<string, WorkItem[]>();
      for (const r of (linkedRows ?? [])) {
        if (!r.business_request_id) continue;
        const arr = linkedByBR.get(r.business_request_id) ?? [];
        arr.push({
          id: r.id,
          issue_key: r.issue_key,
          issue_type: r.issue_type ?? 'Story',
          project_key: r.project_key ?? '',
          status: r.status ?? 'todo',
          due_date: r.due_date ?? null,
          severity: r.severity ?? null,
          parent_key: r.parent_key ?? null,
          sprint_id: null,
          business_request_id: r.business_request_id,
          created_at: r.created_at,
          updated_at: r.updated_at,
        });
        linkedByBR.set(r.business_request_id, arr);
      }

      for (const br of brs) {
        const brModel: BusinessRequest = {
          id: br.id,
          request_key: br.request_key ?? br.id,
          status: br.process_step ?? 'active',
          end_date: br.end_date ?? null,
          release_id: br.release_id ?? null,
          created_at: br.created_at,
          updated_at: br.updated_at,
        };
        const linked = linkedByBR.get(br.id) ?? [];
        const violations = computeDatePulseViolations(brModel, linked, null);
        const healthStatus = computeHealthStatus(brModel, linked, violations);
        result.set(br.id, healthStatus);
      }

      return result;
    },
  });
}
