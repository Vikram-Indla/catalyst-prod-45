// Hook to fetch roadmap data from Supabase

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoadmapItem, Milestone } from './types';

export function useRoadmapData() {
  // Fetch themes
  const { data: themes = [], isLoading: themesLoading } = useQuery({
    queryKey: ['roadmap-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch objectives grouped by theme
  const themeIds = themes.map(t => t.id);
  const { data: objectives = [], isLoading: objectivesLoading } = useQuery({
    queryKey: ['roadmap-objectives', themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('objectives')
        .select('*')
        .in('theme_id', themeIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: themeIds.length > 0,
  });

  // Fetch epics grouped by theme
  const { data: epics = [], isLoading: epicsLoading } = useQuery({
    queryKey: ['roadmap-epics', themeIds],
    queryFn: async () => {
      if (themeIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .in('theme_id', themeIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: themeIds.length > 0,
  });

  // Transform data into hierarchical roadmap items
  const items: RoadmapItem[] = themes.map(theme => {
    // Get objectives for this theme
    const themeObjectives = objectives.filter(o => o.theme_id === theme.id);
    const themeEpics = epics.filter(e => e.theme_id === theme.id);

    // Calculate theme progress from objectives/epics
    const totalProgress = themeObjectives.length > 0 
      ? themeObjectives.reduce((sum, o) => sum + ((o.overall_progress || 0) * 100), 0) / themeObjectives.length
      : 0;

    // Build objective children with their epics
    const objectiveChildren: RoadmapItem[] = themeObjectives.map(obj => {
      // Get epics under this objective (if linked via objective_id, otherwise all theme epics)
      const objEpics = themeEpics.filter(e => (e as any).objective_id === obj.id);
      
      return {
        id: obj.id,
        type: 'objective' as const,
        name: obj.name,
        status: (obj.status as any) || 'active',
        startDate: obj.start_date || theme.start_date || new Date().toISOString(),
        endDate: obj.end_date || theme.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        progress: Math.round((obj.overall_progress || 0) * 100),
        parentId: theme.id,
        children: objEpics.map(epic => ({
          id: epic.id,
          type: 'epic' as const,
          name: epic.name,
          status: (epic.status as any) || 'in-progress',
          startDate: epic.start_date || obj.start_date || theme.start_date || new Date().toISOString(),
          endDate: epic.target_completion_date || epic.end_date || obj.end_date || theme.end_date || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 0, // Epics don't have a direct progress field
          parentId: obj.id,
        })),
      };
    });

    return {
      id: theme.id,
      type: 'theme' as const,
      name: theme.name,
      strategy: theme.description || 'Digital Transformation Strategy',
      status: (theme.status as any) || 'active',
      startDate: theme.start_date || new Date().toISOString(),
      endDate: theme.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      progress: Math.round(totalProgress),
      objectives: themeObjectives.length,
      epics: themeEpics.length,
      risks: 0, // Would need to join with risks table
      children: objectiveChildren,
    };
  });

  // Default milestones (can be fetched from DB if needed)
  const milestones: Milestone[] = [
    { id: 'MS-001', name: 'Q1 Review', date: '2025-03-31' },
    { id: 'MS-002', name: 'Mid-Year Assessment', date: '2025-06-30' },
    { id: 'MS-003', name: 'Q3 Review', date: '2025-09-30' },
    { id: 'MS-004', name: 'Year-End Review', date: '2025-12-31' },
  ];

  return {
    items,
    milestones,
    isLoading: themesLoading || objectivesLoading || epicsLoading,
  };
}
