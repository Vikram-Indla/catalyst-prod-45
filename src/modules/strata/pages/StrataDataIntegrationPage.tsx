/**
 * STRATA Data & integration domain (governed control plane, anchor 26 · P5-D3).
 * Route: /strata/admin/data. Left section-nav: Sources (read-only registry) +
 * Upload templates (governed contracts, reused section).
 *
 * R3 (2026-07-17) — the read-only scoping below is now STALE and has been lifted.
 * P5-D3 deferred source authoring because "strata_data_sources is status-only with
 * NO admin authoring RPC". That was true then. `strata_set_data_source_status` and
 * `strata_data_source_blast_radius` now exist (migration 20260717150000), so the
 * lifecycle (registered → active → suspended → retired) and the dependents-impact
 * check are real, governed flows here — not labelled gaps.
 * The per-source "feeds" mapping still has no backing, so that column stays omitted
 * rather than fabricated (zero-assumption).
 *
 * Freshness (slice B2, task_70e821ad): `strata_data_sources` has no
 * last-refresh column — but that was never the question. Freshness is DERIVED
 * from `max(strata_upload_runs.completed_at)` per `data_source_id`, which is
 * exactly how the Data & Lineage landing already does it (P4-D8). Same
 * derivation, same `StrataFreshnessGlyph`, so the two surfaces agree. No
 * schema change was needed; the "column gap" was a wrong conclusion.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, EmptyState, Lozenge, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle,
  SectionMessage, Spinner, Textfield,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import { ArrowLeft, Database, Upload } from '@/lib/atlaskit-icons';
import {
  useDataSources, useInvalidateStrata, useProfileNames, useStrataRoles, useUploadRuns,
} from '@/modules/strata/hooks/useStrata';
import { lineageApi } from '@/modules/strata/domain';
import { StrataFreshnessGlyph, StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { labelize } from '@/modules/strata/components/format';
import { UploadTemplatesSection } from './StrataAdminConfigPage';
import type { StrataBlastRadius, StrataBlastRadiusItem, StrataDataSource } from '@/modules/strata/types';

type OnError = (msg: string | null) => void;

const metaStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtle };
const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: '0 0 12px' };

const SYSTEM_TYPE_LABEL: Record<StrataDataSource['system_type'], string> = {
  excel: 'Excel upload', jira: 'Jira', manual: 'Manual', api: 'API', erp: 'ERP', bi: 'BI',
};
const SOURCE_STATUS: Record<StrataDataSource['status'], LozengeAppearance> = {
  active: 'success', registered: 'default', suspended: 'moved', retired: 'removed',
};

const NAV = [
  { key: 'sources', label: 'Sources', icon: Database },
  { key: 'templates', label: 'Upload templates', icon: Upload },
] as const;

/**
 * R3 lifecycle transitions, exactly as the RPC allows them. Stated here rather than derived so the
 * UI can never offer a transition the server refuses: registered→active|retired ·
 * active→suspended|retired · suspended→active|retired · retired is terminal.
 */
const NEXT_STATUS: Record<StrataDataSource['status'], Array<{ to: StrataDataSource['status']; label: string; appearance?: 'danger' | 'warning' }>> = {
  registered: [{ to: 'active', label: 'Validate & activate' }, { to: 'retired', label: 'Retire', appearance: 'danger' }],
  active: [{ to: 'suspended', label: 'Suspend', appearance: 'warning' }, { to: 'retired', label: 'Retire', appearance: 'danger' }],
  suspended: [{ to: 'active', label: 'Resume' }, { to: 'retired', label: 'Retire', appearance: 'danger' }],
  retired: [],
};

/**
 * Dependents-impact panel (R3). Renders the RPC's three classes verbatim — including its
 * `coverage_note`, because "no historical impact" is NOT proof a source was uninvolved: manual
 * actuals carry no run lineage. Hiding that would turn an honest lower bound into a false all-clear.
 */
// ADS space tokens, not px — the audit gate counts new hardcoded px, and shared.tsx already
// established var(--ds-space-*) as the primitive here.
const LIST_STYLE: React.CSSProperties = {
  margin: 'var(--ds-space-100) 0 0', paddingLeft: 'var(--ds-space-250)',
};

function BlastRadiusPanel({ blast }: { blast: StrataBlastRadius }) {
  const Row = ({ item }: { item: StrataBlastRadiusItem }) => (
    <li style={{ marginBottom: 'var(--ds-space-075)' }}>
      <span style={{ ...bodyStyle, fontWeight: 600 }}>{item.name ?? item.snapshot_key ?? item.id}</span>
      {item.status ? <span style={metaStyle}> · {labelize(item.status)}</span> : null}
      {item.reason ? <div style={metaStyle}>{item.reason}</div> : null}
    </li>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-testid="strata-source-blast-radius">
      {blast.blocking.length > 0 ? (
        <SectionMessage appearance="error" title={`Retirement is blocked by ${blast.blocking.length} approved KPI(s)`}>
          <ul style={LIST_STYLE}>{blast.blocking.map((i) => <Row key={i.id} item={i} />)}</ul>
        </SectionMessage>
      ) : (
        <SectionMessage appearance="success" title="No approved KPI depends on this source">
          <p style={{ margin: 0 }}>Nothing blocks retirement.</p>
        </SectionMessage>
      )}
      {blast.migration.length > 0 ? (
        <SectionMessage appearance="warning" title={`${blast.migration.length} KPI(s) should be re-pointed`}>
          <ul style={LIST_STYLE}>{blast.migration.map((i) => <Row key={i.id} item={i} />)}</ul>
        </SectionMessage>
      ) : null}
      {blast.historical.length > 0 ? (
        <SectionMessage appearance="information" title={`${blast.historical.length} locked snapshot(s) used this source — preserved, not blocking`}>
          <ul style={LIST_STYLE}>{blast.historical.map((i) => <Row key={i.id} item={i} />)}</ul>
        </SectionMessage>
      ) : null}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={metaStyle}>Upload runs: {blast.upload_runs ?? 0}</span>
        <span style={metaStyle}>Actuals from this source: {blast.kpi_actuals_from_source}</span>
        <span style={metaStyle}>Calculated values: {blast.calculated_values_from_source}</span>
      </div>
      {/* The RPC's own honesty about its blind spot — rendered, never summarised away. */}
      <p style={{ ...captionStyle, margin: 0 }} data-testid="strata-source-coverage-note">{blast.coverage_note}</p>
    </div>
  );
}

// ── Sources registry (governed lifecycle, R3) ────────────────────────────────
// Exported so the governed lifecycle can be tested directly, mirroring ScorecardModelsSection.
// Rendering the whole page in a test drags in the STRATA shell and proves the shell, not this.
export function SourcesRegistry({ onError }: { onError: OnError }) {
  const q = useDataSources();
  const profiles = useProfileNames();
  const runsQ = useUploadRuns();
  const roles = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const list = q.data ?? [];
  // Mirrors the RPC's role gate exactly — the server is the boundary; this only avoids offering a
  // verb it would refuse.
  const canGovern = (roles.data ?? []).some((r) => r === 'strategy_office' || r === 'data_steward' || r === 'strata_admin');

  const [impact, setImpact] = useState<{ source: StrataDataSource; blast: StrataBlastRadius } | null>(null);
  const [pending, setPending] = useState<{ source: StrataDataSource; to: StrataDataSource['status'] } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const openImpact = async (source: StrataDataSource) => {
    setBusy(true); onError(null);
    try {
      setImpact({ source, blast: await lineageApi.dataSourceBlastRadius(source.id) });
    } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const applyStatus = async () => {
    if (!pending) return;
    setBusy(true); onError(null);
    try {
      await lineageApi.setDataSourceStatus(pending.source.id, pending.to, reason.trim() || undefined);
      invalidate();
      setPending(null); setReason(''); setImpact(null);
    } catch (e) {
      // The RPC's refusal (e.g. "cannot retire: 3 approved KPI(s)… Blocking: …") is surfaced
      // verbatim — it already names the blockers, so re-wording it would lose them.
      onError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const ownerName = (id: string | null): string | null => (id ? profiles.data?.get(id)?.name ?? null : null);

  // B2 / task_70e821ad: last refresh = max(completed_at) of the source's runs.
  // Same derivation as the Data & Lineage landing (P4-D8) so the two surfaces
  // never disagree about how fresh a source is. Sources with no completed run
  // resolve to null → the glyph renders "—" rather than inventing a date.
  const lastRunBySource = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of runsQ.data ?? []) {
      if (!r.data_source_id || !r.completed_at) continue;
      const prev = m.get(r.data_source_id);
      if (!prev || r.completed_at > prev) m.set(r.data_source_id, r.completed_at);
    }
    return m;
  }, [runsQ.data]);

  const columns: Column<StrataDataSource>[] = [
    {
      id: 'source', label: 'Source', flex: true,
      cell: ({ row }) => {
        const owner = ownerName(row.owner_id);
        const sub = [owner ? `owner ${owner}` : null, row.refresh_cadence ? labelize(row.refresh_cadence) : null]
          .filter(Boolean).join(' · ');
        return (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.name}</span>
            {sub ? <span style={metaStyle}>{sub}</span> : null}
          </span>
        );
      },
    },
    {
      id: 'kind', label: 'Kind', width: 16,
      cell: ({ row }) => <span style={metaStyle}>{SYSTEM_TYPE_LABEL[row.system_type] ?? labelize(row.system_type)}</span>,
    },
    {
      id: 'freshness', label: 'Last refresh', width: 16,
      cell: ({ row }) => (
        <StrataFreshnessGlyph
          latest={lastRunBySource.get(row.id) ?? null}
          testId={`strata-data-source-fresh-${row.id}`}
        />
      ),
    },
    {
      id: 'status', label: 'Status', width: 20,
      cell: ({ row }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusLozenge status={row.status} label={labelize(row.status)} appearance={SOURCE_STATUS[row.status] ?? 'default'} />
          {row.health ? <span style={metaStyle}>{labelize(row.health)}</span> : null}
        </span>
      ),
    },
    {
      id: 'actions', label: 'Governance', width: 30,
      cell: ({ row }) => {
        const next = NEXT_STATUS[row.status] ?? [];
        if (!canGovern) return <span style={metaStyle}>—</span>;
        if (row.status === 'retired') {
          // Terminal by rule (the RPC refuses any transition out of retired). Say so rather than
          // rendering a row of dead buttons.
          return <span style={metaStyle} data-testid={`strata-source-terminal-${row.id}`}>Retired — terminal</span>;
        }
        return (
          <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
            <Button
              spacing="compact" appearance="subtle" isDisabled={busy}
              testId={`strata-source-impact-${row.id}`}
              onClick={() => void openImpact(row)}
            >
              Dependents
            </Button>
            {next.map((n) => (
              <Button
                key={n.to}
                spacing="compact"
                appearance={n.appearance === 'danger' ? 'danger' : n.appearance === 'warning' ? 'warning' : 'default'}
                isDisabled={busy}
                testId={`strata-source-${n.to}-${row.id}`}
                onClick={() => { setReason(''); setPending({ source: row, to: n.to }); }}
              >
                {n.label}
              </Button>
            ))}
          </span>
        );
      },
    },
  ];

  return (
    <StrataPanel
      title="Registered sources"
      icon={<Database size={16} />}
      count={list.length}
      testId="strata-data-sources"
      actions={canGovern ? null : <Lozenge appearance="new">Read-only for your role</Lozenge>}
    >
      <p style={captionStyle}>
        The systems STRATA is allowed to believe — each with an owner, because data problems are owned problems.
        Retiring a source runs a dependents-impact check first: an approved KPI still fed by it blocks retirement, and
        locked snapshots that used it are preserved, never rewritten. Suspending is deliberately not blocked — stopping
        a bad feed must not be harder the more important the feed is.
      </p>
      {q.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
      ) : q.isError ? (
        <SectionMessage appearance="error" title="Failed to load data sources">
          <p>{q.error instanceof Error ? q.error.message : 'Unknown error'}</p>
        </SectionMessage>
      ) : list.length === 0 ? (
        <EmptyState size="compact" header="No registered sources" description="No data sources have been registered for this tenant yet." />
      ) : (
        <JiraTable<StrataDataSource>
          columns={columns}
          data={list}
          getRowId={(s) => s.id}
          showRowCount={false}
          ariaLabel="Registered data sources"
        />
      )}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 16, marginTop: 12,
          padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.sunken,
        }}
      >
        <span style={{ fontWeight: 600, letterSpacing: '0.04em', fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>CHANGE RULE</span>
        <span style={metaStyle}>
          Template changes never reinterpret promoted history — a run keeps the version it was validated under.
          Retiring a source never rewrites what it already produced: locked snapshots and issued packs are preserved.
        </span>
      </div>

      {/* Dependents impact — read-only, opened from the row */}
      <Modal isOpen={!!impact} onClose={() => setImpact(null)} width="medium">
        <ModalHeader><ModalTitle>Dependents · {impact?.source.name}</ModalTitle></ModalHeader>
        <ModalBody>{impact ? <BlastRadiusPanel blast={impact.blast} /> : null}</ModalBody>
        <ModalFooter><Button appearance="subtle" onClick={() => setImpact(null)}>Close</Button></ModalFooter>
      </Modal>

      {/* Lifecycle transition. Retirement REQUIRES a reason (the RPC enforces it); the others accept
          one optionally, because an unexplained suspension is still recoverable and an unexplained
          retirement is not. */}
      <Modal isOpen={!!pending} onClose={() => setPending(null)} width="small">
        <ModalHeader>
          <ModalTitle>{pending ? `${labelize(pending.to)} · ${pending.source.name}` : ''}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            {pending?.to === 'retired'
              ? 'Retirement is terminal and is refused while any approved KPI is still fed by this source. Its history is preserved unchanged.'
              : pending?.to === 'suspended'
                ? 'Suspending stops STRATA believing this feed. It is reversible and is not blocked by dependents.'
                : 'Activating means STRATA will accept data from this source.'}
          </p>
          <Textfield
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={pending?.to === 'retired' ? 'Reason (required)' : 'Reason (optional)'}
            aria-label="Reason"
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setPending(null)}>Cancel</Button>
          <Button
            appearance={pending?.to === 'retired' ? 'danger' : 'primary'}
            // Retirement's reason requirement is stated here rather than surfaced as a server error.
            isDisabled={busy || (pending?.to === 'retired' && reason.trim() === '')}
            testId="strata-source-status-confirm"
            onClick={() => void applyStatus()}
          >
            {pending ? labelize(pending.to) : ''}
          </Button>
        </ModalFooter>
      </Modal>
    </StrataPanel>
  );
}

// ── Data & integration domain page ───────────────────────────────────────────
export default function StrataDataIntegrationPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string>('sources');
  const [err, setErr] = useState<string | null>(null);

  return (
    <StrataPageShell
      trail={[{ text: 'Administration', href: Routes.strata.admin() }]}
      title="Data & integration"
      docTitle="Data & integration · Administration"
      testId="strata-data-chrome"
    >
      <style>{
        '.strata-domain-nav-item:hover{background:var(--ds-background-neutral-subtle-hovered);}'
        + '.strata-domain-nav-item:focus-visible{outline:2px solid var(--ds-border-focused);outline-offset:-2px;}'
      }</style>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <nav aria-label="Data & integration sections" style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            appearance="subtle"
            spacing="compact"
            iconBefore={<ArrowLeft size={14} />}
            onClick={() => navigate(Routes.strata.admin())}
            testId="strata-data-back"
          >
            Configuration
          </Button>
          <div style={{ height: 8 }} />
          {NAV.map((n) => {
            const Icon = n.icon;
            const isActive = active === n.key;
            return (
              <button
                key={n.key}
                type="button"
                className="strata-domain-nav-item"
                onClick={() => { setActive(n.key); setErr(null); }}
                data-testid={`strata-data-nav-${n.key}`}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', font: 'inherit',
                  background: isActive ? T.selected : 'transparent',
                  color: isActive ? T.brandText : T.text,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span aria-hidden style={{ display: 'inline-flex' }}><Icon size={16} /></span>
                <span style={{ flex: 1 }}>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ flex: '1 1 520px', minWidth: 0 }}>
          {err ? (
            <div style={{ marginBottom: 16 }}>
              <SectionMessage appearance="error" title="Governance action rejected by the database"><p>{err}</p></SectionMessage>
            </div>
          ) : null}
          {active === 'sources' ? <SourcesRegistry onError={setErr} /> : <UploadTemplatesSection onError={setErr} />}
        </div>
      </div>
    </StrataPageShell>
  );
}
