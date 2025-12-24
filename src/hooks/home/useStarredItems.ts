// src/hooks/home/useStarredItems.ts
// Manages user starred items - star/unstar work items

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export type StarredItemType = 'epic' | 'feature' | 'story' | 'task' | 'incident' | 'defect';

export interface StarredItem {
  id: string;
  item_id: string;
  item_type: StarredItemType;
  starred_at: string;
}

// Get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// Fetch all starred item IDs for current user
export function useStarredItemIds() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId().then(setUserId);
  }, []);

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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId().then(setUserId);
  }, []);

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

  return useMutation({
    mutationFn: async ({ itemId, itemType, isCurrentlyStarred }: { 
      itemId: string; 
      itemType: StarredItemType;
      isCurrentlyStarred: boolean;
    }) => {
      const userId = await getCurrentUserId();
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

// Fetch full starred items with details for delivery mode
export function useStarredDeliveryItems() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId().then(setUserId);
  }, []);

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

      const items: any[] = [];

      // Fetch stories
      if (storyIds.length > 0) {
        const { data: stories } = await supabase
          .from('stories')
          .select('id, story_key, title, name, status, state, priority, blocked, updated_at, feature:features(id, name, display_id)')
          .in('id', storyIds)
          .is('deleted_at', null);

        (stories || []).forEach(story => {
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

      // Sort by starred_at (most recent first)
      items.sort((a, b) => new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime());

      return { items, count: items.length };
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}
