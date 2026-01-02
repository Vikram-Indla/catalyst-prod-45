/**
 * useUserActivity Hook
 * Fetches and manages user activity data for reporting
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  fetchUserActivity,
  fetchActivityItems,
  logTestActivity,
  UserActivityFilters,
  ActivityAggregate,
  ActivityItem,
  ActivityType,
  TimeGrouping,
} from '../api/userActivity';

export interface UserActivityReportState {
  userIds: string[];
  startDate: Date | null;
  endDate: Date | null;
  groupBy: TimeGrouping;
  currentProjectOnly: boolean;
  includeLimitedVisibility: boolean;
  activityTypes: ActivityType[];
}

const defaultState: UserActivityReportState = {
  userIds: [],
  startDate: null,
  endDate: null,
  groupBy: 'none',
  currentProjectOnly: true,
  includeLimitedVisibility: false,
  activityTypes: [
    'case_created',
    'case_updated',
    'case_automated',
    'case_assigned',
    'run_executed',
    'effort_logged',
    'defect_discovered',
  ],
};

export function useUserActivityReport(projectId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<UserActivityReportState>(defaultState);
  const [isGenerated, setIsGenerated] = useState(false);

  // Build filters object
  const filters: UserActivityFilters | null = useMemo(() => {
    if (!state.startDate || !state.userIds.length) return null;
    
    return {
      userIds: state.userIds,
      startDate: format(state.startDate, 'yyyy-MM-dd'),
      endDate: state.endDate ? format(state.endDate, 'yyyy-MM-dd') : undefined,
      groupBy: state.groupBy,
      currentProjectOnly: state.currentProjectOnly,
      projectId: projectId || undefined,
      includeLimitedVisibility: state.includeLimitedVisibility,
      activityTypes: state.activityTypes,
    };
  }, [state, projectId]);

  // Fetch aggregated data
  const {
    data: aggregates,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-activity-report', filters],
    queryFn: async () => {
      if (!filters) return [];
      return await fetchUserActivity(filters);
    },
    enabled: !!user && !!filters && isGenerated,
    staleTime: 30000,
  });

  // Update state helpers
  const setUserIds = useCallback((ids: string[]) => {
    setState(prev => ({ ...prev, userIds: ids }));
    setIsGenerated(false);
  }, []);

  const setStartDate = useCallback((date: Date | null) => {
    setState(prev => ({ ...prev, startDate: date }));
    setIsGenerated(false);
  }, []);

  const setEndDate = useCallback((date: Date | null) => {
    setState(prev => ({ ...prev, endDate: date }));
    setIsGenerated(false);
  }, []);

  const setGroupBy = useCallback((groupBy: TimeGrouping) => {
    setState(prev => ({ ...prev, groupBy }));
    setIsGenerated(false);
  }, []);

  const setCurrentProjectOnly = useCallback((val: boolean) => {
    setState(prev => ({ ...prev, currentProjectOnly: val }));
    setIsGenerated(false);
  }, []);

  const setIncludeLimitedVisibility = useCallback((val: boolean) => {
    setState(prev => ({ ...prev, includeLimitedVisibility: val }));
    setIsGenerated(false);
  }, []);

  const setActivityTypes = useCallback((types: ActivityType[]) => {
    setState(prev => ({ ...prev, activityTypes: types }));
    setIsGenerated(false);
  }, []);

  const toggleActivityType = useCallback((type: ActivityType) => {
    setState(prev => ({
      ...prev,
      activityTypes: prev.activityTypes.includes(type)
        ? prev.activityTypes.filter(t => t !== type)
        : [...prev.activityTypes, type],
    }));
    setIsGenerated(false);
  }, []);

  // Generate report
  const generate = useCallback(() => {
    if (!state.userIds.length) {
      toast.error('Please select at least one user');
      return false;
    }
    if (!state.startDate) {
      toast.error('Please select a start date');
      return false;
    }
    if (!state.activityTypes.length) {
      toast.error('Please select at least one activity type');
      return false;
    }
    setIsGenerated(true);
    return true;
  }, [state]);

  // Reset report
  const reset = useCallback(() => {
    setState(defaultState);
    setIsGenerated(false);
  }, []);

  // Validation
  const isValid = useMemo(() => {
    return state.userIds.length > 0 && 
           state.startDate !== null && 
           state.activityTypes.length > 0;
  }, [state]);

  return {
    // State
    state,
    filters,
    isGenerated,
    isValid,
    
    // Data
    aggregates: aggregates || [],
    isLoading,
    error: error as Error | null,
    
    // Actions
    setUserIds,
    setStartDate,
    setEndDate,
    setGroupBy,
    setCurrentProjectOnly,
    setIncludeLimitedVisibility,
    setActivityTypes,
    toggleActivityType,
    generate,
    reset,
    refetch,
  };
}

/**
 * Hook for drill-down into activity items
 */
export function useActivityDrillDown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [drillDownParams, setDrillDownParams] = useState<{
    userId: string;
    userName: string;
    activityType: ActivityType;
    startDate: string;
    endDate: string;
    projectId?: string;
  } | null>(null);

  const { data: items, isLoading, error } = useQuery({
    queryKey: ['activity-drill-down', drillDownParams],
    queryFn: async () => {
      if (!drillDownParams) return [];
      return await fetchActivityItems(
        drillDownParams.userId,
        drillDownParams.activityType,
        drillDownParams.startDate,
        drillDownParams.endDate,
        drillDownParams.projectId
      );
    },
    enabled: !!user && !!drillDownParams && isOpen,
  });

  const open = useCallback((params: typeof drillDownParams) => {
    setDrillDownParams(params);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setDrillDownParams(null);
  }, []);

  return {
    isOpen,
    params: drillDownParams,
    items: items || [],
    isLoading,
    error: error as Error | null,
    open,
    close,
  };
}

/**
 * Hook to log activity on test operations
 */
export function useLogTestActivity() {
  const { user } = useAuth();

  const logActivity = useCallback(
    async (
      activityType: string,
      entityType: string,
      entityId: string,
      entityTitle: string,
      options?: {
        programId?: string;
        projectId?: string;
        description?: string;
        effortHours?: number;
        metadata?: Record<string, any>;
      }
    ) => {
      if (!user) return;
      await logTestActivity(user.id, activityType, entityType, entityId, entityTitle, options);
    },
    [user]
  );

  return { logActivity };
}

export type { ActivityAggregate, ActivityItem, ActivityType, TimeGrouping, UserActivityFilters };
