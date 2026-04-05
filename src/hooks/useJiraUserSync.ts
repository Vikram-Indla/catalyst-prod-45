import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '@/services/jiraSyncService';
import type { SyncFilter, PermissionLevel, CreateCatalystUserPayload } from '@/types/jiraSync';

const K = {
  users: (p: number, f: SyncFilter, s: string) =>
    ['jira-sync-users', p, f, s] as const,
  stats: ['jira-sync-stats'] as const,
  runs: ['jira-sync-runs'] as const,
  detail: (id: string) => ['jira-sync-detail', id] as const,
};

export const useJiraSyncUsers = (p: number, f: SyncFilter, s: string) =>
  useQuery({
    queryKey: K.users(p, f, s),
    queryFn: () => svc.fetchJiraSyncUsers(p, f, s),
    placeholderData: (prev: any) => prev,
    staleTime: 30_000,
  });

export const useJiraSyncStats = () =>
  useQuery({
    queryKey: K.stats,
    queryFn: svc.fetchSyncStats,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

export const useJiraSyncRuns = () =>
  useQuery({
    queryKey: K.runs,
    queryFn: svc.fetchSyncRuns,
    refetchInterval: 10_000,
  });

export const useJiraUserDetail = (id: string | null) =>
  useQuery({
    queryKey: K.detail(id ?? ''),
    queryFn: () => svc.fetchUserDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
  });

export const useToggleUserStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      svc.toggleUserStatus(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jira-sync-users'] });
      qc.invalidateQueries({ queryKey: K.stats });
    },
  });
};

export const useUpdatePerm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ permId, level }: { permId: string; level: PermissionLevel }) =>
      svc.updateProjectPerm(permId, level),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['jira-sync-users'] }),
  });
};

export const useCreateCatalystUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateCatalystUserPayload) => svc.createCatalystUser(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jira-sync-users'] });
      qc.invalidateQueries({ queryKey: K.stats });
    },
  });
};

export const useTriggerUserSync = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.triggerManualSync,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jira-sync-users'] });
      qc.invalidateQueries({ queryKey: K.runs });
      qc.invalidateQueries({ queryKey: K.stats });
    },
  });
};

export const useCopyPermissions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, targetIds }: { sourceId: string; targetIds: string[] }) =>
      svc.copyPermissions(sourceId, targetIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jira-sync-users'] }),
  });
};
