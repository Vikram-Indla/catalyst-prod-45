/**
 * useAllocationDrawer Hook
 * Manages state and data for the legacy Allocation Drawer component
 * Catalyst V5 Enterprise Design System
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  parseISO, 
  startOfWeek, 
  addWeeks,
  format,
  isBefore,
  startOfDay
} from 'date-fns';
import { toast } from 'sonner';
import type { 
  AllocationResource, 
  Assignment, 
  WeeklyAllocation,
  WeekColumn,
  ValidationResult
} from '@/types/resource-allocation.types';
import { 
  generateVisibleWeeks, 
  validateBeforeSave,
  assignColorsToAssignments
} from '@/utils/allocation.utils';

interface UseAllocationDrawerProps {
  resource: AllocationResource;
  onClose: () => void;
}

interface EditingCell {
  assignmentId: string;
  weekStart: string;
}

export function useAllocationDrawer({ resource, onClose }: UseAllocationDrawerProps) {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [localAllocations, setLocalAllocations] = useState<WeeklyAllocation[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  const today = useMemo(() => startOfDay(new Date()), []);
  const forecastBoundary = parseISO(resource.forecastBoundary);

  // Calculate visible weeks
  const visibleWeeks = useMemo(() => {
    const startDate = addWeeks(
      startOfWeek(today, { weekStartsOn: 1 }),
      weekOffset - 2
    );
    return generateVisibleWeeks(startDate, forecastBoundary, today);
  }, [today, weekOffset, forecastBoundary]);

  // Fetch assignments for this resource
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['resource-assignments-drawer', resource.id],
    queryFn: async (): Promise<Assignment[]> => {
      // @ts-expect-error - Supabase type instantiation depth issue
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('id, name, color')
        .eq('resource_id', resource.id)
        .order('name');
      
      if (error) throw error;
      
      if (error) throw error;
      
      const rawData = data as Array<{ id: string; name: string; color: string | null }> | null;
      return assignColorsToAssignments((rawData || []).map(d => ({
        id: d.id,
        name: d.name,
        color: d.color || '#2563eb'
      })));
    },
  });

  // Fetch allocations for this resource
  const { data: serverAllocations = [], isLoading: isLoadingAllocations } = useQuery({
    queryKey: ['resource-allocations-drawer', resource.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_allocations')
        .select('*')
        .eq('resource_id', resource.id);
      
      if (error) throw error;

      // Convert to weekly allocations for the grid
      const weeklyAllocations: WeeklyAllocation[] = [];
      
      (data || []).forEach(alloc => {
        // For each allocation, generate weekly entries
        const startDate = parseISO(alloc.start_date);
        const endDate = alloc.end_date ? parseISO(alloc.end_date) : startDate;
        
        let currentWeek = startOfWeek(startDate, { weekStartsOn: 1 });
        const lastWeek = startOfWeek(endDate, { weekStartsOn: 1 });
        
        while (!isBefore(lastWeek, currentWeek)) {
          weeklyAllocations.push({
            id: `${alloc.id}-${format(currentWeek, 'yyyy-MM-dd')}`,
            resourceId: alloc.resource_id,
            assignmentId: alloc.assignment_id,
            weekStart: format(currentWeek, 'yyyy-MM-dd'),
            percentage: alloc.allocation_percent || 0,
            status: (alloc.status as 'committed' | 'forecast') || 'forecast',
          });
          currentWeek = addWeeks(currentWeek, 1);
        }
      });
      
      return weeklyAllocations;
    },
    enabled: assignments.length > 0,
  });

  // Initialize local allocations from server
  useMemo(() => {
    if (serverAllocations.length > 0 && !isDirty) {
      setLocalAllocations(serverAllocations);
    }
  }, [serverAllocations, isDirty]);

  // Allocations to use (local if dirty, server otherwise)
  const allocations = isDirty ? localAllocations : serverAllocations;

  // Validation
  const validation = useMemo<ValidationResult>(() => {
    return validateBeforeSave(allocations);
  }, [allocations]);

  // Navigation
  const navigateWeeks = useCallback((direction: 'prev' | 'next') => {
    setWeekOffset(prev => direction === 'prev' ? prev - 4 : prev + 4);
  }, []);

  const goToToday = useCallback(() => {
    setWeekOffset(0);
  }, []);

  // Update allocation
  const updateAllocation = useCallback((
    assignmentId: string, 
    weekStart: string, 
    percentage: number,
    status: 'committed' | 'forecast'
  ) => {
    setLocalAllocations(prev => {
      const existing = prev.find(
        a => a.assignmentId === assignmentId && a.weekStart === weekStart
      );
      
      if (existing) {
        return prev.map(a => 
          a.assignmentId === assignmentId && a.weekStart === weekStart
            ? { ...a, percentage, status }
            : a
        );
      } else {
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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Group allocations by assignment
      const byAssignment = allocations.reduce((acc, alloc) => {
        if (!acc[alloc.assignmentId]) acc[alloc.assignmentId] = [];
        acc[alloc.assignmentId].push(alloc);
        return acc;
      }, {} as Record<string, WeeklyAllocation[]>);

      // Delete existing and insert new for each assignment
      for (const [assignmentId, weeklyAllocs] of Object.entries(byAssignment)) {
        // Delete existing allocations for this assignment
        await supabase
          .from('resource_allocations')
          .delete()
          .eq('resource_id', resource.id)
          .eq('assignment_id', assignmentId);

        // Group consecutive weeks with same percentage/status
        const grouped = groupConsecutiveWeeks(weeklyAllocs);
        
        // Insert grouped allocations
        for (const group of grouped) {
          if (group.percentage > 0) {
            await supabase
              .from('resource_allocations')
              .insert({
                resource_id: resource.id,
                assignment_id: assignmentId,
                start_date: group.weekStart,
                end_date: group.weekEnd,
                allocation_percent: group.percentage,
                status: group.status,
              });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations-drawer', resource.id] });
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      setIsDirty(false);
      toast.success('Allocations saved successfully');
    },
    onError: (error) => {
      console.error('Failed to save allocations:', error);
      toast.error('Failed to save allocations');
    },
  });

  const saveChanges = useCallback(() => {
    if (validation.isValid) {
      saveMutation.mutate();
    }
  }, [validation.isValid, saveMutation]);

  const discardChanges = useCallback(() => {
    setLocalAllocations(serverAllocations);
    setIsDirty(false);
    setEditingCell(null);
  }, [serverAllocations]);

  return {
    assignments,
    allocations,
    visibleWeeks,
    today,
    weekOffset,
    editingCell,
    isDirty,
    isSaving: saveMutation.isPending,
    isLoading: isLoadingAssignments || isLoadingAllocations,
    validation,
    setEditingCell,
    updateAllocation,
    navigateWeeks,
    goToToday,
    saveChanges,
    discardChanges,
  };
}

// Helper to group consecutive weeks with same percentage/status
function groupConsecutiveWeeks(allocations: WeeklyAllocation[]): Array<{
  weekStart: string;
  weekEnd: string;
  percentage: number;
  status: 'committed' | 'forecast';
}> {
  const sorted = [...allocations].sort((a, b) => 
    a.weekStart.localeCompare(b.weekStart)
  );
  
  const groups: Array<{
    weekStart: string;
    weekEnd: string;
    percentage: number;
    status: 'committed' | 'forecast';
  }> = [];
  
  let current: typeof groups[0] | null = null;
  
  for (const alloc of sorted) {
    if (!current) {
      current = {
        weekStart: alloc.weekStart,
        weekEnd: alloc.weekStart,
        percentage: alloc.percentage,
        status: alloc.status,
      };
    } else if (
      alloc.percentage === current.percentage && 
      alloc.status === current.status
    ) {
      // Extend current group
      current.weekEnd = alloc.weekStart;
    } else {
      // Start new group
      groups.push(current);
      current = {
        weekStart: alloc.weekStart,
        weekEnd: alloc.weekStart,
        percentage: alloc.percentage,
        status: alloc.status,
      };
    }
  }
  
  if (current) groups.push(current);
  
  return groups;
}
