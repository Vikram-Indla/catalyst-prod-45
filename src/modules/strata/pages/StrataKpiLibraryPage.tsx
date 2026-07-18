/**
 * STRATA KPI/OKR Library — /strata/kpis (CAT-STRATA-20260705-001).
 * Governed KPI dictionary (canonical JiraTable) + OKR panel with lazy key results.
 * UI never computes achievement/RAG — per-row values come from
 * strata_calc_kpi_achievement via useKpiAchievement. Unknowns render '—'.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
  Avatar, Button, CatalystTag,
  EmptyState, Lozenge, SectionMessage, Spinner, Textfield, Tooltip,
} from '@/components/ads';
import {
  Activity, ArrowDown, ArrowUp, CheckCircle2, Plus, Scale, Target,
} from '@/lib/atlaskit-icons';
import { JiraTable, BulkFooterBar } from '@/components/shared/JiraTable';
import type { Column, SortOrder, BulkAction } from '@/components/shared/JiraTable';
import { Routes } from '@/lib/routes';
import { kpiApi } from '@/modules/strata/domain';
import {
  useBandResolver, useDataSources, useElementKpis, useInvalidateStrata, useKpiAchievement, useKpis, useOkrs, usePerspectives, useProfileNames, useSavedViews, useStrataContext, useStrataRoles, useStrategyElements, useThresholdSchemes,
} from '@/modules/strata/hooks/useStrata';
import { OkrRow, StrataBandBar, StrataBandLozenge, StrataChipMenu, StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import { fmtDate, fmtPct, fmtUnit, labelize } from '@/modules/strata/components/format';
import type { GovernedStatus, StrataBulkUpdateResult, StrataKpi, StrataKpiActual, StrataOkr, StrataSavedView, ThresholdBand } from '@/modules/strata/types';
import type { StrataProfileRef } from '@/modules/strata/hooks/useStrata';

/** UI affordance gating only — server RPCs enforce the real role rules (SoD etc.). */
const CREATE_ROLES = ['strategy_office', 'kpi_owner', 'strata_admin'] as const;

const DIRECTION_OPTIONS = [
  { value: 'higher_better', label: 'Higher is better' },
  { value: 'lower_better', label: 'Lower is better' },
  { value: 'band', label: 'Band' },
  { value: 'manual', label: 'Manual' },
];
const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
];
const ENTRY_METHOD_OPTIONS = [
  { value: 'upload', label: 'Upload' },
  { value: 'manual', label: 'Manual' },
  { value: 'connector', label: 'Connector' },
];

/** Shape returned by strata_calc_kpi_achievement — rendered verbatim, never recomputed. */
interface KpiAchievementPayload {
  achievement: number | null;
  actual: number | null;
  target: number | null;
  status_key: string | null;
  has_data?: boolean;
  confidence?: number | null;
}

const GOVERNED_LOZENGE: Record<GovernedStatus, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  approved: { label: 'Approved', appearance: 'success' },
  draft: { label: 'Draft', appearance: 'default' },
  pending_approval: { label: 'Pending approval', appearance: 'moved' },
  retired: { label: 'Retired', appearance: 'removed' },
  superseded: { label: 'Superseded', appearance: 'default' },
};

export function StrataGovernedStatusLozenge({ status }: { status: GovernedStatus | string | null | undefined }) {
  if (!status) return <span style={{ color: T.subtlest }}>—</span>;
  const cfg = GOVERNED_LOZENGE[status as GovernedStatus];
  if (!cfg) return <Lozenge appearance="default">{labelize(String(status))}</Lozenge>;
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

/** Short labels — the arrow icon already carries the "is better" semantics;
 *  the long phrasing ellipsized inside the 10-unit column. */
const DIRECTION_LABEL: Record<StrataKpi['direction'], string> = {
  higher_better: 'Higher',
  lower_better: 'Lower',
  band: 'Band',
  manual: 'Manual',
};

const Dash = () => <span style={{ color: T.subtlest }}>—</span>;

/** Direction cell — icon + label (S-130). */
/** Subtle skeleton bar shown while a per-row achievement RPC resolves (S-123). */
function CellSkeleton() {
  return <span aria-hidden style={{ display: 'inline-block', width: 64, height: 8, borderRadius: 4, background: T.neutral }} />;
}

/** KPI name — brand-text link with hover underline when a slug exists (S-121). */
function KpiNameLink({ row, onOpen }: { row: StrataKpi; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  if (!row.slug) {
    return (
      <span style={{ fontWeight: 600, color: T.text, fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)' }}>
        {row.name}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        font: 'inherit', fontWeight: 600, color: T.brandText, textAlign: 'left',
        fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)',
        textDecoration: hover ? 'underline' : 'none',
      }}
    >
      {row.name}
    </button>
  );
}

/** Per-row achievement — server-computed via strata_calc_kpi_achievement. */
function KpiAchievementCell({ kpiId }: { kpiId: string }) {
  const { activePeriod } = useStrataContext();
  const q = useKpiAchievement(kpiId, activePeriod?.id);
  if (!activePeriod) return <Dash />;
  if (q.isLoading) return <CellSkeleton />;
  const a = (q.data ?? null) as KpiAchievementPayload | null;
  if (q.isError || !a || a.achievement == null) return <Dash />;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(a.achievement)}</span>
        {a.status_key ? <StrataBandLozenge bandKey={a.status_key} /> : null}
      </span>
      <span style={{ width: 64 }}>
        <StrataBandBar value={a.achievement} bandKey={a.status_key} height={4} />
      </span>
    </span>
  );
}

/** Per-actual validation state (validated/pending/rejected/quarantined). */
const VALIDATION_APPEARANCE: Record<string, React.ComponentProps<typeof Lozenge>['appearance']> = {
  validated: 'success', pending: 'moved', rejected: 'removed', quarantined: 'moved',
};
function ValidationLozenge({ status }: { status?: string | null }) {
  if (!status) return <Dash />;
  return <Lozenge appearance={VALIDATION_APPEARANCE[status] ?? 'default'}>{labelize(status)}</Lozenge>;
}

/** Per-row actuals — same queryKey across cells of a row so React Query dedupes
 *  to one fetch (feeds Δ + Validation + Freshness). */
function useKpiActualsLite(kpiId: string) {
  return useQuery({ queryKey: ['strata', 'kpi-actuals', kpiId], queryFn: () => kpiApi.actuals(kpiId), staleTime: 30_000 });
}

/** Actual or Target for the active period — split columns per anchor 16. */
function KpiValueCell({ kpiId, unit, field }: { kpiId: string; unit: string | null; field: 'actual' | 'target' }) {
  const { activePeriod } = useStrataContext();
  const q = useKpiAchievement(kpiId, activePeriod?.id);
  if (!activePeriod) return <Dash />;
  if (q.isLoading) return <CellSkeleton />;
  const a = (q.data ?? null) as KpiAchievementPayload | null;
  const v = a ? a[field] : null;
  if (v == null) return <Dash />;
  return (
    <span style={{
      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: 'var(--ds-font-size-100)',
      color: field === 'actual' ? T.text : T.subtle,
      fontWeight: field === 'actual' ? 600 : 400,
    }}>
      {fmtUnit(v, unit)}
    </span>
  );
}

/** Signed magnitude, ≤2 decimals, no trailing zeros — the arrow carries the sign. */
function fmtDelta(v: number): string {
  return Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Δ vs the prior period's actual (anchor 16). Arrow carries direction (grayscale-safe);
 *  color reinforces good/bad by the KPI's direction. Rendered only when both periods have a value. */
function KpiDeltaCell({ kpiId, direction }: { kpiId: string; direction: string }) {
  const { activePeriod } = useStrataContext();
  const q = useKpiActualsLite(kpiId);
  if (q.isLoading) return <CellSkeleton />;
  const acts = ((q.data ?? []) as StrataKpiActual[])
    .filter((a) => a.value != null)
    .sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1));
  if (acts.length < 2) return <Dash />;
  const curIdx = activePeriod ? acts.findIndex((a) => a.period_id === activePeriod.id) : -1;
  const cur = curIdx >= 0 ? acts[curIdx] : acts[acts.length - 1];
  const prev = curIdx > 0 ? acts[curIdx - 1] : (curIdx < 0 ? acts[acts.length - 2] : null);
  if (!cur || !prev) return <Dash />;
  const delta = cur.value - prev.value;
  if (delta === 0) return <span style={{ color: T.subtlest, fontVariantNumeric: 'tabular-nums' }}>0</span>;
  const up = delta > 0;
  const good = direction === 'higher_better' ? up : direction === 'lower_better' ? !up : null;
  const color = good == null ? T.subtle : good ? 'var(--ds-text-success)' : 'var(--ds-text-danger)';
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color, fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 'var(--ds-font-size-100)' }}>
      <Arrow size={12} aria-hidden />{fmtDelta(delta)}
    </span>
  );
}

/** Latest validation state for the active period (else most recent actual). */
function KpiValidationCell({ kpiId }: { kpiId: string }) {
  const { activePeriod } = useStrataContext();
  const q = useKpiActualsLite(kpiId);
  if (q.isLoading) return <CellSkeleton />;
  const acts = (q.data ?? []) as StrataKpiActual[];
  const cur = acts.find((a) => a.period_id === activePeriod?.id) ?? acts[0] ?? null;
  return cur ? <ValidationLozenge status={cur.validation_status} /> : <Dash />;
}

/** Freshness — staleness glyph (● fresh ≤2d / ◐ aging 3–5d / ○ stale >5d) + relative time;
 *  absolute date on hover. Glyph shape + text carry meaning (color never alone). */
function KpiFreshnessCell({ kpiId }: { kpiId: string }) {
  const q = useKpiActualsLite(kpiId);
  if (q.isLoading) return <CellSkeleton />;
  const acts = (q.data ?? []) as StrataKpiActual[];
  if (acts.length === 0) return <Dash />;
  const latest = acts.reduce((mx, a) => (a.submitted_at > mx ? a.submitted_at : mx), acts[0].submitted_at);
  const days = Math.max(0, Math.floor((Date.now() - new Date(latest).getTime()) / 86_400_000));
  const stale = days > 5;
  const aging = days > 2 && days <= 5;
  const glyph = stale ? '○' : aging ? '◐' : '●';
  const color = stale ? 'var(--ds-text-danger)' : aging ? 'var(--ds-text-warning)' : 'var(--ds-text-success)';
  const rel = days === 0 ? 'today' : `${days}d`;
  return (
    <Tooltip content={fmtDate(latest)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, fontSize: 'var(--ds-font-size-100)', whiteSpace: 'nowrap' }}>
        <span aria-hidden>{glyph}</span>
        <span>{stale ? `stale ${rel}` : rel}</span>
      </span>
    </Tooltip>
  );
}

/** Owner (accountable owner) — resolved name + avatar; NO OWNER renders as a value, never blank. */
function KpiOwnerCell({ ownerId, profiles }: { ownerId: string | null; profiles?: Map<string, StrataProfileRef> }) {
  const NoOwner = () => <span style={{ color: T.subtlest, whiteSpace: 'nowrap' }}>— no owner</span>;
  if (!ownerId) return <NoOwner />;
  const p = profiles?.get(ownerId);
  return p?.name ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <Avatar size="xsmall" name={p.name} src={p.avatarUrl ?? undefined} />
      <span style={{ color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
    </span>
  ) : <NoOwner />;
}

/** Validator cell — resolved name, or attestation icon; never the literal "Set" (S-120). */
// ── OKR panel — OkrRow/KeyResultsList/krProgressFraction/OKR_STATUS_LOZENGE ──
//    now live in components/shared.tsx (canonical, shared with Theme/Objective
//    detail's OKR Performance panel — CAT-STRATA-THEME-DETAIL-20260710-001
//    Slice 2). ──

function OkrPanel() {
  const { activeCycle } = useStrataContext();
  const okrsQ = useOkrs();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const kpisQ = useKpis();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newOkrOpen, setNewOkrOpen] = useState(false);
  const [krOkr, setKrOkr] = useState<StrataOkr | null>(null);

  const canAuthor = (rolesQ.data ?? []).some((r) => (CREATE_ROLES as readonly string[]).includes(r));

  const elementNameById = useMemo(() => {
    const m = new Map<string, string>();
    (elementsQ.data ?? []).forEach((e) => m.set(e.id, e.name));
    return m;
  }, [elementsQ.data]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const okrs = okrsQ.data ?? [];

  return (
    <StrataPanel
      title="OKRs"
      icon={<Target size={16} />}
      count={okrs.length}
      testId="strata-okr-panel"
      actions={canAuthor ? (
        <Button
          appearance="default"
          spacing="compact"
          iconBefore={<Plus size={14} />}
          onClick={() => setNewOkrOpen(true)}
          testId="strata-new-okr"
        >
          New OKR
        </Button>
      ) : undefined}
    >
      {okrsQ.isLoading ? (
        <Spinner size="medium" aria-label="Loading OKRs" />
      ) : okrsQ.isError ? (
        <SectionMessage appearance="error" title="Failed to load OKRs">
          <p>{(okrsQ.error as Error)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      ) : okrs.length === 0 ? (
        <EmptyState size="compact" header="No OKRs yet" description="OKRs linked to strategy objectives will appear here." />
      ) : (
        <div>
          {okrs.map((okr) => (
            <OkrRow
              key={okr.id}
              okr={okr}
              objectiveName={okr.objective_element_id ? (elementNameById.get(okr.objective_element_id) ?? null) : null}
              isOpen={expanded.has(okr.id)}
              onToggle={() => toggle(okr.id)}
              onAddKeyResult={canAuthor ? () => setKrOkr(okr) : undefined}
              onLifecycle={canAuthor}
            />
          ))}
        </div>
      )}

      {/* New OKR — server RPC validates; errors render in-modal */}
      <StrataFormModal
        open={newOkrOpen}
        onClose={() => setNewOkrOpen(false)}
        title="New OKR"
        description="Creates a draft OKR in the active cycle."
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'OKR objective statement' },
          { key: 'ownerId', label: 'Owner', kind: 'user' },
          {
            key: 'objectiveElementId', label: 'Objective element', kind: 'select',
            options: (elementsQ.data ?? []).map((e) => ({ value: e.id, label: e.name })),
            helper: 'Optional link to a strategy objective',
          },
        ]}
        submitLabel="Create OKR"
        onSubmit={async (v) => {
          await kpiApi.createOkr({
            name: String(v.name),
            cycleId: activeCycle?.id,
            objectiveElementId: v.objectiveElementId ? String(v.objectiveElementId) : undefined,
            ownerId: v.ownerId ? String(v.ownerId) : undefined,
          });
          invalidate();
        }}
        testId="strata-new-okr-modal"
      />

      {/* Add key result — server RPC validates; errors render in-modal */}
      <StrataFormModal
        open={krOkr !== null}
        onClose={() => setKrOkr(null)}
        title={krOkr ? `Add key result · ${krOkr.name}` : 'Add key result'}
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'Measurable key result' },
          {
            key: 'kpiId', label: 'Linked KPI', kind: 'select',
            options: (kpisQ.data ?? []).map((k) => ({ value: k.id, label: k.name })),
            helper: 'Optional governed KPI backing this key result',
          },
          { key: 'unit', label: 'Unit', kind: 'text', placeholder: 'e.g. %, days, count' },
          { key: 'baseline', label: 'Baseline', kind: 'number' },
          { key: 'target', label: 'Target', kind: 'number' },
          { key: 'currentValue', label: 'Current value', kind: 'number' },
          { key: 'direction', label: 'Direction', kind: 'select', options: DIRECTION_OPTIONS },
        ]}
        initial={{ direction: 'higher_better' }}
        submitLabel="Add key result"
        onSubmit={async (v) => {
          if (!krOkr) return;
          await kpiApi.createKeyResult({
            okrId: krOkr.id,
            name: String(v.name),
            kpiId: v.kpiId ? String(v.kpiId) : undefined,
            unit: v.unit ? String(v.unit) : undefined,
            baseline: v.baseline != null ? Number(v.baseline) : undefined,
            target: v.target != null ? Number(v.target) : undefined,
            currentValue: v.currentValue != null ? Number(v.currentValue) : undefined,
            direction: v.direction ? String(v.direction) : undefined,
          });
          invalidate();
        }}
        testId="strata-add-kr-modal"
      />
    </StrataPanel>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const STATUS_FILTER_OPTIONS: Array<{ value: GovernedStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'retired', label: 'Retired' },
  { value: 'superseded', label: 'Superseded' },
];

export default function StrataKpiLibraryPage() {
  const navigate = useNavigate();
  const { activeCycle, activePeriod } = useStrataContext();
  const kpisQ = useKpis();
  const dataSourcesQ = useDataSources();
  const profilesQ = useProfileNames();
  const rolesQ = useStrataRoles();
  const elementKpisQ = useElementKpis();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const schemesQ = useThresholdSchemes();
  const perspectivesQ = usePerspectives();
  const resolveBand = useBandResolver();
  // Bulk selection + governed bulk-write state (anchor 16 BulkFooterBar).
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<null | 'owner' | 'scheme'>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<StrataBulkUpdateResult | null>(null);

  // KPI → objective-ancestry name (anchor-16 sub-line). Objectives win; themes are the fallback.
  // Zero-assumption: a KPI with no linked objective/theme renders no sub-line (never invented).
  const objectiveByKpiId = useMemo(() => {
    const elById = new Map((elementsQ.data ?? []).map((e) => [e.id, e]));
    const links = elementKpisQ.data ?? [];
    const pickByType = (type: string) => {
      const m = new Map<string, string>();
      links.forEach((l) => {
        const el = elById.get(l.element_id);
        if (el && el.element_type === type && !m.has(l.kpi_id)) m.set(l.kpi_id, el.name);
      });
      return m;
    };
    const m = new Map(pickByType('theme'));
    pickByType('objective').forEach((v, k) => m.set(k, v));
    return m;
  }, [elementKpisQ.data, elementsQ.data]);
  const invalidate = useInvalidateStrata();

  const allKpis = useMemo(() => kpisQ.data ?? [], [kpisQ.data]);

  // Page-level achievement for the active period — one query per KPI, SAME queryKey as the row cells,
  // so React Query dedupes to a single fetch per KPI. Powers the Band filter + worst-first sort.
  const achievementQueries = useQueries({
    queries: allKpis.map((k) => ({
      queryKey: ['strata', 'kpi-achievement', k.id, activePeriod?.id],
      queryFn: () => kpiApi.achievement(k.id, activePeriod!.id),
      enabled: !!activePeriod?.id,
      staleTime: 30_000,
    })),
  });
  const achByKpiId = useMemo(() => {
    const m = new Map<string, KpiAchievementPayload>();
    allKpis.forEach((k, i) => {
      const d = achievementQueries[i]?.data as KpiAchievementPayload | undefined;
      if (d) m.set(k.id, d);
    });
    return m;
    // achievementQueries is a fresh array each render; key the memo on resolved-count + period.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKpis, activePeriod?.id, achievementQueries.map((q) => (q.data ? 1 : 0)).join('')]);

  // Page-level actuals per KPI — SAME queryKey as the row cells' useKpiActualsLite (deduped).
  // Powers the Validation filter (current-period validation status, else most recent actual).
  const actualsQueries = useQueries({
    queries: allKpis.map((k) => ({
      queryKey: ['strata', 'kpi-actuals', k.id],
      queryFn: () => kpiApi.actuals(k.id),
      staleTime: 30_000,
    })),
  });
  const validationByKpiId = useMemo(() => {
    const m = new Map<string, string | null>();
    allKpis.forEach((k, i) => {
      const acts = (actualsQueries[i]?.data ?? []) as StrataKpiActual[];
      const cur = acts.find((a) => a.period_id === activePeriod?.id) ?? acts[0] ?? null;
      m.set(k.id, cur?.validation_status ?? null);
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKpis, activePeriod?.id, actualsQueries.map((q) => (q.data ? 1 : 0)).join('')]);

  // KPI → perspective_id via its linked element (element_kpis ⋈ elements). First link wins.
  const perspectiveIdByKpiId = useMemo(() => {
    const elById = new Map((elementsQ.data ?? []).map((e) => [e.id, e]));
    const m = new Map<string, string>();
    (elementKpisQ.data ?? []).forEach((l) => {
      const el = elById.get(l.element_id);
      if (el?.perspective_id && !m.has(l.kpi_id)) m.set(l.kpi_id, el.perspective_id);
    });
    return m;
  }, [elementKpisQ.data, elementsQ.data]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GovernedStatus | 'all'>('all');
  const [bandFilter, setBandFilter] = useState<'all' | 'exceptions' | string>('all');
  const [perspectiveFilter, setPerspectiveFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<string>('all');
  // Saved views (per-user, strata_saved_views). activeViewId: a view id, '__exceptions__' (built-in), or null.
  const savedViewsQ = useSavedViews('kpi');
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  // Worst-first by achievement is the anchor-16 default; a column-header click overrides it.
  const [sortKey, setSortKey] = useState<string>('achievement');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');
  const [newKpiOpen, setNewKpiOpen] = useState(false);
  // Holds the id of a KPI already created this modal session, so a resubmit
  // after a failed owner/link write (e.g. server SoD rejection) does not create
  // a duplicate draft — createKpi fires at most once until the modal reopens.
  const newKpiIdRef = useRef<string | null>(null);

  const canAuthor = (rolesQ.data ?? []).some((r) => (CREATE_ROLES as readonly string[]).includes(r));

  // A KPI is an "exception" when its governed band resolves to a warning/danger appearance.
  const isExceptionBand = (statusKey?: string | null) => {
    const ap = resolveBand(statusKey ?? null)?.appearance;
    return ap === 'removed' || ap === 'moved';
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = allKpis.filter((k) => {
      if (statusFilter !== 'all' && k.status !== statusFilter) return false;
      if (term && !k.name.toLowerCase().includes(term)) return false;
      if (ownerFilter !== 'all') {
        if (ownerFilter === 'none') { if (k.accountable_owner_id != null) return false; }
        else if (k.accountable_owner_id !== ownerFilter) return false;
      }
      if (perspectiveFilter !== 'all' && (perspectiveIdByKpiId.get(k.id) ?? null) !== perspectiveFilter) return false;
      if (validationFilter !== 'all') {
        const vs = validationByKpiId.get(k.id) ?? null;
        if (validationFilter === 'none') { if (vs != null) return false; }
        else if (vs !== validationFilter) return false;
      }
      if (bandFilter !== 'all') {
        const sk = achByKpiId.get(k.id)?.status_key ?? null;
        if (bandFilter === 'exceptions') { if (!isExceptionBand(sk)) return false; }
        else if (sk !== bandFilter) return false;
      }
      return true;
    });
    const dir = sortOrder === 'ASC' ? 1 : -1;
    if (sortKey === 'achievement') {
      // Worst-first: ascending achievement; KPIs without a value sort last regardless of direction.
      rows = [...rows].sort((a, b) => {
        const av = achByKpiId.get(a.id)?.achievement;
        const bv = achByKpiId.get(b.id)?.achievement;
        if (av == null && bv == null) return a.name.localeCompare(b.name);
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av - bv) * dir;
      });
    } else {
      // Numeric-aware sort (S-127): compare numbers as numbers, everything else lexically.
      rows = [...rows].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sortKey];
        const bv = (b as unknown as Record<string, unknown>)[sortKey];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
      });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKpis, search, statusFilter, ownerFilter, perspectiveFilter, validationFilter, bandFilter, sortKey, sortOrder, achByKpiId, perspectiveIdByKpiId, validationByKpiId, resolveBand]);

  // ── Filter option lists (anchor 16 chips) ─────────────────────────────────
  const bandList = useMemo<ThresholdBand[]>(() => {
    const m = new Map<string, ThresholdBand>();
    (schemesQ.data ?? []).forEach((s) => (s.bands ?? []).forEach((b) => { if (!m.has(b.key)) m.set(b.key, b); }));
    return [...m.values()].sort((a, b) => b.min_score - a.min_score);
  }, [schemesQ.data]);
  const perspectiveNameById = useMemo(
    () => new Map((perspectivesQ.data ?? []).map((p) => [p.id, p.name])),
    [perspectivesQ.data],
  );
  // Owners actually present on some KPI, plus a "No owner" bucket when any KPI is unowned.
  const ownerOptionList = useMemo(() => {
    const ids = new Set<string>();
    let anyNone = false;
    allKpis.forEach((k) => { if (k.accountable_owner_id) ids.add(k.accountable_owner_id); else anyNone = true; });
    const named = [...ids]
      .map((id) => ({ id, name: profilesQ.data?.get(id)?.name ?? 'Unknown' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { named, anyNone };
  }, [allKpis, profilesQ.data]);

  const VALIDATION_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' }, { value: 'validated', label: 'Validated' },
    { value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' },
    { value: 'quarantined', label: 'Quarantined' }, { value: 'none', label: 'No data' },
  ];
  const bandLabel = bandFilter === 'all' ? 'All'
    : bandFilter === 'exceptions' ? 'Below threshold'
    : (resolveBand(bandFilter)?.label ?? bandFilter);
  const perspectiveLabel = perspectiveFilter === 'all' ? 'All' : (perspectiveNameById.get(perspectiveFilter) ?? 'Unknown');
  const ownerLabel = ownerFilter === 'all' ? 'All'
    : ownerFilter === 'none' ? 'No owner'
    : (profilesQ.data?.get(ownerFilter)?.name ?? 'Unknown');
  const validationLabel = VALIDATION_OPTIONS.find((o) => o.value === validationFilter)?.label ?? 'All';

  const hasActiveFilters = statusFilter !== 'all' || bandFilter !== 'all'
    || perspectiveFilter !== 'all' || ownerFilter !== 'all' || validationFilter !== 'all' || search.trim() !== '';
  const filterSummary = [
    bandFilter === 'exceptions' ? 'below-threshold bands' : bandFilter !== 'all' ? `${bandLabel} band` : null,
    perspectiveFilter !== 'all' ? `${perspectiveLabel} perspective` : null,
    ownerFilter !== 'all' ? (ownerFilter === 'none' ? 'unowned KPIs' : `owner ${ownerLabel}`) : null,
    validationFilter !== 'all' ? (validationFilter === 'none' ? 'no reported data' : `${validationLabel.toLowerCase()} validation`) : null,
    statusFilter !== 'all' ? `${statusFilter.replace('_', ' ')} status` : null,
    search.trim() ? `“${search.trim()}”` : null,
  ].filter(Boolean).join(' · ');
  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setBandFilter('all'); setPerspectiveFilter('all');
    setOwnerFilter('all'); setValidationFilter('all'); setActiveViewId(null);
  };

  // ── Saved views: apply / save / delete ─────────────────────────────────────
  const currentViewConfig = (): Record<string, unknown> => ({
    search, statusFilter, bandFilter, perspectiveFilter, ownerFilter, validationFilter, sortKey, sortOrder,
  });
  const applySavedView = (v: StrataSavedView) => {
    const c = v.config as Record<string, unknown>;
    setSearch(typeof c.search === 'string' ? c.search : '');
    setStatusFilter((c.statusFilter as GovernedStatus | 'all') ?? 'all');
    setBandFilter((c.bandFilter as string) ?? 'all');
    setPerspectiveFilter((c.perspectiveFilter as string) ?? 'all');
    setOwnerFilter((c.ownerFilter as string) ?? 'all');
    setValidationFilter((c.validationFilter as string) ?? 'all');
    setSortKey((c.sortKey as string) ?? 'achievement');
    setSortOrder((c.sortOrder as SortOrder) ?? 'ASC');
    setActiveViewId(v.id);
  };
  const applyMyExceptions = () => {
    setSearch(''); setStatusFilter('all'); setPerspectiveFilter('all'); setOwnerFilter('all');
    setValidationFilter('all'); setSortKey('achievement'); setSortOrder('ASC');
    setBandFilter('exceptions'); setActiveViewId('__exceptions__');
  };
  const deleteActiveView = async () => {
    if (!activeViewId || activeViewId.startsWith('__')) return;
    await kpiApi.deleteSavedView(activeViewId);
    setActiveViewId(null);
    invalidate();
  };
  const savedViews = savedViewsQ.data ?? [];
  const activeViewLabel = activeViewId === '__exceptions__' ? 'My exceptions'
    : (savedViews.find((v) => v.id === activeViewId)?.name ?? 'Saved views');
  const sortSummary = sortKey === 'achievement'
    ? `achievement, ${sortOrder === 'ASC' ? 'worst first' : 'best first'}`
    : `${sortKey}, ${sortOrder === 'ASC' ? 'ascending' : 'descending'}`;

  const clearSelection = () => setSelection(new Set());

  // Export = client-side CSV of the selected rows (read-only, safe — no server call).
  const exportSelectedCsv = () => {
    const rows = filtered.filter((k) => selection.has(k.id));
    if (rows.length === 0) return;
    const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const header = ['Name', 'Status', 'Unit', 'Direction', 'Frequency', 'Owner'];
    const lines = [header.join(',')];
    rows.forEach((k) => {
      const owner = k.accountable_owner_id ? (profilesQ.data?.get(k.accountable_owner_id)?.name ?? '') : '';
      lines.push([k.name, k.status, k.unit, k.direction, k.frequency, owner].map(esc).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strata-kpis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Governed bulk write — loops strata_update_kpi server-side; approved KPIs come back rejected.
  const runBulk = async (patch: { accountableOwnerId?: string; thresholdSchemeId?: string }) => {
    setBulkBusy(true);
    try {
      const res = await kpiApi.bulkUpdate({ kpiIds: [...selection], ...patch });
      setBulkResult(res);
      setBulkModal(null);
      clearSelection();
      invalidate();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkActions = useMemo<BulkAction[]>(() => [
    ...(canAuthor ? [
      { label: 'Change owner…', onClick: () => setBulkModal('owner'), disabled: bulkBusy },
      { label: 'Assign threshold scheme…', onClick: () => setBulkModal('scheme'), disabled: bulkBusy },
    ] : []),
    { label: 'Export', onClick: exportSelectedCsv },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canAuthor, bulkBusy, selection, filtered, profilesQ.data]);

  // Verdict-first columns (anchor 16): KPI·objective · Achievement · Actual · Target · Δ ·
  // Validation · Owner · Freshness (DRIFT-5 — no trend spark; Actual/Target split; Δ added).
  // Achievement/Actual/Target come from the per-row achievement RPC; Δ/Validation/Freshness
  // from a per-row actuals fetch (deduped by React Query).
  const columns = useMemo<Column<StrataKpi>[]>(() => [
    {
      id: 'name',
      label: 'KPI · objective',
      width: 24,
      sortable: true,
      alwaysVisible: true,
      cell: ({ row }) => {
        const objective = objectiveByKpiId.get(row.id);
        return (
          <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <KpiNameLink row={row} onOpen={() => { if (row.slug) navigate(Routes.strata.kpi(row.slug)); }} />
              <StrataGovernedStatusLozenge status={row.status} />
            </span>
            {objective ? (
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ↑ {objective}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      id: 'achievement',
      label: 'Achievement',
      width: 14,
      sortable: true,
      cell: ({ row }) => <KpiAchievementCell kpiId={row.id} />,
    },
    {
      id: 'actual',
      label: 'Actual',
      width: 10,
      cell: ({ row }) => <KpiValueCell kpiId={row.id} unit={row.unit} field="actual" />,
    },
    {
      id: 'target',
      label: 'Target',
      width: 10,
      cell: ({ row }) => <KpiValueCell kpiId={row.id} unit={row.unit} field="target" />,
    },
    {
      id: 'delta',
      label: 'Δ',
      width: 8,
      sortable: false,
      cell: ({ row }) => <KpiDeltaCell kpiId={row.id} direction={row.direction} />,
    },
    {
      id: 'validation',
      label: 'Validation',
      width: 12,
      cell: ({ row }) => <KpiValidationCell kpiId={row.id} />,
    },
    {
      id: 'owner',
      label: 'Owner',
      width: 12,
      cell: ({ row }) => <KpiOwnerCell ownerId={row.accountable_owner_id} profiles={profilesQ.data} />,
    },
    {
      id: 'freshness',
      label: 'Freshness',
      width: 10,
      sortable: false,
      cell: ({ row }) => <KpiFreshnessCell kpiId={row.id} />,
    },
  ], [navigate, profilesQ.data, objectiveByKpiId]);

  const statusLabel = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All statuses';

  return (
    <StrataPageShell testId="strata-kpi-library-chrome">
      {kpisQ.isError ? (
        <SectionMessage appearance="error" title="Failed to load KPI library">
          <p>{(kpisQ.error as Error)?.message ?? 'Unknown error'}</p>
        </SectionMessage>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bulkResult ? (
            <SectionMessage
              appearance={bulkResult.failed === 0 ? 'success' : 'warning'}
              title={`Bulk update — ${bulkResult.applied} applied${bulkResult.failed ? `, ${bulkResult.failed} not applied` : ''}`}
              actions={[{ key: 'dismiss', text: 'Dismiss', onClick: () => setBulkResult(null) }]}
            >
              {bulkResult.failed > 0 ? (
                <p>
                  {bulkResult.failed} KPI{bulkResult.failed === 1 ? ' was' : 's were'} not changed —
                  approved KPIs can’t be edited in place. Retire and recreate to change an approved KPI.
                </p>
              ) : (
                <p>Changes on draft KPIs still route through the normal approval step before they go live.</p>
              )}
            </SectionMessage>
          ) : null}
          <StrataPanel
            title="KPI dictionary"
            icon={<Activity size={16} />}
            count={filtered.length}
            testId="strata-kpi-library-panel"
            noPadding
            actions={
              <>
                <div style={{ width: 240 }}>
                  <Textfield
                    spacing="compact"
                    placeholder="Search KPIs by name"
                    value={search}
                    onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                    aria-label="Search KPIs by name"
                  />
                </div>
                {canAuthor ? (
                  <Button
                    appearance="primary"
                    spacing="compact"
                    iconBefore={<Plus size={14} />}
                    onClick={() => { newKpiIdRef.current = null; setNewKpiOpen(true); }}
                    testId="strata-new-kpi"
                  >
                    New KPI
                  </Button>
                ) : null}
              </>
            }
          >
            {/* Filter toolbar (anchor 16): Status · Band · Perspective · Owner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)', flexWrap: 'wrap', padding: 'var(--ds-space-150) var(--ds-space-200)', borderBottom: `1px solid ${T.border}` }}>
              <StrataChipMenu
                value={statusLabel}
                active={statusFilter !== 'all'}
                aria-label="Filter KPIs by status"
                options={STATUS_FILTER_OPTIONS.map((o) => ({
                  key: String(o.value), label: o.label,
                  isSelected: o.value === statusFilter, onClick: () => setStatusFilter(o.value),
                }))}
              />
              <StrataChipMenu
                value={`Band: ${bandLabel}`}
                active={bandFilter !== 'all'}
                aria-label="Filter KPIs by band"
                options={[
                  { key: 'all', label: 'All bands', isSelected: bandFilter === 'all', onClick: () => setBandFilter('all') },
                  { key: 'exceptions', label: 'Below threshold', isSelected: bandFilter === 'exceptions', onClick: () => setBandFilter('exceptions') },
                  ...bandList.map((b) => ({
                    key: b.key, label: b.label, isSelected: bandFilter === b.key, onClick: () => setBandFilter(b.key),
                  })),
                ]}
              />
              <StrataChipMenu
                value={`Perspective: ${perspectiveLabel}`}
                active={perspectiveFilter !== 'all'}
                aria-label="Filter KPIs by perspective"
                options={[
                  { key: 'all', label: 'All perspectives', isSelected: perspectiveFilter === 'all', onClick: () => setPerspectiveFilter('all') },
                  ...(perspectivesQ.data ?? []).map((p) => ({
                    key: p.id, label: p.name, isSelected: perspectiveFilter === p.id, onClick: () => setPerspectiveFilter(p.id),
                  })),
                ]}
              />
              <StrataChipMenu
                value={`Owner: ${ownerLabel}`}
                active={ownerFilter !== 'all'}
                aria-label="Filter KPIs by owner"
                options={[
                  { key: 'all', label: 'All owners', isSelected: ownerFilter === 'all', onClick: () => setOwnerFilter('all') },
                  ...(ownerOptionList.anyNone ? [{ key: 'none', label: 'No owner', isSelected: ownerFilter === 'none', onClick: () => setOwnerFilter('none') }] : []),
                  ...ownerOptionList.named.map((o) => ({
                    key: o.id, label: o.name, isSelected: ownerFilter === o.id, onClick: () => setOwnerFilter(o.id),
                  })),
                ]}
              />
              <StrataChipMenu
                value={`Validation: ${validationLabel}`}
                active={validationFilter !== 'all'}
                aria-label="Filter KPIs by validation"
                options={VALIDATION_OPTIONS.map((o) => ({
                  key: o.value, label: o.value === 'all' ? 'All validation' : o.label,
                  isSelected: o.value === validationFilter, onClick: () => setValidationFilter(o.value),
                }))}
              />
              {/* Saved views (per-user) — right-aligned */}
              <div style={{ marginLeft: 'auto' }}>
                <StrataChipMenu
                  value={activeViewLabel}
                  active={activeViewId !== null}
                  aria-label="Saved views"
                  options={[
                    { key: '__exceptions__', label: 'My exceptions', isSelected: activeViewId === '__exceptions__', onClick: applyMyExceptions },
                    ...savedViews.map((v) => ({ key: v.id, label: v.name, isSelected: activeViewId === v.id, onClick: () => applySavedView(v) })),
                    { key: '__save__', label: 'Save current view…', isSelected: false, onClick: () => setSaveViewOpen(true) },
                    ...(activeViewId && !activeViewId.startsWith('__')
                      ? [{ key: '__delete__', label: 'Delete this view', isSelected: false, onClick: () => { void deleteActiveView(); } }]
                      : []),
                  ]}
                />
              </div>
            </div>

            {/* Filter summary bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-150)', flexWrap: 'wrap', padding: 'var(--ds-space-100) var(--ds-space-200)', borderBottom: `1px solid ${T.border}`, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
              <span>
                Showing <strong style={{ color: T.text }}>{filtered.length}</strong> of {allKpis.length}
                {filterSummary ? <> — filtered to {filterSummary}</> : null}
              </span>
              {hasActiveFilters ? (
                <Button appearance="subtle-link" spacing="none" onClick={clearFilters} testId="strata-kpi-clear-filters">
                  Clear filters
                </Button>
              ) : null}
              <span style={{ marginLeft: 'auto', color: T.subtlest }}>Sorted by {sortSummary}</span>
            </div>

            <JiraTable<StrataKpi>
              columns={columns}
              data={filtered}
              getRowId={(row) => row.id}
              onRowClick={(row) => { if (row.slug) navigate(Routes.strata.kpi(row.slug)); }}
              selectable
              selection={selection}
              onSelectionChange={setSelection}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSortChange={(key, order) => { setSortKey(key); setSortOrder(order); }}
              density="compact"
              isLoading={kpisQ.isLoading}
              ariaLabel="KPI dictionary"
              emptyView={
                <EmptyState
                  size="compact"
                  header="No KPIs found"
                  description={search || statusFilter !== 'all'
                    ? 'No KPIs match the current search or status filter.'
                    : 'Approved KPIs in the governed dictionary will appear here.'}
                />
              }
            />
          </StrataPanel>

          <OkrPanel />
        </div>
      )}

      {/* New KPI — draft governed entry; approval is a separate step */}
      <StrataFormModal
        open={newKpiOpen}
        onClose={() => setNewKpiOpen(false)}
        title="New KPI"
        description="Creates a draft KPI in the governed dictionary. Assign owners now, or later from the KPI page. Linking to the strategy hierarchy happens after approval, from the Strategy Room. Approval is a separate governed step."
        width="large"
        fields={[
          { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'KPI name' },
          { key: 'unit', label: 'Unit', kind: 'text', placeholder: 'e.g. %, days, count' },
          { key: 'direction', label: 'Direction', kind: 'select', options: DIRECTION_OPTIONS },
          { key: 'frequency', label: 'Frequency', kind: 'select', options: FREQUENCY_OPTIONS },
          { key: 'entryMethod', label: 'Entry method', kind: 'select', options: ENTRY_METHOD_OPTIONS },
          { key: 'isStrategic', label: 'Strategic KPI', kind: 'checkbox', helper: 'Requires a governed strategy association (cycle/theme/objective/perspective) before approval (STRATA-E2E-010)' },
          { key: 'accountableOwnerId', label: 'Accountable owner', kind: 'user' },
          { key: 'dataOwnerId', label: 'Data owner', kind: 'user' },
          { key: 'reporterId', label: 'Reporter', kind: 'user' },
          { key: 'validatorId', label: 'Validator', kind: 'user', helper: 'Must differ from the submitter — enforced server-side' },
          { key: 'escalationOwnerId', label: 'Escalation owner', kind: 'user' },
        ]}
        initial={{ direction: 'higher_better', frequency: 'quarterly', entryMethod: 'upload', isStrategic: false }}
        submitLabel="Create KPI"
        onSubmit={async (v) => {
          // Create at most once per modal session (see newKpiIdRef): a failed
          // owner/link write below keeps the modal open, and a resubmit must
          // reuse the already-created draft rather than making a second one.
          if (!newKpiIdRef.current) {
            newKpiIdRef.current = await kpiApi.createKpi({
              name: String(v.name),
              unit: v.unit ? String(v.unit) : undefined,
              direction: v.direction ? String(v.direction) : undefined,
              frequency: v.frequency ? String(v.frequency) : undefined,
              entryMethod: v.entryMethod ? String(v.entryMethod) : undefined,
              isStrategic: Boolean(v.isStrategic),
            });
          }
          const newKpiId = newKpiIdRef.current;
          // Owners are a separate governed write (strata_update_kpi) — only fire
          // when at least one was set, so an unowned draft still creates cleanly.
          const hasOwner = v.accountableOwnerId || v.dataOwnerId || v.reporterId
            || v.validatorId || v.escalationOwnerId;
          if (hasOwner) {
            await kpiApi.updateKpi(newKpiId, {
              accountableOwnerId: v.accountableOwnerId ? String(v.accountableOwnerId) : undefined,
              dataOwnerId: v.dataOwnerId ? String(v.dataOwnerId) : undefined,
              reporterId: v.reporterId ? String(v.reporterId) : undefined,
              validatorId: v.validatorId ? String(v.validatorId) : undefined,
              escalationOwnerId: v.escalationOwnerId ? String(v.escalationOwnerId) : undefined,
            });
          }
          // Full success — clear so the next New KPI opens a fresh create.
          newKpiIdRef.current = null;
          invalidate();
        }}
        testId="strata-new-kpi-modal"
      />

      {/* Bulk actions footer — shows when rows are selected (anchor 16) */}
      <BulkFooterBar
        selectedCount={selection.size}
        onDeselectAll={clearSelection}
        actions={bulkActions}
        note={canAuthor ? 'Bulk changes are governed — owner changes route through approval' : undefined}
      />

      {/* Bulk: change accountable owner — governed (approved KPIs are rejected server-side) */}
      <StrataFormModal
        open={bulkModal === 'owner'}
        onClose={() => setBulkModal(null)}
        title={`Change owner · ${selection.size} KPI${selection.size === 1 ? '' : 's'}`}
        description="Reassigns the accountable owner. Draft KPIs update immediately (then follow approval); approved KPIs are rejected — retire and recreate to change an approved KPI."
        fields={[{ key: 'ownerId', label: 'Accountable owner', kind: 'user', required: true }]}
        submitLabel="Change owner"
        onSubmit={async (v) => { await runBulk({ accountableOwnerId: String(v.ownerId) }); }}
        testId="strata-bulk-owner-modal"
      />

      {/* Bulk: assign threshold scheme — governed (approved KPIs are rejected server-side) */}
      <StrataFormModal
        open={bulkModal === 'scheme'}
        onClose={() => setBulkModal(null)}
        title={`Assign threshold scheme · ${selection.size} KPI${selection.size === 1 ? '' : 's'}`}
        description="Assigns a threshold scheme. Draft KPIs update immediately (then follow approval); approved KPIs are rejected — retire and recreate to change an approved KPI."
        fields={[{
          key: 'schemeId', label: 'Threshold scheme', kind: 'select', required: true,
          options: (schemesQ.data ?? []).map((s) => ({ value: s.id, label: s.name })),
        }]}
        submitLabel="Assign scheme"
        onSubmit={async (v) => { await runBulk({ thresholdSchemeId: String(v.schemeId) }); }}
        testId="strata-bulk-scheme-modal"
      />

      {/* Save current view — persists filters + sort to strata_saved_views (per user) */}
      <StrataFormModal
        open={saveViewOpen}
        onClose={() => setSaveViewOpen(false)}
        title="Save current view"
        description="Saves the current filters and sort as a named view, visible only to you."
        fields={[{ key: 'name', label: 'View name', kind: 'text', required: true, placeholder: 'e.g. Quarterly board set' }]}
        submitLabel="Save view"
        onSubmit={async (v) => {
          const created = await kpiApi.createSavedView({ entity: 'kpi', name: String(v.name).trim(), config: currentViewConfig() });
          setActiveViewId(created.id);
          invalidate();
        }}
        testId="strata-save-view-modal"
      />
    </StrataPageShell>
  );
}
