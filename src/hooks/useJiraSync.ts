/**
 * useJiraSync — TanStack Query hooks for Jira sync operations
 * Stage B: Full query/mutation hooks, no UI
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jiraSyncService } from '@/services/jira-sync.service';

export const jiraSyncKeys = {
  conflicts: (projectId: string) => ['jira-conflicts', projectId] as const,
  syncLog: (projectId: string) => ['jira-sync-log', projectId] as const,
  writeBackQueue: (projectId: string) => ['jira-write-back', projectId] as const,
  syncSummary: (projectId: string) => ['jira-sync-summary', projectId] as const,
};

export function useConflicts(projectId: string) {
  return useQuery({
    queryKey: jiraSyncKeys.conflicts(projectId),
    queryFn: () => jiraSyncService.getConflicts(projectId),
    refetchInterval: 30_000,
    enabled: !!projectId,
  });
}

export function useSyncSummary(projectId: string) {
  return useQuery({
    queryKey: jiraSyncKeys.syncSummary(projectId),
    queryFn: () => jiraSyncService.getSyncSummary(projectId),
    enabled: !!projectId,
  });
}

export function useSyncLogs(projectId: string) {
  return useQuery({
    queryKey: jiraSyncKeys.syncLog(projectId),
    queryFn: () => jiraSyncService.getSyncLogs(projectId),
    enabled: !!projectId,
  });
}

export function useWriteBackQueue(projectId: string) {
  return useQuery({
    queryKey: jiraSyncKeys.writeBackQueue(projectId),
    queryFn: () => jiraSyncService.getWriteBackQueue(projectId),
    enabled: !!projectId,
  });
}

export function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => jiraSyncService.triggerSync(projectId),
    onSuccess: (_, projectId) => {
      qc.invalidateQueries({ queryKey: jiraSyncKeys.syncLog(projectId) });
      qc.invalidateQueries({ queryKey: jiraSyncKeys.syncSummary(projectId) });
    },
  });
}

export function useResolveConflict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conflictId, resolution }: {
      conflictId: string;
      resolution: 'keep_catalyst' | 'keep_jira';
    }) => jiraSyncService.resolveConflict(conflictId, resolution),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jira-conflicts'] });
    },
  });
}

export function useApproveWriteBack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queueId: string) => jiraSyncService.approveWriteBack(queueId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jira-write-back'] });
    },
  });
}
