/**
 * STRATA Strategy Element Detail — /strata/strategy/elements/:slug
 * (CAT-STRATA-HIERARCHY-20260706-001).
 * Composes existing read hooks only — no new RPCs, no new writes. Summary,
 * Charter (Theme only), KPI links, Strategy Map edges, and audit trail for
 * one strategy element.
 *
 * Deliberately out of scope for this slice: a Project Cards section (Project
 * Card -> Theme linkage lives in the separate, uncommitted Execution
 * Reconciliation branch and isn't present in this worktree) and an
 * element-specific Evidence drilldown (no existing query scopes evidence to
 * one element today — would be new read-path design, not composition of
 * existing hooks).
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState, Lozenge, Spinner } from '@/components/ads';
import { GitBranch, Network, Target } from '@/lib/atlaskit-icons';
import { Routes } from '@/lib/routes';
import {
  useElementKpis, useKpis, useMapEdges, usePerspectives, usePlayCharters,
  useProfileNames, useStrataAudit, useStrategyElementBySlug, useStrategyElements,
} from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { fmtDateTime, labelize } from '@/modules/strata/components/format';

const STATUS_APPEARANCE: Record<string, React.ComponentProps<typeof Lozenge>['appearance']> = {
  draft: 'default',
  proposed: 'inprogress',
  active: 'success',
  on_hold: 'moved',
  retired: 'removed',
};

export default function StrataStrategyElementDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const elementQ = useStrategyElementBySlug(slug);
  const element = elementQ.data;

  const elementsQ = useStrategyElements(element?.cycle_id);
  const mapEdgesQ = useMapEdges(element?.cycle_id);
  const chartersQ = usePlayCharters();
  const elementKpisQ = useElementKpis();
  const kpisQ = useKpis();
  const perspectivesQ = usePerspectives();
  const auditQ = useStrataAudit('strata_strategy_elements');
  const profiles = useProfileNames();

  const elements = elementsQ.data ?? [];
  const elementById = new Map(elements.map((e) => [e.id, e]));
  const ownerName = (id: string | null) => (id ? profiles.data?.get(id) ?? '—' : '—');
  const perspectiveName = (id: string | null) => {
    if (!id) return '—';
    return perspectivesQ.data?.find((p) => p.id === id)?.name ?? '—';
  };

  if (elementQ.isLoading) {
    return (
      <StrataPageShell trail={[{ text: 'Strategy Room', onClick: () => navigate(Routes.strata.strategy()) }]}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>
      </StrataPageShell>
    );
  }

  if (!element) {
    return (
      <StrataPageShell trail={[{ text: 'Strategy Room', onClick: () => navigate(Routes.strata.strategy()) }]}>
        <EmptyState header="Element not found" description={`No strategy element matches "${slug}".`} />
      </StrataPageShell>
    );
  }

  const charter = element.element_type === 'theme'
    ? chartersQ.data?.find((c) => c.element_id === element.id)
    : undefined;
  const charterComplete = !!(charter && charter.hypothesis && charter.value_thesis && charter.owner_id);

  const linkedKpis = (elementKpisQ.data ?? [])
    .filter((l) => l.element_id === element.id)
    .map((l) => ({ link: l, kpi: kpisQ.data?.find((k) => k.id === l.kpi_id) }))
    .filter((r) => !!r.kpi);

  const incomingEdges = (mapEdgesQ.data ?? []).filter((e) => e.to_element_id === element.id);
  const outgoingEdges = (mapEdgesQ.data ?? []).filter((e) => e.from_element_id === element.id);

  const auditRows = (auditQ.data ?? [])
    .filter((a: { entity_id: string | null }) => a.entity_id === element.id)
    .slice(0, 20);

  const parent = element.parent_id ? elementById.get(element.parent_id) : undefined;
  const children = elements.filter((e) => e.parent_id === element.id);

  return (
    <StrataPageShell
      trail={[{ text: 'Strategy Room', onClick: () => navigate(Routes.strata.strategy()) }]}
      title={element.name}
      docTitle={element.name}
      state={element.status}
      testId="strata-strategy-element-detail"
    >
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <StrataPanel title="Summary" icon={<Target size={16} />}>
          <div style={{ display: 'grid', gap: 8, fontSize: 'var(--ds-font-size-100)' }}>
            <div><span style={{ fontWeight: 600 }}>Type</span> {labelize(element.element_type)}</div>
            <div>
              <span style={{ fontWeight: 600 }}>Status</span>{' '}
              <Lozenge appearance={STATUS_APPEARANCE[element.status] ?? 'default'}>{labelize(element.status)}</Lozenge>
            </div>
            <div><span style={{ fontWeight: 600 }}>Owner</span> {ownerName(element.owner_id)}</div>
            <div><span style={{ fontWeight: 600 }}>Perspective</span> {perspectiveName(element.perspective_id)}</div>
            <div>
              <span style={{ fontWeight: 600 }}>Parent</span>{' '}
              {parent ? (
                <button
                  type="button"
                  onClick={() => parent.slug && navigate(Routes.strata.strategyElement(parent.slug))}
                  style={{ color: T.brand, background: 'none', border: 'none', padding: 0, cursor: parent.slug ? 'pointer' : 'default', font: 'inherit' }}
                  disabled={!parent.slug}
                >
                  {parent.name}
                </button>
              ) : (
                <span style={{ color: T.subtlest }}>Root-level</span>
              )}
            </div>
            {children.length > 0 ? (
              <div>
                <span style={{ fontWeight: 600 }}>Children</span> {children.length}
              </div>
            ) : null}
          </div>
        </StrataPanel>

        {element.element_type === 'theme' ? (
          <StrataPanel
            title="Charter"
            icon={<GitBranch size={16} />}
            actions={!charterComplete ? <Lozenge appearance="moved">Incomplete</Lozenge> : undefined}
          >
            {charter ? (
              <div style={{ display: 'grid', gap: 8, fontSize: 'var(--ds-font-size-100)' }}>
                <div><span style={{ fontWeight: 600 }}>Hypothesis</span> {charter.hypothesis || '—'}</div>
                <div><span style={{ fontWeight: 600 }}>Scope</span> {charter.scope || '—'}</div>
                <div><span style={{ fontWeight: 600 }}>Value thesis</span> {charter.value_thesis || '—'}</div>
                <div><span style={{ fontWeight: 600 }}>Charter owner</span> {ownerName(charter.owner_id)}</div>
              </div>
            ) : (
              <EmptyState header="No charter yet" description="Author a charter from the Strategy Room row menu." />
            )}
          </StrataPanel>
        ) : null}

        <StrataPanel title="KPI links" icon={<Target size={16} />} count={linkedKpis.length}>
          {linkedKpis.length === 0 ? (
            <EmptyState header="No KPIs linked" description="Link a KPI from the Strategy Room row menu." />
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {linkedKpis.map(({ link, kpi }) => (
                <button
                  key={link.kpi_id}
                  type="button"
                  onClick={() => kpi?.slug && navigate(Routes.strata.kpi(kpi.slug))}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'none', border: 'none', padding: '4px 0', textAlign: 'left',
                    cursor: kpi?.slug ? 'pointer' : 'default', color: T.text, font: 'inherit',
                  }}
                >
                  <span>{kpi?.name ?? '—'}</span>
                  {link.weight != null ? <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-050)' }}>weight {link.weight}</span> : null}
                </button>
              ))}
            </div>
          )}
        </StrataPanel>

        <StrataPanel title="Map edges" icon={<Network size={16} />} count={incomingEdges.length + outgoingEdges.length}>
          {incomingEdges.length === 0 && outgoingEdges.length === 0 ? (
            <EmptyState header="No map edges" description="Create relationships on the Strategy Map." />
          ) : (
            <div style={{ display: 'grid', gap: 10, fontSize: 'var(--ds-font-size-100)' }}>
              {incomingEdges.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Incoming</div>
                  {incomingEdges.map((e) => (
                    <div key={e.id} style={{ color: T.subtle }}>
                      {elementById.get(e.from_element_id)?.name ?? '—'}
                      <span style={{ color: T.subtlest }}>
                        {' '}· {labelize(e.relationship_type)}
                        {e.confidence != null ? ` · confidence ${Math.round(e.confidence * 100)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {outgoingEdges.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Outgoing</div>
                  {outgoingEdges.map((e) => (
                    <div key={e.id} style={{ color: T.subtle }}>
                      {elementById.get(e.to_element_id)?.name ?? '—'}
                      <span style={{ color: T.subtlest }}>
                        {' '}· {labelize(e.relationship_type)}
                        {e.confidence != null ? ` · confidence ${Math.round(e.confidence * 100)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </StrataPanel>

        <StrataPanel title="Audit" icon={<GitBranch size={16} />} count={auditRows.length}>
          {auditRows.length === 0 ? (
            <EmptyState header="No audit events" description="Changes to this element will appear here." />
          ) : (
            <div style={{ display: 'grid', gap: 6, fontSize: 'var(--ds-font-size-050)' }}>
              {auditRows.map((a: { action: string | null; created_at: string; actor_id: string | null }, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: T.subtle }}>
                  <span>{a.action ?? '—'}</span>
                  <span style={{ color: T.subtlest }}>{fmtDateTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </StrataPanel>
      </div>
    </StrataPageShell>
  );
}
