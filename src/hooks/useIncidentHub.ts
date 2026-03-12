/**
 * IncidentHub — TanStack Query hooks for redesigned views
 * Uses existing Supabase tables: incidents, incident_comments, incident_history,
 * incident_list_view, committee_queue_view
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── List View (uses optimized view) ──
export function useIncidentListView() {
  return useQuery({
    queryKey: ['incident-hub-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_list_view')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Committee Queue ──
export function useCommitteeQueueView() {
  return useQuery({
    queryKey: ['incident-hub-committee-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committee_queue_view')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Stats aggregation ──
export function useIncidentStats() {
  const { data: incidents } = useIncidentListView();
  
  if (!incidents) return { total: 0, sev1: 0, sev2: 0, active: 0, committeePending: 0, resolvedWeek: 0 };
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return {
    total: incidents.length,
    sev1: incidents.filter(i => i.severity === 'SEV1').length,
    sev2: incidents.filter(i => i.severity === 'SEV2').length,
    active: incidents.filter(i => i.status && !['resolved', 'closed', 'converted'].includes(i.status)).length,
    committeePending: incidents.filter(i => i.committee_status === 'pending').length,
    resolvedWeek: incidents.filter(i => i.resolved_at && new Date(i.resolved_at) >= weekAgo).length,
  };
}

// ── Update incident status with history ──
export function useUpdateIncidentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, changedBy }: { id: string; status: string; changedBy: string }) => {
      const { data: current } = await supabase.from('incidents').select('status').eq('id', id).single();
      const { error } = await supabase.from('incidents').update({ status, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
      await supabase.from('incident_history').insert({
        incident_id: id,
        changed_by: changedBy,
        field_name: 'status',
        old_value: current?.status,
        new_value: status,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident-hub-list'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}
