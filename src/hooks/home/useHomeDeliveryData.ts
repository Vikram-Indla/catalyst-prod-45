// src/hooks/home/useHomeDeliveryData.ts
// Delivery Mode: Execution Work Items (Epic, Feature, Story, Task)
// Provides summary counts and paginated work items

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItemType } from '@/components/ja/icons/WorkItemTypeIcon';

// ============================================
// TYPES
// ============================================
export interface DeliverySummary {
  workedOn: number;
  assigned: number;
  starred: number;
  recentlyUpdated: number;
}

export interface DeliveryWorkItem {
  id: string;
  key: string;
  summary: string;
  project: string;
  projectKey: string;
  status: string;
  type: WorkItemType;
  assignee: string | null;
  activityDate: Date;
  activityType: 'Updated' | 'Created';
  priority?: string;
  blocked?: boolean;
}

export interface DeliveryItemsParams {
  scope?: 'worked-on' | 'assigned' | 'starred';
  types?: ('epic' | 'feature' | 'story' | 'task')[];
  search?: string;
  sort?: 'updated' | 'priority' | 'due-date';
  page?: number;
  pageSize?: number;
  userId?: string;
}

export interface DeliveryItemsResponse {
  items: DeliveryWorkItem[];
  counts: {
    workedOn: number;
    assigned: number;
    starred: number;
    total: number;
  };
}

// ============================================
// SUMMARY HOOK
// ============================================
export function useHomeDeliverySummary(userId?: string) {
  return useQuery({
    queryKey: ['home-delivery-summary', userId],
    queryFn: async (): Promise<DeliverySummary> => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch stories count
      const { count: storyCount } = await supabase
        .from('stories')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Fetch features count
      const { count: featureCount } = await supabase
        .from('features')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Fetch assigned items (stories with assignee)
      const { count: assignedCount } = await supabase
        .from('stories')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('assignee_id', 'is', null);

      // Fetch recently updated (last 7 days)
      const { count: recentCount } = await supabase
        .from('stories')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('updated_at', sevenDaysAgo.toISOString());

      const totalWorkedOn = (storyCount || 0) + (featureCount || 0);

      return {
        workedOn: totalWorkedOn,
        assigned: assignedCount || 0,
        starred: 0, // Starred items would need a separate user_starred_items table
        recentlyUpdated: recentCount || 0,
      };
    },
    staleTime: 1000 * 30,
  });
}

// ============================================
// ITEMS HOOK
// ============================================
export function useHomeDeliveryItems(params: DeliveryItemsParams = {}) {
  const { 
    scope = 'worked-on', 
    types = ['epic', 'feature', 'story', 'task'],
    search, 
    sort = 'updated', 
    page = 1, 
    pageSize = 20,
    userId,
  } = params;

  return useQuery({
    queryKey: ['home-delivery-items', scope, types, search, sort, page, pageSize, userId],
    queryFn: async (): Promise<DeliveryItemsResponse> => {
      const items: DeliveryWorkItem[] = [];
      let workedOnCount = 0;
      let assignedCount = 0;
      const starredCount = 0;

      const from = (page - 1) * pageSize;

      // Fetch stories if included
      if (types.includes('story')) {
        let query = supabase
          .from('stories')
          .select(`
            id,
            story_key,
            title,
            name,
            status,
            state,
            priority,
            assignee_id,
            blocked,
            created_at,
            updated_at,
            feature:features(id, name, display_id)
          `, { count: 'exact' })
          .is('deleted_at', null);

        // Apply scope filter
        if (scope === 'assigned' && userId) {
          query = query.eq('assignee_id', userId);
        }

        // Apply search
        if (search) {
          query = query.or(`title.ilike.%${search}%,story_key.ilike.%${search}%,name.ilike.%${search}%`);
        }

        // Apply sorting
        if (sort === 'priority') {
          query = query.order('priority', { ascending: true });
        } else {
          query = query.order('updated_at', { ascending: false });
        }

        query = query.range(from, from + pageSize - 1);

        const { data: stories, count, error } = await query;

        if (error) throw error;

        workedOnCount += count || 0;
        if (scope === 'assigned') assignedCount = count || 0;

        (stories || []).forEach(story => {
          items.push({
            id: story.id,
            key: story.story_key || `US-${story.id.slice(0, 6)}`,
            summary: story.title || story.name || 'Untitled Story',
            project: story.feature?.name || 'Backlog',
            projectKey: story.feature?.display_id || 'BKL',
            status: story.status || story.state || 'Open',
            type: 'story' as WorkItemType,
            assignee: story.assignee_id,
            activityDate: new Date(story.updated_at || story.created_at),
            activityType: 'Updated',
            priority: story.priority,
            blocked: story.blocked,
          });
        });
      }

      // Fetch features if included
      if (types.includes('feature')) {
        let query = supabase
          .from('features')
          .select(`
            id,
            display_id,
            name,
            status,
            priority,
            blocked,
            created_at,
            updated_at,
            epic:epics(id, name, epic_key)
          `, { count: 'exact' })
          .is('deleted_at', null);

        if (search) {
          query = query.or(`name.ilike.%${search}%,display_id.ilike.%${search}%`);
        }

        if (sort === 'priority') {
          query = query.order('priority', { ascending: true });
        } else {
          query = query.order('updated_at', { ascending: false });
        }

        query = query.range(from, from + pageSize - 1);

        const { data: features, count, error } = await query;

        if (error) throw error;

        workedOnCount += count || 0;

        (features || []).forEach(feature => {
          items.push({
            id: feature.id,
            key: feature.display_id || `F-${feature.id.slice(0, 6)}`,
            summary: feature.name,
            project: feature.epic?.name || 'Portfolio',
            projectKey: feature.epic?.epic_key || 'PRT',
            status: feature.status || 'Open',
            type: 'feature' as WorkItemType,
            assignee: null,
            activityDate: new Date(feature.updated_at || feature.created_at),
            activityType: 'Updated',
            priority: feature.priority,
            blocked: feature.blocked,
          });
        });
      }

      // Fetch epics if included
      if (types.includes('epic')) {
        let query = supabase
          .from('epics')
          .select(`
            id,
            epic_key,
            name,
            status,
            created_at,
            updated_at
          `, { count: 'exact' })
          .is('deleted_at', null);

        if (search) {
          query = query.or(`name.ilike.%${search}%,epic_key.ilike.%${search}%`);
        }

        query = query.order('updated_at', { ascending: false });
        query = query.range(from, from + pageSize - 1);

        const { data: epics, count, error } = await query;

        if (error) throw error;

        workedOnCount += count || 0;

        (epics || []).forEach(epic => {
          items.push({
            id: epic.id,
            key: epic.epic_key || `E-${epic.id.slice(0, 6)}`,
            summary: epic.name,
            project: 'Portfolio',
            projectKey: 'PRT',
            status: epic.status || 'Open',
            type: 'epic' as WorkItemType,
            assignee: null,
            activityDate: new Date(epic.updated_at || epic.created_at),
            activityType: 'Updated',
          });
        });
      }

      // Sort combined items by activity date
      items.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());

      // Trim to page size
      const paginatedItems = items.slice(0, pageSize);

      return {
        items: paginatedItems,
        counts: {
          workedOn: workedOnCount,
          assigned: assignedCount,
          starred: starredCount,
          total: workedOnCount,
        },
      };
    },
    staleTime: 1000 * 30,
  });
}
