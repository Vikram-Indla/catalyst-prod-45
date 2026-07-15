/**
 * STRATA Data Pipeline — Upload / Validation / Lineage (blueprint Flow 1).
 * Routes: /strata/data and /strata/data/runs/:runKey.
 * UI renders DB/RPC values only — no business logic computed here.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button, CatalystTag, EmptyState, IconButton, SectionMessage, Spinner, Tooltip,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import {
  AlertTriangle, CheckCircle2, Copy, Database, MoveRight, Network, RefreshCw, Upload,
} from '@/lib/atlaskit-icons';
import { executionApi, kpiApi, lineageApi } from '@/modules/strata/domain';
import {
  useDataSources, useInvalidateStrata, useKpis, useProfileNames, useRunDetail, useStrataContext, useStrataRoles, useUploadRuns,
} from '@/modules/strata/hooks/useStrata';
import { StrataDecisionModal, StrataFreshnessGlyph, StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { fmtDate, fmtDateTime, labelize } from '@/modules/strata/components/format';
import type {
  StrataDataSource, StrataKpi, StrataKpiActual, StrataStagingRow, StrataUploadRun, StrataValidationResult,
} from '@/modules/strata/types';

/** UI affordance gating only — DB RPC guards enforce the real rules (mirrors StrataUploadWizardPage). */
const INGEST_ROLES = ['data_steward', 'kpi_owner', 'strategy_office', 'strata_admin'] as const;
/** Jira connector sync (F-GOV-010) — narrower than ingest: no kpi_owner. RPC enforces the real guard. */
const SYNC_ROLES = ['data_steward', 'strategy_office', 'strata_admin'] as const;

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

/** A run needs resolution when it rejected rows or failed/quarantined outright. */
const runNeedsResolution = (r: StrataUploadRun): boolean =>
  (r.row_count_rejected ?? 0) > 0 || r.status === 'failed' || r.status === 'quarantined';

/**
 * Enriched source row (anchor 19) — consequence-ranked from freshness (the `health`
 * column is unpopulated in-schema, so derive from the latest run's age) + backward-
 * derived downstream KPIs (P4-D4: strata_kpis.data_source_id; scorecard/snapshot
 * forward impact is NOT tracked → labeled gap, never fabricated).
 */
interface SourceRow {
  source: StrataDataSource;
  lastRunAt: string | null;
  lastRunKey: string | null;
  contractVersion: number | null;
  dependentNames: string[];
  freshnessDays: number | null;
  consequenceRank: number; // stale 0 · aging 1 · healthy 2 · never-run 3
  statusLabel: string;
  statusAppearance: LozengeAppearance;
}
function buildSourceRows(sources: StrataDataSource[], runs: StrataUploadRun[], kpis: StrataKpi[]): SourceRow[] {
  const runsBySource = new Map<string, StrataUploadRun[]>();
  runs.forEach((r) => { if (r.data_source_id) runsBySource.set(r.data_source_id, [...(runsBySource.get(r.data_source_id) ?? []), r]); });
  const namesBySource = new Map<string, string[]>();
  kpis.forEach((k) => { if (k.data_source_id) namesBySource.set(k.data_source_id, [...(namesBySource.get(k.data_source_id) ?? []), k.name]); });

  const rows = sources.map((s): SourceRow => {
    const srcRuns = (runsBySource.get(s.id) ?? []).filter((r) => r.completed_at);
    const lastRun = srcRuns.reduce<StrataUploadRun | null>((mx, r) => (mx == null || r.completed_at! > mx.completed_at! ? r : mx), null);
    const lastRunAt = lastRun?.completed_at ?? null;
    const days = lastRunAt ? Math.max(0, Math.floor((Date.now() - new Date(lastRunAt).getTime()) / 86_400_000)) : null;
    let statusLabel: string; let statusAppearance: LozengeAppearance; let consequenceRank: number;
    if (days == null) { statusLabel = labelize(s.status); statusAppearance = SOURCE_STATUS[s.status] ?? 'default'; consequenceRank = 3; }
    else if (days > 5) { statusLabel = 'Stale'; statusAppearance = 'removed'; consequenceRank = 0; }
    else if (days > 2) { statusLabel = 'Aging'; statusAppearance = 'moved'; consequenceRank = 1; }
    else { statusLabel = 'Healthy'; statusAppearance = 'success'; consequenceRank = 2; }
    return {
      source: s, lastRunAt, lastRunKey: lastRun?.run_key ?? null,
      contractVersion: lastRun?.template_version ?? null,
      dependentNames: namesBySource.get(s.id) ?? [], freshnessDays: days,
      consequenceRank, statusLabel, statusAppearance,
    };
  });
  return rows.sort((a, b) => a.consequenceRank - b.consequenceRank || (b.freshnessDays ?? -1) - (a.freshnessDays ?? -1));
}

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
/** Judgment sentence (anchor 19) — the steward's triage line: what breaks what, worst first. */
function DataLandingJudgment() {
  const sourcesQ = useDataSources();
  const runsQ = useUploadRuns();
  const kpisQ = useKpis();
  const rows = useMemo(
    () => buildSourceRows(sourcesQ.data ?? [], runsQ.data ?? [], kpisQ.data ?? []),
    [sourcesQ.data, runsQ.data, kpisQ.data],
  );
  if (sourcesQ.isLoading || runsQ.isLoading) return <div aria-hidden style={{ height: 22, borderRadius: 8, background: T.neutral }} />;
  const attention = rows.filter((r) => r.consequenceRank <= 1);
  const resolveRuns = (runsQ.data ?? []).filter(runNeedsResolution);
  const worst = attention[0];
  const clauses: string[] = [];
  if (attention.length > 0) {
    const victims = worst?.dependentNames.length ?? 0;
    clauses.push(
      `${attention.length} source${attention.length === 1 ? '' : 's'} ${attention.length === 1 ? 'is' : 'are'} stale or aging`
      + (worst && victims > 0 ? ` (${worst.source.name} degrades ${victims} KPI${victims === 1 ? '' : 's'})` : ''),
    );
  }
  if (resolveRuns.length > 0) clauses.push(`${resolveRuns.length} run${resolveRuns.length === 1 ? '' : 's'} need resolution`);
  const sentence = clauses.length > 0
    ? `${clauses.join('; ')}.`
    : `All ${rows.length} source${rows.length === 1 ? '' : 's'} are fresh — no runs need resolution.`;
  return (
    <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-300)', color: T.text }} data-testid="strata-data-judgment">
      <strong>{sentence}</strong>
    </p>
  );
}

// ── Sources — freshness and who depends on them (anchor 19) ───────────────────
function SourcesPanel() {
  const sources = useDataSources();
  const runs = useUploadRuns();
  const kpis = useKpis();
  const rows = useMemo(
    () => buildSourceRows(sources.data ?? [], runs.data ?? [], kpis.data ?? []),
    [sources.data, runs.data, kpis.data],
  );

  const columns: Column<SourceRow>[] = [
    {
      id: 'source', label: 'Source', flex: true,
      cell: ({ row }) => (
        <div style={{ minWidth: 0 }}>
          <span style={{ ...bodyStyle, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{row.source.name}</span>
          <span style={{ ...captionStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {labelize(row.source.system_type)}{row.source.refresh_cadence ? ` · ${row.source.refresh_cadence}` : ''}
          </span>
        </div>
      ),
    },
    {
      id: 'freshness', label: 'Freshness', width: 14,
      cell: ({ row }) => <StrataFreshnessGlyph latest={row.lastRunAt} testId={`strata-source-fresh-${row.source.id}`} />,
    },
    {
      id: 'contract', label: 'Contract', width: 14,
      cell: ({ row }) => row.contractVersion != null
        ? <span style={captionStyle}>Template v{row.contractVersion}</span>
        : <span style={{ color: T.subtlest }}>—</span>,
    },
    {
      id: 'dependents', label: 'Downstream dependents', width: 22,
      cell: ({ row }) => {
        if (row.dependentNames.length === 0) return <span style={{ color: T.subtlest }}>— none tracked</span>;
        const shown = row.dependentNames.slice(0, 2).join(', ');
        const extra = row.dependentNames.length - 2;
        return (
          <Tooltip content={`${row.dependentNames.join(', ')} · scorecard/snapshot forward impact not tracked`}>
            <span style={{ ...captionStyle, color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {row.dependentNames.length} KPI{row.dependentNames.length === 1 ? '' : 's'}: {shown}{extra > 0 ? ` +${extra}` : ''}
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: 'lastrun', label: 'Last run', width: 15,
      cell: ({ row }) => row.lastRunKey ? (
        <div style={{ minWidth: 0 }}>
          <span style={{ ...captionStyle, color: T.subtle, fontWeight: 600, display: 'block' }}>{row.lastRunKey}</span>
          {row.lastRunAt ? <span style={{ ...captionStyle, fontVariantNumeric: 'tabular-nums', display: 'block' }}>{fmtDate(row.lastRunAt)}</span> : null}
        </div>
      ) : <span style={{ color: T.subtlest }}>never run</span>,
    },
    {
      id: 'status', label: 'Status', width: 13,
      cell: ({ row }) => <StatusLozenge status={row.statusLabel.toLowerCase()} label={row.statusLabel} appearance={row.statusAppearance} />,
    },
  ];

  return (
    <StrataPanel
      title="Sources — freshness and who depends on them"
      icon={<Database size={16} />}
      count={rows.length}
      noPadding
      testId="strata-sources-panel"
      actions={<span style={captionStyle}>Sorted by consequence: stale &gt; aging &gt; healthy</span>}
    >
      <PanelState
        query={sources}
        empty={rows.length === 0}
        emptyHeader="No data sources registered yet"
        emptyDescription="Register a source to begin governed ingestion — its freshness and downstream KPIs appear here."
      >
        <JiraTable<SourceRow>
          columns={columns}
          data={rows}
          getRowId={(r) => r.source.id}
          showRowCount={false}
          ariaLabel="Data sources"
        />
      </PanelState>
    </StrataPanel>
  );
}

// ── Upload runs ──────────────────────────────────────────────────────────────
function RunsPanel() {
  const runs = useUploadRuns();
  const navigate = useNavigate();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const kpis = useKpis();
  const profiles = useProfileNames();
  // Downstream KPIs per source — "waiting on it" for runs that still need resolution (P4-D4).
  const namesBySource = useMemo(() => {
    const m = new Map<string, string[]>();
    (kpis.data ?? []).forEach((k) => { if (k.data_source_id) m.set(k.data_source_id, [...(m.get(k.data_source_id) ?? []), k.name]); });
    return m;
  }, [kpis.data]);
  const hasSyncRole = (rolesQ.data ?? []).some((r) => (SYNC_ROLES as readonly string[]).includes(r));
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  /** strata_sync_jira RPC — server failure text surfaces verbatim, never swallowed. */
  const syncFromJira = async () => {
    setSyncBusy(true);
    setSyncError(null);
    setSyncNote(null);
    try {
      const res = await executionApi.syncJira();
      setSyncNote(
        `${res.cards_created} card${res.cards_created === 1 ? '' : 's'} created, `
        + `${res.cards_updated} updated, ${res.milestones_synced} milestone${res.milestones_synced === 1 ? '' : 's'} synced.`,
      );
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncBusy(false);
      invalidate();
    }
  };

  const columns: Column<StrataUploadRun>[] = [
    {
      id: 'run', label: 'Run', width: 12, sortable: true,
      accessor: (r) => r.run_key,
      cell: ({ row: r }) => (
        <span style={{ ...bodyStyle, fontWeight: 600, color: T.brandText, whiteSpace: 'nowrap' }}>{r.run_key}</span>
      ),
    },
    {
      id: 'what', label: 'What', flex: true,
      accessor: (r) => r.file_name ?? r.channel,
      cell: ({ row: r }) => {
        const owner = r.initiated_by ? profiles.data?.get(r.initiated_by)?.name ?? null : null;
        return (
          <div style={{ minWidth: 0 }}>
            <span style={{ ...bodyStyle, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {r.file_name ?? labelize(r.channel)}
            </span>
            <span style={{ ...captionStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {owner ? `${owner} · ` : ''}{fmtDate(r.started_at)}
            </span>
          </div>
        );
      },
    },
    {
      id: 'rows', label: 'Rows', width: 20,
      cell: ({ row: r }) => <SegmentedCounts raw={r.row_count_raw} valid={r.row_count_valid} rejected={r.row_count_rejected} />,
    },
    {
      id: 'status', label: 'Status', width: 14, sortable: true,
      accessor: (r) => r.status,
      cell: ({ row: r }) => (
        <StatusLozenge status={r.status} label={labelize(r.status)} appearance={runStatusAppearance(r.status)} />
      ),
    },
    {
      id: 'waiting', label: 'Waiting on it', width: 18,
      cell: ({ row: r }) => {
        if (!runNeedsResolution(r)) return <span style={{ color: T.subtlest }}>—</span>;
        const deps = r.data_source_id ? namesBySource.get(r.data_source_id) ?? [] : [];
        return (
          <span style={{ ...captionStyle, color: 'var(--ds-text-danger)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {deps.length > 0 ? `${deps.length} KPI${deps.length === 1 ? '' : 's'} waiting` : 'needs resolution'}
          </span>
        );
      },
    },
  ];

  return (
    <StrataPanel
      title="Recent runs"
      icon={<Upload size={16} />}
      count={runs.data?.length ?? null}
      noPadding
      testId="strata-runs-panel"
      actions={hasSyncRole ? (
        <Button
          appearance="default"
          spacing="compact"
          iconBefore={<RefreshCw size={14} />}
          isDisabled={syncBusy}
          onClick={() => void syncFromJira()}
          testId="strata-sync-jira"
        >
          {syncBusy ? 'Syncing…' : 'Sync from Jira'}
        </Button>
      ) : undefined}
    >
      {syncNote ? (
        <div style={{ padding: '12px 16px 0' }}>
          <SectionMessage appearance="success" title="Jira sync complete">
            <p>{syncNote}</p>
          </SectionMessage>
        </div>
      ) : null}
      {syncError ? (
        <div style={{ padding: '12px 16px 0' }}>
          <SectionMessage appearance="error" title="Jira sync failed">
            <p style={{ whiteSpace: 'pre-wrap' }}>{syncError}</p>
          </SectionMessage>
        </div>
      ) : null}
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
  const { activePeriod } = useStrataContext();
  const invalidate = useInvalidateStrata();
  const runId = detail.data?.run.id ?? null;

  // Attestation applies to strata_kpi_actuals (not staging rows). There is no
  // by-run domain API, so actuals are fetched for the governed ACTIVE period
  // and matched to this run via upload_run_id + staging_row_id. Actuals this
  // run wrote into other periods are not attestable from this view.
  const actualsQ = useQuery({
    queryKey: ['strata', 'kpi-actuals-period', activePeriod?.id],
    queryFn: () => kpiApi.actualsForPeriod(activePeriod!.id),
    enabled: !!activePeriod && !!runId,
    staleTime: 30_000,
  });
  const pendingActualByStagingId = useMemo(() => {
    const m = new Map<string, StrataKpiActual>();
    ((actualsQ.data ?? []) as StrataKpiActual[]).forEach((a) => {
      if (runId && a.upload_run_id === runId && a.validation_status === 'pending' && a.staging_row_id) {
        m.set(a.staging_row_id, a);
      }
    });
    return m;
  }, [actualsQ.data, runId]);
  const [attestTarget, setAttestTarget] = useState<{ actual: StrataKpiActual; rowNumber: number } | null>(null);

  // Pipeline actions (validate/promote) — role-gated affordance; RPCs enforce the real guard.
  const rolesQ = useStrataRoles();
  const hasIngestRole = (rolesQ.data ?? []).some((r) => (INGEST_ROLES as readonly string[]).includes(r));
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  /** Runs a pipeline RPC; server failure text surfaces verbatim — never swallowed. */
  const runPipelineAction = async (fn: () => Promise<string>) => {
    setActionBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      setActionSuccess(await fn());
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionBusy(false);
      invalidate();
    }
  };

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
    // Attest action — only when this run has pending KPI actuals to govern.
    ...(pendingActualByStagingId.size > 0
      ? [{
          id: 'attest', label: 'Attestation', width: 11,
          cell: ({ row: r }) => {
            const actual = pendingActualByStagingId.get(r.id);
            if (!actual) return <span style={{ color: T.subtlest }}>—</span>;
            return (
              <Button
                spacing="compact"
                onClick={() => setAttestTarget({ actual, rowNumber: r.row_number })}
                testId={`strata-attest-row-${r.row_number}`}
              >
                Attest
              </Button>
            );
          },
        } satisfies Column<StrataStagingRow>]
      : []),
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
      {/* Run meta — breadcrumb + shell title carry the run key; no back row */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <StatusLozenge status={run.status} label={labelize(run.status)} appearance={runStatusAppearance(run.status)} />
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>{run.file_name ?? labelize(run.channel)}</span>
          {run.template_version != null ? (
            <CatalystTag text={`Template v${run.template_version}`} />
          ) : null}
          <span style={captionStyle}>Started {fmtDateTime(run.started_at)}</span>
          {hasIngestRole && run.status === 'staging' ? (
            <Button
              appearance="primary"
              spacing="compact"
              isDisabled={actionBusy}
              onClick={() => runPipelineAction(async () => {
                const res = await lineageApi.validateRun(run.id);
                return `Validation ${labelize(res.status)}: ${res.row_count_valid} valid, ${res.row_count_rejected} rejected.`;
              })}
              testId="strata-validate-run"
            >
              {actionBusy ? 'Validating…' : 'Validate run'}
            </Button>
          ) : null}
          {hasIngestRole && run.status === 'completed' ? (
            <Button
              appearance="primary"
              spacing="compact"
              isDisabled={actionBusy}
              onClick={() => runPipelineAction(async () => {
                const res = await lineageApi.promoteRun(run.id);
                return `${res.promoted} actual${res.promoted === 1 ? '' : 's'} written (pending attestation), ${res.skipped} skipped.`;
              })}
              testId="strata-promote-run"
            >
              {actionBusy ? 'Promoting…' : 'Promote to canonical actuals'}
            </Button>
          ) : null}
        </div>
        {actionSuccess ? (
          <div style={{ marginTop: 8 }}>
            <SectionMessage appearance="success" title="Pipeline action complete">
              <p>{actionSuccess}</p>
            </SectionMessage>
          </div>
        ) : null}
        {actionError ? (
          <div style={{ marginTop: 8 }}>
            <SectionMessage appearance="error" title="Pipeline action failed">
              <p style={{ whiteSpace: 'pre-wrap' }}>{actionError}</p>
            </SectionMessage>
          </div>
        ) : null}
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

      {/* Governed attestation verdict — RPC-only; SoD errors render in-modal */}
      <StrataDecisionModal
        open={attestTarget !== null}
        onClose={() => setAttestTarget(null)}
        title={attestTarget ? `Attest row ${attestTarget.rowNumber}` : 'Attest'}
        description="Records a governed verdict on the KPI actual written by this run. Segregation of duties is enforced in the database."
        options={[
          { value: 'validated', label: 'Validate' },
          { value: 'rejected', label: 'Reject', appearance: 'danger' },
          { value: 'quarantined', label: 'Quarantine' },
        ]}
        confirmLabel="Record verdict"
        onConfirm={async (verdict, note) => {
          if (!attestTarget) return;
          await kpiApi.attestActual(
            attestTarget.actual.id,
            verdict as 'validated' | 'rejected' | 'quarantined',
            note || undefined,
          );
          invalidate();
        }}
        testId="strata-attest-modal"
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataDataPipelinePage() {
  const { runKey } = useParams<{ runKey?: string }>();
  const navigate = useNavigate();
  // Lifted to page level so the pipeline stepper reflects the viewed run's state.
  const detail = useRunDetail(runKey);

  return (
    <StrataPageShell
      trail={runKey ? [
        { text: 'Data pipeline', href: Routes.strata.data() },
        { text: runKey },
      ] : undefined}
      docTitle={runKey ?? undefined}
      headerActions={
        <Button
          appearance="primary"
          iconBefore={<Upload size={14} />}
          onClick={() => navigate(Routes.strata.upload())}
          testId="strata-upload-data-cta"
        >
          Upload data
        </Button>
      }
      testId="strata-data-pipeline-chrome"
    >
      {/* Lifecycle stepper is run-detail only (anchor 19 landing carries no stepper). */}
      {runKey ? <PipelineStepper run={detail.data?.run ?? null} /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {runKey ? (
          <RunDetailSection runKey={runKey} detail={detail} />
        ) : (
          <>
            <DataLandingJudgment />
            <SourcesPanel />
            <RunsPanel />
          </>
        )}
      </div>
    </StrataPageShell>
  );
}
