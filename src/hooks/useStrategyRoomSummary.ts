/**
 * Unified data source for Strategy Room top gadgets.
 * Single query for all metrics used by StrategicPulseSection and ExposureGapsSection.
 * 
 * KEY BEHAVIORS:
 * 1. LKG (Last Known Good) caching - persists to sessionStorage
 * 2. Never returns undefined after first successful load
 * 3. Concurrency control - cancels stale requests
 * 4. Safe number handling - prevents NaN/undefined in charts
 */

import { useQuery } from '@tanstack/react-query';
import { useRef, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getLKGData, 
  setLKGData, 
  safeNumber, 
  safePercentage, 
  safeArray 
} from '@/utils/strategyRoomCache';

export interface StrategyRoomSummaryData {
  // OKR Metrics
  objectivesCount: number;
  avgProgress: number;
  atRiskObjectives: ObjectiveSummary[];
  byHealth: {
    good: number;
    fair: number;
    poor: number;
    at_risk: number;
    unknown: number;
  };
  
  // Alignment Gaps
  misalignedEpics: number;
  misalignedFeatures: number;
  alignmentGaps: number;
  
  // Risk Metrics
  totalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  overdueRisks: number;
  topRisks: RiskSummary[];
  
  // Derived Status
  overallStatus: 'on-track' | 'at-risk' | 'off-track';
}

interface ObjectiveSummary {
  id: string;
  name: string;
  health: string | null;
  overall_progress: number;
}

interface RiskSummary {
  id: string;
  title: string;
  impact: string | null;
}

export const EMPTY_SUMMARY: StrategyRoomSummaryData = {
  objectivesCount: 0,
  avgProgress: 0,
  atRiskObjectives: [],
  byHealth: { good: 0, fair: 0, poor: 0, at_risk: 0, unknown: 0 },
  misalignedEpics: 0,
  misalignedFeatures: 0,
  alignmentGaps: 0,
  totalRisks: 0,
  highRisks: 0,
  mediumRisks: 0,
  lowRisks: 0,
  overdueRisks: 0,
  topRisks: [],
  overallStatus: 'at-risk',
};

// Request ID for concurrency control
let globalRequestId = 0;

async function fetchSummaryData(
  snapshotId: string, 
  requestId: number,
  currentRequestIdRef: React.MutableRefObject<number>
): Promise<StrategyRoomSummaryData | null> {
  // Check if request is still current
  const checkStale = () => {
    if (currentRequestIdRef.current !== requestId) {
      console.log('[Strategy Room] Request cancelled - newer request in flight');
      return true;
    }
    return false;
  };

  if (checkStale()) return null;

  // Parallel fetch all data sources
  const [themesResult, risksResult, snapshotLinksResult, alignmentResult] = await Promise.all([
    // 1. Fetch themes for this snapshot
    supabase
      .from('strategic_themes')
      .select('id, name')
      .eq('snapshot_id', snapshotId),
    
    // 2. Fetch open risks
    supabase
      .from('risks')
      .select('id, title, impact, status, target_resolution_date')
      .not('status', 'eq', 'Closed')
      .order('impact', { ascending: false })
      .limit(10),
    
    // 3. Fetch snapshot strategy links for alignment
    supabase
      .from('snapshot_strategy_links')
      .select('theme_ids')
      .eq('snapshot_id', snapshotId)
      .maybeSingle(),
    
    // 4. Fetch total counts for alignment gaps
    Promise.all([
      supabase.from('epics').select('id', { count: 'exact', head: true }),
      supabase.from('features').select('id', { count: 'exact', head: true }),
    ]),
  ]);

  if (checkStale()) return null;

  const themes = safeArray(themesResult.data);
  const risks = safeArray(risksResult.data);
  const snapshotLinks = snapshotLinksResult.data;
  const [epicsCountResult, featuresCountResult] = alignmentResult;

  const themeIds = themes.map(t => t.id);
  const linkedThemeIds = safeArray(snapshotLinks?.theme_ids);

  // Fetch objectives for these themes
  let objectives: any[] = [];
  if (themeIds.length > 0) {
    const { data } = await supabase
      .from('objectives')
      .select('id, name, health, overall_progress, theme_id')
      .eq('is_v2', true)
      .in('theme_id', themeIds);
    objectives = safeArray(data);
  }

  if (checkStale()) return null;

  // Calculate OKR metrics with safe numbers
  const byHealth = { good: 0, fair: 0, poor: 0, at_risk: 0, unknown: 0 };
  let totalProgress = 0;

  objectives.forEach(obj => {
    const health = (obj.health || '').toLowerCase();
    if (health === 'good') byHealth.good++;
    else if (health === 'fair') byHealth.fair++;
    else if (health === 'poor') byHealth.poor++;
    else if (health === 'at_risk') byHealth.at_risk++;
    else byHealth.unknown++;
    totalProgress += safeNumber(obj.overall_progress);
  });

  const objectivesCount = objectives.length;
  const avgProgress = objectivesCount > 0 
    ? safePercentage(Math.round(totalProgress / objectivesCount)) 
    : 0;
  
  const atRiskObjectives = objectives
    .filter(obj => {
      const health = (obj.health || '').toLowerCase();
      return health === 'at_risk' || health === 'poor';
    })
    .map(obj => ({
      id: obj.id,
      name: obj.name || 'Unnamed Objective',
      health: obj.health,
      overall_progress: safeNumber(obj.overall_progress),
    }));

  // Calculate risk metrics with safe numbers
  const today = new Date();
  const getSeverity = (r: { impact?: string | null }) => {
    const impact = (r.impact || '').toLowerCase();
    if (impact === 'critical' || impact === 'high' || impact === '5' || impact === '4') return 'high';
    if (impact === 'medium' || impact === '3') return 'medium';
    return 'low';
  };

  const highRisks = safeNumber(risks.filter(r => getSeverity(r) === 'high').length);
  const mediumRisks = safeNumber(risks.filter(r => getSeverity(r) === 'medium').length);
  const lowRisks = safeNumber(risks.filter(r => getSeverity(r) === 'low').length);
  const overdueRisks = safeNumber(risks.filter(r => {
    if (!r.target_resolution_date) return false;
    return new Date(r.target_resolution_date) < today;
  }).length);
  
  const topRisks = risks
    .filter(r => getSeverity(r) === 'high')
    .slice(0, 3)
    .map(r => ({ id: r.id, title: r.title || 'Unnamed Risk', impact: r.impact }));

  if (checkStale()) return null;

  // Calculate alignment gaps
  const allLinkedThemeIds = [...new Set([...themeIds, ...linkedThemeIds])];
  
  let alignedEpicIds = new Set<string>();
  if (allLinkedThemeIds.length > 0) {
    const [themeEpicResult, objectiveEpicResult] = await Promise.all([
      supabase
        .from('theme_epic_links')
        .select('epic_id')
        .in('theme_id', allLinkedThemeIds),
      supabase
        .from('objective_epic_links')
        .select('epic_id'),
    ]);
    
    safeArray(themeEpicResult.data).forEach(l => alignedEpicIds.add(l.epic_id));
    safeArray(objectiveEpicResult.data).forEach(l => alignedEpicIds.add(l.epic_id));
  }

  if (checkStale()) return null;

  const totalEpics = safeNumber(epicsCountResult.count);
  const totalFeatures = safeNumber(featuresCountResult.count);
  
  let alignedFeaturesCount = 0;
  if (alignedEpicIds.size > 0) {
    const { count } = await supabase
      .from('features')
      .select('id', { count: 'exact', head: true })
      .in('epic_id', Array.from(alignedEpicIds));
    alignedFeaturesCount = safeNumber(count);
  }

  if (checkStale()) return null;

  const misalignedEpics = Math.max(0, totalEpics - alignedEpicIds.size);
  const misalignedFeatures = Math.max(0, totalFeatures - alignedFeaturesCount);
  const alignmentGaps = safeNumber(misalignedEpics + misalignedFeatures);

  // Determine overall status
  const hasObjectives = objectivesCount > 0;
  let overallStatus: 'on-track' | 'at-risk' | 'off-track' = 'at-risk';
  
  if (!hasObjectives) {
    overallStatus = 'at-risk';
  } else if (highRisks > 2 || atRiskObjectives.length > 3 || avgProgress < 30) {
    overallStatus = 'off-track';
  } else if (highRisks > 0 || atRiskObjectives.length > 0 || alignmentGaps > 3 || avgProgress < 60) {
    overallStatus = 'at-risk';
  } else {
    overallStatus = 'on-track';
  }

  return {
    objectivesCount: safeNumber(objectivesCount),
    avgProgress,
    atRiskObjectives,
    byHealth,
    misalignedEpics: safeNumber(misalignedEpics),
    misalignedFeatures: safeNumber(misalignedFeatures),
    alignmentGaps,
    totalRisks: safeNumber(risks.length),
    highRisks,
    mediumRisks,
    lowRisks,
    overdueRisks,
    topRisks,
    overallStatus,
  };
}

export function useStrategyRoomSummary(snapshotId?: string) {
  // Track request ID for concurrency control
  const currentRequestIdRef = useRef<number>(0);
  
  // Track if we've ever successfully loaded
  const hasEverLoadedRef = useRef(false);
  
  // Track last good data in memory (fast access)
  const lastGoodDataRef = useRef<StrategyRoomSummaryData | null>(null);
  
  // Track previous snapshot to detect changes
  const prevSnapshotIdRef = useRef<string | undefined>(undefined);

  // On snapshot change, try to load LKG from sessionStorage immediately
  useEffect(() => {
    if (snapshotId && snapshotId !== prevSnapshotIdRef.current) {
      prevSnapshotIdRef.current = snapshotId;
      
      // Increment request ID to cancel any in-flight requests
      currentRequestIdRef.current = ++globalRequestId;
      
      // Try to get LKG data from cache for immediate display
      const cachedData = getLKGData<StrategyRoomSummaryData>(snapshotId, 'pulse');
      if (cachedData) {
        lastGoodDataRef.current = cachedData;
        hasEverLoadedRef.current = true;
      }
    }
  }, [snapshotId]);

  const query = useQuery({
    queryKey: ['strategy-room-summary', snapshotId],
    queryFn: async (): Promise<StrategyRoomSummaryData> => {
      if (!snapshotId) {
        return EMPTY_SUMMARY;
      }
      
      // Increment request ID for this fetch
      const requestId = ++globalRequestId;
      currentRequestIdRef.current = requestId;
      
      const result = await fetchSummaryData(snapshotId, requestId, currentRequestIdRef);
      
      // If request was cancelled, return last good data or empty
      if (result === null) {
        return lastGoodDataRef.current || EMPTY_SUMMARY;
      }
      
      // Store successful result in both memory and sessionStorage
      lastGoodDataRef.current = result;
      hasEverLoadedRef.current = true;
      setLKGData(snapshotId, 'pulse', result);
      
      return result;
    },
    enabled: !!snapshotId,
    // Aggressive stale-while-revalidate config
    staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh
    gcTime: 30 * 60 * 1000, // 30 minutes cache retention
    refetchOnWindowFocus: false, // Prevent refetch on tab switch
    refetchOnReconnect: true,
    // Keep previous data during refetch
    placeholderData: (previousData) => previousData,
  });

  // Compute stable display data that NEVER goes undefined after first load
  const displayData = useMemo(() => {
    // Priority 1: Fresh data from current query
    if (query.data && query.data !== EMPTY_SUMMARY) {
      return query.data;
    }
    
    // Priority 2: Last good data in memory
    if (lastGoodDataRef.current) {
      return lastGoodDataRef.current;
    }
    
    // Priority 3: Try sessionStorage cache
    if (snapshotId) {
      const cached = getLKGData<StrategyRoomSummaryData>(snapshotId, 'pulse');
      if (cached) {
        lastGoodDataRef.current = cached;
        return cached;
      }
    }
    
    // Priority 4: Empty data (will show skeleton on first load only)
    return null;
  }, [query.data, snapshotId]);

  // Compute loading states per requirements
  const isInitialLoading = query.isLoading && !hasEverLoadedRef.current && !lastGoodDataRef.current;
  const isRefreshing = query.isFetching && (hasEverLoadedRef.current || !!lastGoodDataRef.current);

  return {
    // Return displayData which bridges snapshot transitions
    data: displayData,
    // True only when we have NEVER loaded any data AND no LKG exists (show skeleton)
    isLoading: isInitialLoading,
    // True when actively fetching new data with existing data shown (show "Refreshing..." indicator)
    isFetching: isRefreshing,
    // True when we have data to show
    hasData: !!displayData,
    // True if showing stale/cached data
    isStale: query.isStale && !!displayData,
    // Error state
    error: query.error,
    refetch: query.refetch,
  };
}
