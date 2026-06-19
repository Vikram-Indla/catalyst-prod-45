/**
 * useBusinessRequestHealth Hook
 *
 * Composite hook that:
 * 1. Fetches BR + linked work from Supabase
 * 2. Runs DatePulseEngine to compute violations
 * 3. Runs HealthStatusEngine to compute state
 * 4. Returns complete health assessment
 *
 * Includes caching, refresh interval, error handling
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { computeDatePulseViolations } from '@/lib/date-pulse/DatePulseEngine';
import {
  computeHealthStatus,
  mapStatusToSeverity,
  generateHealthSummary,
  generateHealthDescriptor,
} from '@/lib/date-pulse/HealthStatusEngine';
import {
  BusinessRequest,
  BusinessRequestHealth,
  UseBusinessRequestHealthOptions,
  UseBusinessRequestHealthResult,
  WorkItem,
} from '@/types/date-pulse';
import { supabase } from '@/lib/supabase';

/**
 * In-memory cache for health results
 * Key: brId, Value: { health, timestamp }
 */
const healthCache = new Map<
  string,
  {
    health: BusinessRequestHealth;
    timestamp: number;
  }
>();

const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Fetch BR + linked work from Supabase
 */
async function fetchBusinessRequestData(brId: string): Promise<{
  br: BusinessRequest | null;
  linkedWork: WorkItem[];
}> {
  try {
    // Fetch BR
    const { data: br, error: brError } = await supabase
      .from('business_requests')
      .select('*')
      .eq('id', brId)
      .single();

    if (brError || !br) {
      throw new Error(`Failed to fetch BR: ${brError?.message || 'Not found'}`);
    }

    // Fetch linked work
    const { data: linkedWork, error: workError } = await supabase
      .from('ph_issues')
      .select('*')
      .eq('business_request_id', brId);

    if (workError) {
      throw new Error(`Failed to fetch linked work: ${workError.message}`);
    }

    return {
      br,
      linkedWork: linkedWork || [],
    };
  } catch (err) {
    console.error('[Health] Data fetch error:', err);
    throw err;
  }
}

/**
 * Fetch release data if br.release_id is set
 */
async function fetchReleaseData(releaseId: string | null) {
  if (!releaseId) return null;

  try {
    const { data: release, error } = await supabase
      .from('product_releases')
      .select('*')
      .eq('id', releaseId)
      .single();

    if (error) {
      console.warn('[Health] Release fetch error:', error.message);
      return null;
    }

    return release;
  } catch (err) {
    console.error('[Health] Release fetch error:', err);
    return null;
  }
}

/**
 * Main health calculation logic
 */
async function calculateHealth(brId: string): Promise<BusinessRequestHealth> {
  const startTime = performance.now();

  // 1. Fetch data
  const { br, linkedWork } = await fetchBusinessRequestData(brId);

  if (!br) {
    throw new Error('Business Request not found');
  }

  // 2. Fetch release if linked
  const release = await fetchReleaseData(br.release_id);

  // 3. Run Date Pulse Engine
  const violations = computeDatePulseViolations(br, linkedWork, release);

  // 4. Run Health Status Engine
  const healthStatus = computeHealthStatus(br, linkedWork, violations);

  // 5. Compile health object
  const daysToDeadline =
    br.end_date || (release && release.target_date)
      ? Math.floor(
          (new Date(br.end_date || release?.target_date || new Date()).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : Infinity;

  const workWithDates = linkedWork.filter(w => w.due_date);
  const inProgressWork = linkedWork.filter(
    w => w.status && w.status !== 'backlog' && w.status !== 'todo' && w.status !== 'done',
  );
  const doneWork = linkedWork.filter(w => w.status === 'done');
  const blockedWork = linkedWork.filter(w => w.status === 'blocked');

  const health: BusinessRequestHealth = {
    health_status: healthStatus,
    health_severity: mapStatusToSeverity(healthStatus),
    health_summary: generateHealthSummary(healthStatus, br, linkedWork),
    health_descriptor: generateHealthDescriptor(healthStatus, br, linkedWork),
    linked_work_count: linkedWork.length,
    linked_work_with_dates_count: workWithDates.length,
    in_progress_count: inProgressWork.length,
    done_count: doneWork.length,
    open_blockers_count: blockedWork.length,
    br_target_date: br.end_date || null,
    br_end_date: br.end_date || null,
    release_target_date: release?.target_date || null,
    earliest_story_due: linkedWork.length > 0 ? minDate(workWithDates.map(w => w.due_date)) : null,
    latest_story_due: linkedWork.length > 0 ? maxDate(workWithDates.map(w => w.due_date)) : null,
    days_to_deadline: daysToDeadline,
    is_overdue: br.end_date ? br.end_date < new Date().toISOString() : false,
    is_urgent: daysToDeadline < 7 && daysToDeadline >= 0,
    date_pulse_violations: violations,
    violation_count: violations.length,
    critical_violation_count: violations.filter(v => v.severity === 'critical').length,
    evaluated_at: new Date().toISOString(),
    evaluation_duration_ms: Math.round(performance.now() - startTime),
  };

  return health;
}

/**
 * Hook: useBusinessRequestHealth
 *
 * @param brId Business Request UUID
 * @param options Optional configuration
 * @returns Health assessment result with loading/error state
 */
export function useBusinessRequestHealth(
  brId: string,
  options?: UseBusinessRequestHealthOptions,
): UseBusinessRequestHealthResult {
  const [health, setHealth] = useState<BusinessRequestHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshInterval = options?.refreshInterval ?? 30000;
  const forceRecalculate = options?.forceRecalculate ?? false;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const refetch = useCallback(async () => {
    if (!brId) return;

    try {
      setIsLoading(true);

      // Check cache first (unless force recalculate)
      if (!forceRecalculate) {
        const cached = healthCache.get(brId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          if (isMountedRef.current) {
            setHealth(cached.health);
            setError(null);
            setIsLoading(false);
          }
          return;
        }
      }

      // Calculate fresh
      const result = await calculateHealth(brId);

      // Update cache
      healthCache.set(brId, {
        health: result,
        timestamp: Date.now(),
      });

      if (isMountedRef.current) {
        setHealth(result);
        setError(null);
      }
    } catch (err) {
      console.error('[Health] Calculation error:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setHealth(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [brId, forceRecalculate]);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    refetch();

    // Set up refresh interval
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(refetch, refreshInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [brId, refreshInterval, refetch]);

  return { health, isLoading, error, refetch };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find minimum date in array (ignoring nulls)
 */
function minDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter(d => d !== null && d !== undefined) as string[];
  return valid.length > 0 ? valid.sort()[0] : null;
}

/**
 * Find maximum date in array (ignoring nulls)
 */
function maxDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter(d => d !== null && d !== undefined) as string[];
  return valid.length > 0 ? valid.sort().reverse()[0] : null;
}

/**
 * Clear all health cache (for testing/refresh)
 */
export function clearHealthCache(): void {
  healthCache.clear();
}
