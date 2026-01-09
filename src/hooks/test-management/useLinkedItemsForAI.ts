/**
 * Hook for fetching linked items (stories, features, epics, defects, incidents) for AI generation
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LinkedItemType = 'story' | 'feature' | 'epic' | 'defect' | 'incident';

export interface LinkedItem {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  type: LinkedItemType;
}

export function useLinkedItemsForAI(projectId: string | undefined, itemType: LinkedItemType) {
  const [items, setItems] = useState<LinkedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchItems = useCallback(async () => {
    if (!projectId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      let mappedItems: LinkedItem[] = [];
      
      if (itemType === 'story') {
        const { data } = await supabase
          .from('stories')
          .select('id, story_key, title, name, description, status')
          .order('created_at', { ascending: false })
          .limit(100);
        mappedItems = (data || []).map((item: any) => ({
          id: item.id,
          key: item.story_key || `STORY-${item.id.slice(0, 6)}`,
          title: item.title || item.name || 'Untitled',
          description: item.description,
          status: item.status || 'unknown',
          type: 'story' as LinkedItemType,
        }));
      } else if (itemType === 'feature') {
        const { data } = await supabase
          .from('features')
          .select('id, name, description, status')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(100);
        mappedItems = (data || []).map((item: any) => ({
          id: item.id,
          key: `FEAT-${item.id.slice(0, 6)}`,
          title: item.name || 'Untitled',
          description: item.description,
          status: item.status || 'unknown',
          type: 'feature' as LinkedItemType,
        }));
      } else if (itemType === 'epic') {
        const { data } = await supabase
          .from('epics')
          .select('id, epic_key, name, description, status')
          .order('created_at', { ascending: false })
          .limit(100);
        mappedItems = (data || []).map((item: any) => ({
          id: item.id,
          key: item.epic_key || `EPIC-${item.id.slice(0, 6)}`,
          title: item.name || 'Untitled',
          description: item.description,
          status: item.status || 'unknown',
          type: 'epic' as LinkedItemType,
        }));
      } else if (itemType === 'defect') {
        const { data } = await supabase
          .from('defects')
          .select('id, defect_id, title, description, workflow_status')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(100);
        mappedItems = (data || []).map((item: any) => ({
          id: item.id,
          key: item.defect_id || `DEF-${item.id.slice(0, 6)}`,
          title: item.title || 'Untitled',
          description: item.description,
          status: item.workflow_status || 'unknown',
          type: 'defect' as LinkedItemType,
        }));
      } else if (itemType === 'incident') {
        const { data } = await supabase
          .from('incidents')
          .select('id, incident_key, title, description, status')
          .order('created_at', { ascending: false })
          .limit(100);
        mappedItems = (data || []).map((item: any) => ({
          id: item.id,
          key: item.incident_key || `INC-${item.id.slice(0, 6)}`,
          title: item.title || 'Untitled',
          description: item.description,
          status: item.status || 'unknown',
          type: 'incident' as LinkedItemType,
        }));
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const lowerSearch = searchQuery.toLowerCase();
        mappedItems = mappedItems.filter(item => 
          item.title.toLowerCase().includes(lowerSearch) ||
          item.key.toLowerCase().includes(lowerSearch)
        );
      }

      setItems(mappedItems);
    } catch (err) {
      console.error(`Error fetching ${itemType}s:`, err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, itemType, searchQuery]);

  useEffect(() => {
    const debounceTimer = setTimeout(fetchItems, 300);
    return () => clearTimeout(debounceTimer);
  }, [fetchItems]);

  return { items, loading, searchQuery, setSearchQuery, refetch: fetchItems };
}
