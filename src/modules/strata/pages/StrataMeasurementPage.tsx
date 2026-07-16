/**
 * STRATA Measurement domain (governed control plane, anchor 04 · P5-D1).
 * Route: /strata/admin/measurement. Left section-nav groups the measurement
 * config records (perspectives, scorecard models, KPI types, threshold schemes)
 * behind one governed page. Perspectives get the anchor-04 treatment: a
 * JiraTable with weight-integrity header + a 360px edit rail (governance
 * envelope, client-derived usage-impact preview, lifecycle actions). The other
 * sections reuse the existing governed sections (5C/5D refine them in place).
 *
 * Scoped honestly (P5-D2/D3): usage impact is a CLIENT-derived count of
 * scorecard models referencing the perspective — not a fabricated score-shift
 * (no server RPC exists). Revising an approved perspective needs a version-bump
 * authoring RPC that does not exist yet — surfaced as a labelled note, never a
 * dead form.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import { ArrowLeft, BarChart3, Layers, ListChecks, Scale } from '@/lib/atlaskit-icons';
import {
  useAllModelPerspectives, useKpiTypes, usePerspectives, useScorecardModels,
  useStrataRoles, useThresholdSchemes,
} from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { fmtDate } from '@/modules/strata/components/format';
import {
  GovActions, GovEnvelope, GovStatusLozenge, KpiTypesSection, ScorecardModelsSection, ThresholdsSection,
} from './StrataAdminConfigPage';
import type { GovernedStatus, StrataPerspective } from '@/modules/strata/types';

type OnError = (msg: string | null) => void;

const metaStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtle };
const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: '0 0 12px' };
const railBox: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 12,
  border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, background: T.raised,
};

const countPending = (rows?: ReadonlyArray<{ status: GovernedStatus }>): number =>
  (rows ?? []).filter((r) => r.status === 'pending_approval').length;

const NAV = [
  { key: 'perspectives', label: 'Perspectives & taxonomy', icon: Layers },
  { key: 'scorecard-models', label: 'Scorecard models', icon: Scale },
  { key: 'kpi-types', label: 'KPI types & formulas', icon: ListChecks },
  { key: 'thresholds', label: 'Threshold schemes', icon: BarChart3 },
] as const;

// ── Perspectives sub-view (anchor 04) ────────────────────────────────────────
interface PerspectiveRow extends StrataPerspective { usedBy: number }

function RailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
      <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{label}</span>
      <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function PerspectiveRail({ perspective, usedBy, onError }: {
  perspective: StrataPerspective | null;
  usedBy: number;
  onError: OnError;
}) {
  if (!perspective) {
    return (
      <div style={railBox} data-testid="strata-perspective-rail-empty">
        <EmptyState
          size="compact"
          header="Select a perspective"
          description="Choose a perspective to see its governance envelope, downstream usage and lifecycle actions."
        />
      </div>
    );
  }
  return (
    <div style={railBox} data-testid="strata-perspective-rail">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <strong style={{ fontSize: 'var(--ds-font-size-300)', color: T.text }}>{perspective.name}</strong>
        {perspective.description ? <span style={metaStyle}>{perspective.description}</span> : null}
      </div>
      <GovEnvelope r={perspective} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <RailField label="Default weight" value={perspective.default_weight != null ? `${perspective.default_weight}%` : '—'} />
        <RailField label="Order" value={String(perspective.order_index)} />
        <RailField label="Effective from" value={perspective.effective_from ? fmtDate(perspective.effective_from) : '—'} />
      </div>

      {/* Impact preview — client-derived usage, NOT a server score-shift (P5-D2) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, border: `1px solid ${T.border}`, borderRadius: 6, padding: 12, background: T.sunken }}>
        <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle, letterSpacing: 0.4 }}>IMPACT PREVIEW</span>
        <span style={bodyStyle}>Used by <strong>{usedBy}</strong> scorecard model{usedBy === 1 ? '' : 's'}.</span>
        <span style={metaStyle}>
          Locked snapshots keep the version they were calculated under — changing this perspective never reinterprets history.
        </span>
        <span style={metaStyle}>A server-calculated score-shift preview is not yet available.</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <GovActions table="strata_perspectives" record={perspective} onError={onError} />
      </div>
      {perspective.status === 'pending_approval' ? (
        <span style={metaStyle}>
          Approval requires a different strata_admin than the author — segregation of duties is enforced in the database.
        </span>
      ) : null}
      {perspective.status === 'approved' ? (
        <span style={metaStyle}>
          Revising an approved perspective creates a new version. That authoring flow is a later feature — today, retire and recreate.
        </span>
      ) : null}
    </div>
  );
}

function PerspectivesDomain({ onError }: { onError: OnError }) {
  const q = usePerspectives();
  const allMP = useAllModelPerspectives();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = q.data ?? [];
  const usageById = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const mp of allMP.data ?? []) {
      if (!m.has(mp.perspective_id)) m.set(mp.perspective_id, new Set());
      m.get(mp.perspective_id)!.add(mp.model_id);
    }
    return m;
  }, [allMP.data]);

  const rows: PerspectiveRow[] = list.map((p) => ({ ...p, usedBy: usageById.get(p.id)?.size ?? 0 }));
  const approvedWeightSum = list
    .filter((p) => p.status === 'approved')
    .reduce((a, p) => a + (p.default_weight ?? 0), 0);
  const retiredCount = list.filter((p) => p.status === 'retired' || p.status === 'superseded').length;
  const selected = list.find((p) => p.id === selectedId) ?? null;

  const columns: Column<PerspectiveRow>[] = [
    {
      id: 'name', label: 'Perspective', flex: true,
      cell: ({ row }) => (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ ...bodyStyle, fontWeight: 600 }}>{row.name}</span>
          {row.description ? (
            <span style={{ ...metaStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'weight', label: 'Weight', width: 13,
      cell: ({ row }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{row.default_weight != null ? `${row.default_weight}%` : '—'}</span>,
    },
    {
      id: 'usedby', label: 'Used by', width: 15,
      cell: ({ row }) => (row.usedBy > 0
        ? <span style={metaStyle}>{row.usedBy} model{row.usedBy === 1 ? '' : 's'}</span>
        : <span style={{ color: T.subtlest }}>—</span>),
    },
    {
      id: 'lifecycle', label: 'Lifecycle', width: 16,
      cell: ({ row }) => <GovStatusLozenge status={row.status} />,
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 460px', minWidth: 0 }}>
        <StrataPanel
          title="Perspectives & taxonomy"
          icon={<Layers size={16} />}
          count={list.length}
          testId="strata-measurement-perspectives"
          actions={list.length > 0 ? (
            approvedWeightSum === 100
              ? <StatusLozenge status="valid" label="Weights total 100" appearance="success" />
              : <StatusLozenge status="invalid" label={`Weights total ${approvedWeightSum}`} appearance="removed" />
          ) : undefined}
        >
          <p style={captionStyle}>
            Perspectives are the scoring lens every scorecard rolls up through — each is a versioned, approved record.
            Select one to see its governance envelope and downstream usage.
          </p>
          {q.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="medium" /></div>
          ) : q.isError ? (
            <SectionMessage appearance="error" title="Failed to load perspectives">
              <p>{q.error instanceof Error ? q.error.message : 'Unknown error'}</p>
            </SectionMessage>
          ) : list.length === 0 ? (
            <EmptyState
              size="compact"
              header="No perspectives yet"
              description="Perspectives define the lens every scorecard is scored through. Add the first from Configuration."
            />
          ) : (
            <>
              <JiraTable<PerspectiveRow>
                columns={columns}
                data={rows}
                getRowId={(r) => r.id}
                onRowClick={(r) => setSelectedId(r.id)}
                showRowCount={false}
                ariaLabel="Perspectives"
              />
              {retiredCount > 0 ? (
                <p style={{ ...metaStyle, marginTop: 12 }}>
                  {retiredCount} retired perspective{retiredCount === 1 ? '' : 's'} remain visible — historical scorecards
                  keep calculating under the version that was live when they locked.
                </p>
              ) : null}
            </>
          )}
        </StrataPanel>
      </div>

      <aside style={{ flex: '0 1 360px', minWidth: 280 }}>
        <PerspectiveRail
          perspective={selected}
          usedBy={selected ? (usageById.get(selected.id)?.size ?? 0) : 0}
          onError={onError}
        />
      </aside>
    </div>
  );
}

// ── Measurement domain page ──────────────────────────────────────────────────
export default function StrataMeasurementPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string>('perspectives');
  const [err, setErr] = useState<string | null>(null);

  const perspectives = usePerspectives();
  const models = useScorecardModels();
  const kpiTypes = useKpiTypes();
  const thresholds = useThresholdSchemes();
  const pendingByKey: Record<string, number> = {
    perspectives: countPending(perspectives.data),
    'scorecard-models': countPending(models.data),
    'kpi-types': countPending(kpiTypes.data),
    thresholds: countPending(thresholds.data),
  };

  return (
    <StrataPageShell
      trail={[{ text: 'Administration', href: Routes.strata.admin() }]}
      title="Measurement"
      docTitle="Measurement · Administration"
      testId="strata-measurement-chrome"
    >
      <style>{
        '.strata-domain-nav-item:hover{background:var(--ds-background-neutral-subtle-hovered);}'
        + '.strata-domain-nav-item:focus-visible{outline:2px solid var(--ds-border-focused);outline-offset:-2px;}'
      }</style>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <nav aria-label="Measurement sections" style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            appearance="subtle"
            spacing="compact"
            iconBefore={<ArrowLeft size={14} />}
            onClick={() => navigate(Routes.strata.admin())}
            testId="strata-measurement-back"
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
                data-testid={`strata-measurement-nav-${n.key}`}
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
                {pendingByKey[n.key] > 0 ? <Lozenge appearance="moved">{pendingByKey[n.key]}</Lozenge> : null}
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
          {active === 'perspectives' ? <PerspectivesDomain onError={setErr} />
            : active === 'scorecard-models' ? <ScorecardModelsSection onError={setErr} />
            : active === 'kpi-types' ? <KpiTypesSection onError={setErr} />
            : <ThresholdsSection onError={setErr} />}
        </div>
      </div>
    </StrataPageShell>
  );
}
