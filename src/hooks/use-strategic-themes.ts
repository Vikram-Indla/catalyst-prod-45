import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/strategic-themes-service';
import type { StrategicTheme, ThemeGroup, ThemeMilestone } from '@/types/strategic-themes';
import { catalystToast } from '@/lib/catalystToast';

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategic-themes'] });
      catalystToast.success('Theme Created', 'Strategic theme has been created successfully.');
    },
    onError: (error: Error) => {
      catalystToast.error('Error', error.message || 'Failed to create theme.');
    },
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
      catalystToast.success('Theme Updated', 'Strategic theme has been updated.');
    },
    onError: (error: Error) => {
      catalystToast.error('Error', error.message || 'Failed to update theme.');
    },
  });
}

export function useDeleteTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTheme(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategic-themes'] });
      catalystToast.success('Theme Deleted', 'Strategic theme has been deleted.');
    },
    onError: (error: Error) => {
      catalystToast.error('Error', error.message || 'Failed to delete theme.');
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['theme-groups'] });
      catalystToast.success('Group Created', 'Theme group has been created.');
    },
    onError: (error: Error) => {
      catalystToast.error('Error', error.message || 'Failed to create group.');
    },
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
      catalystToast.success('Milestone Created', 'Milestone has been added.');
    },
    onError: (error: Error) => {
      catalystToast.error('Error', error.message || 'Failed to create milestone.');
    },
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, themeId, updates }: { id: string; themeId: string; updates: Partial<ThemeMilestone> }) =>
      api.updateMilestone(id, updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['theme-milestones', vars.themeId] });
      qc.invalidateQueries({ queryKey: ['strategic-themes'] });
      catalystToast.success('Milestone Updated', 'Milestone has been updated.');
    },
    onError: (error: Error) => {
      catalystToast.error('Error', error.message || 'Failed to update milestone.');
    },
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, themeId }: { id: string; themeId: string }) => api.deleteMilestone(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['theme-milestones', vars.themeId] });
      qc.invalidateQueries({ queryKey: ['strategic-themes'] });
      catalystToast.success('Milestone Deleted', 'Milestone has been removed.');
    },
    onError: (error: Error) => {
      catalystToast.error('Error', error.message || 'Failed to delete milestone.');
    },
  });
}

// ═══ GOALS / INITIATIVES (Drawer) ═══
export function useGoalsForTheme(themeId: string | undefined) {
  return useQuery({
    queryKey: ['theme-goals', themeId],
    queryFn: () => api.fetchGoalsForTheme(themeId!),
    enabled: !!themeId,
  });
}

export function useInitiativesForTheme(themeId: string | undefined) {
  return useQuery({
    queryKey: ['theme-initiatives', themeId],
    queryFn: () => api.fetchInitiativesForTheme(themeId!),
    enabled: !!themeId,
  });
}

// ═══ TIMELINE ═══
export function useTimelineData() {
  return useQuery({
    queryKey: ['themes-timeline'],
    queryFn: api.fetchTimelineData,
  });
}
