/**
 * useReportInsights — invokes the report-insights edge function (Caty narrative).
 * Feature: CAT-REPORTS-HUB-20260703-001 Phase 3 (Task A).
 *
 * Payload carries AGGREGATE metrics only (counts/rates + names already
 * shown in-app). Response: { narrative } or { narrative: null, reason:
 * 'ai-unavailable' } when the environment has no AI key.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReportInsightsRequest {
  report_id: string;
  report_label: string;
  project_name?: string | null;
  computed: Record<string, unknown>;
  date_range?: string | null;
}

export interface ReportInsightsResponse {
  narrative: string | null;
  reason?: string;
}

export function useReportInsights() {
  const mutation = useMutation({
    mutationFn: async (payload: ReportInsightsRequest): Promise<ReportInsightsResponse> => {
      const { data, error } = await supabase.functions.invoke('report-insights', {
        body: payload,
      });
      if (error) throw error;
      return data as ReportInsightsResponse;
    },
  });

  return {
    generate: mutation.mutate,
    narrative: mutation.data?.narrative ?? null,
    /** 'ai-unavailable' when AI is not configured in this environment. */
    reason: mutation.data?.reason,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
