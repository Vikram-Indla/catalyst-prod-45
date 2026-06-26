/**
 * TestCyclesProgressWidget — TestHub canonical cycles widget.
 *
 * 2026-06-21: lists active test cycles with execution + pass-rate progress.
 */
import React from 'react';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useTestCycles } from '@/hooks/test-management/useTestCycles';
import WidgetWrapper from '../WidgetWrapper';
import { Lozenge, EmptyState } from '@/components/ads';
import type { WidgetProps } from '../widget-types';

export default function TestCyclesProgressWidget({ collapsed, onToggleCollapse }: WidgetProps) {
  const { data: projects = [], isLoading: pl } = useProjects();
  const projectId = projects[0]?.id;
  const { data: cycles = [], isLoading: cl } = useTestCycles(projectId);

  const active = (cycles ?? []).filter((c) => c.status === 'IN_PROGRESS' || c.status === 'PLANNED');
  const isLoading = pl || cl;

  return (
    <WidgetWrapper
      title="Active test cycles"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      headerBadges={<Lozenge appearance="default">{String(active.length)}</Lozenge>}
    >
      {isLoading ? (
        <div style={{ padding: 24, color: 'var(--ds-text-subtlest, #6B778C)' }}>Loading…</div>
      ) : active.length === 0 ? (
        <EmptyState header="No active cycles" description="Plan a test cycle in the Cycles tab to track execution here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map((c) => {
            const total = c.total_cases ?? 0;
            const passed = c.passed_count ?? 0;
            const failed = c.failed_count ?? 0;
            const blocked = c.blocked_count ?? 0;
            const executed = passed + failed + blocked;
            const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
            const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;
            return (
              <div
                key={c.id}
                style={{
                  background: 'var(--ds-surface-raised, #FFFFFF)',
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  borderRadius: 6,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginRight: 8 }}>{c.key}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>{c.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
                    {passRate}% pass · {executed}/{total}
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--ds-background-neutral, #F1F2F4)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ds-background-brand-bold, #0052CC)', borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--ds-text-success, #216E4E)' }}>{passed} passed</span>
                  <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>{failed} failed</span>
                  <span style={{ color: 'var(--ds-text-warning, #974F0C)' }}>{blocked} blocked</span>
                  <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>{c.not_run_count ?? 0} not run</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetWrapper>
  );
}
