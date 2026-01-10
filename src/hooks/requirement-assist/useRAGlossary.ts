import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  RAGlossaryTerm, 
  CreateRAGlossaryTerm, 
  UpdateRAGlossaryTerm 
} from '@/types/requirement-assist';

// Fetch all glossary terms
export function useRAGlossaryTerms(category?: string) {
  return useQuery({
    queryKey: ['ra-glossary', category],
    queryFn: async () => {
      let query = supabase
        .from('ra_glossary_terms')
        .select('*')
        .order('english_term', { ascending: true });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RAGlossaryTerm[];
    },
  });
}

// Get unique categories
export function useRAGlossaryCategories() {
  return useQuery({
    queryKey: ['ra-glossary-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ra_glossary_terms')
        .select('category');

      if (error) throw error;
      
      const categories = [...new Set(data.map(d => d.category))].sort();
      return categories;
    },
  });
}

// Fetch single term
export function useRAGlossaryTerm(id: string | undefined) {
  return useQuery({
    queryKey: ['ra-glossary-term', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('ra_glossary_terms')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as RAGlossaryTerm | null;
    },
    enabled: !!id,
  });
}

// Search terms
export function useRAGlossarySearch(searchTerm: string) {
  return useQuery({
    queryKey: ['ra-glossary-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('ra_glossary_terms')
        .select('*')
        .or(`english_term.ilike.%${searchTerm}%,arabic_translation.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      return data as RAGlossaryTerm[];
    },
    enabled: searchTerm.length >= 2,
  });
}

// Create term
export function useCreateRAGlossaryTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (term: CreateRAGlossaryTerm) => {
      const { data, error } = await supabase
        .from('ra_glossary_terms')
        .insert(term)
        .select()
        .single();
      if (error) throw error;
      return data as RAGlossaryTerm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-glossary'] });
      queryClient.invalidateQueries({ queryKey: ['ra-glossary-categories'] });
      toast.success('Term added');
    },
    onError: (error: any) => {
      console.error('Error creating term:', error);
      if (error.code === '23505') {
        toast.error('Term already exists');
      } else {
        toast.error('Failed to add term');
      }
    },
  });
}

// Update term
export function useUpdateRAGlossaryTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateRAGlossaryTerm & { id: string }) => {
      const { data, error } = await supabase
        .from('ra_glossary_terms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RAGlossaryTerm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ra-glossary'] });
      queryClient.invalidateQueries({ queryKey: ['ra-glossary-term', data.id] });
      queryClient.invalidateQueries({ queryKey: ['ra-glossary-categories'] });
      toast.success('Term updated');
    },
    onError: (error) => {
      console.error('Error updating term:', error);
      toast.error('Failed to update term');
    },
  });
}

// Delete term
export function useDeleteRAGlossaryTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ra_glossary_terms')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-glossary'] });
      queryClient.invalidateQueries({ queryKey: ['ra-glossary-categories'] });
      toast.success('Term deleted');
    },
    onError: (error) => {
      console.error('Error deleting term:', error);
      toast.error('Failed to delete term');
    },
  });
}
