// ============================================================
// GENERATION HISTORY HOOK
// Fetches all generations across Catalyst with filtering
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GenerationItem {
  id: string;
  generation_id: string;
  temp_display_id: string;
  permanent_display_id: string | null;
  item_type: 'prd' | 'epic' | 'feature' | 'story' | 'task' | 'test_case';
  parent_id: string | null;
  title: string;
  description: string | null;
  acceptance_criteria: string[];
  confidence_score: number;
  is_selected: boolean;
  is_edited: boolean;
  is_published: boolean;
  published_at: string | null;
  sort_order: number;
  level: number;
}

// Display status for UI (computed from items)
export type GenerationDisplayStatus = 'draft' | 'partial' | 'published' | 'processing' | 'failed' | 'completed';

export interface Generation {
  id: string;
  display_id: string;
  title: string | null;
  input_text: string;
  program_id: string | null;
  project_id: string | null;
  status: string; // DB status
  displayStatus: GenerationDisplayStatus; // Computed for UI
  epic_count: number;
  feature_count: number;
  story_count: number;
  total_count: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  created_by: string | null;
  program?: {
    id: string;
    name: string;
    key: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
    key: string | null;
  } | null;
  items?: GenerationItem[];
  published_keys?: string[];
  published_count?: number;
}

export interface GenerationHistoryFilters {
  search: string;
  programId: string;
  projectId: string;
  status: '' | 'published' | 'partial' | 'draft';
}

export interface GenerationHistoryStats {
  totalCount: number;
  publishedCount: number;
  pendingCount: number;
  programCount: number;
  projectCount: number;
}

export function useGenerationHistory() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<GenerationHistoryFilters>({
    search: '',
    programId: '',
    projectId: '',
    status: '',
  });

  // Fetch programs for filter dropdown
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, key')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects for filter dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list', filters.programId],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, name, key, program_id')
        .order('name');
      
      if (filters.programId) {
        query = query.eq('program_id', filters.programId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch generations with related data
  const { data: generations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['generation-history', filters],
    queryFn: async () => {
      let query = supabase
        .from('generations')
        .select(`
          id,
          display_id,
          title,
          input_text,
          program_id,
          project_id,
          status,
          epic_count,
          feature_count,
          story_count,
          total_count,
          is_published,
          published_at,
          created_at,
          created_by,
          programs:program_id (id, name, key),
          projects:project_id (id, name, key)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters.programId) {
        query = query.eq('program_id', filters.programId);
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters.search) {
        query = query.or(`display_id.ilike.%${filters.search}%,input_text.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch items for each generation
      const generationsWithItems = await Promise.all(
        (data || []).map(async (gen) => {
          const { data: items } = await supabase
            .from('generation_items')
            .select('*')
            .eq('generation_id', gen.id)
            .order('sort_order');

          const itemsList = items || [];
          const publishedItems = itemsList.filter(i => i.is_published);
          const publishedKeys = publishedItems.map(i => i.permanent_display_id || i.temp_display_id);
          
          // Calculate display status for UI
          let displayStatus: GenerationDisplayStatus = 'draft';
          if (publishedItems.length === itemsList.length && itemsList.length > 0) {
            displayStatus = 'published';
          } else if (publishedItems.length > 0) {
            displayStatus = 'partial';
          } else if (gen.status === 'completed') {
            displayStatus = 'draft';
          } else if (gen.status === 'failed') {
            displayStatus = 'failed';
          } else if (['analyzing', 'generating', 'validating'].includes(gen.status)) {
            displayStatus = 'processing';
          }

          return {
            ...gen,
            program: gen.programs,
            project: gen.projects,
            items: itemsList as GenerationItem[],
            published_keys: publishedKeys,
            published_count: publishedItems.length,
            displayStatus,
          };
        })
      );

      // Apply status filter after computing
      if (filters.status) {
        return generationsWithItems.filter(g => g.displayStatus === filters.status) as Generation[];
      }

      return generationsWithItems as Generation[];
    },
  });

  // Calculate stats
  const stats = useMemo<GenerationHistoryStats>(() => {
    const uniquePrograms = new Set(generations.map(g => g.program_id).filter(Boolean));
    const uniqueProjects = new Set(generations.map(g => g.project_id).filter(Boolean));
    
    return {
      totalCount: generations.length,
      publishedCount: generations.filter(g => g.displayStatus === 'published').length,
      pendingCount: generations.filter(g => g.displayStatus === 'draft' || g.displayStatus === 'partial').length,
      programCount: uniquePrograms.size,
      projectCount: uniqueProjects.size,
    };
  }, [generations]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('generations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generation-history'] });
      toast.success('Generation deleted');
    },
    onError: () => {
      toast.error('Failed to delete generation');
    },
  });

  const deleteGeneration = useCallback(async (id: string) => {
    if (!confirm('Delete this generation? Published items will remain in backlog.')) return;
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const updateFilter = useCallback((key: keyof GenerationHistoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', programId: '', projectId: '', status: '' });
  }, []);

  return {
    generations: generations as Generation[],
    isLoading,
    error,
    filters,
    updateFilter,
    clearFilters,
    stats,
    programs,
    projects,
    deleteGeneration,
    refetch,
  };
}
