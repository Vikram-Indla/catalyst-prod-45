import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  EpicBalancingEpic, 
  EpicBalancingStats, 
  EpicBalancingFilters,
  EpicBalancingResponse,
  PriorityToExecute,
  AbilityToExecute
} from '../types';

// Real data - no mock data

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function useEpicBalancingData(programId: string, filters: EpicBalancingFilters) {
  const [hiddenDrivers, setHiddenDrivers] = useState<Set<PriorityToExecute>>(new Set());

  const { data, isLoading, error, refetch } = useQuery<EpicBalancingResponse>({
    queryKey: ['epic-balancing', programId, filters],
    queryFn: async () => {
      // Return empty data - no mock data
      return {
        context: {
          programId,
          snapshotId: filters.snapshotId,
          productId: filters.productId,
        },
        epics: [],
        stats: {
          medianJobSize: 0,
          medianCostOfDelay: 0,
        },
      };
    },
    enabled: !!programId,
  });

  const filteredEpics = useMemo(() => {
    if (!data?.epics) return [];
    return data.epics.filter(epic => !hiddenDrivers.has(epic.priorityToExecute));
  }, [data?.epics, hiddenDrivers]);

  const toggleDriver = (driver: PriorityToExecute) => {
    setHiddenDrivers(prev => {
      const next = new Set(prev);
      if (next.has(driver)) {
        next.delete(driver);
      } else {
        next.add(driver);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setHiddenDrivers(new Set());
  };

  const scoringStats = useMemo(() => {
    if (!data?.epics) return { complete: 0, incomplete: 0 };
    
    const complete = data.epics.filter(
      e => e.businessAlignment !== null && 
           e.timeCriticality !== null && 
           e.investorEnablement !== null && 
           e.jobSize !== null
    ).length;
    
    return {
      complete,
      incomplete: data.epics.length - complete,
    };
  }, [data?.epics]);

  return {
    epics: filteredEpics,
    allEpics: data?.epics ?? [],
    stats: data?.stats,
    scoringStats,
    isLoading,
    error,
    refetch,
    hiddenDrivers,
    toggleDriver,
    resetFilters,
  };
}