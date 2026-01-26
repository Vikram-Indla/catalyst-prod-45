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
import { validateAllocationDatesAgainstContract } from '@/utils/allocationValidation';
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
  const [view, setView] = useState<TimelineView>('months');
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
  // Merge consecutive monthly records for the same assignment into ONE bar
  // ============================================
  
  const timelineBars = useMemo((): TimelineBar[] => {
    // Group allocations by assignmentId, then merge overlapping/adjacent ones
    const byAssignment = new Map<string, typeof allocations>();
    allocations.forEach((alloc: any) => {
      const existing = byAssignment.get(alloc.assignmentId) || [];
      existing.push(alloc);
      byAssignment.set(alloc.assignmentId, existing);
    });
    
    const result: TimelineBar[] = [];
    
    byAssignment.forEach((assignmentAllocs, assignmentId) => {
      // Sort by start date
      const sorted = [...assignmentAllocs].sort((a: any, b: any) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      // Merge consecutive/overlapping allocations with the same status
      const merged: { startDate: string; endDate: string; percentage: number; status: string; id: string; originalIds: string[]; assignmentName: string; assignmentColor: string }[] = [];
      
      sorted.forEach((alloc: any) => {
        const lastMerged = merged[merged.length - 1];
        
        if (lastMerged && lastMerged.status === alloc.status && lastMerged.percentage === alloc.percentage) {
          // Check if this allocation is adjacent or overlapping with the last one
          const lastEnd = new Date(lastMerged.endDate);
          const thisStart = new Date(alloc.startDate);
          const daysDiff = (thisStart.getTime() - lastEnd.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 1) {
            // Merge: extend the end date
            lastMerged.endDate = alloc.endDate;
            lastMerged.originalIds.push(alloc.id);
            return;
          }
        }
        
        // Start a new merged segment
        merged.push({
          id: alloc.id,
          originalIds: [alloc.id],
          startDate: alloc.startDate,
          endDate: alloc.endDate,
          percentage: alloc.percentage,
          status: alloc.status,
          assignmentName: alloc.assignmentName,
          assignmentColor: alloc.assignmentColor,
        });
      });
      
      // Convert merged segments to timeline bars
      merged.forEach((seg) => {
        const startDate = parseISO(seg.startDate);
        let endDate = parseISO(seg.endDate);
        
        // CRITICAL: Clamp end date to contract end date - never show allocations beyond contract
        const contractEndDate = resource.contractEnd ? parseISO(resource.contractEnd) : null;
        let clampedEndDate = seg.endDate;
        if (contractEndDate && isBefore(contractEndDate, endDate)) {
          endDate = contractEndDate;
          clampedEndDate = resource.contractEnd!;
        }
        
        // Skip allocations that start after contract end
        if (contractEndDate && isBefore(contractEndDate, startDate)) {
          return; // Don't render this bar at all
        }
        
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
        
        result.push({
          allocationId: seg.id,
          originalIds: seg.originalIds,
          assignmentId,
          assignmentName: seg.assignmentName,
          assignmentColor: seg.assignmentColor,
          startIndex,
          endIndex,
          spanCount: Math.max(1, endIndex - startIndex + 1),
          percentage: seg.percentage,
          status: seg.status as any,
          startDate: seg.startDate,
          endDate: clampedEndDate, // Use clamped end date
        });
      });
    });
    
    return result;
  }, [allocations, periods, view, resource.contractEnd]);

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
  // Deduplicate: show ONE assignment row per unique assignment_id
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
      
      // Validate against contract end date
      if (!validateAllocationDatesAgainstContract(
        startDate,
        endDate,
        resource.contractEnd,
        resource.name
      )) {
        throw new Error('VALIDATION_FAILED'); // Will be caught and not shown as duplicate error
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
     // Invalidate ALL allocation-related queries for complete CRUD sync
     queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['resource-allocations-timeline', resource.id] });
     queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
     queryClient.invalidateQueries({ queryKey: ['analytics-allocations'] });
     queryClient.invalidateQueries({ queryKey: ['analytics-resources'] });
     queryClient.invalidateQueries({ queryKey: ['capacity-summary'] });
     queryClient.invalidateQueries({ queryKey: ['resource-utilization'] });
      refetch();
    },
    onError: (error) => {
      // Don't show duplicate error for validation failures (already shown via toast)
      if (error instanceof Error && error.message === 'VALIDATION_FAILED') return;
      toast.error('Failed to add assignment', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const updateAllocation = useMutation({
    mutationFn: async ({ id, originalIds, ...updates }: { id: string; originalIds?: string[]; percentage?: number; status?: AllocationStatus; startDate?: string; endDate?: string }) => {
      // Validate end date against contract if being updated
      if (updates.endDate !== undefined) {
        if (!validateAllocationDatesAgainstContract(
          updates.startDate || new Date().toISOString().split('T')[0],
          updates.endDate,
          resource.contractEnd,
          resource.name
        )) {
          throw new Error('VALIDATION_FAILED');
        }
      }
      
      // CRITICAL FIX: Delete merged records before updating
      // If this bar was merged from multiple DB records, delete all except the first
      if (originalIds && originalIds.length > 1) {
        const idsToDelete = originalIds.slice(1); // Keep first, delete rest
        console.log(`[updateAllocation] Deleting ${idsToDelete.length} merged records:`, idsToDelete);
        
        const { error: deleteError } = await supabase
          .from('resource_allocations')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error('[updateAllocation] Failed to delete merged records:', deleteError);
          throw deleteError;
        }
      }
      
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.percentage !== undefined) updateData.allocation_percent = updates.percentage;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      
      console.log(`[updateAllocation] Updating primary record ${id}:`, updateData);
      const { error } = await supabase
        .from('resource_allocations')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Allocation updated');
     // Invalidate ALL allocation-related queries for complete CRUD sync
     queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['resource-allocations-timeline', resource.id] });
     queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
     queryClient.invalidateQueries({ queryKey: ['analytics-allocations'] });
     queryClient.invalidateQueries({ queryKey: ['analytics-resources'] });
     queryClient.invalidateQueries({ queryKey: ['capacity-summary'] });
     queryClient.invalidateQueries({ queryKey: ['resource-utilization'] });
      refetch();
    },
    onError: (error) => {
      // Don't show duplicate error for validation failures
      if (error instanceof Error && error.message === 'VALIDATION_FAILED') return;
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
     // Invalidate ALL allocation-related queries for complete CRUD sync
     queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['resource-allocations-timeline', resource.id] });
     queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
     queryClient.invalidateQueries({ queryKey: ['analytics-allocations'] });
     queryClient.invalidateQueries({ queryKey: ['analytics-resources'] });
     queryClient.invalidateQueries({ queryKey: ['capacity-summary'] });
     queryClient.invalidateQueries({ queryKey: ['resource-utilization'] });
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
  // Summary Stats - CURRENT PERIOD ONLY
  // Shows the allocation for the current month/week, not sum of all historical records
  // ============================================
  
  const summary = useMemo(() => {
    // Find the current period
    const currentPeriod = periods.find(p => p.isCurrent);
    if (!currentPeriod) {
      // Fallback: if no current period in view, show 0
      return { committed: 0, forecast: 0, total: 0 };
    }
    
    const periodDate = parseISO(currentPeriod.date);
    let committed = 0;
    let forecast = 0;
    
    allocations.forEach((alloc: any) => {
      const startDate = parseISO(alloc.startDate);
      const endDate = parseISO(alloc.endDate);
      
      // Check if this allocation overlaps with the current period
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
    
    return { committed, forecast, total: committed + forecast };
  }, [allocations, periods, view]);

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
