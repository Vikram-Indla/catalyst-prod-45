import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/hooks/useProjects';
import type { BacklogEpic, BacklogFeature, BacklogStory } from '../types/backlog.types';

// ─── EPIC BACKLOG ─────────────────────────────────
export function useEpicBacklog(projectId: string) {
  const { data: project } = useProject(projectId);
  const programId = project?.program_id ?? null;

  return useQuery({
    queryKey: ['backlog-epics', projectId, programId],
    queryFn: async (): Promise<BacklogEpic[]> => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from('epics')
        .select('id, epic_key, name, description, status, assignee_id, end_date, priority, deleted_at, primary_program_id')
        .eq('primary_program_id', programId)
        .is('deleted_at', null)
        .order('global_rank', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as any as BacklogEpic[];
    },
    enabled: !!projectId && !!programId,
  });
}

// ─── FEATURE BACKLOG ──────────────────────────────
export function useFeatureBacklog(projectId: string) {
  return useQuery({
    queryKey: ['backlog-features', projectId],
    queryFn: async (): Promise<BacklogFeature[]> => {
      const { data, error } = await supabase
        .from('features')
        .select('id, display_id, name, description, status, epic_id, project_id, assignee_id, planned_end_date, priority, deleted_at')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('global_rank', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as any as BacklogFeature[];
    },
    enabled: !!projectId,
  });
}

// ─── STORY BACKLOG ────────────────────────────────
export function useStoryBacklog(projectId: string) {
  return useQuery({
    queryKey: ['backlog-stories', projectId],
    queryFn: async (): Promise<BacklogStory[]> => {
      const { data: features, error: featError } = await supabase
        .from('features')
        .select('id, display_id, name, epic_id')
        .eq('project_id', projectId)
        .is('deleted_at', null);
      if (featError) throw featError;
      if (!features || features.length === 0) return [];

      const featureIds = features.map(f => f.id);

      const epicIds = [...new Set(features.map(f => f.epic_id).filter(Boolean))] as string[];
      const epicsMap: Record<string, { id: string; epic_key: string | null; name: string }> = {};
      if (epicIds.length > 0) {
        const { data: epics } = await supabase
          .from('epics')
          .select('id, epic_key, name')
          .in('id', epicIds);
        if (epics) {
          for (const e of epics) epicsMap[e.id] = e;
        }
      }

      const featureMap: Record<string, BacklogStory['feature']> = {};
      for (const f of features) {
        featureMap[f.id] = {
          id: f.id,
          display_id: f.display_id,
          name: f.name,
          epic_id: f.epic_id,
          epic: f.epic_id ? epicsMap[f.epic_id] ?? null : null,
        };
      }

      const { data: stories, error: storyError } = await supabase
        .from('stories')
        .select('id, story_key, title, name, description, status, feature_id, assignee_id, start_date, priority, deleted_at, rank_order')
        .in('feature_id', featureIds)
        .is('deleted_at', null)
        .order('rank_order', { ascending: true, nullsFirst: false });
      if (storyError) throw storyError;

      return (stories || []).map((s: any) => ({
        ...s,
        feature: s.feature_id ? featureMap[s.feature_id] ?? null : null,
      })) as BacklogStory[];
    },
    enabled: !!projectId,
  });
}
