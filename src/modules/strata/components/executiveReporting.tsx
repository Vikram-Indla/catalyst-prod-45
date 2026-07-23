/**
 * STRATA Engine 5 — Executive Reporting read surface (CAT-STRATA-KPI-OPMODEL-20260720-001).
 * ProjectKpiTracePanel → strata_project_kpi_trace (S19): one Project Card's full governed
 * contribution chain + typed-mapping aggregation + KR provenance. Resolves ids → names
 * client-side (never render a raw UUID). Read-only; the authoritative aggregation rule lives in
 * the DB (approved, currently-effective direct_component only).
 *
 * The enterprise-wide rollup (S20 strata_executive_governed_rollup) is consumed by the Command
 * Center's "Governed KPI rollup" panel via useExecutiveGovernedRollup — not duplicated here.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, Lozenge, Spinner } from '@/components/ads';
import { kpiApi } from '@/modules/strata/domain';
import type { StrataProjectKpiTraceMapping } from '@/modules/strata/domain';
import { StrataPanel, T } from './shared';
import { labelize } from './format';

function useNameMaps(krIds: string[]) {
  const elementsQ = useQuery({ queryKey: ['strata', 'er-elements-all'], queryFn: () => kpiApi.strategyElementsAll(), staleTime: 60_000 });
  const kpisQ = useQuery({ queryKey: ['strata', 'er-kpis'], queryFn: () => kpiApi.approvedKpis(), staleTime: 60_000 });
  const krQ = useQuery({ queryKey: ['strata', 'er-kr-names', [...krIds].sort()], queryFn: () => kpiApi.keyResultNames(krIds), enabled: krIds.length > 0, staleTime: 30_000 });
  const elementName = (id: string | null | undefined) => (id ? (elementsQ.data?.find((e) => e.id === id)?.name ?? '—') : '—');
  const kpiName = (id: string | null | undefined) => (id ? (kpisQ.data?.find((k) => k.id === id)?.name ?? '—') : '—');
  const krName = (id: string | null | undefined) => (id ? (krQ.data?.find((k) => k.id === id)?.name ?? '—') : '—');
  return { elementName, kpiName, krName };
}

function AggregatesLozenge({ aggregates }: { aggregates: boolean }) {
  return aggregates
    ? <Lozenge appearance="success">Aggregates to strategic</Lozenge>
    : <Lozenge appearance="default">Non-aggregating</Lozenge>;
}

// ── S19: one Project Card's governed contribution provenance ──
export function ProjectKpiTracePanel({ projectCardId }: { projectCardId: string }) {
  const traceQ = useQuery({
    queryKey: ['strata', 'project-kpi-trace', projectCardId],
    queryFn: () => kpiApi.projectKpiTrace(projectCardId), staleTime: 0,
  });
  const trace = traceQ.data;
  const assignments = trace?.project_kpi_assignments ?? [];
  const krIds = assignments.flatMap((a) => a.contribution_mappings.flatMap((m) => m.linked_key_results.map((k) => k.key_result_id)));
  const { elementName, kpiName, krName } = useNameMaps(krIds);

  return (
    <StrataPanel title="Strategic contribution & provenance" testId="project-kpi-trace">
      {traceQ.isLoading ? <Spinner size="medium" aria-label="Loading governed trace" /> : null}
      {!traceQ.isLoading && assignments.length === 0 ? (
        <EmptyState size="compact" header="No governed contributions yet"
          description="Once a Project KPI Assignment is approved and mapped to a Strategic KPI Assignment, its governed contribution and provenance appear here. Only approved, currently-effective direct-component mappings roll up to strategic measurement." />
      ) : null}
      {assignments.length > 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {assignments.map((a) => (
            <div key={a.assignment_id} data-testid={`trace-assignment-${a.assignment_id}`}
              style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 8, background: 'var(--ds-surface-sunken)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ color: T.text }}>{kpiName(a.kpi_id)}</strong>
                <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-100)' }}>{a.assignment_key ?? ''}</span>
                <Lozenge appearance={a.status === 'approved' ? 'success' : a.status === 'retired' ? 'moved' : 'default'}>{labelize(a.status)}</Lozenge>
              </div>
              {a.contribution_mappings.length === 0 ? (
                <span style={{ color: T.subtle, fontSize: 'var(--ds-font-size-100)' }}>No contribution mappings.</span>
              ) : a.contribution_mappings.map((m: StrataProjectKpiTraceMapping) => (
                <div key={m.mapping_id} style={{ display: 'grid', gap: 4, paddingLeft: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 'var(--ds-font-size-100)' }}>
                    <Lozenge appearance={m.relationship_type === 'direct_component' ? 'inprogress' : 'default'}>{labelize(m.relationship_type)}</Lozenge>
                    <Lozenge appearance={m.status === 'approved' ? 'success' : m.status === 'retired' ? 'moved' : m.status === 'rejected' ? 'removed' : 'default'}>{labelize(m.status)}</Lozenge>
                    <AggregatesLozenge aggregates={m.aggregates} />
                  </div>
                  <div style={{ color: T.subtle, fontSize: 'var(--ds-font-size-100)' }}>
                    → Strategic KPI <strong style={{ color: T.text }}>{kpiName(m.parent_kpi_id)}</strong>
                    {' · Objective '}<strong style={{ color: T.text }}>{elementName(m.parent_strategic_objective_id)}</strong>
                  </div>
                  {m.linked_key_results.length > 0 ? (
                    <div style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-100)' }}>
                      Linked Key Results: {m.linked_key_results.map((k) => krName(k.key_result_id)).join(', ')}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </StrataPanel>
  );
}
