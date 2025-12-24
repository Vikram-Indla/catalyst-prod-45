/**
 * useKanbanData - Fetches business requests and maps to dynamic Kanban columns
 * Columns are built from demand_process_steps table
 * Includes real-time updates for process_step changes
 */

import { useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KanbanTicket, UNCATEGORIZED_COLUMN_ID } from '../types';
import { useKanbanColumns, useProcessSteps } from './useProcessSteps';
import { toast } from 'sonner';

// Map process_step from DB to column ID
// Returns _uncategorized for null/empty/invalid process_steps
const mapProcessStepToColumnId = (processStep: string | null, validStepValues: Set<string>): string => {
  if (!processStep) return UNCATEGORIZED_COLUMN_ID;
  
  // Check if the process_step exists in active steps
  if (validStepValues.has(processStep)) {
    return processStep;
  }
  
  return UNCATEGORIZED_COLUMN_ID;
};

// Derive priority from business_score (for visual display only)
const derivePriorityFromScore = (score: number | null): string => {
  if (score === null) return 'medium';
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

// Calculate days in column (simplified - using created_at)
const calculateDaysInColumn = (createdAt: string | null): number => {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export function useKanbanData() {
  const queryClient = useQueryClient();
  
  // Fetch process steps for column mapping
  const { data: processSteps = [] } = useProcessSteps();
  const validStepValues = useMemo(() => new Set(processSteps.map(s => s.value)), [processSteps]);
  
  // Fetch departments to resolve IDs to names
  const { data: departments = [] } = useQuery({
    queryKey: ['kanban-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const departmentMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach(d => map.set(d.id, d.name));
    return map;
  }, [departments]);
  
  // Use the same query key as useBusinessRequests for data sync
  const { data: rawRequests, isLoading, error } = useQuery({
    queryKey: ['business-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('*')
        .is('deleted_at', null)
        .order('rank', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for business_requests updates
  useEffect(() => {
    const channel = supabase
      .channel('kanban-business-requests')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'business_requests'
        },
        (payload) => {
          console.log('Kanban realtime update:', payload.eventType);
          // Invalidate and refetch business-requests to update the board
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const tickets: KanbanTicket[] = useMemo(() => {
    if (!rawRequests) return [];
    
    return rawRequests.map((req) => ({
      id: req.request_key || `MIM-${String(req.id).slice(-3)}`,
      summary: req.title || 'Untitled Request',
      status: mapProcessStepToColumnId(req.process_step, validStepValues),
      assignee: req.assignee || null,
      businessOwner: req.business_owner || null,
      // Resolve department ID to name
      department: req.department ? (departmentMap.get(req.department) || req.department) : null,
      score: req.business_score,
      rank: req.rank,
      epic: null,
      platform: req.delivery_platform,
      createdAt: req.created_at,
      daysInColumn: calculateDaysInColumn(req.updated_at || req.created_at),
      _dbId: req.id,
      _derivedPriority: derivePriorityFromScore(req.business_score),
    }));
  }, [rawRequests, departmentMap, validStepValues]);

  // Mutation to update status (process_step)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, newStatus }: { ticketId: string; newStatus: string }) => {
      // Find the raw request by ticketId
      const rawRequest = rawRequests?.find(r => 
        (r.request_key === ticketId) || 
        (`MIM-${String(r.id).slice(-3)}` === ticketId)
      );
      
      if (!rawRequest) throw new Error('Request not found');
      
      // If moving to Uncategorized, set process_step to null
      const processStepValue = newStatus === UNCATEGORIZED_COLUMN_ID ? null : newStatus;
      
      const { error } = await supabase
        .from('business_requests')
        .update({ 
          process_step: processStepValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', rawRequest.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate the shared query key - persists across module and project
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    },
    onError: (error) => {
      toast.error('Failed to update status');
      console.error('Status update error:', error);
    },
  });

  return {
    tickets,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
  };
}

// Hook to get team members for avatar filters
export function useTeamMembers() {
  const { data: profiles } = useQuery({
    queryKey: ['kanban-team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  return useMemo(() => {
    if (!profiles) return [];
    
    const colors = ['#5c7c5c', '#8b7355', '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b'];
    
    return profiles.map((p, idx) => {
      const name = p.full_name || 'Unknown';
      const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      return {
        id: p.id,
        name,
        initials,
        color: colors[idx % colors.length],
      };
    });
  }, [profiles]);
}
