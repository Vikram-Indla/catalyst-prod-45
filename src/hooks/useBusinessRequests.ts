import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BusinessRequest, CreateBusinessRequestFormData, ReadinessChecklist } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

// Helper to transform DB row to BusinessRequest
const transformRow = (row: any): BusinessRequest => ({
  ...row,
  readiness_checklist: (row.readiness_checklist as ReadinessChecklist) || {
    requirements_documented: false,
    technical_design_approved: false,
    resources_allocated: false,
    environment_ready: false,
    test_cases_prepared: false,
  },
});

export function useBusinessRequests(searchQuery?: string) {
  return useQuery({
    queryKey: ['business-requests', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('business_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(transformRow);
    },
  });
}

export function useBusinessRequest(id: string | null) {
  return useQuery({
    queryKey: ['business-request', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('business_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return transformRow(data);
    },
    enabled: !!id,
  });
}

export function useCreateBusinessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBusinessRequestFormData) => {
      const { data: result, error } = await supabase
        .from('business_requests')
        .insert([{
          title: data.title,
          description: data.description || null,
          platform: data.platform,
          complexity: data.complexity,
          urgency: data.urgency,
          track: data.track || null,
          requestor: data.requestor || null,
          business_justification: data.business_justification || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast({ title: 'Business request created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create business request', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBusinessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BusinessRequest> }) => {
      // Convert ReadinessChecklist to Json-compatible format
      const updateData: Record<string, any> = { ...data };
      if (data.readiness_checklist) {
        updateData.readiness_checklist = data.readiness_checklist as unknown as Json;
      }
      
      const { data: result, error } = await supabase
        .from('business_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['business-request'] });
      toast({ title: 'Business request updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update business request', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBusinessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast({ title: 'Business request deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete business request', description: error.message, variant: 'destructive' });
    },
  });
}
