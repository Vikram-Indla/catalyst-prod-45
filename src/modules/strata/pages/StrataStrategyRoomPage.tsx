/**
 * STRATA Strategy Room — /strata/strategy (CAT-STRATA-20260705-001).
 * Hierarchy tree, KPI coverage and cause & effect summary for the active cycle.
 * UI computes nothing: statuses/stages/charters come straight from the DB;
 * promotion control is enforced server-side (strata_promote_element).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Button, EmptyState, Lozenge, SectionMessage } from '@/components/ads';
import { PageContainer } from '@/components/shared/PageContainer';
import { Routes } from '@/lib/routes';
import {
  useElementKpis, useInvalidateStrata, useKpis, useMapEdges, usePerspectives,
  usePlayCharters, useStrataContext, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { strategyApi } from '@/modules/strata/domain';
import { StrataConfigContextBar, StrataPanel } from '@/modules/strata/components/shared';
import type { StrataStrategyElement } from '@/modules/strata/types';

type LozengeAppearance = React.ComponentProps<typeof Lozenge>['appearance'];

/** SYSTEM element states (DB CHECK on strata_strategy_elements.status). */
const STATUS_APPEARANCE: Record<StrataStrategyElement['status'], LozengeAppearance> = {
  draft: 'default',
  proposed: 'default',
  active: 'inprogress',
  on_hold: 'moved',
  retired: 'removed',
};

const sentenceCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s;

const typeChipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', flexShrink: 0,
  padding: '4px 8px', borderRadius: 4,
  background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)',
  fontSize: 11, fontWeight: 600,
};

export default function StrataStrategyRoomPage() {
  const navigate = useNavigate();
  const { activeCycle, isLoading: contextLoading } = useStrataContext();
  const elementsQ = useStrategyElements(activeCycle?.id);
  const edgesQ = useMapEdges(activeCycle?.id);
  const chartersQ = usePlayCharters();
  const elementKpisQ = useElementKpis();
  const kpisQ = useKpis();
  const perspectivesQ = usePerspectives();
  const invalidate = useInvalidateStrata();

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [perspectiveFilter, setPerspectiveFilter] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const elements = useMemo(() => elementsQ.data ?? [], [elementsQ.data]);
  const perspectives = perspectivesQ.data ?? [];
  const charters = chartersQ.data ?? [];
  const elementKpis = elementKpisQ.data ?? [];
  const kpis = kpisQ.data ?? [];
  const edges = edgesQ.data ?? [];

  const elementById = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const charterByElement = useMemo(() => new Map(charters.map((c) => [c.element_id, c])), [charters]);
  const kpiById = useMemo(() => new Map(kpis.map((k) => [k.id, k])), [kpis]);
  const perspectiveName = (id: string | null): string =>
    (id ? perspectives.find((p) => p.id === id)?.name : null) ?? '—';

  const distinctTypes = useMemo(
    () => Array.from(new Set(elements.map((e) => e.element_type))),
    [elements],
  );
  const distinctStatuses = useMemo(
    () => Array.from(new Set(elements.map((e) => e.status))),
    [elements],
  );

  // Filtered flat set; children of hidden parents surface as roots.
  const { roots, childrenOf } = useMemo(() => {
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
    return { roots: rootList, childrenOf: children };
  }, [elements, typeFilter, statusFilter, perspectiveFilter]);

  const handlePromote = async (elementId: string) => {
    setPromoteError(null);
    setPromotingId(elementId);
    try {
      await strategyApi.promoteElement(elementId);
      invalidate();
    } catch (e) {
      setPromoteError(e instanceof Error ? e.message : String(e));
    } finally {
      setPromotingId(null);
    }
  };

  const renderNode = (el: StrataStrategyElement, depth: number): React.ReactNode => {
    const charter = el.element_type === 'play' ? charterByElement.get(el.id) : undefined;
    const charterComplete = !!(charter && charter.hypothesis && charter.value_thesis && charter.owner_id);
    return (
      <React.Fragment key={el.id}>
        <div
          data-testid={`strata-element-row-${el.id}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            padding: '8px 8px', paddingLeft: 8 + depth * 24,
            borderBottom: '1px solid var(--ds-border)',
          }}
        >
          <span style={typeChipStyle}>{sentenceCase(el.element_type)}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text)', flex: '1 1 auto', minWidth: 120 }}>
            {el.name}
          </span>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>{el.stage ? sentenceCase(el.stage) : '—'}</span>
          <Lozenge appearance={STATUS_APPEARANCE[el.status] ?? 'default'}>{sentenceCase(el.status)}</Lozenge>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }} title={el.owner_id ?? undefined}>
            {el.owner_id ? `${el.owner_id.slice(0, 8)}…` : '—'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>{perspectiveName(el.perspective_id)}</span>
          {el.element_type === 'play' ? (
            <>
              <Lozenge appearance={charterComplete ? 'success' : 'moved'}>
                {charterComplete ? 'Charter complete' : 'Charter incomplete'}
              </Lozenge>
              {el.status !== 'active' ? (
                <Button
                  spacing="compact"
                  isLoading={promotingId === el.id}
                  onClick={() => handlePromote(el.id)}
                >
                  Promote
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
        {(childrenOf.get(el.id) ?? []).map((child) => renderNode(child, depth + 1))}
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
  const filterTriggerLabel = (prefix: string, value: string | null) => `${prefix}: ${value ?? 'All'}`;

  return (
    <PageContainer variant="wide">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 8px' }}>Strategy Room</h1>
      <StrataConfigContextBar />

      {isLoading ? (
        <div style={{ padding: 32, color: 'var(--ds-text-subtle)' }}>Loading strategy…</div>
      ) : elementsQ.isError ? (
        <SectionMessage appearance="error" title="Could not load strategy elements">
          <p>{elementsQ.error instanceof Error ? elementsQ.error.message : 'Unknown error'}</p>
        </SectionMessage>
      ) : !activeCycle || elements.length === 0 ? (
        <EmptyState
          header="No strategy elements yet"
          description="This cycle has no themes, plays or objectives. Elements appear here once the strategy office drafts them."
        />
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <DropdownMenu trigger={filterTriggerLabel('Type', typeFilter ? sentenceCase(typeFilter) : null)} shouldRenderToParent>
              <DropdownItemGroup>
                <DropdownItem isSelected={typeFilter === null} onClick={() => setTypeFilter(null)}>All</DropdownItem>
                {distinctTypes.map((t) => (
                  <DropdownItem key={t} isSelected={typeFilter === t} onClick={() => setTypeFilter(t)}>
                    {sentenceCase(t)}
                  </DropdownItem>
                ))}
              </DropdownItemGroup>
            </DropdownMenu>
            <DropdownMenu trigger={filterTriggerLabel('Status', statusFilter ? sentenceCase(statusFilter) : null)} shouldRenderToParent>
              <DropdownItemGroup>
                <DropdownItem isSelected={statusFilter === null} onClick={() => setStatusFilter(null)}>All</DropdownItem>
                {distinctStatuses.map((s) => (
                  <DropdownItem key={s} isSelected={statusFilter === s} onClick={() => setStatusFilter(s)}>
                    {sentenceCase(s)}
                  </DropdownItem>
                ))}
              </DropdownItemGroup>
            </DropdownMenu>
            <DropdownMenu
              trigger={filterTriggerLabel('Perspective', perspectiveFilter ? perspectiveName(perspectiveFilter) : null)}
              shouldRenderToParent
            >
              <DropdownItemGroup>
                <DropdownItem isSelected={perspectiveFilter === null} onClick={() => setPerspectiveFilter(null)}>All</DropdownItem>
                {perspectives.map((p) => (
                  <DropdownItem key={p.id} isSelected={perspectiveFilter === p.id} onClick={() => setPerspectiveFilter(p.id)}>
                    {p.name}
                  </DropdownItem>
                ))}
              </DropdownItemGroup>
            </DropdownMenu>
            <div style={{ marginLeft: 'auto' }}>
              <Button appearance="primary" onClick={() => navigate(Routes.strata.strategyMap())}>
                Open Strategy Map
              </Button>
            </div>
          </div>

          {promoteError ? (
            <div style={{ marginBottom: 16 }}>
              <SectionMessage appearance="error" title="Promotion blocked">
                <p>{promoteError}</p>
              </SectionMessage>
            </div>
          ) : null}

          {/* Hierarchy */}
          <div style={{ marginBottom: 16 }}>
            <StrataPanel title="Strategy hierarchy" testId="strata-hierarchy-panel">
              {roots.length === 0 ? (
                <EmptyState size="compact" header="No elements match the filters" description="Clear a filter to see the hierarchy." />
              ) : (
                <div>{roots.map((el) => renderNode(el, 0))}</div>
              )}
            </StrataPanel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {/* KPI coverage */}
            <StrataPanel title="KPI coverage" testId="strata-kpi-coverage-panel">
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
                        padding: '8px 0', borderBottom: '1px solid var(--ds-border)',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text)', flex: '1 1 auto', minWidth: 140 }}>
                        {obj.name}
                      </span>
                      {linkedKpiIds.length === 0 ? (
                        <Lozenge appearance="moved">No KPIs</Lozenge>
                      ) : (
                        linkedKpiIds.map((kpiId) => {
                          const kpi = kpiById.get(kpiId);
                          if (!kpi) return <span key={kpiId} style={{ fontSize: 12, color: 'var(--ds-text-subtlest)' }}>—</span>;
                          return (
                            <Button
                              key={kpiId}
                              appearance="subtle"
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
              title={
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(Routes.strata.strategyMap())}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(Routes.strata.strategyMap()); } }}
                  style={{ cursor: 'pointer' }}
                  title="Open the strategy map"
                >
                  Cause &amp; effect ({edges.length})
                </span>
              }
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
                        padding: '8px 0', borderBottom: '1px solid var(--ds-border)', fontSize: 13,
                      }}
                    >
                      <span style={{ color: 'var(--ds-text)', fontWeight: 600 }}>{from?.name ?? '—'}</span>
                      <span style={{ color: 'var(--ds-text-subtlest)' }}>→</span>
                      <span style={{ color: 'var(--ds-text)', fontWeight: 600 }}>{to?.name ?? '—'}</span>
                      <span style={typeChipStyle}>{sentenceCase(edge.relationship_type)}</span>
                      <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)', marginLeft: 'auto' }}>
                        {edge.confidence != null ? `confidence ${edge.confidence}` : '—'}
                      </span>
                    </div>
                  );
                })
              )}
            </StrataPanel>
          </div>
        </>
      )}
    </PageContainer>
  );
}
