import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IncidentWorkItem {
  id: string;
  incident_id: string;
  work_item_type: 'feature' | 'story' | 'task';
  work_item_id: string;
  work_item_key: string;
  work_item_title: string | null;
  linked_at: string;
  linked_by: string | null;
}

export interface WorkItemSearchResult {
  id: string;
  type: 'feature' | 'story' | 'task';
  key: string;
  name: string;
  project_name?: string;
  status?: string;
}

export function useIncidentWorkItems(incidentId: string) {
  return useQuery({
    queryKey: ['incident-work-items', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      
      const { data, error } = await supabase
        .from('incident_work_items')
        .select('*')
        .eq('incident_id', incidentId)
        .order('linked_at', { ascending: false });
      
      if (error) throw error;
      return data as IncidentWorkItem[];
    },
    enabled: !!incidentId,
  });
}

export function useSearchWorkItems(searchTerm: string, type?: 'feature' | 'story' | 'task') {
  return useQuery({
    queryKey: ['work-items-search', searchTerm, type],
    queryFn: async () => {
      const results: WorkItemSearchResult[] = [];
      
      // Search features
      if (!type || type === 'feature') {
        const { data: features } = await supabase
          .from('features')
          .select('id, display_id, name, project:projects(name), status')
          .or(`display_id.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
          .limit(10);
        
        if (features) {
          results.push(...features.map(f => ({
            id: f.id,
            type: 'feature' as const,
            key: f.display_id || `FTR-${f.id.slice(0, 6).toUpperCase()}`,
            name: f.name,
            project_name: (f.project as any)?.name,
            status: f.status,
          })));
        }
      }
      
      // Search stories
      if (!type || type === 'story') {
        const { data: stories } = await supabase
          .from('stories')
          .select('id, story_key, name, status')
          .or(`story_key.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
          .limit(10);
        
        if (stories) {
          results.push(...stories.map(s => ({
            id: s.id,
            type: 'story' as const,
            key: s.story_key || `STR-${s.id.slice(0, 6).toUpperCase()}`,
            name: s.name,
            status: s.status,
          })));
        }
      }
      
      // Search tasks (subtasks)
      if (!type || type === 'task') {
        const { data: tasks } = await supabase
          .from('subtasks')
          .select('id, name, status')
          .ilike('name', `%${searchTerm}%`)
          .limit(10);
        
        if (tasks) {
          results.push(...tasks.map(t => ({
            id: t.id,
            type: 'task' as const,
            key: `TSK-${t.id.slice(0, 6).toUpperCase()}`,
            name: t.name,
            status: t.status,
          })));
        }
      }
      
      return results;
    },
    enabled: searchTerm.length >= 2,
  });
}

export function useLinkWorkItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      workItem 
    }: { 
      incidentId: string; 
      workItem: WorkItemSearchResult;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('incident_work_items')
        .insert({
          incident_id: incidentId,
          work_item_type: workItem.type,
          work_item_id: workItem.id,
          work_item_key: workItem.key,
          work_item_title: workItem.name,
          linked_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Log to audit
      await supabase.from('incident_history').insert({
        incident_id: incidentId,
        field_name: 'work_item_linked',
        old_value: null,
        new_value: `${workItem.type}: ${workItem.key}`,
        changed_by: user?.id,
      });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-work-items', variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident', variables.incidentId] });
    },
  });
}

export function useUnlinkWorkItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      linkId,
      workItemKey,
      workItemType,
    }: { 
      incidentId: string; 
      linkId: string;
      workItemKey: string;
      workItemType: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('incident_work_items')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
      
      // Log to audit
      await supabase.from('incident_history').insert({
        incident_id: incidentId,
        field_name: 'work_item_unlinked',
        old_value: `${workItemType}: ${workItemKey}`,
        new_value: null,
        changed_by: user?.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-work-items', variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident', variables.incidentId] });
    },
  });
}
