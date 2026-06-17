// ============================================================
// ITSM INSIGHTS HOOK — derives deterministic System Insights from
// the live incident set. Wraps the pure generateSystemInsights().
// ============================================================

import { useMemo } from 'react';
import { useItsmIncidents } from './useItsmQueries';
import { generateSystemInsights } from '../logic/itsmInsights';
import type { SystemInsight } from '../types';

export function useItsmInsights(): { insights: SystemInsight[]; isLoading: boolean } {
  const { data, isLoading } = useItsmIncidents();

  const insights = useMemo(() => {
    if (!data) return [];
    // `now` snapshotted when the incident set changes — deterministic per data version.
    return generateSystemInsights(data, new Date().toISOString());
  }, [data]);

  return { insights, isLoading };
}
