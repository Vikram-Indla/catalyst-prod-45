/**
 * WorkHub "All Work" — Complete TanStack Query hooks
 * Wired to workhubService → wh_ tables (with ph_issues fallback)
 * ZERO hardcoded data. All state from Supabase.
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { workhubService } from '@/services/workhub';
import { catalystToast } from '@/lib/catalystToast';

// Query-key factory (was @/types/workhub.ts, removed in the work-item enum
// dedup sweep). Inlined here — this is the only consumer. Keys follow the
// shared 'workhub' prefix convention used by the other hooks in this file.
const whQueryKeys = {
  all: ['workhub'] as const,
  detail: (id: string) => ['workhub', 'detail', id] as const,
  statuses: () => ['workhub', 'statuses'] as const,
  workTypes: () => ['workhub', 'work-types'] as const,
  sprintReleases: () => ['workhub', 'sprint-releases'] as const,
  labels: () => ['workhub', 'labels'] as const,
  comments: (id: string) => ['workhub', 'comments', id] as const,
  worklogs: (id: string) => ['workhub', 'worklogs', id] as const,
  history: (id: string) => ['workhub', 'history', id] as const,
  links: (id: string) => ['workhub', 'links', id] as const,
  stats: () => ['workhub', 'stats'] as const,
};

// ════════════════════════════════════════════════════════════════
// READ HOOKS
// ════════════════════════════════════════════════════════════════

const STALE = 60_000;

export function useAllWorkItems(
  projectId?: string,
  filters?: {
    types?: string[];
    statuses?: string[];
    priorities?: string[];
    search?: string;
    assigneeIds?: string[];
  },
  pagination?: { page: number; pageSize: number },
  sort?: { field: string; dir: 'asc' | 'desc' },
) {
  return useQuery({
    queryKey: ['workhub', 'all-work', projectId, filters, pagination, sort],
    queryFn: () => workhubService.fetchAllWorkList(projectId, filters, pagination, sort),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useWorkItemDetail(id: string | null) {
  return useQuery({
    queryKey: whQueryKeys.detail(id ?? ''),
    queryFn: () => workhubService.fetchWorkItemDetail(id!),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useWhStatuses(projectId?: string) {
  return useQuery({
    queryKey: [...whQueryKeys.statuses(), projectId],
    queryFn: () => workhubService.fetchStatuses(projectId),
    staleTime: 120_000,
  });
}

export function useValidTransitions(projectId: string, fromStatusId: string) {
  return useQuery({
    queryKey: ['workhub', 'transitions', projectId, fromStatusId],
    queryFn: () => workhubService.fetchValidTransitions(projectId, fromStatusId),
    enabled: !!projectId && !!fromStatusId,
    staleTime: 120_000,
  });
}

export function useWhWorkTypes(projectId?: string) {
  return useQuery({
    queryKey: [...whQueryKeys.workTypes(), projectId],
    queryFn: () => workhubService.fetchWorkTypes(projectId),
    staleTime: 120_000,
  });
}

export function useWhSprintReleases(projectId?: string) {
  return useQuery({
    queryKey: [...whQueryKeys.sprintReleases(), projectId],
    queryFn: () => workhubService.fetchSprintReleases(projectId),
    staleTime: 120_000,
  });
}

export function useWhLabels(projectId?: string) {
  return useQuery({
    queryKey: [...whQueryKeys.labels(), projectId],
    queryFn: () => workhubService.fetchLabels(projectId),
    staleTime: 120_000,
  });
}

export function useWhLinkTypes() {
  return useQuery({
    queryKey: ['workhub', 'link-types'],
    queryFn: () => workhubService.fetchLinkTypes(),
    staleTime: 300_000,
  });
}

export function useWhComments(workItemId: string | null) {
  return useQuery({
    queryKey: whQueryKeys.comments(workItemId ?? ''),
    queryFn: () => workhubService.fetchComments(workItemId!),
    enabled: !!workItemId,
    staleTime: 15_000,
  });
}

export function useWhWorkLogs(workItemId: string | null) {
  return useQuery({
    queryKey: whQueryKeys.worklogs(workItemId ?? ''),
    queryFn: () => workhubService.fetchWorkLogs(workItemId!),
    enabled: !!workItemId,
    staleTime: 15_000,
  });
}

export function useWhHistory(workItemId: string | null) {
  return useQuery({
    queryKey: whQueryKeys.history(workItemId ?? ''),
    queryFn: () => workhubService.fetchHistory(workItemId!),
    enabled: !!workItemId,
    staleTime: 15_000,
  });
}

export function useWhLinks(workItemId: string | null) {
  return useQuery({
    queryKey: whQueryKeys.links(workItemId ?? ''),
    queryFn: () => workhubService.fetchLinks(workItemId!),
    enabled: !!workItemId,
    staleTime: 30_000,
  });
}

export function useWhDashboardStats(projectId?: string) {
  return useQuery({
    queryKey: [...whQueryKeys.stats(), projectId],
    queryFn: () => workhubService.fetchDashboardStats(projectId),
    staleTime: 15_000,
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['workhub', 'team-members'],
    queryFn: () => workhubService.fetchTeamMembers(),
    staleTime: 120_000,
  });
}

// ════════════════════════════════════════════════════════════════
// MUTATION HOOKS
// ════════════════════════════════════════════════════════════════

export function useCreateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workhubService.createWorkItem,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success(`${data.item_key || 'Work item'} created`);
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to create work item: ${err.message}`);
    },
  });
}

export function useUpdateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, any> }) =>
      workhubService.updateWorkItem(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
    },
    onError: (err: Error) => {
      catalystToast.error(`Update failed: ${err.message}`);
    },
  });
}

export function useDeleteWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workhubService.deleteWorkItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success('Work item deleted');
    },
    onError: (err: Error) => {
      catalystToast.error(`Delete failed: ${err.message}`);
    },
  });
}

export function useBulkDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workhubService.bulkDelete,
    onSuccess: (_data, ids) => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success(`${ids.length} items deleted`);
    },
    onError: (err: Error) => {
      catalystToast.error(`Bulk delete failed: ${err.message}`);
    },
  });
}

export function useBulkUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, statusId }: { ids: string[]; statusId: string }) =>
      workhubService.bulkUpdateStatus(ids, statusId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success(`${vars.ids.length} items updated`);
    },
    onError: (err: Error) => {
      catalystToast.error(`Bulk status update failed: ${err.message}`);
    },
  });
}

export function useCreateComment(workItemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, authorId }: { body: string; authorId: string }) =>
      workhubService.createComment(workItemId, body, authorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whQueryKeys.comments(workItemId) });
      catalystToast.success('Comment added');
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to add comment: ${err.message}`);
    },
  });
}

export function useLogWork(workItemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ timeSpentMinutes, workDate, description, authorId }: {
      timeSpentMinutes: number; workDate: string; description: string | null; authorId: string;
    }) => workhubService.logWork(workItemId, timeSpentMinutes, workDate, description, authorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whQueryKeys.worklogs(workItemId) });
      qc.invalidateQueries({ queryKey: whQueryKeys.detail(workItemId) });
      catalystToast.success('Work logged');
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to log work: ${err.message}`);
    },
  });
}

export function useAddLink(workItemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ linkTypeId, targetItemId, comment, createdBy }: {
      linkTypeId: string; targetItemId: string; comment: string | null; createdBy: string;
    }) => workhubService.addLink(linkTypeId, workItemId, targetItemId, comment, createdBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whQueryKeys.links(workItemId) });
      catalystToast.success('Link added');
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to add link: ${err.message}`);
    },
  });
}

export function useAddLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workItemId, labelId }: { workItemId: string; labelId: string }) =>
      workhubService.addLabel(workItemId, labelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success('Label added');
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to add label: ${err.message}`);
    },
  });
}

export function useRemoveLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workItemId, labelId }: { workItemId: string; labelId: string }) =>
      workhubService.removeLabel(workItemId, labelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success('Label removed');
    },
    onError: (err: Error) => {
      catalystToast.error(`Failed to remove label: ${err.message}`);
    },
  });
}

export function useCloneWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, cloneLinks, cloneSubtasks, clonedBy }: {
      sourceId: string; cloneLinks: boolean; cloneSubtasks: boolean; clonedBy: string;
    }) => workhubService.cloneWorkItem(sourceId, cloneLinks, cloneSubtasks, clonedBy),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success(`Cloned as ${data.item_key || 'new item'}`);
    },
    onError: (err: Error) => {
      catalystToast.error(`Clone failed: ${err.message}`);
    },
  });
}

export function useMoveWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetProjectId, targetWorkTypeId, targetStatusId }: {
      id: string; targetProjectId: string; targetWorkTypeId?: string; targetStatusId?: string;
    }) => workhubService.moveWorkItem(id, targetProjectId, targetWorkTypeId, targetStatusId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success('Work item moved');
    },
    onError: (err: Error) => {
      catalystToast.error(`Move failed: ${err.message}`);
    },
  });
}
