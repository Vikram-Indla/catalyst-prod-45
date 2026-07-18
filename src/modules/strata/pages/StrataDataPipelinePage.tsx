/**
 * STRATA Data Pipeline — Upload / Validation / Lineage (blueprint Flow 1).
 * Routes: /strata/data and /strata/data/runs/:runKey.
 * UI renders DB/RPC values only — no business logic computed here.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button, CatalystTag, EmptyState, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
  SectionMessage, Select, Spinner, Textfield, Tooltip,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import {
  CheckCircle2, Database, Network, RefreshCw, Upload,
} from '@/lib/atlaskit-icons';
import { executionApi, kpiApi, lineageApi } from '@/modules/strata/domain';
import {
  useDataSources, useInvalidateStrata, useKpis, useProfileNames, useRunDetail, useStrataContext, useStrataRoles, useUploadRuns,
} from '@/modules/strata/hooks/useStrata';
import {
  StrataDecisionModal, StrataFreshnessGlyph, StrataLifecycleStepper, StrataPageShell, StrataPanel, T,
  type StrataLifecycleStep, type StrataStepState,
} from '@/modules/strata/components/shared';
import { fmtDate, fmtDateTime, labelize } from '@/modules/strata/components/format';
import type {
  StrataDataSource, StrataKpi, StrataKpiActual, StrataQuarantineResolution, StrataReversalEligibility,
  StrataRunReversal, StrataStagingRow, StrataUploadRun, StrataValidationResult,
} from '@/modules/strata/types';

/** UI affordance gating only — DB RPC guards enforce the real rules (mirrors StrataUploadWizardPage). */
const INGEST_ROLES = ['data_steward', 'kpi_owner', 'strategy_office', 'strata_admin'] as const;
/** Jira connector sync (F-GOV-010) — narrower than ingest: no kpi_owner. RPC enforces the real guard. */
const SYNC_ROLES = ['data_steward', 'strategy_office', 'strata_admin'] as const;
/**
 * R4c · strata_resolve_quarantine gates on strata_has_role(['strategy_office']), and
 * strata_has_role admits strata_admin unconditionally — so this mirrors the RPC exactly.
 * The gate only avoids offering a verb the server would refuse; the RPC remains the authority.
 */
const QUARANTINE_ROLES = ['strategy_office', 'strata_admin'] as const;
/** R4d · strata_reverse_run gates on strata_has_role(['strategy_office','data_steward']) (+ admin). */
const REVERSAL_ROLES = ['strategy_office', 'data_steward', 'strata_admin'] as const;

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
export function buildSourceRows(sources: StrataDataSource[], runs: StrataUploadRun[], kpis: StrataKpi[]): SourceRow[] {
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

/**
 * Run lifecycle (anchor 09) — the steward's 7-step journey, mapped from run.status.
 * "Resolve" is derived (rejected rows outstanding), not a discrete backend stage.
 * Promote writes PENDING attestation. The old "no reverse RPC exists" note is STALE — R4d shipped
 * `strata_reverse_run` (migration 20260717190000): a promoted run is reversible for 24 hours, before
 * a lock or an issuance. RunReversalSection asks the eligibility RPC rather than asserting either way.
 */
export function runLifecycleSteps(run: StrataUploadRun): StrataLifecycleStep[] {
  // DL-DEF-005: a compensating reversal is terminal evidence. It never maps onto the
  // 7-step import journey — there is no Promote or Calculated stage to be "in progress".
  if (run.run_type === 'reversal') {
    const terminal = run.status === 'completed' || run.status === 'failed';
    return [
      { id: 'created', label: 'Reversal created', state: 'done', note: run.reversal_reason ?? undefined },
      { id: 'applied', label: 'Originals marked reversed', state: terminal ? 'done' : 'current', note: 'original evidence preserved' },
      { id: 'terminal', label: 'Terminal', state: run.status === 'failed' ? 'failed' : terminal ? 'done' : 'todo', note: 'nothing to promote' },
    ];
  }
  const s = run.status;
  const rejects = run.row_count_rejected ?? 0;
  const failed = s === 'failed';
  let current: number;
  if (failed) current = 3;
  else if (s === 'uploaded') current = 1;
  else if (s === 'staging') current = 2;
  else if (s === 'validating') current = 3;
  else if (rejects > 0) current = 4;
  else if (s === 'calculating') current = 6;
  else current = 5; // completed / pending_attestation / writing — ready to promote
  const st = (i: number): StrataStepState =>
    failed && i === 3 ? 'failed' : i < current ? 'done' : i === current ? 'current' : 'todo';
  return [
    { id: 'contract', label: 'Contract', state: st(0), note: run.template_version != null ? `template v${run.template_version}` : undefined },
    { id: 'upload', label: 'Upload', state: st(1), note: `${run.row_count_raw} rows` },
    { id: 'map', label: 'Map', state: st(2), note: 'staged' },
    { id: 'validate', label: 'Validate', state: st(3), note: `${run.row_count_valid} valid · ${rejects} rejected` },
    { id: 'resolve', label: 'Resolve', state: st(4), note: rejects > 0 ? `${rejects} to resolve` : 'nothing to resolve' },
    { id: 'promote', label: 'Promote', state: st(5), note: 'pending attestation' },
    { id: 'calculated', label: 'Calculated', state: st(6), note: undefined },
  ];
}

/**
 * DL-DEF-005: resolve a reversal run's relationships and actor to governed display
 * values. Zero-assumption — anything unresolved stays null and the caller renders
 * the raw identifier (honest evidence) rather than a guess.
 */
export function reversalDisplayMeta(
  run: Pick<StrataUploadRun, 'reverses_run_id' | 'reversed_by_run_id' | 'initiated_by'>,
  runKeyById: Map<string, string>,
  profileNameById: Map<string, { name: string | null }> | undefined,
): { reversesKey: string | null; reversedByKey: string | null; actorName: string | null } {
  return {
    reversesKey: run.reverses_run_id ? runKeyById.get(run.reverses_run_id) ?? null : null,
    reversedByKey: run.reversed_by_run_id ? runKeyById.get(run.reversed_by_run_id) ?? null : null,
    actorName: run.initiated_by ? profileNameById?.get(run.initiated_by)?.name ?? null : null,
  };
}

/**
 * DL-DEF-004: run-collection search/filter predicate. Matches run key, file name,
 * channel, status and run type case-insensitively; a status filter is exact.
 */
export function filterRunRows(runs: StrataUploadRun[], q: string, status: string): StrataUploadRun[] {
  const needle = q.toLowerCase();
  return runs.filter((r) => {
    const hay = `${r.run_key} ${r.file_name ?? ''} ${labelize(r.channel)} ${labelize(r.status)} ${labelize(r.run_type ?? 'import')}`.toLowerCase();
    return (!q || hay.includes(needle)) && (!status || r.status === status);
  });
}

/** Client-side error clustering (anchor 09, P4-D3) — group validation results by cause. */
interface ErrorCluster { key: string; code: string; field: string | null; count: number; message: string; fix: string | null; severity: string; }
function clusterErrors(results: StrataValidationResult[]): ErrorCluster[] {
  const m = new Map<string, ErrorCluster>();
  results.forEach((v) => {
    const key = `${v.error_code}::${v.field_name ?? ''}`;
    const ex = m.get(key);
    if (ex) ex.count += 1;
    else m.set(key, { key, code: v.error_code, field: v.field_name, count: 1, message: v.message, fix: v.suggested_fix, severity: v.severity });
  });
  return [...m.values()].sort((a, b) => b.count - a.count);
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)',
};
const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };

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
  const navigate = useNavigate();
  // DL-DEF-004: search + pagination with URL-preserved state (?srcq, ?srcpage).
  const [searchParams, setSearchParams] = useSearchParams();
  const srcQ = searchParams.get('srcq') ?? '';
  const srcPage = Math.max(1, Number(searchParams.get('srcpage') ?? '1') || 1);
  const setListParam = (k: string, v: string) => setSearchParams((prev) => {
    const n = new URLSearchParams(prev);
    if (v) n.set(k, v); else n.delete(k);
    if (k !== 'srcpage') n.delete('srcpage'); // a new search resets paging
    return n;
  }, { replace: true });
  const allRows = useMemo(
    () => buildSourceRows(sources.data ?? [], runs.data ?? [], kpis.data ?? []),
    [sources.data, runs.data, kpis.data],
  );
  const rows = useMemo(() => {
    if (!srcQ) return allRows;
    const needle = srcQ.toLowerCase();
    return allRows.filter((r) =>
      `${r.source.name} ${labelize(r.source.system_type)} ${r.statusLabel} ${r.lastRunKey ?? ''}`.toLowerCase().includes(needle));
  }, [allRows, srcQ]);

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
      <div style={{ padding: '12px 16px 0', maxWidth: 340 }}>
        <Textfield
          value={srcQ}
          onChange={(e) => setListParam('srcq', e.target.value)}
          placeholder="Search sources (name, type, status)"
          aria-label="Search data sources"
          isCompact
        />
      </div>
      <PanelState
        query={sources}
        empty={allRows.length === 0}
        emptyHeader="No data sources registered yet"
        emptyDescription="Register a source to begin governed ingestion — its freshness and downstream KPIs appear here."
      >
        {rows.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              size="compact"
              header="No sources match your search"
              description={`Nothing matches "${srcQ}".`}
              primaryAction={<Button onClick={() => setListParam('srcq', '')}>Clear search</Button>}
            />
          </div>
        ) : (
          <JiraTable<SourceRow>
            columns={columns}
            data={rows}
            getRowId={(r) => r.source.id}
            showRowCount={false}
            ariaLabel="Data sources"
            rowsPerPage={10}
            page={srcPage}
            onPageChange={(p) => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('srcpage', String(p)); return n; }, { replace: true })}
            onRowClick={(r) => { if (r.source.slug) navigate(Routes.strata.source(r.source.slug)); }}
          />
        )}
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
  // DL-DEF-004: search + status filter + pagination with URL-preserved state (?runq, ?runstatus, ?runpage).
  const [searchParams, setSearchParams] = useSearchParams();
  const runQ = searchParams.get('runq') ?? '';
  const runStatus = searchParams.get('runstatus') ?? '';
  const runPage = Math.max(1, Number(searchParams.get('runpage') ?? '1') || 1);
  const setListParam = (k: string, v: string) => setSearchParams((prev) => {
    const n = new URLSearchParams(prev);
    if (v) n.set(k, v); else n.delete(k);
    if (k !== 'runpage') n.delete('runpage'); // new search/filter resets paging
    return n;
  }, { replace: true });
  const statusOptions = useMemo(
    () => [...new Set((runs.data ?? []).map((r) => r.status))].sort()
      .map((s) => ({ label: labelize(s), value: s })),
    [runs.data],
  );
  const filteredRuns = useMemo(
    () => filterRunRows(runs.data ?? [], runQ, runStatus),
    [runs.data, runQ, runStatus],
  );
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
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', maxWidth: 340 }}>
          <Textfield
            value={runQ}
            onChange={(e) => setListParam('runq', e.target.value)}
            placeholder="Search runs (key, file, channel, status)"
            aria-label="Search upload runs"
            isCompact
          />
        </div>
        <div style={{ width: 190 }}>
          <Select
            options={statusOptions}
            value={statusOptions.find((o) => o.value === runStatus) ?? null}
            onChange={(o) => setListParam('runstatus', o?.value ?? '')}
            isClearable
            isSearchable={false}
            placeholder="All statuses"
            aria-label="Filter runs by status"
          />
        </div>
      </div>
      <PanelState
        query={runs}
        empty={(runs.data ?? []).length === 0}
        emptyHeader="No upload runs yet for this period"
        emptyDescription="Runs appear here as soon as data is uploaded through a registered source."
      >
        {filteredRuns.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              size="compact"
              header="No runs match your search"
              description={runStatus ? `Nothing matches "${runQ}" with status ${labelize(runStatus)}.` : `Nothing matches "${runQ}".`}
              primaryAction={<Button onClick={() => { setListParam('runq', ''); setListParam('runstatus', ''); }}>Clear search</Button>}
            />
          </div>
        ) : (
          <JiraTable<StrataUploadRun>
            columns={columns}
            data={filteredRuns}
            getRowId={(r) => r.id}
            onRowClick={(r) => navigate(Routes.strata.run(r.run_key))}
            ariaLabel="Upload runs"
            rowsPerPage={10}
            page={runPage}
            onPageChange={(p) => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('runpage', String(p)); return n; }, { replace: true })}
          />
        )}
      </PanelState>
    </StrataPanel>
  );
}

// ── R4c · quarantine resolution (capability 9) ───────────────────────────────
/**
 * The three verdicts exactly as `strata_resolve_quarantine` allows them — stated, not derived, so
 * the UI can never offer one the server refuses. `correct` is not a shortcut to validated: it
 * returns the row to `pending`, and since pending no longer counts (E-7 cond.3) the KPI reads as
 * Missing until someone attests it. That is the point, so the modal says it rather than hiding it.
 */
type QuarantineVerdict = 'accept_with_exception' | 'correct' | 'reject';
const VERDICTS: Array<{ value: QuarantineVerdict; label: string; danger?: boolean; blurb: string }> = [
  {
    value: 'accept_with_exception',
    label: 'Accept with exception',
    blurb: 'The value COUNTS in official calculations once Strategy Office authorizes it. You cannot authorize an exception for a value you submitted yourself — the database enforces that.',
  },
  {
    value: 'correct',
    label: 'Correct the value',
    blurb: 'A corrected value is a NEW claim nobody has checked, so it returns to PENDING — not validated. Pending values do not count, so this KPI will read as Missing until someone attests the correction. That is correct, not a bug.',
  },
  {
    value: 'reject',
    label: 'Reject',
    danger: true,
    blurb: 'The value stays out of official calculations. Why it was quarantined is preserved.',
  },
];

/**
 * Quarantined values written by this run. Exported so the governed workflow can be tested directly:
 * rendering the whole page drags in the STRATA shell and would prove the shell, not this.
 */
export function QuarantineQueueSection({ actuals, kpiNameById, onResolved }: {
  actuals: StrataKpiActual[];
  kpiNameById: Map<string, string>;
  onResolved: () => void;
}) {
  const rolesQ = useStrataRoles();
  const canResolve = (rolesQ.data ?? []).some((r) => (QUARANTINE_ROLES as readonly string[]).includes(r));

  const [target, setTarget] = useState<StrataKpiActual | null>(null);
  const [verdict, setVerdict] = useState<QuarantineVerdict>('accept_with_exception');
  const [reason, setReason] = useState('');
  const [corrected, setCorrected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<StrataQuarantineResolution | null>(null);

  const correctedNumber = Number(corrected.trim());
  const correctedValid = corrected.trim() !== '' && Number.isFinite(correctedNumber);
  // Both requirements are stated here rather than surfaced as a server error: the RPC demands a
  // reason for every verdict and a corrected value for `correct`.
  const confirmBlocked = busy || reason.trim() === '' || (verdict === 'correct' && !correctedValid);

  const open = (a: StrataKpiActual) => {
    setTarget(a); setVerdict('accept_with_exception'); setReason(''); setCorrected('');
    setError(null); setOutcome(null);
  };

  const resolve = async () => {
    if (!target) return;
    setBusy(true); setError(null);
    try {
      const res = await kpiApi.resolveQuarantine(
        target.id, verdict, reason.trim(), verdict === 'correct' ? correctedNumber : undefined,
      );
      setOutcome(res);
      setTarget(null);
      onResolved();
    } catch (e) {
      // The RPC's refusal (SoD, wrong status, missing reason) surfaces verbatim — re-wording it
      // would lose the specific thing it named.
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const columns: Column<StrataKpiActual>[] = [
    {
      id: 'kpi', label: 'KPI', flex: true,
      cell: ({ row }) => {
        const name = kpiNameById.get(row.kpi_id) ?? null;
        return name
          ? <span style={{ ...bodyStyle, fontWeight: 600 }}>{name}</span>
          : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
    {
      id: 'value', label: 'Quarantined value', width: 18,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>,
    },
    {
      id: 'why', label: 'Why it was quarantined', width: 30,
      // Zero-assumption: no note recorded renders a dash, never an invented reason.
      cell: ({ row }) => (row.validation_note
        ? <span style={{ ...captionStyle, color: T.subtle }}>{row.validation_note}</span>
        : <span style={{ color: T.subtlest }}>—</span>),
    },
    {
      id: 'resolve', label: 'Resolution', width: 16,
      cell: ({ row }) => (canResolve
        ? (
          <Button spacing="compact" isDisabled={busy} testId={`strata-quarantine-resolve-${row.id}`} onClick={() => open(row)}>
            Resolve
          </Button>
        )
        : <span style={{ color: T.subtlest }}>—</span>),
    },
  ];

  const selected = VERDICTS.find((v) => v.value === verdict);

  return (
    <StrataPanel
      title="Quarantined values from this run"
      icon={<Database size={16} />}
      count={actuals.length}
      testId="strata-quarantine-queue"
    >
      <p style={{ ...captionStyle, margin: '0 0 var(--ds-space-150)' }}>
        A quarantined value is excluded from official calculations until it is resolved. Resolving one
        is a Strategy Office act and always requires a reason — the resolution has to be explainable later.
      </p>
      {!canResolve ? (
        // Rule 7: say why the verb is absent rather than leaving a silent gap.
        <p style={{ ...captionStyle, margin: '0 0 var(--ds-space-150)' }} data-testid="strata-quarantine-role-gate">
          Resolving a quarantined value requires the strategy_office role. Your roles cannot, so no
          resolution is offered here.
        </p>
      ) : null}
      {outcome ? (
        <div style={{ marginBottom: 'var(--ds-space-150)' }}>
          <SectionMessage
            appearance={outcome.counts_in_official_calculations ? 'success' : 'information'}
            title={`Resolved — now ${labelize(outcome.validation_status)}`}
          >
            <p style={{ margin: 0 }} data-testid="strata-quarantine-outcome">
              {outcome.counts_in_official_calculations
                ? 'This value now counts in official calculations.'
                : outcome.validation_status === 'pending'
                  // The honest consequence of `correct`, stated rather than hidden.
                  ? 'This value does NOT count yet: a corrected value is a new claim nobody has checked, so it returned to pending and the KPI reads as Missing until someone attests it.'
                  : 'This value does not count in official calculations.'}
            </p>
            {outcome.exception_reason ? (
              <p style={{ margin: 'var(--ds-space-050) 0 0' }}>Exception reason: {outcome.exception_reason}</p>
            ) : null}
          </SectionMessage>
        </div>
      ) : null}
      {actuals.length === 0 ? (
        <EmptyState
          size="compact"
          header="Nothing quarantined from this run"
          description="Quarantined values written by this run would appear here for Strategy Office resolution."
        />
      ) : (
        <JiraTable<StrataKpiActual>
          columns={columns}
          data={actuals}
          getRowId={(a) => a.id}
          showRowCount={false}
          ariaLabel="Quarantined values from this run"
        />
      )}

      <Modal isOpen={!!target} onClose={() => setTarget(null)} width="medium" testId="strata-quarantine-modal">
        <ModalHeader>
          <ModalTitle>
            {target ? `Resolve quarantine · ${kpiNameById.get(target.kpi_id) ?? 'KPI'}` : ''}
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{ display: 'flex', gap: 'var(--ds-space-100)', flexWrap: 'wrap', marginBottom: 'var(--ds-space-150)' }}>
            {VERDICTS.map((v) => (
              <Button
                key={v.value}
                spacing="compact"
                appearance={verdict === v.value ? (v.danger ? 'danger' : 'primary') : 'default'}
                testId={`strata-quarantine-verdict-${v.value}`}
                onClick={() => setVerdict(v.value)}
              >
                {v.label}
              </Button>
            ))}
          </div>
          <p style={{ ...captionStyle, color: T.subtle, margin: '0 0 var(--ds-space-150)' }} data-testid="strata-quarantine-verdict-blurb">
            {selected?.blurb}
          </p>
          {verdict === 'correct' ? (
            <div style={{ marginBottom: 'var(--ds-space-150)' }}>
              <Textfield
                value={corrected}
                onChange={(e) => setCorrected((e.target as HTMLInputElement).value)}
                placeholder="Corrected value (required)"
                aria-label="Corrected value"
                testId="strata-quarantine-corrected"
              />
            </div>
          ) : null}
          <Textfield
            value={reason}
            onChange={(e) => setReason((e.target as HTMLInputElement).value)}
            placeholder="Reason (required)"
            aria-label="Reason"
            testId="strata-quarantine-reason"
          />
          {error ? (
            <div style={{ marginTop: 'var(--ds-space-150)' }}>
              <SectionMessage appearance="error" title="Resolution rejected by the database">
                <p style={{ whiteSpace: 'pre-wrap' }} data-testid="strata-quarantine-error">{error}</p>
              </SectionMessage>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" isDisabled={busy} onClick={() => setTarget(null)}>Cancel</Button>
          <Button
            appearance={verdict === 'reject' ? 'danger' : 'primary'}
            isDisabled={confirmBlocked}
            testId="strata-quarantine-confirm"
            onClick={() => void resolve()}
          >
            {busy ? 'Resolving…' : 'Record resolution'}
          </Button>
        </ModalFooter>
      </Modal>
    </StrataPanel>
  );
}

// ── R4d · 24-hour import reversal (capability 12) ────────────────────────────
/**
 * ASK BEFORE OFFERING THE VERB: eligibility is fetched before Reverse is enabled, and EVERY
 * blocking reason is rendered. The RPC returns them all on purpose — telling a steward "locked
 * snapshot", then "issued board pack" after they fix it, misleads them twice.
 * Exported for the same reason as QuarantineQueueSection: test the section, not the shell.
 */
export function RunReversalSection({ run, onReversed }: { run: StrataUploadRun; onReversed: () => void }) {
  const rolesQ = useStrataRoles();
  const canReverse = (rolesQ.data ?? []).some((r) => (REVERSAL_ROLES as readonly string[]).includes(r));

  const [elig, setElig] = useState<StrataReversalEligibility | null>(null);
  const [eligError, setEligError] = useState<string | null>(null);
  const [eligLoading, setEligLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StrataRunReversal | null>(null);

  useEffect(() => {
    if (!canReverse) return undefined;
    let cancelled = false;
    setEligLoading(true); setEligError(null);
    lineageApi.runReversalEligibility(run.id)
      .then((e) => { if (!cancelled) setElig(e); })
      .catch((e) => { if (!cancelled) setEligError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setEligLoading(false); });
    return () => { cancelled = true; };
  }, [run.id, canReverse]);

  const reverse = async () => {
    setBusy(true); setError(null);
    try {
      const res = await lineageApi.reverseRun(run.id, reason.trim());
      setResult(res);
      setConfirming(false);
      onReversed();
    } catch (e) {
      // The server re-checks eligibility and raises with ALL reasons — surfaced verbatim so a
      // stale client gate cannot quietly become a fake success.
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <StrataPanel title="Reverse this import" icon={<RefreshCw size={16} />} testId="strata-reversal-panel">
      <p style={{ ...captionStyle, margin: '0 0 var(--ds-space-150)' }}>
        Reversal is supersession, not an offsetting entry. The original run and its actuals are kept and
        marked reversed; where a prior validated value exists it becomes effective again. No zero,
        negative or artificial measurement is ever created.
      </p>

      {!canReverse ? (
        <p style={{ ...captionStyle, margin: 0 }} data-testid="strata-reversal-role-gate">
          Reversing an import requires the strategy_office or data_steward role. Your roles cannot, so
          no reversal is offered here.
        </p>
      ) : eligLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--ds-space-300)' }}>
          <Spinner size="medium" />
        </div>
      ) : eligError ? (
        <SectionMessage appearance="error" title="Could not check whether this run can be reversed">
          <p style={{ whiteSpace: 'pre-wrap' }} data-testid="strata-reversal-elig-error">{eligError}</p>
        </SectionMessage>
      ) : elig ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-150)' }}>
          <div style={{ display: 'flex', gap: 'var(--ds-space-200)', flexWrap: 'wrap' }}>
            <span style={captionStyle}>
              Run type: {elig.run_type ? labelize(elig.run_type) : '—'}
            </span>
            <span style={captionStyle}>
              Completed: {elig.completed_at ? fmtDateTime(elig.completed_at) : '—'}
            </span>
            <span style={captionStyle} data-testid="strata-reversal-affected">
              {/* array_length() returns NULL for an empty set — a dash, never an assumed 0. */}
              Actuals it would reverse: {elig.affected_actuals ?? '—'}
            </span>
          </div>

          {elig.can_reverse ? (
            <SectionMessage appearance="success" title="This import can still be reversed">
              <p style={{ margin: 0 }}>Nothing blocks reversal. The database re-checks this before it acts.</p>
            </SectionMessage>
          ) : (
            // EVERY reason, not the first. Fixing one and being told the next is being misled twice.
            <SectionMessage
              appearance="warning"
              title={`Reversal is blocked by ${elig.blocking_reasons.length} reason${elig.blocking_reasons.length === 1 ? '' : 's'}`}
            >
              <ul style={{ margin: 'var(--ds-space-100) 0 0', paddingLeft: 'var(--ds-space-250)' }} data-testid="strata-reversal-blockers">
                {elig.blocking_reasons.map((r) => (
                  <li key={r} style={{ marginBottom: 'var(--ds-space-075)' }}>{r}</li>
                ))}
              </ul>
            </SectionMessage>
          )}

          <div>
            <Button
              appearance="danger"
              spacing="compact"
              isDisabled={busy || !elig.can_reverse}
              testId="strata-reverse-run"
              onClick={() => { setReason(''); setError(null); setConfirming(true); }}
            >
              Reverse import
            </Button>
          </div>
        </div>
      ) : null}

      {result ? (
        <div style={{ marginTop: 'var(--ds-space-150)' }}>
          <SectionMessage appearance="success" title="Import reversed">
            <ul style={{ margin: 'var(--ds-space-100) 0 0', paddingLeft: 'var(--ds-space-250)' }}>
              <li>{result.actuals_reversed} actual{result.actuals_reversed === 1 ? '' : 's'} marked reversed</li>
              <li>{result.prior_values_restored} prior validated value{result.prior_values_restored === 1 ? '' : 's'} effective again</li>
              {/* NOT a failure: it means there was no prior validated value to restore. Never a 0-wash. */}
              <li data-testid="strata-reversal-left-empty">
                {result.left_without_effective_value} left with no effective value — no prior validated
                value existed to restore, so they were left empty rather than zeroed
              </li>
              <li>{result.recalculated} unlocked result{result.recalculated === 1 ? '' : 's'} recalculated</li>
            </ul>
            {/* The server's own statement of what it did — verbatim, never re-worded. */}
            <p style={{ margin: 'var(--ds-space-100) 0 0' }} data-testid="strata-reversal-note">{result.note}</p>
          </SectionMessage>
        </div>
      ) : null}

      <Modal isOpen={confirming} onClose={() => setConfirming(false)} width="small" testId="strata-reversal-modal">
        <ModalHeader><ModalTitle>Reverse import · {run.run_key}</ModalTitle></ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 var(--ds-space-150)', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            A compensating reversal run is recorded against this one. This run is preserved and marked
            reversed — nothing is deleted and no offsetting number is written. Where a KPI has no prior
            validated value, it is left with no effective value rather than zeroed.
          </p>
          <Textfield
            value={reason}
            onChange={(e) => setReason((e.target as HTMLInputElement).value)}
            placeholder="Reason (required)"
            aria-label="Reversal reason"
            testId="strata-reversal-reason"
          />
          {error ? (
            <div style={{ marginTop: 'var(--ds-space-150)' }}>
              <SectionMessage appearance="error" title="Reversal rejected by the database">
                <p style={{ whiteSpace: 'pre-wrap' }} data-testid="strata-reversal-error">{error}</p>
              </SectionMessage>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" isDisabled={busy} onClick={() => setConfirming(false)}>Cancel</Button>
          <Button
            appearance="danger"
            // The RPC demands a reason; stated here rather than spent on a round trip.
            isDisabled={busy || reason.trim() === ''}
            testId="strata-reversal-confirm"
            onClick={() => void reverse()}
          >
            {busy ? 'Reversing…' : 'Reverse import'}
          </Button>
        </ModalFooter>
      </Modal>
    </StrataPanel>
  );
}

// ── Run detail ───────────────────────────────────────────────────────────────
type RunDetailQuery = ReturnType<typeof useRunDetail>;

function RunDetailSection({ runKey, detail }: { runKey: string; detail: RunDetailQuery }) {
  const navigate = useNavigate();
  const { activePeriod } = useStrataContext();
  const invalidate = useInvalidateStrata();
  const kpisQ = useKpis();       // downstream dependents (P4-D4) via strata_kpis.data_source_id
  const sourcesQ = useDataSources(); // source name for the contract/lineage rail
  // DL-DEF-005: resolve reversal relationships to run keys and the actor to a governed name.
  const allRunsQ = useUploadRuns();
  const profilesQ = useProfileNames();
  const runKeyById = useMemo(
    () => new Map((allRunsQ.data ?? []).map((r) => [r.id, r.run_key] as const)),
    [allRunsQ.data],
  );
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
  // R4c — the quarantine queue for THIS run, from the same period-scoped fetch. Actuals this run
  // wrote into other periods are not resolvable from this view (same limit as attestation above).
  const quarantinedActuals = useMemo(
    () => ((actualsQ.data ?? []) as StrataKpiActual[])
      .filter((a) => runId != null && a.upload_run_id === runId && a.validation_status === 'quarantined'),
    [actualsQ.data, runId],
  );
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

  // ── Anchor-09 derivations ──────────────────────────────────────────────────
  const lifecycle = runLifecycleSteps(run);
  const clusters = clusterErrors(results);
  const dependentKpiNames = (kpisQ.data ?? [])
    .filter((k) => run.data_source_id != null && k.data_source_id === run.data_source_id)
    .map((k) => k.name);
  // Name lookup for the quarantine queue — a KPI absent from the list renders a dash, never a guess.
  const kpiNameById = new Map((kpisQ.data ?? []).map((k) => [k.id, k.name] as const));
  const sourceName = run.data_source_id ? (sourcesQ.data ?? []).find((s) => s.id === run.data_source_id)?.name ?? null : null;
  const rejectedRows = rows.filter((r) => r.validation_status === 'rejected');
  // DL-DEF-005: a reversal run is terminal evidence — it never offers Promote.
  const isReversalRun = run.run_type === 'reversal';
  const revMeta = reversalDisplayMeta(run, runKeyById, profilesQ.data);
  /** Run-key link when resolvable; raw id (honest evidence) when not. */
  const runRef = (id: string | null, key: string | null, testId: string) =>
    id == null ? <span style={{ color: T.text }}>—</span>
    : key == null ? <span style={{ ...mono, color: T.text }}>{id}</span>
    : (
      <Button appearance="subtle-link" spacing="none" onClick={() => navigate(Routes.strata.run(key))} testId={testId}>
        {key}
      </Button>
    );
  const promoteReady = hasIngestRole && run.status === 'completed' && !isReversalRun;
  const tileNum: React.CSSProperties = { fontSize: 'var(--ds-font-size-400)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' };
  /**
   * Client-side CSV of the rejected rows with their exact errors — no server call.
   * DL-DEF-006: cells are quoted CSV; non-numeric cells starting with = + - @ are
   * apostrophe-prefixed so a spreadsheet never executes them as formulas. Only
   * template columns + validation findings are exported — no restricted fields.
   */
  const downloadRejected = () => {
    const csvCell = (v: unknown): string => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s) && !/^-?([0-9]+([.][0-9]*)?|[.][0-9]+)$/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const errsByRow = new Map<string, { field: string; rule: string; message: string; fix: string }[]>();
    for (const res of results) {
      if (!res.staging_row_id) continue;
      const list = errsByRow.get(res.staging_row_id) ?? [];
      list.push({ field: res.field_name ?? '', rule: res.error_code, message: res.message, fix: res.suggested_fix ?? '' });
      errsByRow.set(res.staging_row_id, list);
    }
    const header = ['row_number', ...parsedKeys, 'field', 'rule', 'error', 'fix'].map(csvCell).join(',');
    const lines = rejectedRows.map((r) => {
      const errs = errsByRow.get(r.id) ?? [];
      return [
        r.row_number,
        ...parsedKeys.map((k) => r.raw?.[k] ?? ''),
        errs.map((e) => e.field).join(' | '),
        errs.map((e) => e.rule).join(' | '),
        errs.map((e) => e.message).join(' | '),
        errs.map((e) => e.fix).join(' | '),
      ].map(csvCell).join(',');
    });
    const blob = new Blob([[header, ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${run.run_key}-rejected.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Deferred revoke: a synchronous revoke can abort the download in Chromium.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

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
      </div>

      {/* Run lifecycle (anchor 09): the steward's 7-step journey */}
      <div style={{ padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, boxShadow: 'var(--ds-shadow-raised)', overflowX: 'auto' }} data-testid="strata-run-lifecycle">
        <StrataLifecycleStepper variant="full" steps={lifecycle} ariaLabel={`Lifecycle for ${run.run_key}`} />
      </div>

      {/* 2-col: validation + commit (left) · downstream impact + lineage rail (right) */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Validation summary — 2-way (P4-D3: strata_validate_run emits valid/rejected only) + clustered errors */}
          <StrataPanel
            title="Validation summary"
            icon={<CheckCircle2 size={16} />}
            noPadding
            testId="strata-validation-summary"
            actions={<span style={captionStyle}>{run.row_count_raw.toLocaleString()} rows received</span>}
          >
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ flex: 1, padding: 16, borderRight: `1px solid ${T.border}` }}>
                <div style={{ ...tileNum, color: 'var(--ds-text-success)' }}>{run.row_count_valid.toLocaleString()}</div>
                <div style={captionStyle}>Accepted — written to staging</div>
              </div>
              <div style={{ flex: 1, padding: 16 }}>
                <div style={{ ...tileNum, color: 'var(--ds-text-danger)' }}>{run.row_count_rejected.toLocaleString()}</div>
                <div style={captionStyle}>Rejected — need a corrected file</div>
              </div>
            </div>
            {clusters.length === 0 ? (
              <div style={{ padding: 16 }}>
                {run.row_count_rejected > 0 ? (
                  <EmptyState size="compact" header="No per-row error detail" description={`${run.row_count_rejected} row${run.row_count_rejected === 1 ? ' was' : 's were'} rejected, but this run recorded no per-row validation detail.`} />
                ) : (
                  <EmptyState size="compact" header="No validation errors" description="Every staged row passed validation." />
                )}
              </div>
            ) : (
              clusters.map((c) => (
                <div key={c.key} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, alignItems: 'flex-start' }} data-testid={`strata-cluster-${c.code}`}>
                  <span style={{ flexShrink: 0 }}>
                    <StatusLozenge status={c.severity} label={`${c.count} ${c.count === 1 ? 'row' : 'rows'}`} appearance={c.severity === 'error' ? 'removed' : 'moved'} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...bodyStyle, fontWeight: 600 }}>{labelize(c.code)}{c.field ? ` · ${c.field}` : ''}</div>
                    <div style={{ ...captionStyle, color: T.subtle, marginTop: 4 }}>{c.message}</div>
                    {c.fix ? <div style={{ ...captionStyle, color: T.subtle, marginTop: 4 }}>Fix: {c.fix}</div> : null}
                  </div>
                </div>
              ))
            )}
          </StrataPanel>

          {/* DL-DEF-005: a reversal run is terminal compensating evidence — no Promote surface. */}
          {isReversalRun ? (
            <StrataPanel title="Compensating reversal" icon={<Upload size={16} />} testId="strata-reversal-panel">
              <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', gap: 8, ...captionStyle }}>
                <span style={{ color: T.subtlest }}>Run type</span><span style={{ color: T.text }}>Reversal (terminal — nothing to promote)</span>
                <span style={{ color: T.subtlest }}>Reverses run</span>
                <span>{runRef(run.reverses_run_id, revMeta.reversesKey, 'strata-reversal-reverses-link')}</span>
                <span style={{ color: T.subtlest }}>Reason</span><span style={{ color: T.text }}>{run.reversal_reason ?? '—'}</span>
                <span style={{ color: T.subtlest }}>Actor</span>
                <span style={revMeta.actorName ? { color: T.text } : { ...mono, color: T.text }} data-testid="strata-reversal-actor">{revMeta.actorName ?? run.initiated_by ?? '—'}</span>
                <span style={{ color: T.subtlest }}>Completed</span><span style={{ color: T.text }}>{run.completed_at ? fmtDateTime(run.completed_at) : '—'}</span>
              </div>
            </StrataPanel>
          ) : (
          <StrataPanel title="Promote to canonical" icon={<Upload size={16} />} testId="strata-commit-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...bodyStyle, fontWeight: 600 }}>Promote {run.row_count_valid.toLocaleString()} accepted row{run.row_count_valid === 1 ? '' : 's'} to canonical</div>
                <div style={{ ...captionStyle, color: T.subtle, marginTop: 4 }}>
                  Writes pending-attestation actuals — not yet committed. A promoted run can be reversed
                  within 24 hours, before its numbers are locked or issued — see "Reverse this import"
                  below for whether this one still can. The {run.row_count_rejected} rejected row{run.row_count_rejected === 1 ? '' : 's'} never block the rest.
                </div>
              </div>
              {rejectedRows.length > 0 ? (
                <Button appearance="default" spacing="compact" onClick={downloadRejected} testId="strata-download-rejected">
                  Download rejected ({rejectedRows.length})
                </Button>
              ) : null}
              {promoteReady ? (
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
                  {actionBusy ? 'Promoting…' : 'Promote accepted rows'}
                </Button>
              ) : null}
            </div>
          </StrataPanel>
          )}
        </div>

        {/* Downstream impact + contract/lineage rail */}
        <aside style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <StrataPanel title="What depends on this run" icon={<Network size={16} />} testId="strata-run-downstream">
            {dependentKpiNames.length === 0 ? (
              <p style={{ ...captionStyle, margin: 0 }}>No KPIs are backward-linked to this run's source. Scorecard and snapshot forward impact is not tracked.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dependentKpiNames.map((n) => (
                  <span key={n} style={{ ...bodyStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Database size={12} /> {n}</span>
                ))}
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'var(--ds-background-warning)', ...captionStyle, color: 'var(--ds-text-warning)', lineHeight: 1.5 }}>
                  Until promoted, {dependentKpiNames.length} KPI{dependentKpiNames.length === 1 ? '' : 's'} show a missing actual for this period. Scorecard/snapshot forward impact is not tracked.
                </div>
              </div>
            )}
          </StrataPanel>
          <StrataPanel title="Contract & lineage" icon={<Network size={16} />} testId="strata-run-contract">
            <div style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr)', gap: 8, ...captionStyle }}>
              <span style={{ color: T.subtlest }}>Source</span><span style={{ color: T.text }}>{sourceName ?? '—'}</span>
              <span style={{ color: T.subtlest }}>Template</span><span style={{ color: T.text }}>{run.template_version != null ? `v${run.template_version}` : '—'}</span>
              <span style={{ color: T.subtlest }}>Run key</span><span style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{run.run_key}</span>
              <span style={{ color: T.subtlest }}>Channel</span><span style={{ color: T.text }}>{isReversalRun ? 'System (reversal)' : labelize(run.channel)}</span>
              <span style={{ color: T.subtlest }}>Run type</span><span style={{ color: T.text }}>{labelize(run.run_type ?? 'import')}</span>
              {run.reverses_run_id ? (
                <>
                  <span style={{ color: T.subtlest }}>Reverses</span>
                  <span>{runRef(run.reverses_run_id, revMeta.reversesKey, 'strata-lineage-reverses-link')}</span>
                </>
              ) : null}
              {run.reversed_by_run_id ? (
                <>
                  <span style={{ color: T.subtlest }}>Reversed by</span>
                  <span>{runRef(run.reversed_by_run_id, revMeta.reversedByKey, 'strata-lineage-reversed-by-link')}</span>
                </>
              ) : null}
              {run.reversal_reason ? (
                <>
                  <span style={{ color: T.subtlest }}>Reason</span>
                  <span style={{ color: T.text }}>{run.reversal_reason}</span>
                </>
              ) : null}
              {run.file_hash ? (
                <>
                  <span style={{ color: T.subtlest }}>Checksum</span>
                  <span style={{ ...mono, color: T.text }}>{run.file_hash.slice(0, 12)}</span>
                </>
              ) : null}
            </div>
          </StrataPanel>
        </aside>
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

      {/* R4c — quarantined values this run wrote, and their Strategy Office resolution */}
      <QuarantineQueueSection
        actuals={quarantinedActuals}
        kpiNameById={kpiNameById}
        onResolved={() => { invalidate(); void actualsQ.refetch(); }}
      />

      {/* R4d — 24-hour reversal. Eligibility is asked BEFORE the verb is offered. */}
      <RunReversalSection run={run} onReversed={() => { invalidate(); void actualsQ.refetch(); }} />

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

// ── Source detail (DL-DEF-001) ───────────────────────────────────────────────
/**
 * Registered-source drill-down: identity/owner/status, governed contract version,
 * freshness + last success/failure, import-run history, append-only mapping
 * memory, and downstream KPI dependents with owning-module navigation.
 * Zero-assumption: anything not recorded renders '—' / an explicit empty state.
 */
function SourceDetailSection({ sourceSlug }: { sourceSlug: string }) {
  const navigate = useNavigate();
  const sourcesQ = useDataSources();
  const runsQ = useUploadRuns();
  const kpisQ = useKpis();
  const profilesQ = useProfileNames();
  const source = (sourcesQ.data ?? []).find((s) => s.slug === sourceSlug) ?? null;
  const summary = useMemo(
    () => buildSourceRows(sourcesQ.data ?? [], runsQ.data ?? [], kpisQ.data ?? [])
      .find((r) => r.source.slug === sourceSlug) ?? null,
    [sourcesQ.data, runsQ.data, kpisQ.data, sourceSlug],
  );
  const sourceRuns = useMemo(
    () => (runsQ.data ?? []).filter((r) => r.data_source_id === source?.id),
    [runsQ.data, source?.id],
  );
  const lastSuccess = sourceRuns.find((r) => r.status === 'completed') ?? null;
  const lastFailure = sourceRuns.find((r) => r.status === 'failed') ?? null;
  const mappingQ = useQuery({
    queryKey: ['strata', 'mapping-memory', source?.id],
    queryFn: () => lineageApi.mappingMemoryForSource(source!.id),
    enabled: !!source,
    staleTime: 30_000,
  });
  const dependents = useMemo(
    () => (kpisQ.data ?? []).filter((k) => k.data_source_id === source?.id),
    [kpisQ.data, source?.id],
  );
  const nameOf = (id: string | null) => (id ? profilesQ.data?.get(id)?.name ?? null : null);

  if (sourcesQ.isLoading || runsQ.isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="large" /></div>;
  }
  if (!source) {
    return (
      <EmptyState
        header="Source not found"
        description={`No registered data source matches "${sourceSlug}".`}
        primaryAction={<Button onClick={() => navigate(Routes.strata.data())}>Back to pipeline</Button>}
      />
    );
  }

  const runColumns: Column<StrataUploadRun>[] = [
    {
      id: 'run', label: 'Run', width: 16,
      cell: ({ row }) => <span style={{ ...captionStyle, color: T.subtle, fontWeight: 600 }}>{row.run_key}</span>,
    },
    {
      id: 'started', label: 'Started', width: 16,
      cell: ({ row }) => <span style={{ ...captionStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(row.started_at)}</span>,
    },
    {
      id: 'actor', label: 'Actor', width: 16,
      cell: ({ row }) => <span style={captionStyle}>{nameOf(row.initiated_by) ?? row.initiated_by ?? '—'}</span>,
    },
    {
      id: 'counts', label: 'Rows', width: 14,
      cell: ({ row }) => <span style={{ ...captionStyle, fontVariantNumeric: 'tabular-nums' }}>{row.row_count_valid} valid · {row.row_count_rejected} rejected</span>,
    },
    {
      id: 'status', label: 'Status', width: 12,
      cell: ({ row }) => <StatusLozenge status={row.status} label={labelize(row.status)} appearance={runStatusAppearance(row.status)} />,
    },
  ];

  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '130px minmax(0,1fr)', gap: 8, ...captionStyle };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-testid="strata-source-detail">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ flex: '2 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <StrataPanel title="Source identity" icon={<Database size={16} />} testId="strata-source-identity">
            <div style={grid}>
              <span style={{ color: T.subtlest }}>Name</span><span style={{ ...bodyStyle, fontWeight: 600 }}>{source.name}</span>
              <span style={{ color: T.subtlest }}>Type</span><span style={{ color: T.text }}>{labelize(source.system_type)}</span>
              <span style={{ color: T.subtlest }}>Owner</span><span style={{ color: T.text }}>{nameOf(source.owner_id) ?? '—'}</span>
              <span style={{ color: T.subtlest }}>Status</span>
              <span>{summary ? <StatusLozenge status={summary.statusLabel.toLowerCase()} label={summary.statusLabel} appearance={summary.statusAppearance} /> : <StatusLozenge status={source.status} label={labelize(source.status)} appearance="default" />}</span>
              <span style={{ color: T.subtlest }}>Contract</span>
              <span style={{ color: T.text }}>{summary?.contractVersion != null ? `Template v${summary.contractVersion} (last run)` : '— no run has recorded a template version'}</span>
            </div>
          </StrataPanel>
          <StrataPanel title="Freshness" icon={<RefreshCw size={16} />} testId="strata-source-freshness">
            <div style={grid}>
              <span style={{ color: T.subtlest }}>Refresh rule</span><span style={{ color: T.text }}>{source.refresh_cadence ?? '— not recorded'}</span>
              <span style={{ color: T.subtlest }}>Last activity</span>
              <span style={{ color: T.text }}>{summary?.lastRunAt ? `${fmtDateTime(summary.lastRunAt)}${summary.freshnessDays != null ? ` · ${summary.freshnessDays}d ago` : ''}` : 'never run'}</span>
              <span style={{ color: T.subtlest }}>Last success</span>
              <span style={{ color: T.text }}>{lastSuccess ? `${lastSuccess.run_key} · ${fmtDateTime(lastSuccess.started_at)}` : '—'}</span>
              <span style={{ color: T.subtlest }}>Last failure</span>
              <span style={{ color: T.text }}>{lastFailure ? `${lastFailure.run_key} · ${fmtDateTime(lastFailure.started_at)}${lastFailure.error_summary ? ` · ${lastFailure.error_summary}` : ''}` : '—'}</span>
              {summary?.statusLabel === 'Stale' ? (
                <>
                  <span style={{ color: T.subtlest }}>Stale reason</span>
                  <span style={{ color: 'var(--ds-text-warning)' }}>No successful load within the expected cadence{source.refresh_cadence ? ` (${source.refresh_cadence})` : ''}.</span>
                </>
              ) : null}
            </div>
          </StrataPanel>
          <StrataPanel title="Import runs" icon={<Upload size={16} />} count={sourceRuns.length} noPadding testId="strata-source-runs">
            {sourceRuns.length === 0 ? (
              <div style={{ padding: 16 }}>
                <EmptyState size="compact" header="No import runs" description="This source has never been loaded." />
              </div>
            ) : (
              <JiraTable<StrataUploadRun>
                columns={runColumns}
                data={sourceRuns}
                getRowId={(r) => r.id}
                showRowCount={false}
                ariaLabel={`Import runs for ${source.name}`}
                onRowClick={(r) => navigate(Routes.strata.run(r.run_key))}
              />
            )}
          </StrataPanel>
        </div>
        <aside style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <StrataPanel title="Mapping memory" icon={<Network size={16} />} count={(mappingQ.data ?? []).length} testId="strata-source-mapping-memory">
            {(mappingQ.data ?? []).length === 0 ? (
              <p style={{ ...captionStyle, margin: 0 }}>No column-mapping confirmations recorded for this source.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(mappingQ.data ?? []).map((m) => (
                  <div key={m.id} style={{ minWidth: 0 }}>
                    <span style={{ ...bodyStyle, display: 'block' }}><span style={mono}>{m.source_key}</span> → <span style={mono}>{m.target_column}</span></span>
                    <span style={captionStyle}>{nameOf(m.confirmed_by) ?? '—'} · {fmtDateTime(m.confirmed_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </StrataPanel>
          <StrataPanel title="Downstream KPI dependents" icon={<Network size={16} />} count={dependents.length} testId="strata-source-dependents">
            {dependents.length === 0 ? (
              <p style={{ ...captionStyle, margin: 0 }}>No KPIs are backward-linked to this source. Scorecard/snapshot forward impact is not tracked.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dependents.map((k) => (
                  k.slug ? (
                    <Button
                      key={k.id}
                      appearance="subtle-link"
                      spacing="none"
                      onClick={() => navigate(Routes.strata.kpi(k.slug!))}
                      testId={`strata-source-dependent-${k.slug}`}
                    >
                      {k.name}
                    </Button>
                  ) : (
                    <span key={k.id} style={bodyStyle}>{k.name}</span>
                  )
                ))}
                <span style={{ ...captionStyle, marginTop: 4 }}>Scorecard/snapshot forward impact is not tracked.</span>
              </div>
            )}
          </StrataPanel>
        </aside>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataDataPipelinePage() {
  const { runKey, sourceSlug } = useParams<{ runKey?: string; sourceSlug?: string }>();
  const navigate = useNavigate();
  // Lifted to page level so the pipeline stepper reflects the viewed run's state.
  const detail = useRunDetail(runKey);

  return (
    <StrataPageShell
      trail={runKey || sourceSlug ? [
        { text: 'Data pipeline', href: Routes.strata.data() },
        { text: runKey ?? sourceSlug ?? '' },
      ] : undefined}
      docTitle={runKey ?? sourceSlug ?? undefined}
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
      {/* Run detail renders its own anchor-09 lifecycle stepper; landing carries none. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {runKey ? (
          <RunDetailSection runKey={runKey} detail={detail} />
        ) : sourceSlug ? (
          <SourceDetailSection sourceSlug={sourceSlug} />
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
