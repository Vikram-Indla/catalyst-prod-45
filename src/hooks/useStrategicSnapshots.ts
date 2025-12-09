import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export interface StrategicSnapshot {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  total_funding?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  active_since?: string;
  archived_at?: string;
  enterprise_id?: string;
  // Legacy fields
  mission?: string;
  vision?: string;
  values?: any;
  is_active?: boolean;
}

export interface SnapshotConfiguration {
  id: string;
  snapshot_id: string;
  quarters: string[];
  themes: string[];
  org_structures: string[];
  products: string[];
  members: string[];
  notify_on_activation: boolean;
  notify_on_changes: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSnapshotData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  total_funding?: number;
  status?: 'DRAFT' | 'ACTIVE';
}

export interface CreateConfigurationData {
  snapshot_id: string;
  quarters: string[];
  themes: string[];
  org_structures?: string[];
  products?: string[];
  members?: string[];
  notify_on_activation?: boolean;
  notify_on_changes?: boolean;
}

// Generate quarters for current year ± 2 years
export function generateQuarterOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const quarters: string[] = [];
  
  years.forEach(year => {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${year}`);
    }
  });
  
  return quarters;
}

export function useStrategicSnapshots(showArchived = false) {
  return useQuery({
    queryKey: ['strategic-snapshots', showArchived],
    queryFn: async () => {
      let query = supabase
        .from('strategy_snapshots')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!showArchived) {
        query = query.neq('status', 'ARCHIVED');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StrategicSnapshot[];
    },
  });
}

export function useSnapshotConfiguration(snapshotId: string | null) {
  return useQuery({
    queryKey: ['snapshot-configuration', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return null;
      
      const { data, error } = await supabase
        .from('snapshot_configurations')
        .select('*')
        .eq('snapshot_id', snapshotId)
        .maybeSingle();
      
      if (error) throw error;
      return data as SnapshotConfiguration | null;
    },
    enabled: !!snapshotId,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ snapshot, configuration, setActive }: {
      snapshot: CreateSnapshotData;
      configuration: Omit<CreateConfigurationData, 'snapshot_id'>;
      setActive: boolean;
    }) => {
      // Create snapshot
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('strategy_snapshots')
        .insert({
          ...snapshot,
          status: setActive ? 'ACTIVE' : 'DRAFT',
        })
        .select()
        .single();
      
      if (snapshotError) throw snapshotError;
      
      // Create configuration
      const { error: configError } = await supabase
        .from('snapshot_configurations')
        .insert({
          snapshot_id: snapshotData.id,
          ...configuration,
        });
      
      if (configError) throw configError;
      
      return snapshotData;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-snapshots'] });
      
      if (variables.setActive) {
        catalystToast.success('Snapshot Activated', 'Snapshot created and activated. Previous active snapshot archived.');
      } else {
        catalystToast.success('Snapshot Created', 'New snapshot created successfully.');
      }
    },
    onError: (error: any) => {
      if (error.message?.includes('overlaps')) {
        catalystToast.error('Date Overlap', 'Snapshot date range overlaps with an existing snapshot.');
      } else {
        catalystToast.error('Error', error.message || 'Failed to create snapshot.');
      }
    },
  });
}

export function useUpdateSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StrategicSnapshot> }) => {
      const { data: result, error } = await supabase
        .from('strategy_snapshots')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-snapshots'] });
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to update snapshot.');
    },
  });
}

export function useRenameSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-snapshots'] });
      catalystToast.success('Snapshot Renamed', 'Snapshot name updated successfully.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || "Couldn't rename snapshot.");
    },
  });
}

export function useActivateSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .update({ status: 'ACTIVE' })
        .eq('id', snapshotId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-snapshots'] });
      catalystToast.success('Snapshot Activated', 'Previous active snapshot has been archived.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to activate snapshot.');
    },
  });
}

export function useArchiveSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .update({ status: 'ARCHIVED' })
        .eq('id', snapshotId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-snapshots'] });
      catalystToast.success('Snapshot Archived', 'Snapshot has been archived and is now read-only.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to archive snapshot.');
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const { error } = await supabase
        .from('strategy_snapshots')
        .delete()
        .eq('id', snapshotId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-snapshots'] });
      catalystToast.success('Snapshot Deleted', 'Snapshot has been permanently deleted.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to delete snapshot.');
    },
  });
}
