/**
 * STRATA Strategy Room — /strata/strategy (CAT-STRATA-20260705-001).
 * Hierarchy tree, KPI coverage and cause & effect summary for the active cycle.
 * UI computes nothing: statuses/stages/charters come straight from the DB;
 * promotion control is enforced server-side (strata_promote_element).
 * Authoring (Lane A recovery): cycle/element/charter/KPI-link/gate writes go
 * through server-validated RPCs, gated on strategy_office / strata_admin.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, CatalystTag, EmptyState, IconButton,
  Lozenge, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, SectionMessage, Select, Spinner, Textfield,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import { Routes } from '@/lib/routes';
import {
  ChevronDown, ChevronRight, Gem, GitBranch, MoveRight, Network, Target, X,
} from '@/lib/atlaskit-icons';
import {
  useElementKpis, useGateModels, useInvalidateStrata, useKpis, useMapEdges, usePerspectives,
  useThemeCharters, useProfileNames, useStrataContext, useStrataRoles, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { strategyApi } from '@/modules/strata/domain';
import { StrataChipMenu, StrataPageShell, StrataPanel, StrataStatStrip, T } from '@/modules/strata/components/shared';
import type { StrataMenuOption, StrataStat } from '@/modules/strata/components/shared';
import {
  EditElementModal, gateModelSelectOptions, NewElementModal, perspectiveSelectOptions, StrataFormModal,
  str, themeParentOptions, ThemeCharterModal,
} from '@/modules/strata/components/authoring';
import { fmtRatioPct, labelize } from '@/modules/strata/components/format';
import type { StrataKpi, StrataStrategyElement } from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];

/** SYSTEM element states (DB CHECK on strata_strategy_elements.status). */
const STATUS_APPEARANCE: Record<StrataStrategyElement['status'], LozengeAppearance> = {
  draft: 'default',
  proposed: 'default',
  active: 'inprogress',
  on_hold: 'moved',
  retired: 'removed',
};

/**
 * Per-type visual identity — element types are SYSTEM values (DB CHECK).
 * the legacy tier-2 term was consolidated into 'theme' (CAT-STRATA-HIERARCHY-20260706-001):
 * both tiers were the same business concept, so legacy rows were
 * relabeled to 'theme' and no longer need a distinct entry here.
 */
const TYPE_META: Record<string, { icon: React.ComponentType<{ size?: number }>; bg: string; fg: string }> = {
  theme: { icon: Gem, bg: 'var(--ds-background-selected)', fg: 'var(--ds-text-brand)' },
  objective: { icon: Target, bg: 'var(--ds-background-success)', fg: 'var(--ds-text-success)' },
};

function TypeChip({ type }: { type: string }) {
  const meta = TYPE_META[type];
  const Icon = meta?.icon;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
        padding: '4px 8px', borderRadius: 4,
        background: meta?.bg ?? T.neutral, color: meta?.fg ?? T.subtle,
        fontSize: 'var(--ds-font-size-050)', fontWeight: 600, whiteSpace: 'nowrap',
      }}
    >
      {Icon ? <Icon size={13} /> : null}
      {labelize(type)}
    </span>
  );
}

/** Hover states need real :hover — inline styles cannot express them. Tokens only. */
const TREE_CSS = `
.strata-tree-row { transition: background 80ms ease; }
.strata-tree-row:hover { background: var(--ds-surface-sunken); }
.strata-row-actions { opacity: 0; transition: opacity 80ms ease; }
.strata-tree-row:hover .strata-row-actions,
.strata-tree-row:focus-within .strata-row-actions { opacity: 1; }
`;

/** Roles allowed to author strategy structure — UI gate only; DB RPCs enforce. */
const AUTHOR_ROLES = ['strategy_office', 'strata_admin'] as const;
/** SYSTEM granularities (DB CHECK on strata_cycles.period_granularity). */
const GRANULARITIES = ['month', 'quarter', 'half', 'year'] as const;

/** One authoring surface open at a time — row menus and header actions feed this. */
type AuthoringState =
  | { kind: 'create-cycle' }
  | { kind: 'create-element' }
  | { kind: 'edit-element'; element: StrataStrategyElement }
  | { kind: 'retire-element'; element: StrataStrategyElement }
  | { kind: 'charter'; element: StrataStrategyElement }
  | { kind: 'kpi-links'; element: StrataStrategyElement };

function AuthoringFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtle }}>
      {children}
    </div>
  );
}

/**
 * KPI set linking for one element — link approved KPIs, unlink existing.
 * Needs in-place unlink actions, so it composes ads primitives directly
 * (StrataFormModal only submits once and closes).
 */
function KpiLinksModal({
  element, links, kpis, onClose, onChanged,
}: {
  element: StrataStrategyElement;
  links: Array<{ element_id: string; kpi_id: string; weight: number | null }>;
  kpis: StrataKpi[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [kpiId, setKpiId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [contribution, setContribution] = useState<'direct' | 'supporting'>('direct');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kpiById = useMemo(() => new Map(kpis.map((k) => [k.id, k])), [kpis]);
  const linkedIds = new Set(links.map((l) => l.kpi_id));
  const kpiOptions: SelectOption<string>[] = kpis
    .filter((k) => k.status === 'approved' && !linkedIds.has(k.id))
    .map((k) => ({ value: k.id, label: k.name }));
  const contributionOptions: SelectOption<string>[] = [
    { value: 'direct', label: 'Direct' },
    { value: 'supporting', label: 'Supporting' },
  ];

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    if (!kpiId) { setError('Required: KPI'); return; }
    const w = weight === '' ? null : Number(weight);
    if (w != null && (Number.isNaN(w) || w < 0 || w > 100)) {
      setError('Weight must be between 0 and 100.');
      return;
    }
    const ok = await run(() => strategyApi.linkElementKpi(element.id, kpiId, w ?? undefined, contribution));
    if (ok) { setKpiId(null); setWeight(''); }
  };

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} width="medium" testId="strata-kpi-links-modal">
      <ModalHeader><ModalTitle>KPI links — {element.name}</ModalTitle></ModalHeader>
      <ModalBody>
        {links.length === 0 ? (
          <p style={{ margin: '0 0 12px', fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
            No KPIs linked to this element yet.
          </p>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {links.map((l) => (
              <div
                key={l.kpi_id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}
              >
                <span style={{ flex: 1, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>
                  {kpiById.get(l.kpi_id)?.name ?? '—'}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
                  {l.weight != null ? `Weight ${l.weight}` : '—'}
                </span>
                <Button
                  spacing="compact"
                  appearance="subtle"
                  isDisabled={busy}
                  onClick={() => run(() => strategyApi.unlinkElementKpi(element.id, l.kpi_id))}
                >
                  Unlink
                </Button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <AuthoringFieldLabel>KPI (approved)</AuthoringFieldLabel>
            <Select
              options={kpiOptions}
              value={kpiOptions.find((o) => o.value === kpiId) ?? null}
              onChange={(next) => setKpiId(next?.value ?? null)}
              placeholder="Select KPI…"
              isSearchable
              usePortal
              aria-label="KPI"
            />
          </div>
          <div>
            <AuthoringFieldLabel>Weight (0–100)</AuthoringFieldLabel>
            <Textfield
              type="number"
              value={weight}
              onChange={(e) => setWeight((e.target as HTMLInputElement).value)}
              aria-label="Weight"
            />
          </div>
          <div>
            <AuthoringFieldLabel>Contribution</AuthoringFieldLabel>
            <Select
              options={contributionOptions}
              value={contributionOptions.find((o) => o.value === contribution) ?? null}
              onChange={(next) => setContribution((next?.value as 'direct' | 'supporting') ?? 'direct')}
              usePortal
              aria-label="Contribution"
            />
          </div>
        </div>
        {error ? (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title="Action rejected">
              <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
            </SectionMessage>
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={busy}>Close</Button>
        <Button appearance="primary" onClick={link} isDisabled={busy}>
          {busy ? 'Working…' : 'Link KPI'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function StrataStrategyRoomPage() {
  const navigate = useNavigate();
  const { activeCycle, isLoading: contextLoading } = useStrataContext();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const edgesQ = useMapEdges(activeCycle?.id);
  const chartersQ = useThemeCharters();
  const elementKpisQ = useElementKpis();
  const kpisQ = useKpis();
  const perspectivesQ = usePerspectives();
  const profilesQ = useProfileNames();
  const gateModelsQ = useGateModels();
  const rolesQ = useStrataRoles();
  const invalidate = useInvalidateStrata();

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [perspectiveFilter, setPerspectiveFilter] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<StrataStrategyElement | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [authoring, setAuthoring] = useState<AuthoringState | null>(null);

  const canAuthor = (rolesQ.data ?? []).some((r) => (AUTHOR_ROLES as readonly string[]).includes(r));
  const closeAuthoring = () => setAuthoring(null);

  const elements = useMemo(() => elementsQ.data ?? [], [elementsQ.data]);
  const perspectives = perspectivesQ.data ?? [];
  const charters = chartersQ.data ?? [];
  const elementKpis = elementKpisQ.data ?? [];
  const kpis = kpisQ.data ?? [];
  const edges = edgesQ.data ?? [];
  const profiles = profilesQ.data;

  const elementById = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const charterByElement = useMemo(() => new Map(charters.map((c) => [c.element_id, c])), [charters]);
  const kpiById = useMemo(() => new Map(kpis.map((k) => [k.id, k])), [kpis]);
  const perspectiveName = (id: string | null): string =>
    (id ? perspectives.find((p) => p.id === id)?.name : null) ?? '—';
  const ownerName = (ownerId: string | null): string =>
    (ownerId ? profiles?.get(ownerId)?.name : null) ?? '—';

  // Executive KPI band (Command Room SRC-M3) — derived from already-loaded
  // data, zero fabrication; charter completeness matches the row lozenge rule.
  const bandStats = useMemo((): StrataStat[] => {
    const themes = elements.filter((e) => e.element_type === 'theme');
    const activeThemes = themes.filter((e) => e.status === 'active');
    const themeObjectives = elements.filter((e) => e.element_type === 'objective' && e.context === 'theme');
    const activeObjectives = themeObjectives.filter((e) => e.status === 'active');
    const chartersComplete = activeThemes.filter((t) => {
      const c = charterByElement.get(t.id);
      return !!(c && c.hypothesis && c.value_thesis && c.owner_id);
    }).length;
    const kpiLinked = new Set(elementKpis.map((l) => l.element_id));
    const objectivesMeasured = activeObjectives.filter((o) => kpiLinked.has(o.id)).length;
    return [
      { key: 'themes', label: 'Active themes', value: activeThemes.length, caption: `of ${themes.length} in cycle` },
      { key: 'objectives', label: 'Active objectives', value: activeObjectives.length, caption: 'strategic objectives' },
      {
        key: 'charters', label: 'Charters complete', value: `${chartersComplete}/${activeThemes.length}`,
        caption: chartersComplete < activeThemes.length ? 'governance drift' : 'all active themes chartered',
        captionTone: chartersComplete < activeThemes.length ? 'warning' : 'success',
      },
      {
        key: 'coverage', label: 'Objectives measured', value: `${objectivesMeasured}/${activeObjectives.length}`,
        caption: objectivesMeasured < activeObjectives.length ? 'missing KPI links' : 'full KPI coverage',
        captionTone: objectivesMeasured < activeObjectives.length ? 'warning' : 'success',
      },
    ];
  }, [elements, charterByElement, elementKpis]);

  const distinctTypes = useMemo(
    () => Array.from(new Set(elements.map((e) => e.element_type))),
    [elements],
  );
  const distinctStatuses = useMemo(
    () => Array.from(new Set(elements.map((e) => e.status))),
    [elements],
  );

  // Filtered flat set; children of hidden parents surface as roots.
  const { roots, childrenOf, filteredCount } = useMemo(() => {
    const filtered = elements.filter((el) =>
      (typeFilter === null || el.element_type === typeFilter) &&
      (statusFilter === null || el.status === statusFilter) &&
      (perspectiveFilter === null || el.perspective_id === perspectiveFilter));
    const visibleIds = new Set(filtered.map((e) => e.id));
    const children = new Map<string, StrataStrategyElement[]>();
    const rootList: StrataStrategyElement[] = [];
    filtered.forEach((el) => {
      if (el.parent_id && visibleIds.has(el.parent_id)) {
        const list = children.get(el.parent_id) ?? [];
        list.push(el);
        children.set(el.parent_id, list);
      } else {
        rootList.push(el);
      }
    });
    const byOrder = (a: StrataStrategyElement, b: StrataStrategyElement) => a.order_index - b.order_index;
    rootList.sort(byOrder);
    children.forEach((list) => list.sort(byOrder));
    return { roots: rootList, childrenOf: children, filteredCount: filtered.length };
  }, [elements, typeFilter, statusFilter, perspectiveFilter]);

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Authoring option builders — approved-only, current value kept selectable.
  //    Shared with the detail pages via components/authoring.tsx so both call
  //    sites derive options identically (CAT-STRATA-THEME-DETAIL-20260710-001). ──
  const approvedPerspectiveOptions = (currentId?: string | null) => perspectiveSelectOptions(perspectives, currentId);
  const parentOptions = (excludeId?: string) => themeParentOptions(elements, excludeId);
  const gateModelOptions = (currentId?: string | null) => gateModelSelectOptions(gateModelsQ.data ?? [], currentId);

  /** Authoring row menu — every mutation is RPC-validated server-side. */
  const rowActions = (el: StrataStrategyElement): StrataMenuOption[] => [
    { key: 'edit', label: 'Edit', onClick: () => setAuthoring({ kind: 'edit-element', element: el }) },
    ...(el.element_type === 'theme'
      ? [{ key: 'charter', label: 'Charter', onClick: () => setAuthoring({ kind: 'charter', element: el }) }]
      : []),
    { key: 'kpis', label: 'KPI links', onClick: () => setAuthoring({ kind: 'kpi-links', element: el }) },
    ...(el.status !== 'retired'
      ? [{ key: 'retire', label: 'Retire…', onClick: () => setAuthoring({ kind: 'retire-element', element: el }) }]
      : []),
  ];

  const handlePromote = async (elementId: string) => {
    setPromoteError(null);
    setPromotingId(elementId);
    try {
      await strategyApi.promoteElement(elementId);
      invalidate();
      setPromoteTarget(null);
    } catch (e) {
      setPromoteError(e instanceof Error ? e.message : String(e));
      setPromoteTarget(null);
    } finally {
      setPromotingId(null);
    }
  };

  const renderNode = (el: StrataStrategyElement, depth: number): React.ReactNode => {
    const charter = el.element_type === 'theme' ? charterByElement.get(el.id) : undefined;
    const charterComplete = !!(charter && charter.hypothesis && charter.value_thesis && charter.owner_id);
    const kids = childrenOf.get(el.id) ?? [];
    const isCollapsed = collapsed.has(el.id);
    return (
      <React.Fragment key={el.id}>
        <div
          data-testid={`strata-element-row-${el.id}`}
          className="strata-tree-row"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            minHeight: 36, padding: '4px 12px',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {/* Depth rails */}
          {Array.from({ length: depth }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              style={{ alignSelf: 'stretch', width: 20, flexShrink: 0, borderLeft: `1px solid ${T.border}` }}
            />
          ))}
          {/* Expand affordance */}
          {kids.length > 0 ? (
            <IconButton
              icon={isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              appearance="subtle"
              spacing="compact"
              aria-label={isCollapsed ? `Expand ${el.name}` : `Collapse ${el.name}`}
              onClick={() => toggleCollapsed(el.id)}
            />
          ) : (
            <span aria-hidden style={{ width: 24, flexShrink: 0 }} />
          )}
          <TypeChip type={el.element_type} />
          <button
            type="button"
            onClick={() => el.slug && navigate(Routes.strata.strategyElement(el.slug))}
            disabled={!el.slug}
            style={{
              fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)', fontWeight: 600, color: T.text,
              flex: '1 1 auto', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              background: 'none', border: 'none', padding: 0, textAlign: 'left',
              cursor: el.slug ? 'pointer' : 'default', font: 'inherit',
            }}
          >
            {el.name}
          </button>
          {el.stage ? (
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 600 }}>Stage</span> {labelize(el.stage)}
            </span>
          ) : null}
          <Lozenge appearance={STATUS_APPEARANCE[el.status] ?? 'default'}>{labelize(el.status)}</Lozenge>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap' }}>
            {ownerName(el.owner_id)}
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest, whiteSpace: 'nowrap' }}>
            {perspectiveName(el.perspective_id)}
          </span>
          {el.element_type === 'theme' && !charterComplete ? (
            <Lozenge appearance="moved">Charter incomplete</Lozenge>
          ) : null}
          {canAuthor ? (
            <span className="strata-row-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {el.status === 'draft' || el.status === 'proposed' ? (
                <Button
                  spacing="compact"
                  isLoading={promotingId === el.id}
                  onClick={() => setPromoteTarget(el)}
                >
                  Promote
                </Button>
              ) : null}
              <StrataChipMenu
                value="Actions"
                aria-label={`Actions for ${el.name}`}
                options={rowActions(el)}
              />
            </span>
          ) : null}
        </div>
        {!isCollapsed ? kids.map((child) => renderNode(child, depth + 1)) : null}
      </React.Fragment>
    );
  };

  const objectives = useMemo(
    () => elements.filter((e) => e.element_type === 'objective'),
    [elements],
  );
  const kpiLinksByElement = useMemo(() => {
    const map = new Map<string, string[]>();
    elementKpis.forEach((link) => {
      const list = map.get(link.element_id) ?? [];
      list.push(link.kpi_id);
      map.set(link.element_id, list);
    });
    return map;
  }, [elementKpis]);

  const isLoading = contextLoading || elementsQ.isLoading;

  const filterControl = (
    label: string,
    value: string | null,
    display: string | null,
    onClear: () => void,
    options: StrataMenuOption[],
  ) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <StrataChipMenu
        label={label}
        value={display ?? 'All'}
        active={value !== null}
        options={options}
        aria-label={`Filter by ${label.toLowerCase()}`}
      />
      {value !== null ? (
        <IconButton
          icon={<X size={14} />}
          appearance="subtle"
          spacing="compact"
          aria-label={`Clear ${label.toLowerCase()} filter`}
          onClick={onClear}
        />
      ) : null}
    </span>
  );

  const showData = !isLoading && !elementsQ.isError && !!activeCycle && elements.length > 0;

  const filters = (
    <>
      {filterControl(
        'Type',
        typeFilter,
        typeFilter ? labelize(typeFilter) : null,
        () => setTypeFilter(null),
        [
          { key: 'all', label: 'All', isSelected: typeFilter === null, onClick: () => setTypeFilter(null) },
          ...distinctTypes.map((t) => ({
            key: t, label: labelize(t), isSelected: typeFilter === t, onClick: () => setTypeFilter(t),
          })),
        ],
      )}
      {filterControl(
        'Status',
        statusFilter,
        statusFilter ? labelize(statusFilter) : null,
        () => setStatusFilter(null),
        [
          { key: 'all', label: 'All', isSelected: statusFilter === null, onClick: () => setStatusFilter(null) },
          ...distinctStatuses.map((s) => ({
            key: s, label: labelize(s), isSelected: statusFilter === s, onClick: () => setStatusFilter(s),
          })),
        ],
      )}
      {filterControl(
        'Perspective',
        perspectiveFilter,
        perspectiveFilter ? perspectiveName(perspectiveFilter) : null,
        () => setPerspectiveFilter(null),
        [
          { key: 'all', label: 'All', isSelected: perspectiveFilter === null, onClick: () => setPerspectiveFilter(null) },
          ...perspectives.map((p) => ({
            key: p.id, label: p.name, isSelected: perspectiveFilter === p.id, onClick: () => setPerspectiveFilter(p.id),
          })),
        ],
      )}
    </>
  );

  return (
    <StrataPageShell
      headerActions={
        <span style={{ display: 'inline-flex', gap: 8 }}>
          {canAuthor ? (
            <Button onClick={() => setAuthoring({ kind: 'create-cycle' })}>New cycle</Button>
          ) : null}
          {canAuthor ? (
            <Button isDisabled={!activeCycle} onClick={() => setAuthoring({ kind: 'create-element' })}>
              New element
            </Button>
          ) : null}
          <Button appearance="primary" onClick={() => navigate(Routes.strata.strategyMap())}>
            Open Strategy Map
          </Button>
        </span>
      }
      toolbarActions={showData ? filters : undefined}
      testId="strata-strategy-room-chrome"
    >
      <style>{TREE_CSS}</style>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spinner size="large" aria-label="Loading strategy" />
        </div>
      ) : elementsQ.isError ? (
        <SectionMessage appearance="error" title="Could not load strategy elements">
          <p>{elementsQ.error instanceof Error ? elementsQ.error.message : 'Unknown error'}</p>
        </SectionMessage>
      ) : !activeCycle || elements.length === 0 ? (
        <EmptyState
          header="No strategy elements yet"
          description="This cycle has no themes or objectives. Draft the strategy structure in STRATA Configuration, then elements appear here."
          primaryAction={
            <Button onClick={() => navigate(Routes.strata.admin())}>Open Configuration</Button>
          }
        />
      ) : (
        <>
          {promoteError ? (
            <div style={{ marginBottom: 16 }}>
              <SectionMessage appearance="error" title="Promotion blocked">
                <p>{promoteError}</p>
              </SectionMessage>
            </div>
          ) : null}

          <StrataStatStrip items={bandStats} testId="strata-strategy-band" />

          {/* Hierarchy */}
          <div style={{ marginBottom: 16 }}>
            <StrataPanel
              title="Strategy hierarchy"
              icon={<GitBranch size={16} />}
              count={filteredCount}
              testId="strata-hierarchy-panel"
              noPadding
            >
              {roots.length === 0 ? (
                <div style={{ padding: 16 }}>
                  <EmptyState size="compact" header="No elements match the filters" description="Clear a filter to see the hierarchy." />
                </div>
              ) : (
                <div>{roots.map((el) => renderNode(el, 0))}</div>
              )}
            </StrataPanel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {/* KPI coverage */}
            <StrataPanel
              title="KPI coverage"
              icon={<Target size={16} />}
              count={objectives.length}
              testId="strata-kpi-coverage-panel"
            >
              {objectives.length === 0 ? (
                <EmptyState size="compact" header="No objectives in this cycle" />
              ) : (
                objectives.map((obj) => {
                  const linkedKpiIds = kpiLinksByElement.get(obj.id) ?? [];
                  return (
                    <div
                      key={obj.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                        padding: '8px 0', borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      <span style={{
                        fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text,
                        flex: '1 1 auto', minWidth: 140,
                      }}>
                        {obj.name}
                      </span>
                      {linkedKpiIds.length === 0 ? (
                        <Lozenge appearance="moved">No KPIs</Lozenge>
                      ) : (
                        linkedKpiIds.map((kpiId) => {
                          const kpi = kpiById.get(kpiId);
                          if (!kpi) return <span key={kpiId} style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>—</span>;
                          return (
                            <Button
                              key={kpiId}
                              appearance="link"
                              spacing="compact"
                              isDisabled={!kpi.slug}
                              onClick={() => { if (kpi.slug) navigate(Routes.strata.kpi(kpi.slug)); }}
                            >
                              {kpi.name}
                            </Button>
                          );
                        })
                      )}
                    </div>
                  );
                })
              )}
            </StrataPanel>

            {/* Cause & effect */}
            <StrataPanel
              title="Cause & effect"
              icon={<Network size={16} />}
              count={edges.length}
              actions={
                <Button appearance="subtle" spacing="compact" onClick={() => navigate(Routes.strata.strategyMap())}>
                  Open map
                </Button>
              }
              testId="strata-cause-effect-panel"
            >
              {edges.length === 0 ? (
                <EmptyState size="compact" header="No cause & effect links" description="Draw links between elements on the strategy map." />
              ) : (
                edges.map((edge) => {
                  const from = elementById.get(edge.from_element_id);
                  const to = elementById.get(edge.to_element_id);
                  return (
                    <div
                      key={edge.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                        padding: '8px 0', borderBottom: `1px solid ${T.border}`,
                        fontSize: 'var(--ds-font-size-200)',
                      }}
                    >
                      <span style={{ color: T.text, fontWeight: 600 }}>{from?.name ?? '—'}</span>
                      <span aria-hidden style={{ display: 'inline-flex', color: T.subtlest }}><MoveRight size={14} /></span>
                      <span style={{ color: T.text, fontWeight: 600 }}>{to?.name ?? '—'}</span>
                      <CatalystTag text={labelize(edge.relationship_type)} />
                      <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtle, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                        {edge.confidence != null ? `Confidence ${fmtRatioPct(edge.confidence)}` : '—'}
                      </span>
                    </div>
                  );
                })
              )}
            </StrataPanel>
          </div>

          {/* Promote confirmation */}
          <Modal
            isOpen={promoteTarget !== null}
            onClose={() => { if (!promotingId) setPromoteTarget(null); }}
            width="small"
          >
            <ModalHeader>
              <ModalTitle>Promote element</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p style={{ margin: 0, fontSize: 'var(--ds-font-size-200)', color: T.text }}>
                Promote <strong>{promoteTarget?.name ?? '—'}</strong> to active?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>
                Promotion is enforced server-side and is blocked if charter or gate requirements are not met.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" isDisabled={!!promotingId} onClick={() => setPromoteTarget(null)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isLoading={promotingId !== null && promotingId === promoteTarget?.id}
                onClick={() => { if (promoteTarget) handlePromote(promoteTarget.id); }}
              >
                Promote
              </Button>
            </ModalFooter>
          </Modal>
        </>
      )}

      {/* ── Authoring modals (Lane A) — all writes are server-validated RPCs; ──
          rejections surface verbatim inside each modal. Rendered outside the
          data branch so cycle/element creation works from the empty state. */}
      {authoring?.kind === 'create-cycle' ? (
        <StrataFormModal
          open
          onClose={closeAuthoring}
          title="New cycle"
          fields={[
            { key: 'name', label: 'Name', kind: 'text', required: true },
            { key: 'startsOn', label: 'Starts on', kind: 'date', required: true },
            { key: 'endsOn', label: 'Ends on', kind: 'date', required: true },
            {
              key: 'granularity', label: 'Period granularity', kind: 'select', required: true,
              options: GRANULARITIES.map((g) => ({ value: g, label: labelize(g) })),
            },
            { key: 'description', label: 'Description', kind: 'textarea' },
            { key: 'generatePeriods', label: 'Generate periods', kind: 'checkbox', placeholder: 'Generate periods for this cycle after creation' },
          ]}
          initial={{ granularity: 'quarter', generatePeriods: true }}
          submitLabel="Create cycle"
          testId="strata-create-cycle-modal"
          onSubmit={async (v) => {
            const cycleId = await strategyApi.createCycle({
              name: String(v.name), startsOn: String(v.startsOn), endsOn: String(v.endsOn),
              granularity: str(v.granularity), description: str(v.description),
            });
            if (v.generatePeriods) await strategyApi.generatePeriods(cycleId);
            invalidate();
          }}
        />
      ) : null}

      {authoring?.kind === 'create-element' && activeCycle ? (
        <NewElementModal
          cycleId={activeCycle.id}
          cycleName={activeCycle.name}
          themeOptions={parentOptions()}
          perspectiveOptions={approvedPerspectiveOptions()}
          onClose={closeAuthoring}
          onCreated={invalidate}
        />
      ) : null}

      {authoring?.kind === 'edit-element' ? (
        <EditElementModal
          element={authoring.element}
          perspectiveOptions={approvedPerspectiveOptions(authoring.element.perspective_id)}
          parentOptions={parentOptions(authoring.element.id)}
          onClose={closeAuthoring}
          onSaved={invalidate}
        />
      ) : null}

      {authoring?.kind === 'retire-element' ? (
        <StrataFormModal
          open
          onClose={closeAuthoring}
          title="Retire element"
          description={<>Retire <strong>{authoring.element.name}</strong>? A reason is required for the audit trail.</>}
          fields={[{ key: 'reason', label: 'Reason', kind: 'textarea', required: true }]}
          submitLabel="Retire"
          testId="strata-retire-element-modal"
          onSubmit={async (v) => {
            await strategyApi.retireElement(authoring.element.id, String(v.reason));
            invalidate();
          }}
        />
      ) : null}

      {authoring?.kind === 'charter' ? (
        <ThemeCharterModal
          element={authoring.element}
          charter={charterByElement.get(authoring.element.id)}
          gateModelOptions={gateModelOptions(charterByElement.get(authoring.element.id)?.gate_model_id)}
          onClose={closeAuthoring}
          onSaved={invalidate}
        />
      ) : null}

      {authoring?.kind === 'kpi-links' ? (
        <KpiLinksModal
          element={authoring.element}
          links={elementKpis.filter((l) => l.element_id === authoring.element.id)}
          kpis={kpis}
          onClose={closeAuthoring}
          onChanged={invalidate}
        />
      ) : null}
    </StrataPageShell>
  );
}
