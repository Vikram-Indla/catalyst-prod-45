/**
 * STRATA Data Pipeline — Upload / Validation / Lineage (blueprint Flow 1).
 * Routes: /strata/data and /strata/data/runs/:runKey.
 * UI renders DB/RPC values only — no business logic computed here.
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, CatalystTag, EmptyState, Heading, IconButton, SectionMessage, Spinner, Tooltip,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, Copy, Database, MoveRight, Network, Upload,
} from '@/lib/atlaskit-icons';
import { useDataSources, useRunDetail, useUploadRuns } from '@/modules/strata/hooks/useStrata';
import { StrataPageChrome, StrataPanel, T } from '@/modules/strata/components/shared';
import { fmtDateTime, labelize } from '@/modules/strata/components/format';
import type {
  StrataDataSource, StrataStagingRow, StrataUploadRun, StrataValidationResult,
} from '@/modules/strata/types';

// ── System-state appearance maps (mirror DB CHECK constraints) ───────────────
const SOURCE_STATUS: Record<StrataDataSource['status'], LozengeAppearance> = {
  active: 'success', registered: 'default', suspended: 'moved', retired: 'removed',
};
const runStatusAppearance = (status: StrataUploadRun['status']): LozengeAppearance =>
  status === 'completed' ? 'success'
  : status === 'failed' ? 'removed'
  : status === 'quarantined' ? 'moved'
  : 'inprogress';
const rowValidationAppearance = (status: StrataStagingRow['validation_status']): LozengeAppearance =>
  status === 'valid' || status === 'validated' ? 'success'
  : status === 'rejected' ? 'removed'
  : 'moved';

const mono: React.CSSProperties = {
  fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)',
};
const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };

// ── Pipeline stepper (single stateful instance — governed lineage chain) ────
const PIPELINE_STAGES = [
  'Source', 'Ingestion run', 'Staging', 'Validation',
  'Attestation', 'Canonical write', 'Calculation', 'Snapshot',
] as const;

type StageState = 'complete' | 'current' | 'failed' | 'neutral';

/** Derive per-stage state from the run's system status (DB CHECK enum). The
 *  validation stage is the governed rejection point, so failed/quarantined
 *  runs mark Validation as the failure stage. No stage state is invented
 *  beyond what the status enum encodes. */
function stageStates(run: StrataUploadRun | null | undefined): StageState[] {
  if (!run) return PIPELINE_STAGES.map(() => 'neutral');
  const currentByStatus: Record<string, number> = {
    uploaded: 1, staging: 2, validating: 3, pending_attestation: 4, writing: 5, calculating: 6,
  };
  if (run.status === 'completed') {
    return PIPELINE_STAGES.map((_, i) => (i <= 6 ? 'complete' : 'neutral'));
  }
  if (run.status === 'failed' || run.status === 'quarantined') {
    return PIPELINE_STAGES.map((_, i) => (i < 3 ? 'complete' : i === 3 ? 'failed' : 'neutral'));
  }
  const cur = currentByStatus[run.status];
  if (cur == null) return PIPELINE_STAGES.map(() => 'neutral');
  return PIPELINE_STAGES.map((_, i) => (i < cur ? 'complete' : i === cur ? 'current' : 'neutral'));
}

function StageDot({ state }: { state: StageState }) {
  const box: React.CSSProperties = {
    width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
  if (state === 'complete') {
    return <span style={{ ...box, color: 'var(--ds-icon-success)' }} aria-hidden><CheckCircle2 size={16} /></span>;
  }
  if (state === 'failed') {
    return <span style={{ ...box, color: 'var(--ds-icon-danger)' }} aria-hidden><AlertTriangle size={16} /></span>;
  }
  if (state === 'current') {
    return (
      <span style={box} aria-hidden>
        <span style={{
          width: 14, height: 14, borderRadius: '50%',
          border: '2px solid var(--ds-border-information)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ds-text-information)' }} />
        </span>
      </span>
    );
  }
  return (
    <span style={box} aria-hidden>
      <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${T.border}` }} />
    </span>
  );
}

function PipelineStepper({ run }: { run?: StrataUploadRun | null }) {
  const states = stageStates(run);
  return (
    <div
      data-testid="strata-pipeline-strip"
      style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}
      aria-label="Pipeline stages"
    >
      {PIPELINE_STAGES.map((stage, i) => (
        <React.Fragment key={stage}>
          {i > 0 ? (
            <span
              aria-hidden
              style={{
                flex: '1 1 24px', height: 2, marginTop: 12, minWidth: 12,
                background: states[i - 1] === 'complete' && states[i] === 'complete'
                  ? 'var(--ds-text-success)'
                  : T.border,
              }}
            />
          ) : null}
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <StageDot state={states[i]} />
            <span style={{
              fontSize: 'var(--ds-font-size-100)', fontWeight: states[i] === 'current' ? 600 : 500,
              color: states[i] === 'failed' ? 'var(--ds-text-danger)'
                : states[i] === 'current' ? T.text
                : states[i] === 'complete' ? T.subtle
                : T.subtlest,
              whiteSpace: 'nowrap',
            }}>
              {stage}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Segmented row-count mini bar (valid / rejected / pending) ────────────────
function SegmentedCounts({ raw, valid, rejected }: { raw: number; valid: number; rejected: number }) {
  if (!raw) return <span style={{ color: T.subtlest }}>—</span>;
  const pending = Math.max(0, raw - valid - rejected);
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: T.neutral, maxWidth: 120 }} aria-hidden>
        {valid > 0 ? <span style={{ flex: valid, background: 'var(--ds-text-success)' }} /> : null}
        {rejected > 0 ? <span style={{ flex: rejected, background: 'var(--ds-text-danger)' }} /> : null}
        {pending > 0 ? <span style={{ flex: pending, background: 'transparent' }} /> : null}
      </span>
      <span style={{ ...captionStyle, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {valid} valid · <span style={rejected > 0 ? { color: 'var(--ds-text-danger)' } : undefined}>{rejected} rejected</span> · {raw} raw
      </span>
    </span>
  );
}

function PanelState({ query, empty, emptyHeader, emptyDescription, children }: {
  query: { isLoading: boolean; isError: boolean; error: unknown };
  empty: boolean;
  emptyHeader: string;
  emptyDescription: string;
  children: React.ReactNode;
}) {
  if (query.isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>;
  }
  if (query.isError) {
    return (
      <SectionMessage appearance="error" title="Failed to load">
        <p>{query.error instanceof Error ? query.error.message : 'Unknown error'}</p>
      </SectionMessage>
    );
  }
  if (empty) return <EmptyState size="compact" header={emptyHeader} description={emptyDescription} />;
  return <>{children}</>;
}

// ── Registered sources ───────────────────────────────────────────────────────
function SourcesPanel() {
  const sources = useDataSources();
  return (
    <StrataPanel title="Registered sources" icon={<Database size={16} />} count={sources.data?.length ?? null} testId="strata-sources-panel">
      <p style={{ ...captionStyle, margin: '0 0 12px' }}>
        Only registered sources can feed approved KPIs.
      </p>
      <PanelState
        query={sources}
        empty={(sources.data ?? []).length === 0}
        emptyHeader="No data sources registered yet"
        emptyDescription="Register a source to begin governed ingestion."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {(sources.data ?? []).map((s) => (
            <div
              key={s.id}
              style={{
                border: `1px solid ${T.border}`, borderRadius: 8, padding: 12,
                background: T.raised, boxShadow: 'var(--ds-shadow-raised)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{s.name}</strong>
                <StatusLozenge status={s.status} label={labelize(s.status)} appearance={SOURCE_STATUS[s.status] ?? 'default'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <CatalystTag text={labelize(s.system_type)} />
                {s.refresh_cadence ? (
                  <span style={{ ...captionStyle, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CalendarClock size={12} /> Refresh {s.refresh_cadence}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </PanelState>
    </StrataPanel>
  );
}

// ── Upload runs ──────────────────────────────────────────────────────────────
function RunsPanel() {
  const runs = useUploadRuns();
  const navigate = useNavigate();

  const columns: Column<StrataUploadRun>[] = [
    {
      id: 'run', label: 'Run', width: 13, sortable: true,
      accessor: (r) => r.run_key,
      cell: ({ row: r }) => (
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.brandText, whiteSpace: 'nowrap' }}>
          {r.run_key}
        </span>
      ),
    },
    {
      id: 'file', label: 'File / channel', flex: true,
      accessor: (r) => r.file_name ?? r.channel,
      cell: ({ row: r }) => (
        <span style={{ ...bodyStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {r.file_name ?? labelize(r.channel)}
        </span>
      ),
    },
    {
      id: 'started', label: 'Started', width: 17, sortable: true,
      accessor: (r) => r.started_at,
      cell: ({ row: r }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(r.started_at)}</span>,
    },
    {
      id: 'rows', label: 'Rows', width: 22,
      cell: ({ row: r }) => <SegmentedCounts raw={r.row_count_raw} valid={r.row_count_valid} rejected={r.row_count_rejected} />,
    },
    {
      id: 'status', label: 'Status', width: 13, sortable: true,
      accessor: (r) => r.status,
      cell: ({ row: r }) => (
        <StatusLozenge status={r.status} label={labelize(r.status)} appearance={runStatusAppearance(r.status)} />
      ),
    },
  ];

  return (
    <StrataPanel title="Upload runs" icon={<Upload size={16} />} count={runs.data?.length ?? null} noPadding testId="strata-runs-panel">
      <PanelState
        query={runs}
        empty={(runs.data ?? []).length === 0}
        emptyHeader="No upload runs yet for this period"
        emptyDescription="Runs appear here as soon as data is uploaded through a registered source."
      >
        <JiraTable<StrataUploadRun>
          columns={columns}
          data={runs.data ?? []}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(Routes.strata.run(r.run_key))}
          ariaLabel="Upload runs"
        />
      </PanelState>
    </StrataPanel>
  );
}

// ── Run detail ───────────────────────────────────────────────────────────────
type RunDetailQuery = ReturnType<typeof useRunDetail>;

function RunDetailSection({ runKey, detail }: { runKey: string; detail: RunDetailQuery }) {
  const navigate = useNavigate();

  if (detail.isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="large" /></div>;
  }
  if (detail.isError) {
    return (
      <SectionMessage appearance="error" title={`Failed to load run ${runKey}`}>
        <p>{detail.error instanceof Error ? detail.error.message : 'Unknown error'}</p>
      </SectionMessage>
    );
  }
  if (!detail.data) {
    return (
      <EmptyState
        header={`Run ${runKey} not found`}
        description="This upload run does not exist or is not visible to you."
        primaryAction={<Button onClick={() => navigate(Routes.strata.data())}>Back to pipeline</Button>}
      />
    );
  }

  const { run, rows, results } = detail.data;
  const rowNumberByStagingId = new Map(rows.map((r) => [r.id, r.row_number]));

  // Parsed payload columns — union of keys across staged rows (display only).
  const parsedKeys: string[] = [];
  rows.forEach((r) => {
    if (r.raw && typeof r.raw === 'object' && !Array.isArray(r.raw)) {
      Object.keys(r.raw).forEach((k) => { if (!parsedKeys.includes(k)) parsedKeys.push(k); });
    }
  });
  const shownKeys = parsedKeys.slice(0, 4);

  const rawCellValue = (v: unknown): React.ReactNode => {
    if (v == null) return <span style={{ color: T.subtlest }}>—</span>;
    if (['string', 'number', 'boolean'].includes(typeof v)) {
      return <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{String(v)}</span>;
    }
    const json = JSON.stringify(v);
    return (
      <Tooltip content={json}>
        <span style={{ ...mono, color: T.subtle, display: 'inline-block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {json}
        </span>
      </Tooltip>
    );
  };

  const stagedColumns: Column<StrataStagingRow>[] = [
    {
      id: 'row-number', label: '#', width: 6, align: 'end', sortable: true,
      accessor: (r) => r.row_number,
      cell: ({ row: r }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{r.row_number}</span>,
    },
    ...(shownKeys.length > 0
      ? shownKeys.map((key, i): Column<StrataStagingRow> => ({
          id: `raw-${key}`,
          label: labelize(key),
          ...(i === 0 ? { flex: true } : { width: 16 }),
          cell: ({ row: r }) => rawCellValue((r.raw as Record<string, unknown> | null)?.[key]),
        }))
      : [{
          id: 'raw', label: 'Raw', flex: true,
          cell: ({ row: r }) => {
            const json = JSON.stringify(r.raw);
            return (
              <Tooltip content={json}>
                <span style={{ ...mono, color: T.subtle, display: 'inline-block', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {json}
                </span>
              </Tooltip>
            );
          },
        } satisfies Column<StrataStagingRow>]),
    {
      id: 'target-entity', label: 'Target entity', width: 15,
      cell: ({ row: r }) => (r.target_entity
        ? <span style={bodyStyle}>{labelize(r.target_entity)}</span>
        : <span style={{ color: T.subtlest }}>—</span>),
    },
    {
      id: 'validation', label: 'Validation', width: 13,
      cell: ({ row: r }) => (
        <StatusLozenge
          status={String(r.validation_status)}
          label={labelize(String(r.validation_status))}
          appearance={rowValidationAppearance(r.validation_status)}
        />
      ),
    },
  ];

  const errorColumns: Column<StrataValidationResult>[] = [
    {
      id: 'row', label: 'Row', width: 7, align: 'end',
      cell: ({ row: v }) => (
        <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>
          {v.staging_row_id ? rowNumberByStagingId.get(v.staging_row_id) ?? '—' : '—'}
        </span>
      ),
    },
    {
      id: 'field', label: 'Field', width: 13,
      cell: ({ row: v }) => (v.field_name
        ? <span style={{ ...mono, color: T.text }}>{v.field_name}</span>
        : <span style={{ color: T.subtlest }}>—</span>),
    },
    {
      id: 'code', label: 'Code', width: 15,
      cell: ({ row: v }) => <CatalystTag text={v.error_code} />,
    },
    {
      id: 'severity', label: 'Severity', width: 11,
      cell: ({ row: v }) => (
        <StatusLozenge
          status={v.severity}
          label={labelize(v.severity)}
          appearance={v.severity === 'error' ? 'removed' : 'moved'}
        />
      ),
    },
    {
      id: 'message', label: 'Message', flex: true,
      cell: ({ row: v }) => <span style={bodyStyle}>{v.message}</span>,
    },
    {
      id: 'fix', label: 'Suggested fix', width: 22,
      cell: ({ row: v }) => (v.suggested_fix
        ? <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{v.suggested_fix}</span>
        : <span style={{ color: T.subtlest }}>—</span>),
    },
  ];

  // Lineage summary — target entity counts by type from already-loaded rows.
  const entityCounts = new Map<string, number>();
  rows.forEach((r) => {
    if (r.target_entity) entityCounts.set(r.target_entity, (entityCounts.get(r.target_entity) ?? 0) + 1);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-testid="strata-run-detail">
      {/* Back link + run header */}
      <div>
        <div style={{ marginBottom: 4 }}>
          <Button appearance="subtle" spacing="compact" iconBefore={<ChevronLeft size={14} />} onClick={() => navigate(Routes.strata.data())}>
            Data pipeline
          </Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Heading as="h2" size="medium">{run.run_key}</Heading>
          <StatusLozenge status={run.status} label={labelize(run.status)} appearance={runStatusAppearance(run.status)} />
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{run.file_name ?? labelize(run.channel)}</span>
          {run.template_version != null ? (
            <CatalystTag text={`Template v${run.template_version}`} />
          ) : null}
          <span style={captionStyle}>Started {fmtDateTime(run.started_at)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
          <SegmentedCounts raw={run.row_count_raw} valid={run.row_count_valid} rejected={run.row_count_rejected} />
          {run.file_hash ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest }}>Checksum</span>
              <span style={{ ...mono, color: T.subtle }}>{run.file_hash.slice(0, 12)}</span>
              <IconButton
                icon={<Copy size={14} />}
                appearance="subtle"
                spacing="compact"
                aria-label="Copy checksum"
                onClick={() => { void navigator.clipboard.writeText(run.file_hash ?? ''); }}
              />
            </span>
          ) : null}
        </div>
      </div>

      <StrataPanel title="Staged rows" icon={<Database size={16} />} count={rows.length} noPadding testId="strata-staged-rows-panel">
        {rows.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState size="compact" header="No staged rows recorded for this run" description="Staged rows appear here once the file is parsed." />
          </div>
        ) : (
          <JiraTable<StrataStagingRow>
            columns={stagedColumns}
            data={rows}
            getRowId={(r) => r.id}
            ariaLabel={`Staged rows for ${run.run_key}`}
          />
        )}
      </StrataPanel>

      <StrataPanel title="Row-level validation errors" icon={<AlertTriangle size={16} />} count={results.length} noPadding testId="strata-validation-errors-panel">
        {results.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState size="compact" header="No validation errors" description="Every staged row passed validation." />
          </div>
        ) : (
          <JiraTable<StrataValidationResult>
            columns={errorColumns}
            data={results}
            getRowId={(v) => v.id}
            ariaLabel={`Validation errors for ${run.run_key}`}
          />
        )}
      </StrataPanel>

      <StrataPanel title="Lineage" icon={<Network size={16} />} testId="strata-run-lineage-panel">
        {entityCounts.size > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <CatalystTag text={run.run_key} />
              <span style={{ color: T.subtlest, display: 'inline-flex' }} aria-hidden><MoveRight size={14} /></span>
              {[...entityCounts.entries()].map(([entity, count]) => (
                <CatalystTag key={entity} text={`${labelize(entity)} · ${count}`} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
                {run.row_count_valid} row{run.row_count_valid === 1 ? '' : 's'} passed validation in this run.
                Inspect any KPI detail to trace canonical values back to {run.run_key}.
              </span>
              <Button appearance="default" onClick={() => navigate(Routes.strata.kpis())}>
                Open KPI library
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            size="compact"
            header="No lineage recorded for this run yet"
            description="Target entities appear here once staged rows are mapped."
            primaryAction={<Button onClick={() => navigate(Routes.strata.kpis())}>Open KPI library</Button>}
          />
        )}
      </StrataPanel>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataDataPipelinePage() {
  const { runKey } = useParams<{ runKey?: string }>();
  // Lifted to page level so the pipeline stepper reflects the viewed run's state.
  const detail = useRunDetail(runKey);

  return (
    <PageContainer variant="wide">
      <StrataPageChrome
        icon={<Database size={20} />}
        title="Data Pipeline"
        description="Upload, validation and lineage — every number traces to a run."
        actions={
          <Tooltip content="Upload wizard ships in the next slice">
            <Button appearance="primary" iconBefore={<Upload size={14} />} isDisabled>
              Upload data
            </Button>
          </Tooltip>
        }
      />
      <PipelineStepper run={runKey ? detail.data?.run ?? null : null} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {runKey ? (
          <RunDetailSection runKey={runKey} detail={detail} />
        ) : (
          <>
            <SourcesPanel />
            <RunsPanel />
          </>
        )}
      </div>
    </PageContainer>
  );
}
