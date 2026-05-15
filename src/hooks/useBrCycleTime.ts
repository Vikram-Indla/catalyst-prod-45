import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CycleTimeArgs {
  startStep: string;
  endStep: string;
}

export interface CycleTimeStats {
  median: number | null;
  avg: number | null;
  p90: number | null;
  sample_size: number;
}

interface StageHistoryRow {
  business_request_id: string;
  stage_code: string;
  entered_at: string;
}

const NULL_STATS: CycleTimeStats = { median: null, avg: null, p90: null, sample_size: 0 };

function computeStats(cycleDays: number[]): CycleTimeStats {
  const n = cycleDays.length;
  if (n === 0) return NULL_STATS;

  const sorted = [...cycleDays].sort((a, b) => a - b);

  const median =
    n % 2 === 1
      ? sorted[Math.floor(n / 2)]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  const avg = Math.round((sorted.reduce((s, v) => s + v, 0) / n) * 10) / 10;

  const p90 = sorted[Math.ceil(0.9 * n) - 1];

  return { median, avg, p90, sample_size: n };
}

export function useBrCycleTime({ startStep, endStep }: CycleTimeArgs) {
  const { user, loading } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['br-cycle-time', startStep, endStep],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_request_stage_history')
        .select('business_request_id, stage_code, entered_at')
        .in('stage_code', [startStep, endStep]);

      if (error) throw error;

      // Group rows by BR.
      const byBr = new Map<string, Record<string, string>>();
      for (const row of (data ?? []) as StageHistoryRow[]) {
        if (!byBr.has(row.business_request_id)) byBr.set(row.business_request_id, {});
        // Keep earliest entered_at per stage per BR.
        const stages = byBr.get(row.business_request_id)!;
        if (!stages[row.stage_code] || row.entered_at < stages[row.stage_code]) {
          stages[row.stage_code] = row.entered_at;
        }
      }

      // Compute cycle days for BRs that have both steps.
      const cycleDays: number[] = [];
      for (const stages of byBr.values()) {
        if (!stages[startStep] || !stages[endStep]) continue;
        const ms = new Date(stages[endStep]).getTime() - new Date(stages[startStep]).getTime();
        cycleDays.push(ms / 86_400_000);
      }

      return computeStats(cycleDays);
    },
  });

  return {
    ...(data ?? NULL_STATS),
    isLoading: loading || isLoading,
    isError,
    error,
  };
}
