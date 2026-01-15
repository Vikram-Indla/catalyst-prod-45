/**
 * useResourceAllocation Hook
 * Manages state and data fetching for the Resource Allocation View
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  startOfWeek, 
  addWeeks, 
  parseISO, 
  format,
  getISOWeek,
  eachWeekOfInterval,
  endOfWeek
} from 'date-fns';
import type { 
  AllocationResource, 
  Assignment, 
  Allocation,
  WeekColumn,
  AllocationStatus
} from '@/types/resource-allocation.types';
import { 
  generateVisibleWeeks, 
  validateBeforeSave,
  getDefaultForecastBoundary,
  assignColorsToAssignments
} from '@/utils/allocation.utils';

interface UseResourceAllocationProps {
  resource: AllocationResource;
  onClose?: () => void;
}

export function useResourceAllocation({ resource, onClose }: UseResourceAllocationProps) {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingCell, setEditingCell] = useState<{ assignmentId: string; weekStart: string } | null>(null);
  const [localAllocations, setLocalAllocations] = useState<Allocation[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  // Current date context: January 15, 2026
  const today = useMemo(() => new Date('2026-01-15'), []);
  
  // Calculate visible weeks
  const visibleWeeks = useMemo(() => {
    const startDate = startOfWeek(
      addWeeks(parseISO(resource.contractStart), weekOffset),
      { weekStartsOn: 1 }
    );
    const forecastBoundary = resource.forecastBoundary 
      ? parseISO(resource.forecastBoundary)
      : parseISO(getDefaultForecastBoundary(today));
    
    return generateVisibleWeeks(startDate, forecastBoundary, today);
  }, [resource.contractStart, resource.forecastBoundary, weekOffset, today]);

  // Fetch assignments for this resource
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['resource-assignments-for-allocation', resource.id],
    queryFn: async () => {
      // Get all assignments this resource is allocated to
      const { data: allocations, error: allocError } = await supabase
        .from('resource_allocations')
        .select('assignment_id')
        .eq('resource_id', resource.id);
      
      if (allocError) throw allocError;
      
      const assignmentIds = [...new Set(allocations?.map(a => a.assignment_id) || [])];
      
      if (assignmentIds.length === 0) {
        // Fallback: get all active assignments
        const { data: allAssignments, error } = await supabase
          .from('resource_assignments')
          .select('id, name')
          .eq('is_active', true)
          .order('sort_order')
          .limit(4);
        
        if (error) throw error;
        
        return assignColorsToAssignments(
          (allAssignments || []).map(a => ({
            id: a.id,
            name: a.name,
            color: 'primary' as const
          }))
        );
      }
      
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('id, name')
        .in('id', assignmentIds)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      
      return assignColorsToAssignments(
        (data || []).map(a => ({
          id: a.id,
          name: a.name,
          color: 'primary' as const
        }))
      );
    }
  });

  // Fetch allocations for this resource
  const { data: serverAllocations = [], isLoading: loadingAllocations, refetch } = useQuery({
    queryKey: ['resource-allocations-detail', resource.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_allocations')
        .select('*')
        .eq('resource_id', resource.id)
        .order('start_date');
      
      if (error) throw error;
      
      // Transform to weekly allocations
      const weeklyAllocations: Allocation[] = [];
      
      (data || []).forEach(alloc => {
        const startDate = parseISO(alloc.start_date);
        const endDate = parseISO(alloc.end_date);
        
        // Generate weekly entries for the allocation period
        const weeks = eachWeekOfInterval(
          { start: startDate, end: endDate },
          { weekStartsOn: 1 }
        );
        
        weeks.forEach(weekStart => {
          weeklyAllocations.push({
            id: `${alloc.id}-${format(weekStart, 'yyyy-MM-dd')}`,
            resourceId: alloc.resource_id,
            assignmentId: alloc.assignment_id,
            weekStart: format(weekStart, 'yyyy-MM-dd'),
            percentage: alloc.allocation_percent,
            status: (alloc.status as AllocationStatus) || 'committed',
          });
        });
      });
      
      return weeklyAllocations;
    }
  });

  // Sync server allocations to local state
  useEffect(() => {
    if (serverAllocations.length > 0 && !isDirty) {
      setLocalAllocations(serverAllocations);
    }
  }, [serverAllocations, isDirty]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (allocations: Allocation[]) => {
      // Group allocations by assignment to create consolidated records
      const byAssignment = allocations.reduce((acc, alloc) => {
        if (!acc[alloc.assignmentId]) acc[alloc.assignmentId] = [];
        acc[alloc.assignmentId].push(alloc);
        return acc;
      }, {} as Record<string, Allocation[]>);

      // For each assignment, find contiguous date ranges and upsert
      for (const [assignmentId, allocs] of Object.entries(byAssignment)) {
        // Sort by week start
        const sorted = allocs.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
        
        if (sorted.length === 0) continue;
        
        // Get first and last week
        const firstWeek = parseISO(sorted[0].weekStart);
        const lastWeek = parseISO(sorted[sorted.length - 1].weekStart);
        const endDate = endOfWeek(lastWeek, { weekStartsOn: 1 });
        
        // Use most common percentage
        const percentage = sorted[0].percentage;
        const status = sorted[0].status;
        
        // Upsert the allocation
        const { error } = await supabase
          .from('resource_allocations')
          .upsert({
            resource_id: resource.id,
            assignment_id: assignmentId,
            start_date: format(firstWeek, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            allocation_percent: percentage,
            status: status,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'resource_id,assignment_id'
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Allocations saved successfully');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['resource-allocations-detail', resource.id] });
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to save allocations', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update a single allocation
  const updateAllocation = useCallback((
    assignmentId: string,
    weekStart: string,
    percentage: number,
    status: AllocationStatus
  ) => {
    setLocalAllocations(prev => {
      const existingIndex = prev.findIndex(
        a => a.assignmentId === assignmentId && a.weekStart === weekStart
      );
      
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          percentage,
          status,
        };
        return updated;
      } else {
        // Add new
        return [...prev, {
          id: `new-${assignmentId}-${weekStart}`,
          resourceId: resource.id,
          assignmentId,
          weekStart,
          percentage,
          status,
        }];
      }
    });
    setIsDirty(true);
  }, [resource.id]);

  // Navigate timeline
  const navigateWeeks = useCallback((direction: 'prev' | 'next') => {
    setWeekOffset(prev => prev + (direction === 'next' ? 4 : -4));
  }, []);

  const goToToday = useCallback(() => {
    setWeekOffset(0);
  }, []);

  // Save changes
  const saveChanges = useCallback(() => {
    const validation = validateBeforeSave(localAllocations);
    
    if (!validation.isValid) {
      toast.error('Cannot save: ' + validation.errors[0]);
      return;
    }
    
    if (validation.warnings.length > 0) {
      toast.warning(validation.warnings[0]);
    }
    
    saveMutation.mutate(localAllocations);
  }, [localAllocations, saveMutation]);

  // Discard changes
  const discardChanges = useCallback(() => {
    setLocalAllocations(serverAllocations);
    setIsDirty(false);
    setEditingCell(null);
  }, [serverAllocations]);

  // Validation
  const validation = useMemo(() => 
    validateBeforeSave(localAllocations), 
    [localAllocations]
  );

  return {
    // Data
    resource,
    assignments,
    allocations: localAllocations,
    visibleWeeks,
    today,
    
    // State
    weekOffset,
    editingCell,
    isDirty,
    isSaving: saveMutation.isPending,
    isLoading: loadingAssignments || loadingAllocations,
    validation,
    
    // Actions
    setEditingCell,
    updateAllocation,
    navigateWeeks,
    goToToday,
    saveChanges,
    discardChanges,
    onClose,
  };
}
