// src/hooks/home/useStarredItems.ts
// Manages user starred items - star/unstar work items

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type StarredItemType = 'epic' | 'feature' | 'story' | 'task' | 'incident' | 'defect' | 'business_request' | 'theme' | 'objective' | 'dependency' | 'risk' | 'project';

export interface StarredItem {
  id: string;
  item_id: string;
  item_type: StarredItemType;
  starred_at: string;
}

// Fetch all starred item IDs for current user
export function useStarredItemIds() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['starred-item-ids', userId],
    queryFn: async (): Promise<Set<string>> => {
      if (!userId) return new Set();

      const { data, error } = await supabase
        .from('user_starred_items')
        .select('item_id')
        .eq('user_id', userId);

      if (error) throw error;
      return new Set((data || []).map(d => d.item_id));
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Fetch starred items count
export function useStarredItemsCount() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['starred-items-count', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('user_starred_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}

// Toggle star mutation
export function useToggleStar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemId, itemType, isCurrentlyStarred }: { 
      itemId: string; 
      itemType: StarredItemType;
      isCurrentlyStarred: boolean;
    }) => {
      const userId = user?.id;
      if (!userId) throw new Error('Not authenticated');

      if (isCurrentlyStarred) {
        // Unstar
        const { error } = await supabase
          .from('user_starred_items')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', itemId)
          .eq('item_type', itemType);

        if (error) throw error;
        return { action: 'unstarred', itemId };
      } else {
        // Star
        const { error } = await supabase
          .from('user_starred_items')
          .insert({
            user_id: userId,
            item_id: itemId,
            item_type: itemType,
          });

        if (error) throw error;
        return { action: 'starred', itemId };
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['starred-item-ids'] });
      queryClient.invalidateQueries({ queryKey: ['starred-items-count'] });
      queryClient.invalidateQueries({ queryKey: ['starred-delivery-items'] });
      queryClient.invalidateQueries({ queryKey: ['home-delivery-items'] });
      queryClient.invalidateQueries({ queryKey: ['home-delivery-summary'] });
    },
  });
}

// Fetch full starred items with details for delivery mode.
//
// Orphan-star cleanup (H1B, Apr 2026)
// ──────────────────────────────────
// `user_starred_items` is a thin join table — when an underlying issue is
// soft-deleted (`deleted_at != null`) or hard-deleted, the join row stays
// behind and the home rail keeps trying to render a "ghost" pin
// (CEA-020-style ghosts in the Apr 2026 incident). To make the rail
// self-healing, after the four parallel fetches we walk the starred set,
// identify rows whose `item_id` failed to resolve in *any* of the four
// tables, and fire-and-forget delete them. The user sees them disappear
// on the next refetch (staleTime 30s); no spinner, no toast, no error.
// We intentionally swallow the cleanup error — if it fails (auth race,
// RLS hiccup) the orphan just gets retried next mount.
export function useStarredDeliveryItems() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['starred-delivery-items', userId],
    queryFn: async () => {
      if (!userId) return { items: [], count: 0 };

      // Get all starred items
      const { data: starredItems, error: starredError } = await supabase
        .from('user_starred_items')
        .select('item_id, item_type, starred_at')
        .eq('user_id', userId)
        .order('starred_at', { ascending: false });

      if (starredError) throw starredError;
      if (!starredItems || starredItems.length === 0) {
        return { items: [], count: 0 };
      }

      // Group by type for efficient fetching
      const storyIds = starredItems.filter(s => s.item_type === 'story').map(s => s.item_id);
      const featureIds = starredItems.filter(s => s.item_type === 'feature').map(s => s.item_id);
      const epicIds = starredItems.filter(s => s.item_type === 'epic').map(s => s.item_id);
      const taskIds = starredItems.filter(s => s.item_type === 'task').map(s => s.item_id);
      const projectIds = starredItems.filter(s => s.item_type === 'project').map(s => s.item_id);

      const items: any[] = [];
      // Track which (item_id, item_type) tuples resolved to a real row in
      // their respective table. Anything starred but not present in this
      // set is an orphan and gets cleaned up at the end.
      const resolved = new Set<string>();
      const resolveKey = (id: string, type: string) => `${type}::${id}`;

      // Fetch stories
      if (storyIds.length > 0) {
        const { data: stories } = await supabase
          .from('stories')
          .select('id, story_key, title, name, status, state, priority, blocked, updated_at, feature:features(id, name, display_id)')
          .in('id', storyIds)
          .is('deleted_at', null);

        (stories || []).forEach(story => {
          resolved.add(resolveKey(story.id, 'story'));
          const starredItem = starredItems.find(s => s.item_id === story.id);
          items.push({
            id: story.id,
            key: story.story_key || `US-${story.id.slice(0, 6)}`,
            summary: story.title || story.name || 'Untitled Story',
            project: story.feature?.name || 'Backlog',
            projectKey: story.feature?.display_id || 'BKL',
            status: story.status || story.state || 'Open',
            type: 'story',
            priority: story.priority,
            blocked: story.blocked,
            activityDate: new Date(story.updated_at),
            activityType: 'Updated',
            starredAt: starredItem?.starred_at,
          });
        });
      }

      // Fetch features
      if (featureIds.length > 0) {
        const { data: features } = await supabase
          .from('features')
          .select('id, display_id, name, status, priority, blocked, updated_at, epic:epics(id, name, epic_key)')
          .in('id', featureIds)
          .is('deleted_at', null);

        (features || []).forEach(feature => {
          resolved.add(resolveKey(feature.id, 'feature'));
          const starredItem = starredItems.find(s => s.item_id === feature.id);
          items.push({
            id: feature.id,
            key: feature.display_id || `F-${feature.id.slice(0, 6)}`,
            summary: feature.name,
            project: feature.epic?.name || 'Portfolio',
            projectKey: feature.epic?.epic_key || 'PRT',
            status: feature.status || 'Open',
            type: 'feature',
            priority: feature.priority,
            blocked: feature.blocked,
            activityDate: new Date(feature.updated_at),
            activityType: 'Updated',
            starredAt: starredItem?.starred_at,
          });
        });
      }

      // Fetch epics
      if (epicIds.length > 0) {
        const { data: epics } = await supabase
          .from('epics')
          .select('id, epic_key, name, status, updated_at')
          .in('id', epicIds)
          .is('deleted_at', null);

        (epics || []).forEach(epic => {
          resolved.add(resolveKey(epic.id, 'epic'));
          const starredItem = starredItems.find(s => s.item_id === epic.id);
          items.push({
            id: epic.id,
            key: epic.epic_key || `E-${epic.id.slice(0, 6)}`,
            summary: epic.name,
            project: 'Portfolio',
            projectKey: 'PRT',
            status: epic.status || 'Open',
            type: 'epic',
            activityDate: new Date(epic.updated_at),
            activityType: 'Updated',
            starredAt: starredItem?.starred_at,
          });
        });
      }

      // Fetch tasks (from work_manager_tasks) - project = team name
      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from('work_manager_tasks')
          .select('id, key, title, status, priority, blocked, updated_at, assignee_id, team:teams(id, name)')
          .in('id', taskIds);

        (tasks || []).forEach(task => {
          resolved.add(resolveKey(task.id, 'task'));
          const starredItem = starredItems.find(s => s.item_id === task.id);
          items.push({
            id: task.id,
            key: task.key || `TSK-${task.id.slice(0, 6)}`,
            summary: task.title || 'Untitled Task',
            project: task.team?.name || 'Work Manager',
            projectKey: task.team?.name?.slice(0, 3).toUpperCase() || 'WMT',
            status: task.status || 'Open',
            type: 'task',
            priority: task.priority,
            blocked: task.blocked,
            activityDate: new Date(task.updated_at),
            activityType: 'Updated',
            starredAt: starredItem?.starred_at,
          });
        });
      }

      // Fetch projects (Phase D — universal star ↔ Home pinned)
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, project_key, status, status_category, updated_at, lead_id')
          .in('id', projectIds);

        (projects || []).forEach((proj: any) => {
          resolved.add(resolveKey(proj.id, 'project'));
          const starredItem = starredItems.find(s => s.item_id === proj.id);
          items.push({
            id: proj.id,
            key: proj.project_key || `PRJ-${proj.id.slice(0, 6)}`,
            summary: proj.name,
            project: proj.name,
            projectKey: proj.project_key,
            status: proj.status_category || proj.status || 'active',
            type: 'project',
            activityDate: new Date(proj.updated_at),
            activityType: 'Updated',
            starredAt: starredItem?.starred_at,
          });
        });
      }

      // Orphan-star cleanup — find starred rows whose item_id was NOT
      // present in any of the resolved sets (or whose type isn't one
      // we can resolve at all) and silently delete them. We only consider
      // the types we actually queried; an item_type we don't yet
      // support (e.g. 'incident', 'business_request') is left alone so we
      // don't lose pins the moment we add support for that type later.
      const supportedTypes = new Set(['story', 'feature', 'epic', 'task', 'project']);
      const orphans = starredItems.filter(s =>
        supportedTypes.has(s.item_type) && !resolved.has(resolveKey(s.item_id, s.item_type))
      );
      if (orphans.length > 0) {
        // Fire-and-forget delete; swallow errors so a transient RLS or
        // network blip doesn't break the home rail render. The next
        // refetch will retry the cleanup if it matters.
        void supabase
          .from('user_starred_items')
          .delete()
          .eq('user_id', userId)
          .in('item_id', orphans.map(o => o.item_id))
          .then(({ error }) => {
            if (error) {
              // eslint-disable-next-line no-console
              console.warn('[useStarredDeliveryItems] orphan cleanup failed', error.message);
            }
          });
      }

      // Sort by starred_at (most recent first)
      items.sort((a, b) => new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime());

      return { items, count: items.length };
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}
