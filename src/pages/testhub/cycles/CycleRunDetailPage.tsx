/**
 * CycleRunDetailPage — read-only retrospective detail for a cycle's completed
 * execution run(s).
 *
 * The live ExecutionPage is a harness for RECORDING results; CycleDetailPage
 * shows scope, not the run history. This page closes that gap: given a cycle
 * key it renders a run header (name, cycle link, status, pass/fail/blocked
 * summary) plus a JiraTable of every recorded case-execution — case key +
 * type icon, title, result Lozenge, executor face avatar, executed-at, notes,
 * and linked defect. Zero-assumption: dashes where data is absent.
 *
 * CAT-TESTHUB-REBUILD Phase 3b.
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/standard-button';
import SectionMessage from '@atlaskit/section-message';
import { ArrowLeft } from '@/lib/atlaskit-icons';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { useTestCycleByKey } from '@/hooks/useTestCycleByKey';
import { useTestCycle } from '@/hooks/test-management/useTestCycles';
import {
  useCompletedRunResults,
  type CompletedRunResult,
  type RunResultStatus,
} from '@/hooks/test-management/useCompletedRunResults';
import { Routes } from '@/lib/routes';

// Lozenge appearance mapping mirrors CycleDetailPage's RunStatusPill so a run's
// status reads identically wherever it appears.
const STATUS_LOZENGE: Record<
  RunResultStatus,
  { appearance: 'success' | 'removed' | 'moved' | 'inprogress' | 'default'; label: string }
> = {
  PASSED: { appearance: 'success', label: 'Passed' },
  FAILED: { appearance: 'removed', label: 'Failed' },
  BLOCKED: { appearance: 'moved', label: 'Blocked' },
  IN_PROGRESS: { appearance: 'inprogress', label: 'In progress' },
  SKIPPED: { appearance: 'default', label: 'Skipped' },
  NOT_RUN: { appearance: 'default', label: 'Not run' },
};

function RunStatusLozenge({ status }: { status: RunResultStatus }) {
  const { appearance, label } = STATUS_LOZENGE[status] ?? STATUS_LOZENGE.NOT_RUN;
  return <Lozenge appearance={appearance}>{label}</Lozenge>;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CycleRunDetailPage() {
  const {
    cycleKey,
    id: legacyId,
    projectKey = 'BAU',
  } = useParams<{ cycleKey?: string; id?: string; projectKey?: string }>();
  const cycleParam = cycleKey ?? legacyId;
  const navigate = useNavigate();

  const { data: cycleRecord } = useTestCycleByKey(cycleParam, projectKey);
  const cycleId =
    cycleRecord?.id ??
    (cycleParam && /^[0-9a-f-]{36}$/.test(cycleParam) ? cycleParam : undefined);

  const { data: cycle, isLoading: cycleLoading } = useTestCycle(cycleId);
  const {
    data: results = [],
    isLoading: resultsLoading,
    isError,
    error,
    refetch,
  } = useCompletedRunResults(cycleId);

  const columns: Column<CompletedRunResult>[] = [
    {
      id: 'case',
      label: 'Case',
      width: 12,
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-075)' }}>
          <JiraIssueTypeIcon issueType="Test" size={16} />
          <span
            style={{
              fontFamily: 'var(--ds-font-family-code)',
              color: 'var(--ds-text-subtlest)',
              fontSize: 'var(--ds-font-size-200)',
            }}
          >
            {row.caseKey ?? '—'}
          </span>
        </div>
      ),
    },
    {
      id: 'title',
      label: 'Title',
      flex: true,
      cell: ({ row }) => (
        <span style={{ color: 'var(--ds-text)' }}>{row.caseTitle ?? '—'}</span>
      ),
    },
    {
      id: 'result',
      label: 'Result',
      width: 11,
      cell: ({ row }) => <RunStatusLozenge status={row.status} />,
    },
    {
      id: 'executedBy',
      label: 'Executed by',
      width: 16,
      cell: ({ row }) =>
        row.executorName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)' }}>
            <UserAvatar name={row.executorName} src={row.executorAvatarUrl} size="small" />
            <span style={{ color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-200)' }}>
              {row.executorName}
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
        ),
    },
    {
      id: 'executedAt',
      label: 'Executed at',
      width: 15,
      cell: ({ row }) => (
        <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
          {formatDateTime(row.completedAt ?? row.startedAt)}
        </span>
      ),
    },
    {
      id: 'notes',
      label: 'Notes',
      width: 16,
      cell: ({ row }) =>
        row.notes ? (
          <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
            {row.notes}
          </span>
        ) : (
          <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
        ),
    },
    {
      id: 'defect',
      label: 'Defect',
      width: 10,
      cell: ({ row }) =>
        row.defectKey ? (
          <Button
            appearance="link"
            spacing="none"
            onClick={() => navigate(Routes.testHub.defect(row.defectKey!))}
          >
            {row.defectKey}
          </Button>
        ) : (
          <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
        ),
    },
  ];

  if (cycleLoading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div style={{ padding: 32, color: 'var(--ds-text-danger)' }}>Cycle not found</div>
    );
  }

  // Live summary from the recorded runs — zero-assumption (counts what exists).
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const blocked = results.filter((r) => r.status === 'BLOCKED').length;

  const cycleHref = Routes.testHub.cycle(cycle.key ?? cycleParam ?? '');

  return (
    <div
      style={{
        padding: 'var(--ds-space-300)',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'var(--ds-font-family-body)',
      }}
    >
      <div style={{ marginBottom: 'var(--ds-space-300)' }}>
        <ProjectPageHeader
          hubType="test"
          trail={[
            { text: 'Cycles', href: `/testhub/${projectKey}/cycles` },
            { text: cycle.name, href: `/testhub/${projectKey}/cycles/${cycle.key ?? cycleParam}` },
          ]}
          title={`Run results — ${cycle.name}`}
          actions={
            <Button
              appearance="default"
              iconBefore={<ArrowLeft size={13} />}
              onClick={() => navigate(cycleHref)}
            >
              Back to cycle
            </Button>
          }
        />
      </div>

      {/* Run summary bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-200)',
          marginBottom: 'var(--ds-space-300)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
          {results.length} {results.length === 1 ? 'run' : 'runs'} recorded
        </span>
        <Lozenge appearance="success">{passed} passed</Lozenge>
        <Lozenge appearance="removed">{failed} failed</Lozenge>
        <Lozenge appearance="moved">{blocked} blocked</Lozenge>
      </div>

      {isError ? (
        <SectionMessage
          appearance="error"
          title="Couldn't load run results"
          actions={[{ text: 'Retry', onClick: () => refetch() }]}
        >
          {(error as Error)?.message ?? 'The run results failed to load.'}
        </SectionMessage>
      ) : resultsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spinner size="medium" />
        </div>
      ) : results.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: 'var(--ds-text-subtlest)',
            fontSize: 'var(--ds-font-size-400)',
          }}
        >
          No runs recorded for this cycle yet.
        </div>
      ) : (
        <JiraTable
          columns={columns}
          data={results}
          getRowId={(row) => row.id}
          ariaLabel="Completed run results"
        />
      )}
    </div>
  );
}
