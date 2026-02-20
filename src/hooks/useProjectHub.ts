// ============================================================
// ProjectHub Hooks — All data fetching for All Projects page
// Every query hits real Supabase — NO mock data
// ============================================================

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ProjectListItem,
  ProjectTeamMember,
  CreateProjectInput,
  ProjectFilters,
  SortColumn,
  SortDirection,
} from '@/types/projecthub';

// === Query Keys ===
const QUERY_KEYS = {
  projects: ['projecthub', 'projects'] as const,
  projectTeam: (id: string) => ['projecthub', 'team', id] as const,
  favorites: ['projecthub', 'favorites'] as const,
};

// ─────────────────────────────────────────────
// 1. Fetch all projects from v_project_list view
// ─────────────────────────────────────────────
export function useProjects() {
  return useQuery({
    queryKey: QUERY_KEYS.projects,
    queryFn: async (): Promise<ProjectListItem[]> => {
      const { data, error } = await (supabase as any)
        .from('v_project_list')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
      return (data ?? []) as ProjectListItem[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ─────────────────────────────────────────────
// 2. Fetch team members for detail panel
// ─────────────────────────────────────────────
export function useProjectTeam(projectId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.projectTeam(projectId ?? ''),
    queryFn: async (): Promise<ProjectTeamMember[]> => {
      if (!projectId) return [];

      const { data, error } = await (supabase as any)
        .rpc('get_project_team', { p_project_id: projectId });

      if (error) throw new Error(`Failed to fetch team: ${error.message}`);
      return (data ?? []) as ProjectTeamMember[];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────
// 3. Favorites — fetch current user's starred projects
// ─────────────────────────────────────────────
export function useProjectFavorites() {
  return useQuery({
    queryKey: QUERY_KEYS.favorites,
    queryFn: async (): Promise<Set<string>> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Set<string>();

      const { data, error } = await (supabase as any)
        .from('project_favorites')
        .select('project_id')
        .eq('user_id', user.id);

      if (error) throw new Error(`Failed to fetch favorites: ${error.message}`);
      return new Set((data ?? []).map((f: { project_id: string }) => f.project_id));
    },
  });
}

// ─────────────────────────────────────────────
// 4. Toggle favorite — with optimistic update
// ─────────────────────────────────────────────
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, isFavorited }: { projectId: string; isFavorited: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isFavorited) {
        const { error } = await (supabase as any)
          .from('project_favorites')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('project_favorites')
          .insert({ project_id: projectId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ projectId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.favorites });
      const previous = queryClient.getQueryData<Set<string>>(QUERY_KEYS.favorites);

      queryClient.setQueryData<Set<string>>(QUERY_KEYS.favorites, (old) => {
        const next = new Set(old);
        if (isFavorited) next.delete(projectId);
        else next.add(projectId);
        return next;
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.favorites, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.favorites });
    },
  });
}

// ─────────────────────────────────────────────
// 5. Create new project
// ─────────────────────────────────────────────
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('projects')
        .insert({
          name: input.name,
          project_key: input.project_key.toUpperCase(),
          department: input.department ?? null,
          status: input.status ?? 'planning',
          description: input.description ?? null,
          owner_id: user.id,
          created_by: user.id,
          health_status: 'on_track',
          status_category: 'todo',
          total_epics: 0,
          total_stories: 0,
          total_tasks: 0,
          work_items_todo: 0,
          work_items_in_progress: 0,
          work_items_done: 0,
          completion_percentage: 0,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create project: ${error.message}`);

      // Auto-add creator as admin member
      await (supabase as any).from('project_members').insert({
        project_id: data.id,
        user_id: user.id,
        role_name: 'admin',
        added_by: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
}

// ─────────────────────────────────────────────
// 6. Real-time subscription for live updates
// ─────────────────────────────────────────────
export function useProjectsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('projecthub_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// ─────────────────────────────────────────────
// 7. Client-side filtering & sorting utility
// ─────────────────────────────────────────────
export function filterAndSortProjects(
  projects: ProjectListItem[],
  filters: ProjectFilters,
  sortCol: SortColumn,
  sortDir: SortDirection
): ProjectListItem[] {
  let result = [...projects];

  // Text search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.project_key.toLowerCase().includes(q) ||
      (p.department ?? '').toLowerCase().includes(q)
    );
  }

  // Status chip
  if (filters.statusChip !== 'All') {
    const map: Record<string, string> = {
      'Active': 'active', 'On Hold': 'on_hold',
      'Planning': 'planning', 'Completed': 'completed'
    };
    const dbVal = map[filters.statusChip];
    if (dbVal) result = result.filter(p => p.status === dbVal);
  }

  // Advanced filters
  if (filters.departments.length) {
    result = result.filter(p => filters.departments.includes(p.department ?? ''));
  }
  if (filters.statuses.length) {
    result = result.filter(p => filters.statuses.includes(p.status));
  }
  if (filters.healths.length) {
    result = result.filter(p => filters.healths.includes(p.health_status));
  }
  if (filters.categories.length) {
    result = result.filter(p => filters.categories.includes(p.status_category));
  }

  // Sort
  result.sort((a, b) => {
    let va: string | number;
    let vb: string | number;

    switch (sortCol) {
      case 'department': va = a.department ?? ''; vb = b.department ?? ''; break;
      case 'status': va = a.status; vb = b.status; break;
      case 'health_status': va = a.health_status; vb = b.health_status; break;
      case 'total_epics': va = a.total_epics; vb = b.total_epics; break;
      case 'total_stories': va = a.total_stories; vb = b.total_stories; break;
      case 'total_tasks': va = a.total_tasks; vb = b.total_tasks; break;
      default: va = a.name.toLowerCase(); vb = b.name.toLowerCase();
    }

    if (typeof va === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    }
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  return result;
}

// ─────────────────────────────────────────────
// 8. Portfolio stats computed from projects array
// ─────────────────────────────────────────────
export function computePortfolioStats(projects: ProjectListItem[]) {
  return {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    onHold: projects.filter(p => p.status === 'on_hold').length,
    planning: projects.filter(p => p.status === 'planning').length,
    completed: projects.filter(p => p.status === 'completed').length,
    atRisk: projects.filter(p => p.health_status === 'at_risk' || p.health_status === 'off_track').length,
    totalEpics: projects.reduce((s, p) => s + p.total_epics, 0),
    totalStories: projects.reduce((s, p) => s + p.total_stories, 0),
    totalTodo: projects.reduce((s, p) => s + p.work_items_todo, 0),
    totalInProgress: projects.reduce((s, p) => s + p.work_items_in_progress, 0),
    totalDone: projects.reduce((s, p) => s + p.work_items_done, 0),
  };
}
