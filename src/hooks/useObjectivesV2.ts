import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// OKR v2 Types - Unified Objectives (no Portfolio/Program tiers)
// Using actual DB enum values
export type ObjectiveStatusV2 = 'pending' | 'in_progress' | 'on_track' | 'at_risk' | 'off_track' | 'paused' | 'completed' | 'canceled' | 'missed';
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
  visibility?: string;
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
  theme_id: string; // Required in v2
  owner_id?: string;
  start_date?: string;
  due_date?: string;
  status?: ObjectiveStatusV2;
  health?: ObjectiveHealthV2;
  notes?: string;
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
  notes?: string;
}

function determineHealth(progress: number, hasKRs: boolean): ObjectiveHealthV2 {
  if (!hasKRs) return 'at_risk';
  if (progress >= 75) return 'good';
  if (progress >= 40) return 'fair';
  return 'poor';
}

// Helper to write audit log entry
async function writeAuditLog(
  entityType: 'objective' | 'key_result',
  entityId: string,
  action: string,
  beforeJson?: any,
  afterJson?: any
) {
  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from('activity_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_id: user?.user?.id || null,
      before_json: beforeJson || null,
      after_json: afterJson || null,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function useObjectivesV2(filters?: ObjectiveFiltersV2) {
  return useQuery({
    queryKey: ['objectives-v2', filters],
    queryFn: async () => {
      // Fetch objectives marked as v2 - NO join on profiles (no FK relationship)
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
          created_by
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

      // Fetch owner names from profiles table
      const ownerIds = [...new Set(objectives?.filter(o => o.owner_id).map(o => o.owner_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ownerIds.length > 0 ? ownerIds : ['00000000-0000-0000-0000-000000000000']);
      const ownerMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Fetch KRs with progress for real-time calculation
      const objectiveIds = objectives?.map(o => o.id) || [];
      const { data: allKRs } = await supabase
        .from('key_results_v2')
        .select('id, objective_id, progress')
        .in('objective_id', objectiveIds.length > 0 ? objectiveIds : ['00000000-0000-0000-0000-000000000000']);
      
      // Calculate KR count and real-time progress per objective
      const krCountMap = new Map<string, number>();
      const krProgressMap = new Map<string, number[]>();
      allKRs?.forEach(kr => {
        krCountMap.set(kr.objective_id, (krCountMap.get(kr.objective_id) || 0) + 1);
        const progressList = krProgressMap.get(kr.objective_id) || [];
        progressList.push(kr.progress || 0);
        krProgressMap.set(kr.objective_id, progressList);
      });

      // Fetch work contribution counts (via KRs)
      const krIds = allKRs?.map(kr => kr.id) || [];
      const { data: contributions } = await supabase
        .from('kr_work_contributions')
        .select('key_result_id')
        .in('key_result_id', krIds.length > 0 ? krIds : ['00000000-0000-0000-0000-000000000000']);
      
      // Map KR contributions back to objectives
      const krToObjectiveMap = new Map(allKRs?.map(kr => [kr.id, kr.objective_id]) || []);
      const workCountMap = new Map<string, number>();
      contributions?.forEach(c => {
        const objectiveId = krToObjectiveMap.get(c.key_result_id);
        if (objectiveId) {
          workCountMap.set(objectiveId, (workCountMap.get(objectiveId) || 0) + 1);
        }
      });

      // Enrich objectives with real-time calculated progress
      const enrichedObjectives = (objectives || []).map(obj => {
        // Calculate progress from KRs (average of all KR progress values)
        const krProgressList = krProgressMap.get(obj.id) || [];
        const calculatedProgress = krProgressList.length > 0
          ? Math.round(krProgressList.reduce((sum, p) => sum + p, 0) / krProgressList.length)
          : 0;
        
        // Derive health from calculated progress
        let calculatedHealth: ObjectiveHealthV2 = 'at_risk';
        if (krProgressList.length > 0) {
          if (calculatedProgress >= 70) calculatedHealth = 'good';
          else if (calculatedProgress >= 40) calculatedHealth = 'fair';
          else if (calculatedProgress >= 20) calculatedHealth = 'at_risk';
          else calculatedHealth = 'poor';
        }

        return {
          id: obj.id,
          name: obj.name,
          description: obj.description,
          theme_id: obj.theme_id,
          owner_id: obj.owner_id,
          start_date: obj.start_date,
          due_date: obj.due_date,
          status: (obj.status || 'pending') as ObjectiveStatusV2,
          health: calculatedHealth,
          visibility: obj.visibility || 'org-wide',
          overall_progress: calculatedProgress,
          is_v2: obj.is_v2 ?? true,
          created_at: obj.created_at,
          updated_at: obj.updated_at,
          created_by: obj.created_by,
          theme_name: obj.theme_id ? themeMap.get(obj.theme_id) : undefined,
          owner_name: obj.owner_id ? ownerMap.get(obj.owner_id) : undefined,
          key_results_count: krCountMap.get(obj.id) || 0,
          linked_work_count: workCountMap.get(obj.id) || 0,
        };
      });

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
      
      // Fetch objective WITHOUT profile join (no FK relationship)
      const { data, error } = await supabase
        .from('objectives')
        .select('*')
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

      // Fetch owner name
      let owner_name: string | undefined;
      if (data.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.owner_id)
          .single();
        owner_name = profile?.full_name;
      }

      return {
        ...data,
        theme_name,
        owner_name,
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
          description: input.description || null,
          theme_id: input.theme_id, // Required in v2
          owner_id: input.owner_id || null,
          start_date: input.start_date || null,
          due_date: input.due_date || null,
          status: input.status || 'pending',
          health: input.health || 'at_risk',
          notes: input.notes || null,
          is_v2: true,
          overall_progress: 0,
          created_by: user?.user?.id || null,
          // Clear v1 hierarchy fields
          tier: null,
          parent_objective_id: null,
          portfolio_id: null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Write audit log for creation
      await writeAuditLog('objective', data.id, 'created', null, data);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
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
      // Fetch current state for audit log
      const { data: beforeData } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', id)
        .single();

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      // Only include fields that are explicitly provided
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.theme_id !== undefined) updateData.theme_id = input.theme_id;
      if (input.owner_id !== undefined) updateData.owner_id = input.owner_id;
      if (input.start_date !== undefined) updateData.start_date = input.start_date;
      if (input.due_date !== undefined) updateData.due_date = input.due_date;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.health !== undefined) updateData.health = input.health;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const { data, error } = await supabase
        .from('objectives')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Write audit log for update
      await writeAuditLog('objective', id, 'updated', beforeData, data);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['objective-v2', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
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
      // Fetch current state for audit log
      const { data: beforeData } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', objectiveId)
        .single();

      const { error } = await supabase
        .from('objectives')
        .delete()
        .eq('id', objectiveId);

      if (error) throw error;
      
      // Write audit log for deletion
      await writeAuditLog('objective', objectiveId, 'deleted', beforeData, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Objective deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete objective');
      console.error('Delete objective error:', error);
    },
  });
}

// Recalculate objective progress from its KRs
export function useRecalculateObjectiveProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      // Fetch all KRs for this objective
      const { data: krs, error: krError } = await supabase
        .from('key_results_v2')
        .select('progress')
        .eq('objective_id', objectiveId);

      if (krError) throw krError;

      // Calculate average progress
      const hasKRs = krs && krs.length > 0;
      const avgProgress = hasKRs 
        ? krs.reduce((sum, kr) => sum + (kr.progress || 0), 0) / krs.length
        : 0;

      // Determine health based on progress
      let health: ObjectiveHealthV2 = 'at_risk';
      if (hasKRs) {
        if (avgProgress >= 75) health = 'good';
        else if (avgProgress >= 40) health = 'fair';
        else health = 'poor';
      }

      // Update objective
      const { data, error } = await supabase
        .from('objectives')
        .update({
          overall_progress: Math.round(avgProgress),
          health,
          updated_at: new Date().toISOString(),
        })
        .eq('id', objectiveId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, objectiveId) => {
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['objective-v2', objectiveId] });
    },
  });
}
