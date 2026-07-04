/**
 * STRATA Data Pipeline — Upload / Validation / Lineage (blueprint Flow 1).
 * Routes: /strata/data and /strata/data/runs/:runKey.
 * UI renders DB/RPC values only — no business logic computed here.
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '@atlaskit/badge';
import { Button, EmptyState, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import { useDataSources, useRunDetail, useUploadRuns } from '@/modules/strata/hooks/useStrata';
import { StrataConfigContextBar, StrataPanel } from '@/modules/strata/components/shared';
import type { StrataDataSource, StrataStagingRow, StrataUploadRun } from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];

// ── Pipeline stages (informational — the governed lineage chain) ────────────
const PIPELINE_STAGES = [
  'Source', 'Ingestion run', 'Staging', 'Validation',
  'Attestation', 'Canonical write', 'Calculation', 'Snapshot',
] as const;

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '4px 8px', borderRadius: 4,
  background: 'var(--ds-background-neutral)', color: 'var(--ds-text)',
  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
};

const mono: React.CSSProperties = {
  fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12,
};

function PipelineStrip() {
  return (
    <div
      data-testid="strata-pipeline-strip"
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}
    >
      {PIPELINE_STAGES.map((stage, i) => (
        <React.Fragment key={stage}>
          {i > 0 ? <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 12 }}>→</span> : null}
          <span style={chipStyle}>{stage}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Lozenge mappings (system states) ─────────────────────────────────────────
function sourceStatusLozenge(status: StrataDataSource['status']) {
  const map: Record<StrataDataSource['status'], LozengeAppearance> = {
    active: 'success', registered: 'default', suspended: 'moved', retired: 'removed',
  };
  return <Lozenge appearance={map[status] ?? 'default'}>{status}</Lozenge>;
}

function runStatusLozenge(status: StrataUploadRun['status']) {
  const appearance: LozengeAppearance =
    status === 'completed' ? 'success'
    : status === 'failed' ? 'removed'
    : status === 'quarantined' ? 'moved'
    : 'inprogress';
  return <Lozenge appearance={appearance}>{status.replace(/_/g, ' ')}</Lozenge>;
}

function rowValidationLozenge(status: StrataStagingRow['validation_status']) {
  const appearance: LozengeAppearance =
    status === 'valid' || status === 'validated' ? 'success'
    : status === 'rejected' ? 'removed'
    : 'moved';
  return <Lozenge appearance={appearance}>{String(status).replace(/_/g, ' ')}</Lozenge>;
}

// ── Table primitives (token-styled, module-local) ───────────────────────────
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 11, fontWeight: 700,
      color: 'var(--ds-text-subtle)',
      borderBottom: '2px solid var(--ds-border)', whiteSpace: 'nowrap',
    }}>{children}</th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{
      padding: '8px 12px 8px 0', fontSize: 13, color: 'var(--ds-text)',
      borderBottom: '1px solid var(--ds-border)', verticalAlign: 'top', ...style,
    }}>{children}</td>
  );
}

function PanelState({ query, empty, children }: {
  query: { isLoading: boolean; isError: boolean; error: unknown };
  empty: boolean;
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
  if (empty) return <EmptyState size="compact" header="Nothing here yet" description="No records found." />;
  return <>{children}</>;
}

function fmtDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : '—';
}

// ── Registered sources ───────────────────────────────────────────────────────
function SourcesPanel() {
  const sources = useDataSources();
  return (
    <StrataPanel title="Registered sources" testId="strata-sources-panel">
      <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', margin: '0 0 12px' }}>
        Sources must be registered before feeding approved KPIs
      </p>
      <PanelState query={sources} empty={(sources.data ?? []).length === 0}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {(sources.data ?? []).map((s) => (
            <div
              key={s.id}
              style={{
                border: '1px solid var(--ds-border)', borderRadius: 8, padding: 12,
                background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 13, color: 'var(--ds-text)' }}>{s.name}</strong>
                {sourceStatusLozenge(s.status)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={chipStyle}>{s.system_type}</span>
                <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
                  Refresh: {s.refresh_cadence ?? '—'}
                </span>
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
  return (
    <StrataPanel title="Upload runs" testId="strata-runs-panel">
      <PanelState query={runs} empty={(runs.data ?? []).length === 0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>Run</Th><Th>File / channel</Th><Th>Started</Th><Th>Rows</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {(runs.data ?? []).map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.run(r.run_key))}>
                      <span style={{ fontWeight: 700 }}>{r.run_key}</span>
                    </Button>
                  </Td>
                  <Td>{r.file_name ?? r.channel}</Td>
                  <Td>{fmtDate(r.started_at)}</Td>
                  <Td>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      raw {r.row_count_raw} · valid {r.row_count_valid} ·{' '}
                      <span style={r.row_count_rejected > 0 ? { color: 'var(--ds-text-danger)' } : undefined}>
                        rejected {r.row_count_rejected}
                      </span>
                    </span>
                  </Td>
                  <Td>{runStatusLozenge(r.status)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelState>
    </StrataPanel>
  );
}

// ── Run detail ───────────────────────────────────────────────────────────────
function RunDetailSection({ runKey }: { runKey: string }) {
  const detail = useRunDetail(runKey);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-testid="strata-run-detail">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text)', margin: 0 }}>{run.run_key}</h2>
        {runStatusLozenge(run.status)}
        <span style={{ fontSize: 13, color: 'var(--ds-text-subtle)' }}>{run.file_name ?? run.channel}</span>
        {run.file_hash ? (
          <span
            title={run.file_hash}
            style={{
              ...mono, color: 'var(--ds-text-subtlest)', maxWidth: 160,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block',
            }}
          >
            {run.file_hash}
          </span>
        ) : null}
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
          Template {run.template_version != null ? `v${run.template_version}` : '—'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>
          raw {run.row_count_raw} · valid {run.row_count_valid} ·{' '}
          <span style={run.row_count_rejected > 0 ? { color: 'var(--ds-text-danger)' } : undefined}>
            rejected {run.row_count_rejected}
          </span>
        </span>
      </div>

      <StrataPanel title="Staged rows" testId="strata-staged-rows-panel">
        {rows.length === 0 ? (
          <EmptyState size="compact" header="No staged rows" description="This run has no staging rows recorded." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><Th>#</Th><Th>Raw</Th><Th>Target entity</Th><Th>Validation</Th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const raw = JSON.stringify(r.raw);
                  return (
                    <tr key={r.id}>
                      <Td>{r.row_number}</Td>
                      <Td>
                        <span
                          title={raw}
                          style={{
                            ...mono, display: 'inline-block', maxWidth: 420,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {raw}
                        </span>
                      </Td>
                      <Td>{r.target_entity ?? '—'}</Td>
                      <Td>{rowValidationLozenge(r.validation_status)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </StrataPanel>

      <StrataPanel title="Row-level validation errors" testId="strata-validation-errors-panel">
        {results.length === 0 ? (
          <EmptyState size="compact" header="No validation errors" description="Every staged row passed validation." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><Th>Row</Th><Th>Field</Th><Th>Code</Th><Th>Severity</Th><Th>Message</Th><Th>Suggested fix</Th></tr>
              </thead>
              <tbody>
                {results.map((v) => (
                  <tr key={v.id}>
                    <Td>{v.staging_row_id ? rowNumberByStagingId.get(v.staging_row_id) ?? '—' : '—'}</Td>
                    <Td>{v.field_name ?? '—'}</Td>
                    <Td><Badge>{v.error_code}</Badge></Td>
                    <Td>
                      <Lozenge appearance={v.severity === 'error' ? 'removed' : 'moved'}>{v.severity}</Lozenge>
                    </Td>
                    <Td>{v.message}</Td>
                    <Td style={{ color: 'var(--ds-text-subtle)' }}>{v.suggested_fix ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StrataPanel>

      <StrataPanel title="Lineage" testId="strata-run-lineage-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--ds-text-subtle)' }}>
            {run.row_count_valid} row{run.row_count_valid === 1 ? '' : 's'} passed validation in this run.
            Canonical values are traceable from each KPI — inspect any KPI detail to trace back to {run.run_key}.
          </span>
          <Button appearance="default" onClick={() => navigate(Routes.strata.kpis())}>
            Open KPI library
          </Button>
        </div>
      </StrataPanel>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataDataPipelinePage() {
  const { runKey } = useParams<{ runKey?: string }>();
  return (
    <PageContainer variant="wide">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 8px' }}>
        Data Pipeline
      </h1>
      <StrataConfigContextBar />
      <PipelineStrip />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {runKey ? (
          <RunDetailSection runKey={runKey} />
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
