import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BusinessProcess {
  id: string;
  name_en: string;
  name_ar: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBusinessProcessInput {
  name_en: string;
  name_ar?: string;
  active?: boolean;
}

export interface UpdateBusinessProcessInput {
  name_en?: string;
  name_ar?: string;
  active?: boolean;
  sort_order?: number;
}

// Fetch all business processes (for admin)
export function useAllBusinessProcesses() {
  return useQuery({
    queryKey: ['business-processes', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_processes')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name_en', { ascending: true });

      if (error) throw error;
      return data as BusinessProcess[];
    },
  });
}

// Fetch only active business processes (for dropdowns)
export function useActiveBusinessProcesses() {
  return useQuery({
    queryKey: ['business-processes', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_processes')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('name_en', { ascending: true });

      if (error) throw error;
      return data as BusinessProcess[];
    },
  });
}

// Fetch business processes linked to a specific epic
export function useEpicBusinessProcesses(epicId: string | null) {
  return useQuery({
    queryKey: ['epic-business-processes', epicId],
    queryFn: async () => {
      if (!epicId) return [];

      const { data, error } = await supabase
        .from('epic_business_processes')
        .select(`
          business_process_id,
          business_processes (
            id,
            name_en,
            name_ar,
            active
          )
        `)
        .eq('epic_id', epicId);

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.business_processes.id,
        name_en: item.business_processes.name_en,
        name_ar: item.business_processes.name_ar,
        active: item.business_processes.active,
      })) as Pick<BusinessProcess, 'id' | 'name_en' | 'name_ar' | 'active'>[];
    },
    enabled: !!epicId,
  });
}

// Create a new business process
export function useCreateBusinessProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBusinessProcessInput) => {
      const { data, error } = await supabase
        .from('business_processes')
        .insert({
          name_en: input.name_en,
          name_ar: input.name_ar || null,
          active: input.active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('Business process created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });
}

// Update a business process
export function useUpdateBusinessProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateBusinessProcessInput & { id: string }) => {
      const { data, error } = await supabase
        .from('business_processes')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('Business process updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

// Soft delete (deactivate) a business process
export function useDeleteBusinessProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_processes')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('Business process deactivated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate: ${error.message}`);
    },
  });
}

// Update epic business processes (replaces all)
export function useUpdateEpicBusinessProcesses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ epicId, businessProcessIds }: { epicId: string; businessProcessIds: string[] }) => {
      // Delete existing links
      const { error: deleteError } = await supabase
        .from('epic_business_processes')
        .delete()
        .eq('epic_id', epicId);

      if (deleteError) throw deleteError;

      // Insert new links if any
      if (businessProcessIds.length > 0) {
        const { error: insertError } = await supabase
          .from('epic_business_processes')
          .insert(
            businessProcessIds.map((bpId) => ({
              epic_id: epicId,
              business_process_id: bpId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { epicId }) => {
      queryClient.invalidateQueries({ queryKey: ['epic-business-processes', epicId] });
      toast.success('Business processes updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}
