/**
 * ExecutionDetailPage — /testhub/executions/:executionKey
 *
 * CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 slice E4: an execution lab's
 * full-page view — scope context chips, dated cycles inside it (attach
 * existing / open cycle), variance surfaced per open cycle via the
 * cycle-level banner. Snapshotting happens at scope-add (tm_cycle_scope
 * trigger locks version + full snapshot); drafts are rejected by the DB
 * guard and the error surfaces verbatim.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/new';
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
import { useTestExecutionByKey, useUpdateTestExecution } from '@/hooks/test-management/useTestExecutions';

interface CycleRow {
  id: string;
  cycle_key: string | null;
  name: string;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  total_cases: number | null;
  passed_count: number | null;
  failed_count: number | null;
  blocked_count: number | null;
  execution_id: string | null;
}

const CYCLE_STATUS: Record<string, 'default' | 'inprogress' | 'success' | 'removed' | 'moved'> = {
  planned: 'default',
  draft: 'default',
  active: 'inprogress',
  in_progress: 'inprogress',
  paused: 'moved',
  completed: 'success',
  archived: 'removed',
};

function useExecutionCycles(executionId: string | undefined) {
  return useQuery({
    queryKey: ['tm-execution-cycles', executionId],
    enabled: !!executionId,
    queryFn: async (): Promise<CycleRow[]> => {
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .select('id, cycle_key, name, status, planned_start_date, planned_end_date, total_cases, passed_count, failed_count, blocked_count, execution_id')
        .eq('execution_id', executionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CycleRow[];
    },
  });
}

function useUnattachedCycles(projectId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['tm-unattached-cycles', projectId],
    enabled: enabled && !!projectId,
    queryFn: async (): Promise<CycleRow[]> => {
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .select('id, cycle_key, name, status, planned_start_date, planned_end_date, total_cases, passed_count, failed_count, blocked_count, execution_id')
        .eq('project_id', projectId!)
        .is('execution_id', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CycleRow[];
    },
  });
}

export default function ExecutionDetailPage() {
  const { executionKey } = useParams<{ executionKey: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { projectId, project } = useTestHubProject();

  const { data: execution, isPending, isError, error, refetch } = useTestExecutionByKey(projectId, executionKey);
  const { data: cycles = [], isPending: cyclesPending } = useExecutionCycles(execution?.id);
  const updateExecution = useUpdateTestExecution();

  const [attachOpen, setAttachOpen] = useState(false);
  const { data: unattached = [] } = useUnattachedCycles(projectId, attachOpen);

  const attachCycle = useMutation({
    mutationFn: async (cycleId: string) => {
      const { error } = await supabase
        .from('tm_test_cycles')
        .update({ execution_id: execution!.id })
        .eq('id', cycleId);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success('Cycle attached to execution');
      qc.invalidateQueries({ queryKey: ['tm-execution-cycles', execution?.id] });
      qc.invalidateQueries({ queryKey: ['tm-unattached-cycles', projectId] });
      setAttachOpen(false);
    },
    onError: (e: Error) => catalystToast.error('Failed to attach cycle', e.message),
  });

  const columns: Column<CycleRow>[] = useMemo(() => [
    {
      id: 'key', label: 'Key', width: 10, alwaysVisible: true,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>{row.cycle_key ?? '—'}</span>
      ),
    },
    { id: 'name', label: 'Cycle', flex: true, alwaysVisible: true, cell: makeSummaryCell((r: CycleRow) => r.name) },
    {
      id: 'status', label: 'Status', width: 10,
      cell: ({ row }) => (
        <Lozenge appearance={CYCLE_STATUS[row.status?.toLowerCase?.() ?? ''] ?? 'default'}>{row.status}</Lozenge>
      ),
    },
    {
      id: 'window', label: 'Window', width: 16,
      cell: ({ row }) => {
        const f = (d: string | null) => d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—';
        return (
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
            {f(row.planned_start_date)} → {f(row.planned_end_date)}
          </span>
        );
      },
    },
    {
      id: 'progress', label: 'Progress', width: 14,
      cell: ({ row }) => {
        const total = row.total_cases ?? 0;
        if (total === 0) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        const done = (row.passed_count ?? 0) + (row.failed_count ?? 0) + (row.blocked_count ?? 0);
        return (
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
            {done}/{total} · {row.failed_count ? `${row.failed_count} failed` : 'no failures'}
          </span>
        );
      },
    },
  ], []);

  if (isPending) {
    return <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>;
  }
  if (isError) {
    return (
      <div style={{ padding: 24 }}>
        <SectionMessage appearance="error" title="Couldn't load execution">
          <p style={{ margin: 0 }}>{(error as Error)?.message}</p>
          <Button appearance="subtle" onClick={() => refetch()}>Try again</Button>
        </SectionMessage>
      </div>
    );
  }
  if (!execution) {
    return (
      <EmptyState
        header="Execution not found"
        description={`No execution with key ${executionKey ?? ''} in this project.`}
        primaryAction={<Button appearance="primary" onClick={() => navigate(Routes.testHub.executions())}>Back to executions</Button>}
      />
    );
  }

  const scopeChip =
    execution.lab_scope_type === 'custom' && execution.custom_scope_label
      ? `Custom · ${execution.custom_scope_label}`
      : execution.lab_scope_type.replace('_', ' ');

  return (
    <>
      <ProjectPageHeader projectKey={project?.key ?? 'TESTHUB'} hubType="test" />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{
          padding: 'var(--ds-space-200) var(--ds-space-300)', borderBottom: '1px solid var(--ds-border)',
          display: 'flex', alignItems: 'center', gap: 12, background: 'var(--ds-surface)',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
              <a
                href={Routes.testHub.executions()}
                onClick={(e) => { e.preventDefault(); navigate(Routes.testHub.executions()); }}
                style={{ color: 'var(--ds-link)', textDecoration: 'none', cursor: 'pointer' }}
              >
                Test executions
              </a>
              {' / '}{execution.execution_key}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {execution.name}
              </h2>
              <Lozenge appearance="default">{scopeChip}</Lozenge>
              <Lozenge appearance={execution.status === 'completed' ? 'success' : execution.status === 'active' ? 'inprogress' : 'default'}>
                {execution.status}
              </Lozenge>
            </div>
          </div>
          {execution.status === 'active' && (
            <Button
              appearance="default"
              isLoading={updateExecution.isPending}
              onClick={() => updateExecution.mutate({ id: execution.id, status: 'completed' })}
            >
              Complete execution
            </Button>
          )}
          <Button appearance="primary" onClick={() => setAttachOpen(true)}>Attach cycle</Button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--ds-space-150) var(--ds-space-150) var(--ds-space-300)' }}>
          {cyclesPending ? (
            <div style={{ padding: 'var(--ds-space-400)', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
          ) : cycles.length === 0 ? (
            <EmptyState
              header="No cycles in this lab yet"
              description="Attach a cycle (a dated attempt) to start executing. Cases snapshot their exact version on scope-add; drafts are rejected."
              primaryAction={<Button appearance="primary" onClick={() => setAttachOpen(true)}>Attach cycle</Button>}
            />
          ) : (
            <JiraTable<CycleRow>
              columns={columns}
              data={cycles}
              getRowId={(r) => r.id}
              onRowClick={(row) => { if (row.cycle_key) navigate(Routes.testHub.cycle(row.cycle_key)); }}
              showRowCount
              totalRowCount={cycles.length}
            />
          )}
        </div>
      </div>

      {attachOpen && (
        <ModalDialog onClose={() => setAttachOpen(false)} width="medium">
          <ModalHeader><ModalTitle>Attach cycle to {execution.execution_key}</ModalTitle></ModalHeader>
          <ModalBody>
            {unattached.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--ds-text-subtlest)' }}>
                No unattached cycles in this project. Create one from the Cycles page first.
              </p>
            ) : (
              <div style={{ border: '1px solid var(--ds-border)', borderRadius: 4, maxHeight: 320, overflowY: 'auto' }}>
                {unattached.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      borderBottom: '1px solid var(--ds-border)', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)',
                    }}
                  >
                    <span style={{ color: 'var(--ds-text-subtle)', width: 70, flexShrink: 0 }}>{c.cycle_key ?? '—'}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <Button appearance="default" spacing="compact" isLoading={attachCycle.isPending} onClick={() => attachCycle.mutate(c.id)}>
                      Attach
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setAttachOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </>
  );
}
