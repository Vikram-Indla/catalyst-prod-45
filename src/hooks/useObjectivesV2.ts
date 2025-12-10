import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// OKR v2 Types - Unified Objectives (no Portfolio/Program tiers)
// Map to existing DB statuses for compatibility
export type ObjectiveStatusV2 = 'pending' | 'in_progress' | 'completed' | 'at_risk' | 'off_track' | 'on_track';

export type ObjectiveHealthV2 = 'good' | 'fair' | 'poor' | 'at_risk';

export type ObjectiveVisibility = 'org-wide' | 'business-unit' | 'product-line';

export interface ObjectiveV2 {
  id: string;
  name: string;
  description?: string;
  theme_id?: string;
  owner_id?: string;
  start_date?: string;
  due_date?: string;
  status: ObjectiveStatusV2;
  health?: ObjectiveHealthV2;
  visibility: ObjectiveVisibility;
  overall_progress: number;
  is_v2: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  theme_name?: string;
  owner_name?: string;
  key_results_count?: number;
  linked_work_count?: number;
}

export interface ObjectiveFiltersV2 {
  themeId?: string;
  ownerId?: string;
  status?: ObjectiveStatusV2[];
  health?: ObjectiveHealthV2[];
  timeframe?: { start?: string; end?: string };
  hasLinkedWork?: boolean;
  search?: string;
}

export interface CreateObjectiveInputV2 {
  name: string;
  description?: string;
  theme_id?: string;
  owner_id?: string;
  start_date?: string;
  due_date?: string;
  status?: ObjectiveStatusV2;
  visibility?: ObjectiveVisibility;
}

export interface UpdateObjectiveInputV2 {
  name?: string;
  description?: string;
  theme_id?: string;
  owner_id?: string;
  start_date?: string;
  due_date?: string;
  status?: ObjectiveStatusV2;
  health?: ObjectiveHealthV2;
  visibility?: ObjectiveVisibility;
}

function determineHealth(progress: number, hasKRs: boolean): ObjectiveHealthV2 {
  if (!hasKRs) return 'at_risk';
  if (progress >= 75) return 'good';
  if (progress >= 40) return 'fair';
  return 'poor';
}

export function useObjectivesV2(filters?: ObjectiveFiltersV2) {
  return useQuery({
    queryKey: ['objectives-v2', filters],
    queryFn: async () => {
      // Fetch objectives marked as v2 or all objectives in v2 mode
      let query = supabase
        .from('objectives')
        .select(`
          id,
          name,
          description,
          theme_id,
          owner_id,
          start_date,
          due_date,
          status,
          health,
          visibility,
          overall_progress,
          is_v2,
          created_at,
          updated_at,
          created_by,
          profiles:owner_id (id, full_name, avatar_url)
        `)
        .eq('is_v2', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.themeId) {
        query = query.eq('theme_id', filters.themeId);
      }
      if (filters?.ownerId) {
        query = query.eq('owner_id', filters.ownerId);
      }
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters?.health && filters.health.length > 0) {
        query = query.in('health', filters.health);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.timeframe?.start) {
        query = query.gte('start_date', filters.timeframe.start);
      }
      if (filters?.timeframe?.end) {
        query = query.lte('due_date', filters.timeframe.end);
      }

      const { data: objectives, error } = await query;
      if (error) throw error;

      // Fetch theme names
      const themeIds = [...new Set(objectives?.filter(o => o.theme_id).map(o => o.theme_id))];
      const { data: themes } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .in('id', themeIds.length > 0 ? themeIds : ['00000000-0000-0000-0000-000000000000']);
      const themeMap = new Map(themes?.map(t => [t.id, t.name]) || []);

      // Fetch KR counts
      const objectiveIds = objectives?.map(o => o.id) || [];
      const { data: krCounts } = await supabase
        .from('key_results_v2')
        .select('objective_id')
        .in('objective_id', objectiveIds.length > 0 ? objectiveIds : ['00000000-0000-0000-0000-000000000000']);
      
      const krCountMap = new Map<string, number>();
      krCounts?.forEach(kr => {
        krCountMap.set(kr.objective_id, (krCountMap.get(kr.objective_id) || 0) + 1);
      });

      // Fetch work contribution counts (via KRs)
      const { data: krs } = await supabase
        .from('key_results_v2')
        .select('id, objective_id')
        .in('objective_id', objectiveIds.length > 0 ? objectiveIds : ['00000000-0000-0000-0000-000000000000']);
      
      const krIds = krs?.map(kr => kr.id) || [];
      const { data: contributions } = await supabase
        .from('kr_work_contributions')
        .select('key_result_id')
        .in('key_result_id', krIds.length > 0 ? krIds : ['00000000-0000-0000-0000-000000000000']);
      
      // Map KR contributions back to objectives
      const krToObjectiveMap = new Map(krs?.map(kr => [kr.id, kr.objective_id]) || []);
      const workCountMap = new Map<string, number>();
      contributions?.forEach(c => {
        const objectiveId = krToObjectiveMap.get(c.key_result_id);
        if (objectiveId) {
          workCountMap.set(objectiveId, (workCountMap.get(objectiveId) || 0) + 1);
        }
      });

      // Enrich objectives
      const enrichedObjectives = (objectives || []).map(obj => ({
        id: obj.id,
        name: obj.name,
        description: obj.description,
        theme_id: obj.theme_id,
        owner_id: obj.owner_id,
        start_date: obj.start_date,
        due_date: obj.due_date,
        status: (obj.status || 'pending') as ObjectiveStatusV2,
        health: (obj.health || 'at_risk') as ObjectiveHealthV2,
        visibility: (obj.visibility || 'org-wide') as ObjectiveVisibility,
        overall_progress: obj.overall_progress || 0,
        is_v2: obj.is_v2 ?? true,
        created_at: obj.created_at,
        updated_at: obj.updated_at,
        created_by: obj.created_by,
        theme_name: obj.theme_id ? themeMap.get(obj.theme_id) : undefined,
        owner_name: (obj.profiles as any)?.full_name,
        key_results_count: krCountMap.get(obj.id) || 0,
        linked_work_count: workCountMap.get(obj.id) || 0,
      }));

      if (filters?.hasLinkedWork === true) {
        return enrichedObjectives.filter(o => (o.linked_work_count || 0) > 0);
      }
      if (filters?.hasLinkedWork === false) {
        return enrichedObjectives.filter(o => (o.linked_work_count || 0) === 0);
      }
      return enrichedObjectives;
    },
  });
}

export function useObjectiveV2(objectiveId?: string) {
  return useQuery({
    queryKey: ['objective-v2', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return null;
      
      const { data, error } = await supabase
        .from('objectives')
        .select(`
          *,
          profiles:owner_id (id, full_name, avatar_url)
        `)
        .eq('id', objectiveId)
        .single();
      
      if (error) throw error;

      // Fetch theme name
      let theme_name: string | undefined;
      if (data.theme_id) {
        const { data: theme } = await supabase
          .from('strategic_themes')
          .select('name')
          .eq('id', data.theme_id)
          .single();
        theme_name = theme?.name;
      }

      return {
        ...data,
        theme_name,
        owner_name: (data.profiles as any)?.full_name,
      } as ObjectiveV2;
    },
    enabled: !!objectiveId,
  });
}

export function useCreateObjectiveV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateObjectiveInputV2) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('objectives')
        .insert({
          name: input.name,
          description: input.description,
          theme_id: input.theme_id,
          owner_id: input.owner_id,
          start_date: input.start_date,
          due_date: input.due_date,
          status: input.status || 'not_started',
          visibility: input.visibility || 'org-wide',
          is_v2: true,
          overall_progress: 0,
          health: 'grey',
          created_by: user?.user?.id,
          // Clear v1 hierarchy fields
          tier: null,
          parent_objective_id: null,
          portfolio_id: null,
          program_id: null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      toast.success('Objective created');
    },
    onError: (error) => {
      toast.error('Failed to create objective');
      console.error('Create objective error:', error);
    },
  });
}

export function useUpdateObjectiveV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateObjectiveInputV2 & { id: string }) => {
      const { data, error } = await supabase
        .from('objectives')
        .update({
          name: input.name,
          description: input.description,
          theme_id: input.theme_id,
          owner_id: input.owner_id,
          start_date: input.start_date,
          due_date: input.due_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['objective-v2', variables.id] });
      toast.success('Objective updated');
    },
    onError: (error) => {
      toast.error('Failed to update objective');
      console.error('Update objective error:', error);
    },
  });
}

export function useDeleteObjectiveV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      const { error } = await supabase
        .from('objectives')
        .delete()
        .eq('id', objectiveId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      toast.success('Objective deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete objective');
      console.error('Delete objective error:', error);
    },
  });
}
