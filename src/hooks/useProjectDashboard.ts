/**
 * ProjectHub Dashboard V3 — TanStack Query Hooks
 * Each hook wraps a service function with caching and enabled guards.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  resolveProjectId,
  fetchReleases,
  fetchKeyMilestones,
  fetchInProduction,
  fetchItemsByStatus,
  fetchOverdue,
  fetchOnHold,
  fetchIncidents,
  fetchDefects,
  fetchTimeInStatus,
  fetchLifecycle,
  fetchTeamWorkload,
  fetchAssignedItems,
  fetchActivity,
  fetchMilestoneConfig,
  updateMilestoneConfig,
  fetchTisConfig,
  updateTisConfig,
} from '@/services/project-dashboard';

// ─── Resolve project key → UUID ───
export function useProjectId(projectKey: string | undefined) {
  return useQuery({
    queryKey: ['ph-project-id', projectKey],
    queryFn: () => resolveProjectId(projectKey!),
    enabled: !!projectKey,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Releases ───
export function useReleases(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-releases', projectId],
    queryFn: () => fetchReleases(projectId!),
    enabled: !!projectId,
  });
}

// ─── Key Milestones ───
export function useKeyMilestones(projectId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-milestones', projectId, releaseIds],
    queryFn: () => fetchKeyMilestones(projectId!, releaseIds),
    enabled: !!projectId && releaseIds.length > 0,
  });
}

// ─── Latest in Production ───
export function useInProduction(projectId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-in-production', projectId, releaseIds],
    queryFn: () => fetchInProduction(projectId!, releaseIds),
    enabled: !!projectId && releaseIds.length > 0,
  });
}

// ─── Items by Status ───
export function useItemsByStatus(projectId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-items-by-status', projectId, releaseIds],
    queryFn: () => fetchItemsByStatus(projectId!, releaseIds),
    enabled: !!projectId && releaseIds.length > 0,
  });
}

// ─── Overdue ───
export function useOverdue(projectId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-overdue', projectId, releaseIds],
    queryFn: () => fetchOverdue(projectId!, releaseIds),
    enabled: !!projectId && releaseIds.length > 0,
  });
}

// ─── On Hold ───
export function useOnHold(projectId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-on-hold', projectId, releaseIds],
    queryFn: () => fetchOnHold(projectId!, releaseIds),
    enabled: !!projectId && releaseIds.length > 0,
  });
}

// ─── Incidents ───
export function useIncidents(projectId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-incidents', projectId, releaseIds],
    queryFn: () => fetchIncidents(projectId!, releaseIds),
    enabled: !!projectId && releaseIds.length > 0,
  });
}

// ─── Defects ───
export function useDefects(projectId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-defects', projectId, releaseIds],
    queryFn: () => fetchDefects(projectId!, releaseIds),
    enabled: !!projectId && releaseIds.length > 0,
  });
}

// ─── Time in Status ───
export function useTimeInStatus(projectId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-time-in-status', projectId, releaseIds],
    queryFn: () => fetchTimeInStatus(projectId!, releaseIds),
    enabled: !!projectId && releaseIds.length > 0,
  });
}

// ─── Lifecycle (single item) ───
export function useLifecycle(workItemId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-lifecycle', workItemId],
    queryFn: () => fetchLifecycle(workItemId!),
    enabled: !!workItemId,
  });
}

// ─── Team Workload ───
export function useTeamWorkload(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-team-workload', projectId],
    queryFn: () => fetchTeamWorkload(projectId!),
    enabled: !!projectId,
  });
}

// ─── Assigned Items (for drawer) ───
export function useAssignedItems(userId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-assigned-items', userId, releaseIds],
    queryFn: () => fetchAssignedItems(userId!, releaseIds),
    enabled: !!userId && releaseIds.length > 0,
  });
}

// ─── Recent Activity ───
export function useActivity(projectId: string | null | undefined, releaseIds: string[]) {
  return useQuery({
    queryKey: ['ph-activity', projectId, releaseIds],
    queryFn: () => fetchActivity(projectId!, releaseIds),
    enabled: !!projectId && releaseIds.length > 0,
  });
}

// ─── Milestone Config ───
export function useMilestoneConfig(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-milestone-config', projectId],
    queryFn: () => fetchMilestoneConfig(projectId!),
    enabled: !!projectId,
  });
}

// ─── Update Milestone Config ───
export function useUpdateMilestoneConfig(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (statuses: string[]) => updateMilestoneConfig(projectId, statuses),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ph-milestone-config', projectId] });
      qc.invalidateQueries({ queryKey: ['ph-milestones', projectId] });
    },
  });
}

// ─── TIS Config ───
export function useTisConfig(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['ph-tis-config', projectId],
    queryFn: () => fetchTisConfig(projectId!),
    enabled: !!projectId,
  });
}

// ─── Update TIS Config ───
export function useUpdateTisConfig(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (visibleStatuses: string[]) => updateTisConfig(projectId, visibleStatuses),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ph-tis-config', projectId] });
      qc.invalidateQueries({ queryKey: ['ph-time-in-status', projectId] });
    },
  });
}
