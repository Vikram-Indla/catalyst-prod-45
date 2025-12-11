import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  EpicBalancingEpic, 
  EpicBalancingStats, 
  EpicBalancingFilters,
  EpicBalancingResponse,
  StrategicDriver,
  AbilityToExecute
} from '../types';

// TODO: Replace with real API call when backend is ready
// GET /api/programs/:programId/epics/balancing?snapshotId=&productId=&status=

// Mock data for development - 15 epics with varied scores
const generateMockEpics = (programId: string): EpicBalancingEpic[] => {
  const mockData: Array<{
    key: string;
    name: string;
    bv: number | null;
    tc: number | null;
    opp: number | null;
    js: number | null;
    driver: StrategicDriver;
    ability: AbilityToExecute;
  }> = [
    { key: "E-101", name: "Modernize Investor Onboarding", bv: 18, tc: 12, opp: 8, js: 5, driver: "EXPAND", ability: "HIGH" },
    { key: "E-102", name: "Mobile App Redesign", bv: 15, tc: 10, opp: 12, js: 8, driver: "INNOVATE", ability: "HIGH" },
    { key: "E-103", name: "Legacy System Migration", bv: 8, tc: 15, opp: 5, js: 18, driver: "SUSTAIN", ability: "MEDIUM" },
    { key: "E-104", name: "AI-Powered Analytics Dashboard", bv: 20, tc: 8, opp: 15, js: 12, driver: "EXPAND", ability: "LOW" },
    { key: "E-105", name: "Security Compliance Update", bv: 5, tc: 18, opp: 3, js: 6, driver: "CONTAIN", ability: "HIGH" },
    { key: "E-106", name: "Customer Portal Enhancement", bv: 12, tc: 6, opp: 10, js: 4, driver: "EXPAND", ability: "HIGH" },
    { key: "E-107", name: "Data Warehouse Optimization", bv: 10, tc: 4, opp: 8, js: 14, driver: "SUSTAIN", ability: "MEDIUM" },
    { key: "E-108", name: "Automated Testing Framework", bv: 6, tc: 3, opp: 12, js: 10, driver: "INNOVATE", ability: "HIGH" },
    { key: "E-109", name: "Payment Gateway Integration", bv: 16, tc: 14, opp: 6, js: 7, driver: "EXPAND", ability: "MEDIUM" },
    { key: "E-110", name: "Reporting Module Overhaul", bv: 9, tc: 5, opp: 4, js: 11, driver: "SUSTAIN", ability: "LOW" },
    { key: "E-111", name: "API Gateway Modernization", bv: 14, tc: 11, opp: 9, js: 9, driver: "INNOVATE", ability: "HIGH" },
    { key: "E-112", name: "Sunset Legacy CRM", bv: 3, tc: 2, opp: 1, js: 3, driver: "EXIT", ability: "HIGH" },
    { key: "E-113", name: "Cloud Infrastructure Setup", bv: 17, tc: 16, opp: 14, js: 15, driver: "EXPAND", ability: "MEDIUM" },
    { key: "E-114", name: "Performance Optimization", bv: 11, tc: 7, opp: 5, js: 5, driver: "CONTAIN", ability: "HIGH" },
    { key: "E-115", name: "New Feature Discovery", bv: null, tc: null, opp: null, js: null, driver: "NOT_SET", ability: "LOW" },
  ];

  return mockData.map((item) => {
    const bv = item.bv ?? 0;
    const tc = item.tc ?? 0;
    const opp = item.opp ?? 0;
    const js = item.js ?? 0;

    const costOfDelay = item.bv !== null ? bv + tc + opp : null;
    const technicalScore = js > 0 && costOfDelay !== null ? costOfDelay / js : null;

    return {
      id: item.key,
      key: item.key,
      name: item.name,
      programId,
      businessValue: item.bv,
      timeCriticality: item.tc,
      opportunityEnablement: item.opp,
      jobSize: item.js,
      costOfDelay,
      technicalScore,
      strategicDriver: item.driver,
      abilityToExecute: item.ability,
    };
  });
};

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function useEpicBalancingData(programId: string, filters: EpicBalancingFilters) {
  const [hiddenDrivers, setHiddenDrivers] = useState<Set<StrategicDriver>>(new Set());

  const { data, isLoading, error, refetch } = useQuery<EpicBalancingResponse>({
    queryKey: ['epic-balancing', programId, filters],
    queryFn: async () => {
      // TODO: Replace with real API call
      // const params = new URLSearchParams();
      // if (filters.snapshotId) params.set('snapshotId', filters.snapshotId);
      // if (filters.productId) params.set('productId', filters.productId);
      // if (filters.status?.length) params.set('status', filters.status.join(','));
      // const response = await fetch(`/api/programs/${programId}/epics/balancing?${params}`);
      // return response.json();

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      
      const epics = generateMockEpics(programId);
      
      const jobSizes = epics.filter(e => e.jobSize !== null).map(e => e.jobSize!);
      const costOfDelays = epics.filter(e => e.costOfDelay !== null).map(e => e.costOfDelay!);

      return {
        context: {
          programId,
          snapshotId: filters.snapshotId,
          productId: filters.productId,
        },
        epics,
        stats: {
          medianJobSize: calculateMedian(jobSizes),
          medianCostOfDelay: calculateMedian(costOfDelays),
        },
      };
    },
    enabled: !!programId,
  });

  const filteredEpics = useMemo(() => {
    if (!data?.epics) return [];
    return data.epics.filter(epic => !hiddenDrivers.has(epic.strategicDriver));
  }, [data?.epics, hiddenDrivers]);

  const toggleDriver = (driver: StrategicDriver) => {
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
      e => e.businessValue !== null && 
           e.timeCriticality !== null && 
           e.opportunityEnablement !== null && 
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
