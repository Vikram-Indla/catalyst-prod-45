import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/strategic-themes-service';
import type { StrategicTheme, ThemeGroup, ThemeMilestone } from '@/types/strategic-themes';

// ═══ THEMES ═══
export function useThemes() {
  return useQuery({
    queryKey: ['strategic-themes'],
    queryFn: api.fetchThemes,
  });
}

export function useTheme(id: string | undefined) {
  return useQuery({
    queryKey: ['strategic-theme', id],
    queryFn: () => api.fetchThemeById(id!),
    enabled: !!id,
  });
}

export function useCreateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (theme: Partial<StrategicTheme>) => api.createTheme(theme),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['strategic-themes'] }); },
  });
}

export function useUpdateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<StrategicTheme> }) =>
      api.updateTheme(id, updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['strategic-themes'] });
      qc.invalidateQueries({ queryKey: ['strategic-theme', vars.id] });
    },
  });
}

export function useDeleteTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTheme(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['strategic-themes'] }); },
  });
}

// ═══ THEME GROUPS ═══
export function useThemeGroups() {
  return useQuery({
    queryKey: ['theme-groups'],
    queryFn: api.fetchThemeGroups,
  });
}

export function useCreateThemeGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (group: Partial<ThemeGroup>) => api.createThemeGroup(group),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['theme-groups'] }); },
  });
}

// ═══ MILESTONES ═══
export function useMilestones(themeId: string | undefined) {
  return useQuery({
    queryKey: ['theme-milestones', themeId],
    queryFn: () => api.fetchMilestones(themeId!),
    enabled: !!themeId,
  });
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestone: Partial<ThemeMilestone>) => api.createMilestone(milestone),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['theme-milestones', vars.theme_id] });
      qc.invalidateQueries({ queryKey: ['strategic-themes'] });
    },
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ThemeMilestone> }) =>
      api.updateMilestone(id, updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['theme-milestones'] });
      qc.invalidateQueries({ queryKey: ['strategic-themes'] });
    },
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMilestone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['theme-milestones'] });
      qc.invalidateQueries({ queryKey: ['strategic-themes'] });
    },
  });
}

// ═══ TIMELINE ═══
export function useTimelineData() {
  return useQuery({
    queryKey: ['themes-timeline'],
    queryFn: api.fetchTimelineData,
  });
}
