/**
 * STRATA Data & integration domain (governed control plane, anchor 26 · P5-D3).
 * Route: /strata/admin/data. Left section-nav: Sources (read-only registry) +
 * Upload templates (governed contracts, reused section).
 *
 * Scoped honestly (P5-D3): strata_data_sources is status-only with NO admin
 * authoring RPC, so the source registry is READ-ONLY — "+ Register source" and
 * the retire-with-dependents flow are deferred and labelled, never a dead form.
 * The type carries no last-refresh timestamp and no per-source "feeds" mapping,
 * so those columns are omitted rather than fabricated (zero-assumption).
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { LozengeAppearance } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import { ArrowLeft, Database, Upload } from '@/lib/atlaskit-icons';
import { useDataSources, useProfileNames } from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { labelize } from '@/modules/strata/components/format';
import { UploadTemplatesSection } from './StrataAdminConfigPage';
import type { StrataDataSource } from '@/modules/strata/types';

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

// ── Sources registry (read-only) ─────────────────────────────────────────────
function SourcesRegistry() {
  const q = useDataSources();
  const profiles = useProfileNames();
  const list = q.data ?? [];

  const ownerName = (id: string | null): string | null => (id ? profiles.data?.get(id)?.name ?? null : null);

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
      id: 'status', label: 'Status', width: 20,
      cell: ({ row }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusLozenge status={row.status} label={labelize(row.status)} appearance={SOURCE_STATUS[row.status] ?? 'default'} />
          {row.health ? <span style={metaStyle}>{labelize(row.health)}</span> : null}
        </span>
      ),
    },
  ];

  return (
    <StrataPanel
      title="Registered sources"
      icon={<Database size={16} />}
      count={list.length}
      testId="strata-data-sources"
      actions={<Lozenge appearance="new">Read-only registry</Lozenge>}
    >
      <p style={captionStyle}>
        The systems STRATA is allowed to believe — each with an owner, because data problems are owned problems. Registering
        a source and retiring one (with a dependents-impact check) are governed authoring flows that are a later feature;
        this registry is read-only today.
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
          Template changes never reinterpret promoted history — a run keeps the version it was validated under. Retiring a
          source will require a dependents check that counts every KPI, scorecard and benefit fed by it.
        </span>
      </div>
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
          {active === 'sources' ? <SourcesRegistry /> : <UploadTemplatesSection onError={setErr} />}
        </div>
      </div>
    </StrataPageShell>
  );
}
