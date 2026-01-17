/**
 * useResourceAllocationTimeline Hook
 * Manages state and data for the Linear/Notion-style Resource Allocation Timeline
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  startOfWeek, 
  addWeeks, 
  addMonths,
  parseISO, 
  format,
  getISOWeek,
  eachWeekOfInterval,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  isBefore,
  isSameWeek,
  isSameMonth,
  startOfDay,
} from 'date-fns';
import type { 
  AllocationResource, 
  Assignment, 
  Allocation,
  TimelinePeriod,
  TimelineBar,
  PeriodCapacity,
  TimelineView,
  AllocationStatus,
  CreateAllocationInput,
} from '@/types/resource-allocation.types';
import { ASSIGNMENT_COLORS } from '@/types/resource-allocation.types';

interface UseResourceAllocationTimelineProps {
  resource: AllocationResource;
  onClose?: () => void;
}

export function useResourceAllocationTimeline({ resource, onClose }: UseResourceAllocationTimelineProps) {
  const queryClient = useQueryClient();
  
  // View state
  const [view, setView] = useState<TimelineView>('weeks');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
  
  // Current date context
  const today = useMemo(() => new Date('2026-01-15'), []);
  
  // ============================================
  // Realtime Subscription
  // ============================================
  useEffect(() => {
    const channel = supabase
      .channel(`resource-allocations-${resource.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_allocations',
          filter: `resource_id=eq.${resource.id}`,
        },
        () => {
          // Refetch allocations when any change occurs
          queryClient.invalidateQueries({ queryKey: ['resource-allocations-timeline', resource.id] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [resource.id, queryClient]);
  
  // ============================================
  // Data Fetching
  // ============================================
  
  // Fetch all available assignments/projects
  const { data: availableAssignments = [] } = useQuery({
    queryKey: ['resource-assignments-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('id, name, color')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return (data || []).map((a, index) => ({
        id: a.id,
        name: a.name,
        color: a.color || ASSIGNMENT_COLORS[index % ASSIGNMENT_COLORS.length],
      })) as Assignment[];
    }
  });

  // Fetch allocations for this resource
  const { 
    data: allocations = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['resource-allocations-timeline', resource.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_allocations')
        .select(`
          id,
          resource_id,
          assignment_id,
          allocation_percent,
          start_date,
          end_date,
          status,
          resource_assignments(id, name, color)
        `)
        .eq('resource_id', resource.id)
        .order('start_date');
      
      if (error) throw error;
      
      return (data || []).map((row: any, index: number) => ({
        id: row.id,
        resourceId: row.resource_id,
        assignmentId: row.assignment_id,
        startDate: row.start_date,
        endDate: row.end_date,
        percentage: row.allocation_percent,
        status: (row.status as AllocationStatus) || 'committed',
        assignmentName: row.resource_assignments?.name || 'Unknown',
        assignmentColor: row.resource_assignments?.color || ASSIGNMENT_COLORS[index % ASSIGNMENT_COLORS.length],
      })) as (Allocation & { assignmentName: string; assignmentColor: string })[];
    }
  });

  // ============================================
  // Timeline Periods
  // ============================================
  
  const periods = useMemo((): TimelinePeriod[] => {
    const periodsCount = view === 'weeks' ? 12 : 6;
    const result: TimelinePeriod[] = [];
    const todayStart = startOfDay(today);
    const forecastBoundary = resource.forecastBoundary 
      ? parseISO(resource.forecastBoundary)
      : addWeeks(today, 8);
    
    if (view === 'weeks') {
      // Get current week start
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      const baseDate = addWeeks(currentWeekStart, periodOffset - 2); // Start 2 weeks before current
      
      for (let i = 0; i < periodsCount; i++) {
        const weekStart = addWeeks(baseDate, i);
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekNum = getISOWeek(weekStart);
        const year = weekStart.getFullYear();
        
        const isPast = isBefore(weekEnd, currentWeekStart);
        const isCurrent = isSameWeek(todayStart, weekStart, { weekStartsOn: 1 });
        const isForecast = !isBefore(weekStart, forecastBoundary);
        
        result.push({
          id: `W${weekNum}-${year}`,
          type: 'weekly',
          label: `W${weekNum}`,
          shortLabel: `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`,
          date: format(weekStart, 'yyyy-MM-dd'),
          weekNumber: weekNum,
          year,
          isCurrent,
          isPast,
          isForecast,
        });
      }
    } else {
      // Months view
      const currentMonthStart = startOfMonth(today);
      const baseDate = addMonths(currentMonthStart, periodOffset - 1); // Start 1 month before
      
      for (let i = 0; i < periodsCount; i++) {
        const monthStart = addMonths(baseDate, i);
        const monthNum = monthStart.getMonth() + 1;
        const year = monthStart.getFullYear();
        
        const isPast = isBefore(endOfMonth(monthStart), currentMonthStart);
        const isCurrent = isSameMonth(todayStart, monthStart);
        const isForecast = !isBefore(monthStart, forecastBoundary);
        
        result.push({
          id: `M${monthNum}-${year}`,
          type: 'monthly',
          label: format(monthStart, 'MMM'),
          shortLabel: format(monthStart, 'MMMM yyyy'),
          date: format(monthStart, 'yyyy-MM-dd'),
          monthNumber: monthNum,
          year,
          isCurrent,
          isPast,
          isForecast,
        });
      }
    }
    
    return result;
  }, [view, periodOffset, today, resource.forecastBoundary]);

  // ============================================
  // Timeline Bars
  // ============================================
  
  const timelineBars = useMemo((): TimelineBar[] => {
    return allocations.map((alloc: any) => {
      const startDate = parseISO(alloc.startDate);
      const endDate = parseISO(alloc.endDate);
      
      // Find start and end period indices
      let startIndex = periods.findIndex(p => {
        const periodDate = parseISO(p.date);
        if (view === 'weeks') {
          return !isBefore(periodDate, startOfWeek(startDate, { weekStartsOn: 1 }));
        } else {
          return !isBefore(periodDate, startOfMonth(startDate));
        }
      });
      
      if (startIndex === -1) startIndex = 0;
      
      let endIndex = periods.findIndex(p => {
        const periodDate = parseISO(p.date);
        if (view === 'weeks') {
          return isBefore(endOfWeek(endDate, { weekStartsOn: 1 }), periodDate);
        } else {
          return isBefore(endOfMonth(endDate), periodDate);
        }
      });
      
      if (endIndex === -1) endIndex = periods.length;
      else endIndex = endIndex - 1;
      
      // Clamp to visible range
      startIndex = Math.max(0, startIndex);
      endIndex = Math.min(periods.length - 1, endIndex);
      
      return {
        allocationId: alloc.id,
        assignmentId: alloc.assignmentId,
        assignmentName: alloc.assignmentName,
        assignmentColor: alloc.assignmentColor,
        startIndex,
        endIndex,
        spanCount: Math.max(1, endIndex - startIndex + 1),
        percentage: alloc.percentage,
        status: alloc.status,
        startDate: alloc.startDate,
        endDate: alloc.endDate,
      };
    });
  }, [allocations, periods, view]);

  // ============================================
  // Capacity Calculation
  // ============================================
  
  const periodCapacities = useMemo((): PeriodCapacity[] => {
    return periods.map(period => {
      let committed = 0;
      let forecast = 0;
      const periodDate = parseISO(period.date);
      
      allocations.forEach((alloc: any) => {
        const startDate = parseISO(alloc.startDate);
        const endDate = parseISO(alloc.endDate);
        
        // Check if this period falls within the allocation
        let overlaps = false;
        if (view === 'weeks') {
          const periodEnd = endOfWeek(periodDate, { weekStartsOn: 1 });
          overlaps = !isBefore(periodEnd, startDate) && !isBefore(endDate, periodDate);
        } else {
          const periodEnd = endOfMonth(periodDate);
          overlaps = !isBefore(periodEnd, startDate) && !isBefore(endDate, periodDate);
        }
        
        if (overlaps) {
          if (alloc.status === 'committed') {
            committed += alloc.percentage;
          } else {
            forecast += alloc.percentage;
          }
        }
      });
      
      const total = committed + forecast;
      let status: 'ok' | 'full' | 'over' = 'ok';
      if (total > 100) status = 'over';
      else if (total === 100) status = 'full';
      
      return {
        periodId: period.id,
        periodDate: period.date,
        total,
        committed,
        forecast,
        status,
      };
    });
  }, [periods, allocations, view]);

  // ============================================
  // Unique Assignments from Allocations
  // ============================================
  
  const assignmentsInUse = useMemo((): Assignment[] => {
    const seen = new Set<string>();
    const result: Assignment[] = [];
    
    allocations.forEach((alloc: any) => {
      if (!seen.has(alloc.assignmentId)) {
        seen.add(alloc.assignmentId);
        result.push({
          id: alloc.assignmentId,
          name: alloc.assignmentName,
          color: alloc.assignmentColor,
        });
      }
    });
    
    return result;
  }, [allocations]);

  // ============================================
  // Mutations
  // ============================================
  
  const createAllocation = useMutation({
    mutationFn: async (input: CreateAllocationInput) => {
      // Calculate dates based on period type
      let startDate: string;
      let endDate: string;
      
      if (input.period_type === 'weekly') {
        const start = getWeekStartDate(input.start_week!, input.start_year);
        const end = getWeekEndDate(input.end_week!, input.end_year);
        startDate = start;
        endDate = end;
      } else {
        startDate = format(new Date(input.start_year, (input.start_month || 1) - 1, 1), 'yyyy-MM-dd');
        endDate = format(endOfMonth(new Date(input.end_year, (input.end_month || 1) - 1, 1)), 'yyyy-MM-dd');
      }
      
      const { data, error } = await supabase
        .from('resource_allocations')
        .insert({
          resource_id: input.resource_id,
          assignment_id: input.assignment_id,
          allocation_percent: input.allocation_percentage,
          start_date: startDate,
          end_date: endDate,
          status: input.status,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Assignment added successfully');
      queryClient.invalidateQueries({ queryKey: ['resource-allocations-timeline', resource.id] });
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to add assignment', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const updateAllocation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; percentage?: number; status?: AllocationStatus; startDate?: string; endDate?: string }) => {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.percentage !== undefined) updateData.allocation_percent = updates.percentage;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      
      const { error } = await supabase
        .from('resource_allocations')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Allocation updated');
      queryClient.invalidateQueries({ queryKey: ['resource-allocations-timeline', resource.id] });
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to update allocation', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const deleteAllocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resource_allocations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Allocation removed');
      queryClient.invalidateQueries({ queryKey: ['resource-allocations-timeline', resource.id] });
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to remove allocation', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ============================================
  // Navigation
  // ============================================
  
  const navigatePeriods = useCallback((direction: 'prev' | 'next') => {
    const step = view === 'weeks' ? 4 : 2;
    setPeriodOffset(prev => prev + (direction === 'next' ? step : -step));
  }, [view]);

  const goToToday = useCallback(() => {
    setPeriodOffset(0);
  }, []);

  const toggleView = useCallback((newView: TimelineView) => {
    setView(newView);
    setPeriodOffset(0); // Reset offset when switching views
  }, []);

  // ============================================
  // Summary Stats
  // ============================================
  
  const summary = useMemo(() => {
    const committed = allocations
      .filter((a: any) => a.status === 'committed')
      .reduce((sum, a: any) => sum + a.percentage, 0);
    
    const forecast = allocations
      .filter((a: any) => a.status === 'forecast')
      .reduce((sum, a: any) => sum + a.percentage, 0);
    
    return { committed, forecast, total: committed + forecast };
  }, [allocations]);

  return {
    // Data
    resource,
    allocations,
    assignmentsInUse,
    availableAssignments,
    periods,
    timelineBars,
    periodCapacities,
    summary,
    today,
    
    // View state
    view,
    periodOffset,
    editingAllocationId,
    isLoading,
    isSaving: createAllocation.isPending || updateAllocation.isPending || deleteAllocation.isPending,
    
    // Actions
    setView: toggleView,
    setPeriodOffset,
    setEditingAllocationId,
    navigatePeriods,
    goToToday,
    createAllocation: createAllocation.mutateAsync,
    updateAllocation: updateAllocation.mutateAsync,
    deleteAllocation: deleteAllocation.mutateAsync,
    onClose,
  };
}

// ============================================
// Helper Functions
// ============================================

function getWeekStartDate(weekNum: number, year: number): string {
  // Get the first Monday of the year
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay();
  const daysToFirstMonday = jan1Day === 0 ? 1 : jan1Day === 1 ? 0 : 8 - jan1Day;
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
  
  // Add weeks
  const weekStart = addWeeks(firstMonday, weekNum - 1);
  return format(weekStart, 'yyyy-MM-dd');
}

function getWeekEndDate(weekNum: number, year: number): string {
  const startDate = parseISO(getWeekStartDate(weekNum, year));
  const end = endOfWeek(startDate, { weekStartsOn: 1 });
  return format(end, 'yyyy-MM-dd');
}
