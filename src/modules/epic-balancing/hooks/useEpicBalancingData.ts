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

// TODO: Replace with real API call when backend is ready
// GET /api/programs/:programId/epics/balancing?snapshotId=&productId=&status=

// Default Theme and Business Request IDs from database
const DEFAULT_THEME_ID = '198f362a-79f1-4ef5-bc69-ea831c488ee8';
const DEFAULT_THEME_NAME = 'Digital Maturity';
const DEFAULT_BR_ID = '450c8c96-fd74-4424-8d13-9e68aae455b9';
const DEFAULT_BR_TITLE = 'MIM-003: Enhance DXP';

// Mock data for development - 15 epics with varied scores
const generateMockEpics = (programId: string): EpicBalancingEpic[] => {
  const mockData: Array<{
    key: string;
    name: string;
    ba: number | null;
    tc: number | null;
    ie: number | null;
    js: number | null;
    priority: PriorityToExecute;
    ability: AbilityToExecute;
    plannedQuarter: string;
    themeId?: string;
    themeName?: string;
    businessRequestId?: string;
    businessRequestTitle?: string;
  }> = [
    { key: "E-101", name: "Modernize Investor Onboarding", ba: 18, tc: 12, ie: 8, js: 5, priority: "VERY_HIGH", ability: "HIGH", plannedQuarter: "Q4'25", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME, businessRequestId: DEFAULT_BR_ID, businessRequestTitle: DEFAULT_BR_TITLE },
    { key: "E-102", name: "Mobile App Redesign", ba: 15, tc: 10, ie: 12, js: 8, priority: "HIGH", ability: "HIGH", plannedQuarter: "Q1'26", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME, businessRequestId: DEFAULT_BR_ID, businessRequestTitle: DEFAULT_BR_TITLE },
    { key: "E-103", name: "Legacy System Migration", ba: 8, tc: 15, ie: 5, js: 18, priority: "MEDIUM", ability: "MEDIUM", plannedQuarter: "Q2'26", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME },
    { key: "E-104", name: "AI-Powered Analytics Dashboard", ba: 20, tc: 8, ie: 15, js: 12, priority: "VERY_HIGH", ability: "LOW", plannedQuarter: "Q4'25", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME, businessRequestId: DEFAULT_BR_ID, businessRequestTitle: DEFAULT_BR_TITLE },
    { key: "E-105", name: "Security Compliance Update", ba: 5, tc: 18, ie: 3, js: 6, priority: "HIGH", ability: "HIGH", plannedQuarter: "Q1'26", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME },
    { key: "E-106", name: "Customer Portal Enhancement", ba: 12, tc: 6, ie: 10, js: 4, priority: "VERY_HIGH", ability: "HIGH", plannedQuarter: "Q4'25", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME },
    { key: "E-107", name: "Data Warehouse Optimization", ba: 10, tc: 4, ie: 8, js: 14, priority: "MEDIUM", ability: "MEDIUM", plannedQuarter: "Unscheduled", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME },
    { key: "E-108", name: "Automated Testing Framework", ba: 6, tc: 3, ie: 12, js: 10, priority: "HIGH", ability: "HIGH", plannedQuarter: "Q2'26", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME },
    { key: "E-109", name: "Payment Gateway Integration", ba: 16, tc: 14, ie: 6, js: 7, priority: "VERY_HIGH", ability: "MEDIUM", plannedQuarter: "Q1'26", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME, businessRequestId: DEFAULT_BR_ID, businessRequestTitle: DEFAULT_BR_TITLE },
    { key: "E-110", name: "Reporting Module Overhaul", ba: 9, tc: 5, ie: 4, js: 11, priority: "MEDIUM", ability: "LOW", plannedQuarter: "Unscheduled" },
    { key: "E-111", name: "API Gateway Modernization", ba: 14, tc: 11, ie: 9, js: 9, priority: "HIGH", ability: "HIGH", plannedQuarter: "Q4'25", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME },
    { key: "E-112", name: "Sunset Legacy CRM", ba: 3, tc: 2, ie: 1, js: 3, priority: "LOW", ability: "HIGH", plannedQuarter: "Unscheduled" },
    { key: "E-113", name: "Cloud Infrastructure Setup", ba: 17, tc: 16, ie: 14, js: 15, priority: "VERY_HIGH", ability: "MEDIUM", plannedQuarter: "Q1'26", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME, businessRequestId: DEFAULT_BR_ID, businessRequestTitle: DEFAULT_BR_TITLE },
    { key: "E-114", name: "Performance Optimization", ba: 11, tc: 7, ie: 5, js: 5, priority: "HIGH", ability: "HIGH", plannedQuarter: "Q4'25", themeId: DEFAULT_THEME_ID, themeName: DEFAULT_THEME_NAME },
    { key: "E-115", name: "New Feature Discovery", ba: null, tc: null, ie: null, js: null, priority: "LOW", ability: "LOW", plannedQuarter: "Unscheduled" },
  ];

  return mockData.map((item) => {
    const ba = item.ba ?? 0;
    const tc = item.tc ?? 0;
    const ie = item.ie ?? 0;
    const js = item.js ?? 0;

    const costOfDelay = item.ba !== null ? ba + tc + ie : null;
    const technicalScore = js > 0 && costOfDelay !== null ? costOfDelay / js : null;

    return {
      id: item.key,
      key: item.key,
      name: item.name,
      programId,
      businessAlignment: item.ba,
      timeCriticality: item.tc,
      investorEnablement: item.ie,
      jobSize: item.js,
      costOfDelay,
      technicalScore,
      priorityToExecute: item.priority,
      abilityToExecute: item.ability,
      plannedQuarter: item.plannedQuarter,
      themeId: item.themeId,
      themeName: item.themeName,
      businessRequestId: item.businessRequestId,
      businessRequestTitle: item.businessRequestTitle,
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
  const [hiddenDrivers, setHiddenDrivers] = useState<Set<PriorityToExecute>>(new Set());

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