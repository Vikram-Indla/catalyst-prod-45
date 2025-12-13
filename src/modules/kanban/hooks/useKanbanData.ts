// Hook to fetch and transform business requests for Kanban view

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KanbanTicket, StatusId, PRIORITIES } from '../types';
import { toast } from 'sonner';

// Map process_step from DB to StatusId
const mapProcessStepToStatus = (processStep: string | null): StatusId => {
  if (!processStep) return 'new_request';
  
  const stepMap: Record<string, StatusId> = {
    'NEW_REQUEST': 'new_request',
    'New Request': 'new_request',
    'ANALYSE': 'analyse',
    'Analyse': 'analyse',
    'APPROVED': 'approved',
    'Approved': 'approved',
    'IMPLEMENT': 'implement',
    'Implement': 'implement',
    'CLOSED': 'closed',
    'Closed': 'closed',
    'REJECTED': 'rejected',
    'Rejected': 'rejected',
    'ON_HOLD': 'on_hold',
    'On-Hold': 'on_hold',
    'On Hold': 'on_hold',
  };
  
  return stepMap[processStep] || 'new_request';
};

// Map StatusId back to process_step for DB
const mapStatusToProcessStep = (status: StatusId): string => {
  const stepMap: Record<StatusId, string> = {
    'new_request': 'NEW_REQUEST',
    'analyse': 'ANALYSE',
    'approved': 'APPROVED',
    'implement': 'IMPLEMENT',
    'closed': 'CLOSED',
    'rejected': 'REJECTED',
    'on_hold': 'ON_HOLD',
  };
  return stepMap[status];
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
  
  const { data: rawRequests, isLoading, error } = useQuery({
    queryKey: ['kanban-business-requests'],
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

  // Transform to KanbanTicket format
  const tickets: KanbanTicket[] = useMemo(() => {
    if (!rawRequests) return [];
    
    return rawRequests.map((req) => ({
      id: req.request_key || `MIM-${String(req.id).slice(-3)}`,
      summary: req.title || 'Untitled Request',
      status: mapProcessStepToStatus(req.process_step),
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
  }, [rawRequests, departmentMap]);

  // Mutation to update status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, newStatus }: { ticketId: string; newStatus: StatusId }) => {
      // Find the DB ID from our tickets
      const ticket = tickets.find(t => t.id === ticketId);
      const rawRequest = rawRequests?.find(r => 
        (r.request_key === ticketId) || 
        (`MIM-${String(r.id).slice(-3)}` === ticketId)
      );
      
      if (!rawRequest) throw new Error('Request not found');
      
      const { error } = await supabase
        .from('business_requests')
        .update({ 
          process_step: mapStatusToProcessStep(newStatus),
          updated_at: new Date().toISOString()
        })
        .eq('id', rawRequest.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-business-requests'] });
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
