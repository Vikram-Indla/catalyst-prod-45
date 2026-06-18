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
import { validateReleaseTransition, validateChangeTransition } from '@/lib/release-ops/lifecycle';
import { catalystToast } from '@/lib/catalystToast';

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
  pendingApprovals: ['release-hub', 'signoffs', 'pending-approvals'] as const,
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

export interface ReleaseListRow {
  id: string;
  name: string;
  version: string | null;
  status: string;
  health: string | null;
  release_type: string | null;
  target_env: string | null;
  target_date: string | null;
  planned_release_date: string | null;
  readiness_pct: number | null;
  source: string;
  jira_key: string | null;
  updated_at: string | null;
  changeCount: number;
}

/**
 * Releases list for the JiraTable surface — queries rh_releases directly so the
 * richer lifecycle columns (health, release_type, target_env, readiness_pct …)
 * are available (the rh_release_summary view predates them). changeCount comes
 * from the legacy rh_changes.release_id link (M:N rh_change_release_links is
 * populated from Phase 7 onward).
 */
export const useReleasesList = () =>
  useQuery({
    queryKey: [...KEYS.releases, 'list'],
    staleTime: 30_000,
    queryFn: async (): Promise<ReleaseListRow[]> => {
      const { data: rels, error } = await supabase
        .from('rh_releases')
        .select('id, name, version, status, health, release_type, target_env, target_date, planned_release_date, readiness_pct, source, jira_key, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const releases = (rels ?? []) as any[];
      const ids = releases.map((r) => r.id);
      const counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: chgs } = await supabase
          .from('rh_changes')
          .select('release_id')
          .in('release_id', ids);
        (chgs ?? []).forEach((c: any) => {
          if (c.release_id) counts[c.release_id] = (counts[c.release_id] ?? 0) + 1;
        });
      }
      return releases.map((r) => ({ ...r, changeCount: counts[r.id] ?? 0 })) as ReleaseListRow[];
    },
  });

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
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const guard = await validateReleaseTransition(id, status);
      if (!guard.ok) throw new Error(guard.reason ?? 'Transition not allowed');
      await releaseService.updateStatus(id, status);
      // Auto-generate a production event when a production-targeted release
      // reaches `completed` (idempotent — skips if one already exists).
      if (status === 'completed') {
        const { data: rel } = await supabase
          .from('rh_releases')
          .select('id, name, target_env, product_id')
          .eq('id', id)
          .maybeSingle();
        if (rel && (rel as any).target_env === 'production') {
          const { count } = await supabase
            .from('rh_production_events')
            .select('*', { count: 'exact', head: true })
            .eq('release_id', id);
          if (!count) {
            const userId = (await supabase.auth.getUser()).data.user?.id;
            await supabase.from('rh_production_events').insert({
              release_id: id,
              release_key: (rel as any).name,
              product_id: (rel as any).product_id ?? undefined,
              title: `${(rel as any).name} deployed to production`,
              event_type: 'release',
              deployed_at: new Date().toISOString(),
              produced_at: new Date().toISOString(),
              deployed_by: userId ?? 'system',
              deployment_status: 'success',
              deployment_result: 'SUCCESS',
              target_env: 'production',
            });
          }
        }
      }
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.releases });
      qc.invalidateQueries({ queryKey: KEYS.release(id) });
      qc.invalidateQueries({ queryKey: KEYS.productionEvents });
    },
    onError: (err: any) => { catalystToast.error(err?.message ?? 'Could not change release status'); },
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
    mutationFn: async ({ id, status, deploymentResult, comment }: { id: string; status: string; deploymentResult?: string | null; comment?: string }) => {
      const guard = await validateChangeTransition(id, status);
      if (!guard.ok) throw new Error(guard.reason ?? 'Transition not allowed');
      return changeService.updateStatus(id, status, deploymentResult, comment);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.changes });
      qc.invalidateQueries({ queryKey: KEYS.change(id) });
      qc.invalidateQueries({ queryKey: KEYS.kpis });
    },
    onError: (err: any) => { catalystToast.error(err?.message ?? 'Could not change status'); },
  });
};

// ── Sign-offs ────────────────────────────────────────────────────
export const useChangeSignoffs = (changeId: string) =>
  useQuery({ queryKey: KEYS.signoffs(changeId), queryFn: () => signOffService.getByChangeId(changeId), enabled: !!changeId });

export const usePendingSignOffs = () =>
  useQuery({ queryKey: KEYS.pendingSignoffs, queryFn: signOffService.getAllPending, staleTime: 15_000 });

export interface PendingApproval {
  id: string;
  changeId: string | null;
  chgNumber: string | null;
  changeTitle: string | null;
  riskLevel: string | null;
  role: string | null;
  status: string;
  waitStartedAt: string | null;
  approverId: string | null;
  approverName: string | null;
  approverAvatarUrl: string | null;
}

/**
 * Pending approvals enriched with the approver's profile (name + avatar) so the
 * Overview "Pending Approvals" panel can render face avatars. assigned_to may be
 * null (unassigned gate) — approverName/avatar stay null; render "Unassigned".
 */
export const usePendingApprovals = () =>
  useQuery({
    queryKey: KEYS.pendingApprovals,
    staleTime: 15_000,
    queryFn: async (): Promise<PendingApproval[]> => {
      const { data: rows, error } = await supabase
        .from('rh_change_signoffs')
        .select('id, change_id, signoff_role, stage, status, wait_started_at, assigned_to, rh_changes(chg_number, title, risk_level)')
        .in('status', ['pending', 'waiting'])
        .order('wait_started_at', { ascending: true });
      if (error) throw error;
      const signoffs = rows ?? [];
      const approverIds = [...new Set(signoffs.map((s: any) => s.assigned_to).filter(Boolean))] as string[];
      const profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (approverIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', approverIds);
        (profs ?? []).forEach((p: any) => { profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
      }
      return signoffs.map((s: any) => ({
        id: s.id,
        changeId: s.change_id ?? null,
        chgNumber: s.rh_changes?.chg_number ?? null,
        changeTitle: s.rh_changes?.title ?? null,
        riskLevel: s.rh_changes?.risk_level ?? null,
        role: s.signoff_role ?? s.stage ?? null,
        status: s.status,
        waitStartedAt: s.wait_started_at ?? null,
        approverId: s.assigned_to ?? null,
        approverName: s.assigned_to ? (profileMap[s.assigned_to]?.full_name ?? null) : null,
        approverAvatarUrl: s.assigned_to ? (profileMap[s.assigned_to]?.avatar_url ?? null) : null,
      }));
    },
  });

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
      target_env?: string;
      applicability?: string;
      product_id?: string;
      status?: string;
      override_policy?: string;
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

// ── Release detail: Scope / Changes / Sign-offs (Phase 5b) ───────────
export interface ReleaseScope {
  brs: { id: string; businessRequestId: string; title: string | null }[];
  sprints: { id: string; sprintId: string; code: string | null; name: string | null }[];
  workItems: { id: string; workItemKey: string; inclusionSource: string }[];
}

export const useReleaseScope = (releaseId: string) =>
  useQuery({
    queryKey: ['release-hub', 'releases', releaseId, 'scope'],
    enabled: !!releaseId,
    queryFn: async (): Promise<ReleaseScope> => {
      const [brsRes, sprintsRes, wiRes] = await Promise.all([
        supabase.from('rh_release_brs').select('id, business_request_id, business_requests(id, title)').eq('release_id', releaseId),
        supabase.from('rh_release_sprints').select('id, sprint_id, anchor_sprints(id, code, name)').eq('release_id', releaseId),
        supabase.from('rh_release_work_items').select('id, work_item_key, inclusion_source').eq('release_id', releaseId).neq('inclusion_source', 'excluded'),
      ]);
      return {
        brs: (brsRes.data ?? []).map((b: any) => ({ id: b.id, businessRequestId: b.business_request_id, title: b.business_requests?.title ?? null })),
        sprints: (sprintsRes.data ?? []).map((s: any) => ({ id: s.id, sprintId: s.sprint_id, code: s.anchor_sprints?.code ?? null, name: s.anchor_sprints?.name ?? null })),
        workItems: (wiRes.data ?? []).map((w: any) => ({ id: w.id, workItemKey: w.work_item_key, inclusionSource: w.inclusion_source })),
      };
    },
  });

export interface ReleaseLinkedChange {
  id: string; chgNumber: string; title: string; status: string; riskLevel: string | null;
}

export const useReleaseChanges = (releaseId: string) =>
  useQuery({
    queryKey: ['release-hub', 'releases', releaseId, 'changes'],
    enabled: !!releaseId,
    queryFn: async (): Promise<ReleaseLinkedChange[]> => {
      // Legacy 1:1 link (rh_changes.release_id). M:N rh_change_release_links is
      // populated from Phase 7 onward — union when present.
      const { data: legacy } = await supabase
        .from('rh_changes')
        .select('id, chg_number, title, status, risk_level')
        .eq('release_id', releaseId);
      const { data: links } = await supabase
        .from('rh_change_release_links')
        .select('rh_changes(id, chg_number, title, status, risk_level)')
        .eq('release_id', releaseId)
        .is('unlinked_at', null);
      const byId: Record<string, ReleaseLinkedChange> = {};
      (legacy ?? []).forEach((c: any) => { byId[c.id] = { id: c.id, chgNumber: c.chg_number, title: c.title, status: c.status, riskLevel: c.risk_level }; });
      (links ?? []).forEach((l: any) => { const c = l.rh_changes; if (c) byId[c.id] = { id: c.id, chgNumber: c.chg_number, title: c.title, status: c.status, riskLevel: c.risk_level }; });
      return Object.values(byId);
    },
  });

export interface ReleaseSignoff {
  id: string; changeId: string; chgNumber: string | null; role: string | null; status: string;
  approverId: string | null; approverName: string | null;
}

export const useReleaseSignoffs = (releaseId: string) =>
  useQuery({
    queryKey: ['release-hub', 'releases', releaseId, 'signoffs'],
    enabled: !!releaseId,
    queryFn: async (): Promise<ReleaseSignoff[]> => {
      const { data: chgs } = await supabase.from('rh_changes').select('id').eq('release_id', releaseId);
      const changeIds = (chgs ?? []).map((c: any) => c.id);
      if (changeIds.length === 0) return [];
      const { data: rows } = await supabase
        .from('rh_change_signoffs')
        .select('id, change_id, signoff_role, stage, status, assigned_to, rh_changes(chg_number)')
        .in('change_id', changeIds);
      const signoffs = rows ?? [];
      const approverIds = [...new Set(signoffs.map((s: any) => s.assigned_to).filter(Boolean))] as string[];
      const profileMap: Record<string, string | null> = {};
      if (approverIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', approverIds);
        (profs ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
      }
      return signoffs.map((s: any) => ({
        id: s.id, changeId: s.change_id, chgNumber: s.rh_changes?.chg_number ?? null,
        role: s.signoff_role ?? s.stage ?? null, status: s.status,
        approverId: s.assigned_to ?? null,
        approverName: s.assigned_to ? (profileMap[s.assigned_to] ?? null) : null,
      }));
    },
  });

// ── Notify subscribers (Phase 5b) ────────────────────────────────────
export interface NotifySubscriber {
  id: string; userId: string; name: string | null; avatarUrl: string | null;
}

export const useNotifySubscribers = (itemType: 'release' | 'change', itemId: string) =>
  useQuery({
    queryKey: ['release-hub', 'notify', itemType, itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<NotifySubscriber[]> => {
      const { data: subs } = await supabase
        .from('rh_notify_subscribers')
        .select('id, user_id')
        .eq('item_type', itemType)
        .eq('item_id', itemId);
      const rows = subs ?? [];
      const ids = [...new Set(rows.map((s: any) => s.user_id))] as string[];
      const profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
        (profs ?? []).forEach((p: any) => { profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
      }
      return rows.map((s: any) => ({ id: s.id, userId: s.user_id, name: profileMap[s.user_id]?.full_name ?? null, avatarUrl: profileMap[s.user_id]?.avatar_url ?? null }));
    },
  });

export const useAddNotifySubscriber = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemType, itemId, userId }: { itemType: 'release' | 'change'; itemId: string; userId: string }) => {
      const { error } = await supabase.from('rh_notify_subscribers').insert({ item_type: itemType, item_id: itemId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['release-hub', 'notify', v.itemType, v.itemId] }),
  });
};

export const useRemoveNotifySubscriber = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; itemType: 'release' | 'change'; itemId: string }) => {
      const { error } = await supabase.from('rh_notify_subscribers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['release-hub', 'notify', v.itemType, v.itemId] }),
  });
};

// ── Release detail: Readiness / Notes / Prod events / Audit (Phase 5c) ─
export interface ReadinessCheck {
  id: string; checkKey: string; label: string | null; status: string; detail: string | null;
}
export const useReadinessChecks = (releaseId: string) =>
  useQuery({
    queryKey: ['release-hub', 'releases', releaseId, 'readiness'],
    enabled: !!releaseId,
    queryFn: async (): Promise<ReadinessCheck[]> => {
      const { data } = await supabase
        .from('rh_readiness_checks')
        .select('id, check_key, label, status, detail')
        .eq('release_id', releaseId)
        .order('check_key');
      return (data ?? []).map((c: any) => ({ id: c.id, checkKey: c.check_key, label: c.label, status: c.status, detail: c.detail }));
    },
  });

export interface ReleaseNote {
  id: string; contentMd: string | null; generatedByAi: boolean; updatedAt: string | null;
}
export const useReleaseNotes = (releaseId: string) =>
  useQuery({
    queryKey: ['release-hub', 'releases', releaseId, 'notes'],
    enabled: !!releaseId,
    queryFn: async (): Promise<ReleaseNote | null> => {
      const { data } = await supabase
        .from('rh_release_notes')
        .select('id, content_md, generated_by_ai, updated_at')
        .eq('release_id', releaseId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      return { id: data.id, contentMd: data.content_md, generatedByAi: !!data.generated_by_ai, updatedAt: data.updated_at };
    },
  });

export interface ReleaseProdEvent {
  id: string; title: string; deployedAt: string | null; result: string | null;
}
export const useReleaseProductionEvents = (releaseId: string) =>
  useQuery({
    queryKey: ['release-hub', 'releases', releaseId, 'prod-events'],
    enabled: !!releaseId,
    queryFn: async (): Promise<ReleaseProdEvent[]> => {
      const { data } = await supabase
        .from('rh_production_events')
        .select('id, title, deployed_at, deployment_result, deployment_status')
        .eq('release_id', releaseId)
        .order('deployed_at', { ascending: false });
      return (data ?? []).map((e: any) => ({ id: e.id, title: e.title, deployedAt: e.deployed_at, result: e.deployment_result ?? e.deployment_status ?? null }));
    },
  });

export interface ReleaseAuditEntry {
  id: string; action: string; actorName: string; detail: string | null; createdAt: string | null; isAi: boolean;
}
export const useReleaseAudit = (releaseId: string) =>
  useQuery({
    queryKey: ['release-hub', 'releases', releaseId, 'audit'],
    enabled: !!releaseId,
    queryFn: async (): Promise<ReleaseAuditEntry[]> => {
      const { data } = await supabase
        .from('rh_release_activity_log')
        .select('id, action, actor_name, detail, created_at, is_ai')
        .eq('release_id', releaseId)
        .order('created_at', { ascending: false });
      return (data ?? []).map((a: any) => ({ id: a.id, action: a.action, actorName: a.actor_name, detail: a.detail, createdAt: a.created_at, isAi: !!a.is_ai }));
    },
  });

// ── Change Records list (Phase 7a) ───────────────────────────────────
export interface ChangeListRow {
  id: string;
  chg_number: string;
  title: string;
  status: string;
  risk_level: string | null;
  change_type: string | null;
  target_env: string | null;
  deployment_category: string | null;
  deployment_date: string | null;
  window_start: string | null;
  release_id: string | null;
  releaseName: string | null;
  source: string;
  updated_at: string | null;
}

export const useChangesList = () =>
  useQuery({
    queryKey: [...KEYS.changes, 'list'],
    staleTime: 15_000,
    queryFn: async (): Promise<ChangeListRow[]> => {
      const { data: rows, error } = await supabase
        .from('rh_changes')
        .select('id, chg_number, title, status, risk_level, change_type, target_env, deployment_category, deployment_date, window_start, release_id, source, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const changes = (rows ?? []) as any[];
      const relIds = [...new Set(changes.map((c) => c.release_id).filter(Boolean))] as string[];
      const relMap: Record<string, string> = {};
      if (relIds.length > 0) {
        const { data: rels } = await supabase.from('rh_releases').select('id, name').in('id', relIds);
        (rels ?? []).forEach((r: any) => { relMap[r.id] = r.name; });
      }
      return changes.map((c) => ({ ...c, releaseName: c.release_id ? (relMap[c.release_id] ?? null) : null })) as ChangeListRow[];
    },
  });

// ── SOP execution steps (Phase 8b) ───────────────────────────────────
export interface SopStep {
  id: string; stepNo: number; title: string; description: string | null; stepType: string | null;
  ownerId: string | null; externalOwnerName: string | null; environment: string | null;
  branch: string | null; frontendCommit: string | null; backendCommit: string | null; integrationCommit: string | null;
  scriptReference: string | null; commandText: string | null; expectedResult: string | null; actualResult: string | null;
  evidenceUrl: string | null; status: string; blockerReason: string | null; isMandatory: boolean;
}

export const useSopSteps = (changeId: string) =>
  useQuery({
    queryKey: ['release-hub', 'changes', changeId, 'sop-steps'],
    enabled: !!changeId,
    queryFn: async (): Promise<SopStep[]> => {
      const { data, error } = await supabase
        .from('rh_sop_steps')
        .select('*')
        .eq('change_id', changeId)
        .order('step_no');
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        id: s.id, stepNo: s.step_no, title: s.title, description: s.description, stepType: s.step_type,
        ownerId: s.owner_id, externalOwnerName: s.external_owner_name, environment: s.environment,
        branch: s.branch, frontendCommit: s.frontend_commit, backendCommit: s.backend_commit, integrationCommit: s.integration_commit,
        scriptReference: s.script_reference, commandText: s.command_text, expectedResult: s.expected_result, actualResult: s.actual_result,
        evidenceUrl: s.evidence_url, status: s.status, blockerReason: s.blocker_reason, isMandatory: !!s.is_mandatory,
      }));
    },
  });

export const useUpdateSopStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, changeId, status, evidenceUrl, actualResult }: { id: string; changeId: string; status?: string; evidenceUrl?: string | null; actualResult?: string | null }) => {
      const patch: Record<string, unknown> = {};
      if (status !== undefined) {
        patch.status = status;
        if (status === 'in_progress') patch.started_at = new Date().toISOString();
        if (status === 'done' || status === 'failed' || status === 'skipped') patch.completed_at = new Date().toISOString();
      }
      if (evidenceUrl !== undefined) patch.evidence_url = evidenceUrl;
      if (actualResult !== undefined) patch.actual_result = actualResult;
      const { error } = await supabase.from('rh_sop_steps').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['release-hub', 'changes', v.changeId, 'sop-steps'] }),
  });
};

// ── SOP Templates (Phase 9) ──────────────────────────────────────────
export interface SopTemplateRow {
  id: string; name: string; description: string | null; deployment_category: string | null;
  target_env: string | null; updated_at: string | null; stepCount: number;
}

export const useSopTemplates = () =>
  useQuery({
    queryKey: ['release-hub', 'sop-templates'],
    staleTime: 30_000,
    queryFn: async (): Promise<SopTemplateRow[]> => {
      const { data: tmpls, error } = await supabase
        .from('rh_sop_templates')
        .select('id, name, description, deployment_category, target_env, updated_at')
        .order('name');
      if (error) throw error;
      const templates = (tmpls ?? []) as any[];
      const ids = templates.map((t) => t.id);
      const counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: steps } = await supabase.from('rh_sop_template_steps').select('template_id').in('template_id', ids);
        (steps ?? []).forEach((s: any) => { counts[s.template_id] = (counts[s.template_id] ?? 0) + 1; });
      }
      return templates.map((t) => ({ ...t, stepCount: counts[t.id] ?? 0 })) as SopTemplateRow[];
    },
  });

export interface NewSopTemplateStep { title: string; stepType?: string; environment?: string; isMandatory?: boolean }

export const useCreateSopTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; deployment_category?: string; target_env?: string; steps: NewSopTemplateStep[] }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data: tmpl, error } = await supabase
        .from('rh_sop_templates')
        .insert({ name: payload.name, description: payload.description, deployment_category: payload.deployment_category, target_env: payload.target_env, owner_id: userId ?? undefined })
        .select()
        .single();
      if (error) throw error;
      if (tmpl && payload.steps.length > 0) {
        const rows = payload.steps.map((s, i) => ({
          template_id: tmpl.id, step_no: i + 1, title: s.title,
          step_type: s.stepType ?? undefined, environment: s.environment ?? undefined,
          is_mandatory: s.isMandatory ?? true,
        }));
        const { error: stepErr } = await supabase.from('rh_sop_template_steps').insert(rows);
        if (stepErr) throw stepErr;
      }
      return tmpl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['release-hub', 'sop-templates'] }),
  });
};

/** Copy a template's steps into a change as executable rh_sop_steps. */
export const useApplySopTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, changeId }: { templateId: string; changeId: string }) => {
      const { data: tSteps, error } = await supabase
        .from('rh_sop_template_steps')
        .select('step_no, title, description, step_type, environment, is_mandatory, default_owner_id, external_owner_name')
        .eq('template_id', templateId)
        .order('step_no');
      if (error) throw error;
      const { count } = await supabase.from('rh_sop_steps').select('*', { count: 'exact', head: true }).eq('change_id', changeId);
      const base = count ?? 0;
      const rows = (tSteps ?? []).map((s: any, i: number) => ({
        change_id: changeId, template_id: templateId, step_no: base + i + 1, title: s.title,
        description: s.description ?? undefined, step_type: s.step_type ?? undefined,
        environment: s.environment ?? undefined, is_mandatory: s.is_mandatory ?? true,
        owner_id: s.default_owner_id ?? undefined, external_owner_name: s.external_owner_name ?? undefined,
        status: 'pending',
      }));
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('rh_sop_steps').insert(rows);
        if (insErr) throw insErr;
      }
      return rows.length;
    },
    onSuccess: (_n, v) => qc.invalidateQueries({ queryKey: ['release-hub', 'changes', v.changeId, 'sop-steps'] }),
  });
};

// ── Production Events list + detail (Phase 10) ───────────────────────
export interface ProductionEventRow {
  id: string; title: string; eventType: string; targetEnv: string | null;
  releaseId: string | null; releaseKey: string | null; changeId: string | null; changeKey: string | null;
  deployedAt: string | null; producedAt: string | null; deployedBy: string;
  result: string | null; deploymentStatus: string | null; durationMinutes: number | null; notes: string | null;
  workItemsSnapshot: any; businessRequestsSnapshot: any; commitsSnapshot: any; sopEvidenceSnapshot: any; approversSnapshot: any;
}

export const useProductionEventsList = () =>
  useQuery({
    queryKey: [...KEYS.productionEvents, 'list'],
    staleTime: 30_000,
    queryFn: async (): Promise<ProductionEventRow[]> => {
      const { data, error } = await supabase
        .from('rh_production_events')
        .select('*')
        .order('deployed_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id, title: e.title, eventType: e.event_type, targetEnv: e.target_env ?? null,
        releaseId: e.release_id ?? null, releaseKey: e.release_key ?? null, changeId: e.change_id ?? null, changeKey: e.change_key ?? null,
        deployedAt: e.deployed_at ?? null, producedAt: e.produced_at ?? null, deployedBy: e.deployed_by,
        result: e.deployment_result ?? null, deploymentStatus: e.deployment_status ?? null, durationMinutes: e.duration_minutes ?? null, notes: e.notes ?? null,
        workItemsSnapshot: e.work_items_snapshot ?? null, businessRequestsSnapshot: e.business_requests_snapshot ?? null,
        commitsSnapshot: e.commits_snapshot ?? null, sopEvidenceSnapshot: e.sop_evidence_snapshot ?? null, approversSnapshot: e.approvers_snapshot ?? null,
      }));
    },
  });

// ── Calendar (Phase 11) ──────────────────────────────────────────────
export type CalendarLane = 'release' | 'change' | 'freeze' | 'prod';
export interface CalendarEvent {
  id: string; lane: CalendarLane; label: string; date: string; endDate: string | null;
  link: string | null; env: string | null;
}

export const useReleaseCalendar = () =>
  useQuery({
    queryKey: ['release-hub', 'calendar'],
    staleTime: 30_000,
    queryFn: async (): Promise<CalendarEvent[]> => {
      const [rels, chgs, freezes, prods] = await Promise.all([
        supabase.from('rh_releases').select('id, name, target_date, planned_release_date, target_env'),
        supabase.from('rh_changes').select('id, chg_number, title, deployment_date, window_start, target_env'),
        supabase.from('rh_freeze_windows').select('id, name, start_date, end_date, target_env'),
        supabase.from('rh_production_events').select('id, title, deployed_at, target_env'),
      ]);
      const events: CalendarEvent[] = [];
      (rels.data ?? []).forEach((r: any) => {
        const d = r.planned_release_date ?? r.target_date;
        if (d) events.push({ id: `rel-${r.id}`, lane: 'release', label: r.name, date: d.slice(0, 10), endDate: null, link: `/release-hub/${r.id}`, env: r.target_env ?? null });
      });
      (chgs.data ?? []).forEach((c: any) => {
        const d = c.window_start ?? c.deployment_date;
        if (d) events.push({ id: `chg-${c.id}`, lane: 'change', label: `${c.chg_number} ${c.title}`, date: d.slice(0, 10), endDate: null, link: `/release-hub/changes/${c.id}`, env: c.target_env ?? null });
      });
      (freezes.data ?? []).forEach((f: any) => {
        if (f.start_date) events.push({ id: `frz-${f.id}`, lane: 'freeze', label: f.name, date: f.start_date.slice(0, 10), endDate: f.end_date ? f.end_date.slice(0, 10) : null, link: '/release-hub/freeze-windows', env: f.target_env ?? null });
      });
      (prods.data ?? []).forEach((p: any) => {
        if (p.deployed_at) events.push({ id: `prd-${p.id}`, lane: 'prod', label: p.title, date: p.deployed_at.slice(0, 10), endDate: null, link: '/release-hub/production-events', env: p.target_env ?? null });
      });
      return events;
    },
  });

// ── Freeze Windows list + conflict detection (Phase 13) ──────────────
export interface FreezeWindowRow {
  id: string; name: string; startDate: string; endDate: string; reason: string | null;
  targetEnv: string | null; applicability: string | null; status: string | null; conflicts: number;
}

export const useFreezeWindowsList = () =>
  useQuery({
    queryKey: ['release-hub', 'freeze-windows', 'list'],
    staleTime: 30_000,
    queryFn: async (): Promise<FreezeWindowRow[]> => {
      const [fwRes, relRes, chgRes] = await Promise.all([
        supabase.from('rh_freeze_windows').select('id, name, start_date, end_date, reason, target_env, applicability, status').order('start_date', { ascending: false }),
        supabase.from('rh_releases').select('id, target_env, target_date, planned_release_date').not('status', 'in', '("completed","cancelled","rolled_back")'),
        supabase.from('rh_changes').select('id, target_env, deployment_date, window_start').not('status', 'in', '("in_production","closed","cancelled")'),
      ]);
      const windows = (fwRes.data ?? []) as any[];
      const releases = (relRes.data ?? []) as any[];
      const changes = (chgRes.data ?? []) as any[];
      const envMatch = (winEnv: string | null, itemEnv: string | null) => !winEnv || winEnv === 'all' || winEnv === itemEnv;
      return windows.map((w) => {
        const start = new Date(w.start_date).getTime();
        const end = new Date(w.end_date).getTime();
        const within = (d: string | null) => { if (!d) return false; const t = new Date(d).getTime(); return t >= start && t <= end; };
        const relConflicts = releases.filter((r) => envMatch(w.target_env, r.target_env) && within(r.planned_release_date ?? r.target_date)).length;
        const chgConflicts = changes.filter((c) => envMatch(w.target_env, c.target_env) && within(c.window_start ?? c.deployment_date)).length;
        return {
          id: w.id, name: w.name, startDate: w.start_date, endDate: w.end_date, reason: w.reason,
          targetEnv: w.target_env ?? null, applicability: w.applicability ?? null, status: w.status ?? null,
          conflicts: relConflicts + chgConflicts,
        };
      });
    },
  });

// ── Work-item Release & Change Traceability (Phase 16) ───────────────
export interface WorkItemTraceability {
  changes: { id: string; chgNumber: string; title: string; status: string }[];
  releases: { id: string; name: string; status: string }[];
}

/** Releases + changes that reference a given work item key (for the
 *  Release & Change Traceability panel in the work-item detail view). */
export const useWorkItemTraceability = (workItemKey: string) =>
  useQuery({
    queryKey: ['release-hub', 'traceability', workItemKey],
    enabled: !!workItemKey,
    staleTime: 30_000,
    queryFn: async (): Promise<WorkItemTraceability> => {
      // Changes linking this work item.
      const { data: links } = await supabase
        .from('rh_change_work_items')
        .select('change_id, rh_changes(id, chg_number, title, status, release_id)')
        .eq('work_item_key', workItemKey);
      const changes = (links ?? [])
        .map((l: any) => l.rh_changes)
        .filter(Boolean)
        .map((c: any) => ({ id: c.id, chgNumber: c.chg_number, title: c.title, status: c.status, releaseId: c.release_id }));

      // Release ids: from those changes + direct rh_release_work_items membership.
      const relIds = new Set<string>();
      changes.forEach((c: any) => { if (c.releaseId) relIds.add(c.releaseId); });
      const { data: rwi } = await supabase
        .from('rh_release_work_items')
        .select('release_id')
        .eq('work_item_key', workItemKey)
        .neq('inclusion_source', 'excluded');
      (rwi ?? []).forEach((r: any) => { if (r.release_id) relIds.add(r.release_id); });

      let releases: { id: string; name: string; status: string }[] = [];
      if (relIds.size > 0) {
        const { data: rels } = await supabase.from('rh_releases').select('id, name, status').in('id', [...relIds]);
        releases = (rels ?? []).map((r: any) => ({ id: r.id, name: r.name, status: r.status }));
      }
      return {
        changes: changes.map((c: any) => ({ id: c.id, chgNumber: c.chgNumber, title: c.title, status: c.status })),
        releases,
      };
    },
  });
