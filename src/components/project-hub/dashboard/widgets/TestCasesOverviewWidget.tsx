// @ts-nocheck
/**
 * TestCasesOverviewWidget — TestHub canonical KPI widget.
 *
 * 2026-06-21: shows TestHub case counts by status. Reads tm_test_cases
 * filtered to the first active test-management project. Renders inside the
 * canonical WidgetWrapper so it shares chrome, collapse, refresh, edit-mode
 * affordances with every other dashboard widget.
 */
import React from 'react';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useTestCases } from '@/hooks/test-management/useTestCases';
import WidgetWrapper from '../WidgetWrapper';
import { Lozenge, EmptyState } from '@/components/ads';
import type { WidgetProps } from '../widget-types';

export default function TestCasesOverviewWidget({ collapsed, onToggleCollapse }: WidgetProps) {
  const { data: projects = [], isLoading: pl } = useProjects();
  const projectId = projects[0]?.id;
  const { data, isLoading: cl } = useTestCases(projectId);
  const total = data?.total ?? 0;
  const cases = data?.cases ?? [];

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { DRAFT: 0, REVIEW: 0, APPROVED: 0, DEPRECATED: 0 };
    for (const tc of cases) {
      const s = tc.status ?? 'DRAFT';
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [cases]);

  const isLoading = pl || cl;

  return (
    <WidgetWrapper
      title="Test cases"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerBadges={<Lozenge appearance="default">{String(total)}</Lozenge>}
    >
      {isLoading ? (
        <div style={{ padding: 24, color: 'var(--ds-text-subtlest, #6B778C)' }}>Loading…</div>
      ) : total === 0 ? (
        <EmptyState header="No test cases yet" description="Create test cases in the Repository tab to see them here." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <KpiTile label="Approved" value={counts.APPROVED} color="var(--ds-text-success, #216E4E)" />
          <KpiTile label="In review" value={counts.REVIEW} color="var(--ds-text-information, #0055CC)" />
          <KpiTile label="Draft" value={counts.DRAFT} color="var(--ds-text-subtle, #44546F)" />
          <KpiTile label="Deprecated" value={counts.DEPRECATED} color="var(--ds-text-subtlest, #626F86)" />
        </div>
      )}
    </WidgetWrapper>
  );
}

function KpiTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'var(--ds-surface-raised, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 6,
      padding: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 653, color }}>{value}</div>
    </div>
  );
}
