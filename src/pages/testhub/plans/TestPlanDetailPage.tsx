/**
 * TestPlanDetailPage — /testhub/plans/:planKey
 *
 * CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 slice E2: the first Test Plan
 * detail surface (tm_test_plans previously had a list only — rows weren't even
 * clickable). Full-page, canonical: header with key/status/live-vs-locked,
 * curated case references in a JiraTable (folder path stays visible — plans
 * reference repository cases, they never move them), add/remove references,
 * lock action (create_plan_version trigger snapshots on update).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import SectionMessage from '@atlaskit/section-message';
import EmptyState from '@atlaskit/empty-state';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable, makeSummaryCell } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { Routes } from '@/lib/routes';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import { useCaseTableV2, type CaseTableV2Row } from '@/hooks/test-management/useCaseTableV2';

interface PlanRow {
  id: string;
  plan_key: string | null;
  name: string;
  description: string | null;
  status: string | null;
  is_locked: boolean;
  locked_at: string | null;
  sprint_id: string | null;
  release_id: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
}

interface PlanCaseRef {
  refId: string;
  sortOrder: number;
  caseId: string;
}

function usePlanByKey(projectId: string | undefined, planKey: string | undefined) {
  return useQuery({
    queryKey: ['tm-plan-by-key', projectId, planKey],
    enabled: !!projectId && !!planKey,
    queryFn: async (): Promise<PlanRow | null> => {
      const { data, error } = await typedQuery('tm_test_plans')
        .select('id, plan_key, name, description, status, is_locked, locked_at, sprint_id, release_id, planned_start_date, planned_end_date')
        .eq('project_id', projectId!)
        .eq('plan_key', planKey!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PlanRow | null;
    },
  });
}

function usePlanCases(planId: string | undefined) {
  return useQuery({
    queryKey: ['tm-plan-cases', planId],
    enabled: !!planId,
    queryFn: async (): Promise<PlanCaseRef[]> => {
      const { data, error } = await supabase
        .from('tm_test_plan_cases')
        .select('id, sort_order, test_case_id')
        .eq('test_plan_id', planId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        refId: r.id as string,
        sortOrder: (r.sort_order ?? 0) as number,
        caseId: r.test_case_id as string,
      }));
    },
  });
}

const PLAN_STATUS: Record<string, { appearance: 'default' | 'inprogress' | 'success' | 'removed'; label: string }> = {
  draft: { appearance: 'default', label: 'Draft' },
  active: { appearance: 'inprogress', label: 'Active' },
  in_progress: { appearance: 'inprogress', label: 'In progress' },
  executing: { appearance: 'inprogress', label: 'Executing' },
  completed: { appearance: 'success', label: 'Completed' },
  archived: { appearance: 'removed', label: 'Archived' },
};

const RUN_STATUS: Record<string, { appearance: 'success' | 'removed' | 'moved' | 'inprogress' | 'default'; label: string }> = {
  passed: { appearance: 'success', label: 'Passed' },
  failed: { appearance: 'removed', label: 'Failed' },
  blocked: { appearance: 'moved', label: 'Blocked' },
  in_progress: { appearance: 'inprogress', label: 'In progress' },
  skipped: { appearance: 'default', label: 'Skipped' },
};

type PlanCaseTableRow = { refId: string; caseId: string; v2: CaseTableV2Row | undefined };

export default function TestPlanDetailPage() {
  const { planKey } = useParams<{ planKey: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { projectId, project } = useTestHubProject();

  const { data: plan, isPending: planPending, isError: planError, error: planErr, refetch: refetchPlan } =
    usePlanByKey(projectId, planKey);
  const { data: refs = [], isPending: refsPending } = usePlanCases(plan?.id);
  const { data: v2Map } = useCaseTableV2(projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  const rows: PlanCaseTableRow[] = useMemo(
    () => refs.map((r) => ({ refId: r.refId, caseId: r.caseId, v2: v2Map?.get(r.caseId) })),
    [refs, v2Map],
  );

  const removeRef = useMutation({
    mutationFn: async (refId: string) => {
      const { error } = await supabase.from('tm_test_plan_cases').delete().eq('id', refId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tm-plan-cases', plan?.id] }),
    onError: (e: Error) => catalystToast.error('Failed to remove case', e.message),
  });

  const addRefs = useMutation({
    mutationFn: async (caseIds: string[]) => {
      const base = refs.length;
      const { error } = await supabase.from('tm_test_plan_cases').insert(
        caseIds.map((caseId, i) => ({
          test_plan_id: plan!.id,
          test_case_id: caseId,
          sort_order: base + i,
        })),
      );
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      catalystToast.success(`${ids.length} case${ids.length === 1 ? '' : 's'} added to plan`);
      qc.invalidateQueries({ queryKey: ['tm-plan-cases', plan?.id] });
      setAddOpen(false);
    },
    onError: (e: Error) => catalystToast.error('Failed to add cases', e.message),
  });

  const toggleLock = useMutation({
    mutationFn: async () => {
      const { error } = await typedQuery('tm_test_plans')
        .update({
          is_locked: !plan!.is_locked,
          locked_at: !plan!.is_locked ? new Date().toISOString() : null,
        })
        .eq('id', plan!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success(plan?.is_locked ? 'Plan unlocked — live references' : 'Plan locked — snapshot recorded');
      qc.invalidateQueries({ queryKey: ['tm-plan-by-key', projectId, planKey] });
    },
    onError: (e: Error) => catalystToast.error('Failed to update lock', e.message),
  });

  const columns: Column<PlanCaseTableRow>[] = useMemo(() => [
    {
      id: 'key', label: 'Key', width: 10, alwaysVisible: true,
      cell: ({ row }) => (
        <a
          href={row.v2?.case_key ? Routes.testHub.repositoryCase(row.v2.case_key) : undefined}
          onClick={(e) => {
            e.preventDefault();
            if (row.v2?.case_key) navigate(Routes.testHub.repositoryCase(row.v2.case_key));
          }}
          style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-link)', textDecoration: 'none', cursor: 'pointer' }}
        >
          {row.v2?.case_key ?? '—'}
        </a>
      ),
    },
    {
      id: 'title', label: 'Title', flex: true, alwaysVisible: true,
      cell: makeSummaryCell((r: PlanCaseTableRow) => r.v2?.title ?? '—'),
    },
    {
      id: 'folder', label: 'Repository folder', width: 16,
      cell: ({ row }) => (
        // Reference proof: the case's repository home stays visible — a plan
        // never moves cases.
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.v2?.folder_path ?? undefined}>
          {row.v2?.folder_name ?? '—'}
        </span>
      ),
    },
    {
      id: 'status', label: 'Status', width: 10,
      cell: ({ row }) => {
        if (!row.v2?.status) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        const draft = row.v2.status === 'draft';
        return <Lozenge appearance={draft ? 'default' : 'success'}>{draft ? 'Draft' : row.v2.status}</Lozenge>;
      },
    },
    {
      id: 'latestRun', label: 'Latest run', width: 10,
      cell: ({ row }) => {
        const s = row.v2?.latest_run_status;
        if (!s || s === 'not_run') return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        const cfg = RUN_STATUS[s] ?? { appearance: 'default' as const, label: s };
        return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
      },
    },
    {
      id: 'actions', label: '', width: 6, align: 'end',
      cell: ({ row }) => (
        <Button
          appearance="subtle"
          spacing="compact"
          isDisabled={plan?.is_locked}
          onClick={() => removeRef.mutate(row.refId)}
        >
          Remove
        </Button>
      ),
    },
  ], [navigate, plan?.is_locked, removeRef]);

  // Add-cases picker: repository cases not already referenced
  const candidates = useMemo(() => {
    if (!v2Map) return [];
    const inPlan = new Set(refs.map((r) => r.caseId));
    const all = [...v2Map.values()].filter((c) => !inPlan.has(c.id));
    const q = search.trim().toLowerCase();
    return q
      ? all.filter((c) => c.title.toLowerCase().includes(q) || c.case_key.toLowerCase().includes(q))
      : all;
  }, [v2Map, refs, search]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  if (planPending) {
    return <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>;
  }
  if (planError) {
    return (
      <div style={{ padding: 24 }}>
        <SectionMessage appearance="error" title="Couldn't load test plan">
          <p style={{ margin: 0 }}>{(planErr as Error)?.message}</p>
          <Button appearance="subtle" onClick={() => refetchPlan()}>Try again</Button>
        </SectionMessage>
      </div>
    );
  }
  if (!plan) {
    return (
      <EmptyState
        header="Test plan not found"
        description={`No plan with key ${planKey ?? ''} in this project.`}
        primaryAction={<Button appearance="primary" onClick={() => navigate(Routes.testHub.plans())}>Back to plans</Button>}
      />
    );
  }

  const statusCfg = (plan.status && PLAN_STATUS[plan.status]) || { appearance: 'default' as const, label: plan.status ?? '—' };

  return (
    <>
      <ProjectPageHeader projectKey={project?.key ?? 'TESTHUB'} hubType="test" />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: 'var(--ds-space-200) var(--ds-space-300)', borderBottom: '1px solid var(--ds-border)',
          display: 'flex', alignItems: 'center', gap: 12, background: 'var(--ds-surface)',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
              <a
                onClick={(e) => { e.preventDefault(); navigate(Routes.testHub.plans()); }}
                href={Routes.testHub.plans()}
                style={{ color: 'var(--ds-link)', textDecoration: 'none', cursor: 'pointer' }}
              >
                Test plans
              </a>
              {' / '}{plan.plan_key ?? ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {plan.name}
              </h2>
              <Lozenge appearance={statusCfg.appearance}>{statusCfg.label}</Lozenge>
              <Lozenge appearance={plan.is_locked ? 'moved' : 'inprogress'}>
                {plan.is_locked ? 'Locked references' : 'Live references'}
              </Lozenge>
            </div>
          </div>
          <Button appearance="default" onClick={() => toggleLock.mutate()} isLoading={toggleLock.isPending}>
            {plan.is_locked ? 'Unlock plan' : 'Lock plan'}
          </Button>
          <Button appearance="primary" isDisabled={plan.is_locked} onClick={() => { setPicked(new Set()); setSearch(''); setAddOpen(true); }}>
            Add cases
          </Button>
        </div>

        {plan.is_locked && (
          <div style={{ padding: '0 var(--ds-space-300)', paddingTop: 'var(--ds-space-150)' }}>
            <SectionMessage appearance="information" title="This plan is locked">
              <p style={{ margin: 0 }}>
                References are frozen{plan.locked_at ? ` since ${new Date(plan.locked_at).toLocaleString()}` : ''}.
                Unlock to change the case list; repository edits show as variance in executions, never silent mutation.
              </p>
            </SectionMessage>
          </div>
        )}

        {/* Case references */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--ds-space-150) var(--ds-space-150) var(--ds-space-300)' }}>
          {refsPending ? (
            <div style={{ padding: 'var(--ds-space-400)', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
          ) : rows.length === 0 ? (
            <EmptyState
              header="No cases in this plan yet"
              description="A test plan curates references to repository cases — the cases stay in their folders."
              primaryAction={<Button appearance="primary" isDisabled={plan.is_locked} onClick={() => setAddOpen(true)}>Add cases</Button>}
            />
          ) : (
            <JiraTable<PlanCaseTableRow>
              columns={columns}
              data={rows}
              getRowId={(r) => r.refId}
              showRowCount
              totalRowCount={rows.length}
            />
          )}
        </div>
      </div>

      {addOpen && (
        <ModalDialog onClose={() => setAddOpen(false)} width="large" shouldScrollInViewport>
          <ModalHeader><ModalTitle>Add cases to {plan.plan_key}</ModalTitle></ModalHeader>
          <ModalBody>
            <Textfield
              autoFocus
              placeholder="Search cases by key or title"
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
            <div style={{ marginTop: 12, maxHeight: 360, overflowY: 'auto', border: '1px solid var(--ds-border)', borderRadius: 4 }}>
              {candidates.length === 0 ? (
                <div style={{ padding: 16, color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>
                  No matching repository cases.
                </div>
              ) : candidates.slice(0, 200).map((c) => (
                <label
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', cursor: 'pointer',
                    borderBottom: '1px solid var(--ds-border)',
                    fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={picked.has(c.id)}
                    onChange={(e) => {
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(c.id); else next.delete(c.id);
                        return next;
                      });
                    }}
                  />
                  <span style={{ color: 'var(--ds-text-subtle)', width: 76, flexShrink: 0 }}>{c.case_key}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                  {c.status === 'draft' && <Lozenge appearance="default">Draft</Lozenge>}
                </label>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              appearance="primary"
              isDisabled={picked.size === 0}
              isLoading={addRefs.isPending}
              onClick={() => addRefs.mutate([...picked])}
            >
              Add {picked.size > 0 ? picked.size : ''} case{picked.size === 1 ? '' : 's'}
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </>
  );
}
