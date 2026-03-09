import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { releaseService, changeService, commandCenterService } from '@/services/releasehub.service';
import { supabase } from '@/integrations/supabase/client';

const KEYS = {
  releases: ['releasehub', 'releases'] as const,
  release: (id: string) => ['releasehub', 'releases', id] as const,
  releaseTestCycles: (id: string) => ['releasehub', 'releases', id, 'testcycles'] as const,
  changes: ['releasehub', 'changes'] as const,
  change: (id: string) => ['releasehub', 'changes', id] as const,
  changeSignoffs: (id: string) => ['releasehub', 'changes', id, 'signoffs'] as const,
  changeHistory: (id: string) => ['releasehub', 'changes', id, 'history'] as const,
  commandCenter: ['releasehub', 'command-center'] as const,
  triageCount: ['releasehub', 'triage-count'] as const,
};

// ── Releases ──────────────────────────────────────────────────────
export const useReleases = (projectId?: string) =>
  useQuery({ queryKey: [...KEYS.releases, projectId], queryFn: () => releaseService.getAll(projectId), staleTime: 30_000 });

export const useRelease = (id: string) =>
  useQuery({ queryKey: KEYS.release(id), queryFn: () => releaseService.getById(id), enabled: !!id });

export const useReleaseTestCycles = (releaseId: string) =>
  useQuery({ queryKey: KEYS.releaseTestCycles(releaseId), queryFn: () => releaseService.getTestCycles(releaseId), enabled: !!releaseId });

export const useCreateRelease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; target_date: string; version?: string; status?: string; source?: string; jira_key?: string; project_id?: string }) => releaseService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.releases }),
  });
};

export const useUpdateReleaseStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => releaseService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.releases });
      qc.invalidateQueries({ queryKey: KEYS.release(id) });
    },
  });
};

export const useLinkTestCycle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ releaseId, testCycleId }: { releaseId: string; testCycleId: string }) => releaseService.linkTestCycle(releaseId, testCycleId),
    onSuccess: (_, { releaseId }) => {
      qc.invalidateQueries({ queryKey: KEYS.releaseTestCycles(releaseId) });
      qc.invalidateQueries({ queryKey: KEYS.commandCenter });
    },
  });
};

// ── Changes ───────────────────────────────────────────────────────
export const useChanges = (projectId?: string) =>
  useQuery({ queryKey: [...KEYS.changes, projectId], queryFn: () => changeService.getAll(projectId), staleTime: 15_000 });

export const useChange = (id: string) =>
  useQuery({ queryKey: KEYS.change(id), queryFn: () => changeService.getById(id), enabled: !!id });

export const useChangeSignoffs = (changeId: string) =>
  useQuery({
    queryKey: KEYS.changeSignoffs(changeId),
    queryFn: async () => {
      const { data, error } = await supabase.from('rh_change_signoffs').select('*').eq('change_id', changeId).order('wait_started_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!changeId,
  });

export const useChangeHistory = (changeId: string) =>
  useQuery({
    queryKey: KEYS.changeHistory(changeId),
    queryFn: async () => {
      const { data, error } = await supabase.from('rh_change_status_history').select('*').eq('change_id', changeId).order('changed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!changeId,
  });

export const useCreateChange = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { chg_number: string; title: string; status?: string; risk_level?: string; source?: string; category?: string; deployment_date?: string }) => changeService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.changes });
      qc.invalidateQueries({ queryKey: KEYS.releases });
    },
  });
};

export const useUpdateChangeStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: string; comment?: string }) =>
      changeService.updateStatus(id, status, comment),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.changes });
      qc.invalidateQueries({ queryKey: KEYS.change(id) });
      qc.invalidateQueries({ queryKey: KEYS.changeHistory(id) });
    },
  });
};

export const useApproveSignoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signoffId: string) => changeService.approveSignoff(signoffId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.changes });
    },
  });
};

export const useRejectSignoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ signoffId, comment }: { signoffId: string; comment: string }) => changeService.rejectSignoff(signoffId, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.changes });
    },
  });
};

export const useLinkWorkItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ changeId, workItem }: { changeId: string; workItem: { work_item_key: string; work_item_title: string; work_item_type?: string; work_item_status?: string; work_item_id?: string } }) =>
      changeService.linkWorkItem(changeId, workItem),
    onSuccess: (_, { changeId }) => {
      qc.invalidateQueries({ queryKey: KEYS.change(changeId) });
      qc.invalidateQueries({ queryKey: KEYS.changes });
      qc.invalidateQueries({ queryKey: KEYS.triageCount });
    },
  });
};

// ── Triage Count ──────────────────────────────────────────────────
export const useTriageCount = () =>
  useQuery({
    queryKey: KEYS.triageCount,
    queryFn: async () => {
      // Count changes with no release assignment
      const { count, error } = await supabase
        .from('rh_changes')
        .select('*', { count: 'exact', head: true })
        .is('release_id', null);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 60_000,
  });

// ── Command Center ────────────────────────────────────────────────
export const useCommandCenterMappings = () =>
  useQuery({ queryKey: KEYS.commandCenter, queryFn: commandCenterService.getMappings, staleTime: 30_000 });
