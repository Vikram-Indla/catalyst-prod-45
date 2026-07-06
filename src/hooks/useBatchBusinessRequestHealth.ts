/**
 * useBatchBusinessRequestHealth — fetches health status for multiple BRs in one query.
 * Returns a Map<brId, healthStatus> keyed by BR UUID.
 * Used in product all-work view to power the "Health" filter facet.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeDatePulseViolations } from '@/lib/date-pulse/DatePulseEngine';
import { computeHealthStatus } from '@/lib/date-pulse/HealthStatusEngine';
import { fetchLinkedWorkForBRs } from '@/lib/date-pulse/normalizeLinkedWork';
import type { BusinessRequest } from '@/types/date-pulse';

export function useBatchBusinessRequestHealth(brIds: string[]) {
  const key = brIds.slice().sort().join(',');
  return useQuery<Map<string, string>>({
    queryKey: ['batchBRHealth', key],
    enabled: brIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const result = new Map<string, string>();
      if (!brIds.length) return result;

      // Throw on error so React Query records the failure — destructuring
      // only {data} would silently degrade every BR to "no health status".
      const { data: brs, error: brsError } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, end_date, process_step, release_id, created_at, updated_at')
        .in('id', brIds);
      if (brsError) throw brsError;

      if (!brs?.length) return result;

      // Linked work via the app's real link model: business_request_links
      // (kind='implementation') → features/stories (epics excluded). Replaces
      // the prior ph_issues.business_request_id query (that column never
      // existed — the whole facet errored). Throws on query error.
      const linkedByBR = await fetchLinkedWorkForBRs(brIds);

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
