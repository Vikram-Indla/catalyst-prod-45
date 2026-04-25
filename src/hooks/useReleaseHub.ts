import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  releaseService,
  changeService,
  signOffService,
  triageService,
  testCycleService,
  productionEventService,
  activityService,
  commandCenterService,
  workItemService,
} from '@/services/release-hub.service';
import { supabase } from '@/integrations/supabase/client';

// ── Query Key Family ─────────────────────────────────────────────
const KEYS = {
  all: ['release-hub'] as const,
  releases: ['release-hub', 'releases'] as const,
  release: (id: string) => ['release-hub', 'releases', id] as const,
  releaseTestCycles: (id: string) => ['release-hub', 'releases', id, 'testcycles'] as const,
  changes: ['release-hub', 'changes'] as const,
  change: (id: string) => ['release-hub', 'changes', id] as const,
  signoffs: (changeId: string) => ['release-hub', 'signoffs', changeId] as const,
  pendingSignoffs: ['release-hub', 'signoffs', 'pending'] as const,
  testCycles: (changeId: string) => ['release-hub', 'test-cycles', changeId] as const,
  triage: ['release-hub', 'triage'] as const,
  triageCount: ['release-hub', 'triage-count'] as const,
  productionEvents: ['release-hub', 'production-events'] as const,
  activity: (changeId: string) => ['release-hub', 'activity', changeId] as const,
  kpis: ['release-hub', 'kpis'] as const,
  commandCenter: ['release-hub', 'command-center'] as const,
  workItems: (changeId: string) => ['release-hub', 'work-items', changeId] as const,
};

// ── Releases ─────────────────────────────────────────────────────
export const useReleases = () =>
  useQuery({ queryKey: KEYS.releases, queryFn: releaseService.getAll, staleTime: 30_000 });

export const useReleaseSummary = () =>
  useQuery({ queryKey: [...KEYS.releases, 'summary'], queryFn: releaseService.getSummary, staleTime: 30_000 });

export const useRelease = (id: string) =>
  useQuery({ queryKey: KEYS.release(id), queryFn: () => releaseService.getById(id), enabled: !!id });

export const useReleaseTestCycles = (releaseId: string) =>
  useQuery({ queryKey: KEYS.releaseTestCycles(releaseId), queryFn: () => releaseService.getTestCycles(releaseId), enabled: !!releaseId });

export const useCreateRelease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: releaseService.create,
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

// ── Changes ──────────────────────────────────────────────────────
export const useChanges = () =>
  useQuery({ queryKey: KEYS.changes, queryFn: changeService.getAll, staleTime: 15_000 });

export const useChange = (id: string) =>
  useQuery({ queryKey: KEYS.change(id), queryFn: () => changeService.getById(id), enabled: !!id });

export const useCreateChange = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: changeService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.changes });
      qc.invalidateQueries({ queryKey: KEYS.releases });
      qc.invalidateQueries({ queryKey: KEYS.kpis });
    },
  });
};

export const useUpdateChangeStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, deploymentResult, comment }: { id: string; status: string; deploymentResult?: string | null; comment?: string }) =>
      changeService.updateStatus(id, status, deploymentResult, comment),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.changes });
      qc.invalidateQueries({ queryKey: KEYS.change(id) });
      qc.invalidateQueries({ queryKey: KEYS.kpis });
    },
  });
};

// ── Sign-offs ────────────────────────────────────────────────────
export const useChangeSignoffs = (changeId: string) =>
  useQuery({ queryKey: KEYS.signoffs(changeId), queryFn: () => signOffService.getByChangeId(changeId), enabled: !!changeId });

export const usePendingSignOffs = () =>
  useQuery({ queryKey: KEYS.pendingSignoffs, queryFn: signOffService.getAllPending, staleTime: 15_000 });

export const useApproveSignoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ signoffId, comment }: { signoffId: string; comment?: string }) => changeService.approveSignoff(signoffId, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
};

export const useRejectSignoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ signoffId, comment }: { signoffId: string; comment: string }) => changeService.rejectSignoff(signoffId, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
};

// ── Test Cycles ──────────────────────────────────────────────────
export const useChangeTestCycles = (changeId: string) =>
  useQuery({ queryKey: KEYS.testCycles(changeId), queryFn: () => testCycleService.getByChangeId(changeId), enabled: !!changeId });

// ── Triage ───────────────────────────────────────────────────────
export const useTriageChanges = () =>
  useQuery({ queryKey: KEYS.triage, queryFn: triageService.getUnlinked, staleTime: 15_000 });

export const useTriageCount = () =>
  useQuery({
    queryKey: KEYS.triageCount,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('rh_changes')
        .select('*', { count: 'exact', head: true })
        .is('release_id', null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });

export const useLinkChangeToRelease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ changeId, releaseId }: { changeId: string; releaseId: string }) => triageService.linkToRelease(changeId, releaseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
};

// ── Work Items ───────────────────────────────────────────────────
export const useLinkedWorkItems = (changeId: string) =>
  useQuery({
    queryKey: KEYS.workItems(changeId),
    queryFn: () => changeService.getWorkItems(changeId),
    enabled: !!changeId,
  });

export const useLinkWorkItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ changeId, workItem }: { changeId: string; workItem: { work_item_key: string; work_item_title: string; work_item_type?: string; work_item_status?: string; work_item_id?: string } }) =>
      changeService.linkWorkItem(changeId, workItem),
    onSuccess: (_, { changeId }) => {
      qc.invalidateQueries({ queryKey: KEYS.change(changeId) });
      qc.invalidateQueries({ queryKey: KEYS.workItems(changeId) });
    },
  });
};

// ── Production Events ────────────────────────────────────────────
export const useProductionEvents = () =>
  useQuery({ queryKey: KEYS.productionEvents, queryFn: productionEventService.getAll, staleTime: 30_000 });

// ── Activity Log ─────────────────────────────────────────────────
export const useChangeActivity = (changeId: string) =>
  useQuery({ queryKey: KEYS.activity(changeId), queryFn: () => activityService.getByChangeId(changeId), enabled: !!changeId });

export const useChangeHistory = (changeId: string) =>
  useQuery({
    queryKey: ['release-hub', 'changes', changeId, 'history'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rh_change_status_history').select('*').eq('change_id', changeId).order('changed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!changeId,
  });

// ── Command Center KPIs ──────────────────────────────────────────
export const useCommandCenterKPIs = () =>
  useQuery({ queryKey: KEYS.kpis, queryFn: commandCenterService.getKPIs, staleTime: 30_000 });

export const useCommandCenterMappings = () =>
  useQuery({ queryKey: KEYS.commandCenter, queryFn: commandCenterService.getMappings, staleTime: 30_000 });

// ── Freeze Windows ───────────────────────────────────────────────
export function useFreezeWindows() {
  return useQuery({
    queryKey: ['release-hub', 'freeze-windows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_freeze_windows')
        .select('*')
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateFreezeWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      start_date: string;
      end_date: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('rh_freeze_windows')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['release-hub', 'freeze-windows'] });
    },
  });
}

export function useDeleteFreezeWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rh_freeze_windows')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['release-hub', 'freeze-windows'] });
    },
  });
}

export function useUnlinkTestCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      releaseId,
      testCycleId,
    }: {
      releaseId: string;
      testCycleId: string;
    }) => {
      const { error } = await supabase
        .from('rh_release_test_cycle_links')
        .delete()
        .eq('release_id', releaseId)
        .eq('test_cycle_id', testCycleId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ['release-hub', 'test-cycles', vars.releaseId],
      });
    },
  });
}


export const useUpdateReleaseTargetDate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, targetDate }: { id: string; targetDate: string }) => {
      const { error } = await supabase
        .from('rh_releases')
        .update({ target_date: targetDate })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['release-hub', 'releases'] });
    },
  });
};
