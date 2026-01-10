import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  RAGeneration, 
  RAGenerationStats, 
  CreateRAGeneration, 
  UpdateRAGeneration,
  GenerationStatus 
} from '@/types/requirement-assist';

interface GenerationFilters {
  status?: GenerationStatus | 'all';
  search?: string;
  programId?: string;
  projectId?: string;
  limit?: number;
  offset?: number;
}

// Fetch all generations with filters
export function useRAGenerations(filters?: GenerationFilters) {
  return useQuery({
    queryKey: ['ra-generations', filters],
    queryFn: async () => {
      let query = supabase
        .from('ra_generations')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,display_id.ilike.%${filters.search}%`);
      }
      if (filters?.programId) {
        query = query.eq('program_id', filters.programId);
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RAGeneration[];
    },
  });
}

// Fetch single generation by ID
export function useRAGeneration(id: string | undefined) {
  return useQuery({
    queryKey: ['ra-generation', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('ra_generations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as RAGeneration | null;
    },
    enabled: !!id,
  });
}

// Fetch generation stats
export function useRAGenerationStats() {
  return useQuery({
    queryKey: ['ra-generation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ra_generations')
        .select('status')
        .is('deleted_at', null);
      
      if (error) throw error;

      const stats: RAGenerationStats = {
        total: data.length,
        published: data.filter(g => g.status === 'published').length,
        draft: data.filter(g => g.status === 'draft').length,
        failed: data.filter(g => g.status === 'failed').length,
        processing: data.filter(g => g.status === 'processing').length,
      };
      return stats;
    },
  });
}

// Create generation
export function useCreateRAGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (generation: CreateRAGeneration) => {
      const { data, error } = await supabase
        .from('ra_generations')
        .insert(generation)
        .select()
        .single();
      if (error) throw error;
      return data as RAGeneration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-generations'] });
      queryClient.invalidateQueries({ queryKey: ['ra-generation-stats'] });
    },
    onError: (error) => {
      console.error('Error creating generation:', error);
      toast.error('Failed to create generation');
    },
  });
}

// Update generation
export function useUpdateRAGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateRAGeneration & { id: string }) => {
      const { data, error } = await supabase
        .from('ra_generations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RAGeneration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ra-generations'] });
      queryClient.invalidateQueries({ queryKey: ['ra-generation', data.id] });
      queryClient.invalidateQueries({ queryKey: ['ra-generation-stats'] });
    },
    onError: (error) => {
      console.error('Error updating generation:', error);
      toast.error('Failed to update generation');
    },
  });
}

// Soft delete generation
export function useDeleteRAGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ra_generations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-generations'] });
      queryClient.invalidateQueries({ queryKey: ['ra-generation-stats'] });
      toast.success('Generation deleted');
    },
    onError: (error) => {
      console.error('Error deleting generation:', error);
      toast.error('Failed to delete generation');
    },
  });
}

// Duplicate generation
export function useDuplicateRAGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch original
      const { data: original, error: fetchError } = await supabase
        .from('ra_generations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Create copy (excluding id, display_id, generation_number)
      const { id: _, display_id, generation_number, created_at, updated_at, published_at, ...rest } = original;
      
      const { data, error } = await supabase
        .from('ra_generations')
        .insert({
          ...rest,
          title: `${rest.title} (Copy)`,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data as RAGeneration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-generations'] });
      queryClient.invalidateQueries({ queryKey: ['ra-generation-stats'] });
      toast.success('Generation duplicated');
    },
    onError: (error) => {
      console.error('Error duplicating generation:', error);
      toast.error('Failed to duplicate generation');
    },
  });
}

// Publish generation
export function usePublishRAGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('ra_generations')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RAGeneration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ra-generations'] });
      queryClient.invalidateQueries({ queryKey: ['ra-generation', data.id] });
      queryClient.invalidateQueries({ queryKey: ['ra-generation-stats'] });
      toast.success('Generation published!');
    },
    onError: (error) => {
      console.error('Error publishing generation:', error);
      toast.error('Failed to publish generation');
    },
  });
}
