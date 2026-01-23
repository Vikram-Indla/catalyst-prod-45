// ============================================================
// PLANNER WORK ITEMS HOOK
// Fetches all work items (stories, features, epics, business requests)
// for the work item selector in create task modal
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type WorkItemType = 'story' | 'feature' | 'epic' | 'business_request';

export interface PlannerWorkItem {
  id: string;
  name: string;
  displayId: string;
  type: WorkItemType;
}

export const WORK_ITEM_TYPE_CONFIG: Record<WorkItemType, {
  label: string;
  pluralLabel: string;
  color: string;
  icon: string;
}> = {
  story: {
    label: 'Story',
    pluralLabel: 'Stories',
    color: '#22c55e', // green
    icon: 'FileText',
  },
  feature: {
    label: 'Feature',
    pluralLabel: 'Features',
    color: '#8b5cf6', // purple
    icon: 'Layers',
  },
  epic: {
    label: 'Epic',
    pluralLabel: 'Epics',
    color: '#f59e0b', // amber
    icon: 'Rocket',
  },
  business_request: {
    label: 'Business Request',
    pluralLabel: 'Business Requests',
    color: '#3b82f6', // blue
    icon: 'Briefcase',
  },
};

export function usePlannerWorkItems(typeFilter?: WorkItemType | WorkItemType[]) {
  return useQuery({
    queryKey: ['planner-work-items', typeFilter],
    queryFn: async () => {
      const items: PlannerWorkItem[] = [];
      
      // Determine which types to fetch
      const typesToFetch: WorkItemType[] = typeFilter 
        ? (Array.isArray(typeFilter) ? typeFilter : [typeFilter])
        : ['story', 'feature', 'epic', 'business_request'];

      // Fetch in parallel
      const fetchStories = async () => {
        if (!typesToFetch.includes('story')) return;
        const { data, error } = await supabase
          .from('stories')
          .select('id, name, title, story_key')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && data) {
          data.forEach(s => {
            items.push({
              id: s.id,
              name: s.title || s.name || 'Untitled Story',
              displayId: s.story_key || 'STR',
              type: 'story',
            });
          });
        }
      };

      const fetchFeatures = async () => {
        if (!typesToFetch.includes('feature')) return;
        const { data, error } = await supabase
          .from('features')
          .select('id, name, display_id')
          .is('deleted_at', null)
          .order('name', { ascending: true })
          .limit(100);
        if (!error && data) {
          data.forEach(f => {
            items.push({
              id: f.id,
              name: f.name || 'Untitled Feature',
              displayId: f.display_id || 'FTR',
              type: 'feature',
            });
          });
        }
      };

      const fetchEpics = async () => {
        if (!typesToFetch.includes('epic')) return;
        const { data, error } = await supabase
          .from('epics')
          .select('id, name, epic_key')
          .is('deleted_at', null)
          .order('name', { ascending: true })
          .limit(100);
        if (!error && data) {
          data.forEach(e => {
            items.push({
              id: e.id,
              name: e.name || 'Untitled Epic',
              displayId: e.epic_key || 'EPC',
              type: 'epic',
            });
          });
        }
      };

      const fetchBusinessRequests = async () => {
        if (!typesToFetch.includes('business_request')) return;
        const { data, error } = await (supabase as any)
          .from('business_requests')
          .select('id, title, request_key')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && data) {
          (data as any[]).forEach(br => {
            items.push({
              id: br.id,
              name: br.title || 'Untitled Request',
              displayId: br.request_key || 'BR',
              type: 'business_request',
            });
          });
        }
      };

      await Promise.all([
        fetchStories(),
        fetchFeatures(),
        fetchEpics(),
        fetchBusinessRequests(),
      ]);

      return items;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
