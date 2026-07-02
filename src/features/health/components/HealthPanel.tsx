import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Info } from '@/lib/atlaskit-icons';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import AttentionItemCard from '@/components/boards/AttentionItemCard';
import { useHealthSignals } from '../hooks/useHealthSignals';
import type { HealthAttentionItem, HealthScope } from '../types';
import type { Board } from '@/types/board';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';
import type { EntityConfig } from '@/lib/entity-hub/config';
import type { RawDependencyRow } from '@/components/shared/Timeline/dependencies/normalize';
import type { DependencyIssueMeta } from '../adapters/dependencies';

const MAX_ITEMS_SHOWN = 10;

interface HealthPanelProps {
  scope: HealthScope;
  board?: Board | null;
  rows?: JqlResultRow[];
  resultCap?: number;
  entityConfig?: EntityConfig;
  entityName?: string | null;
  dependencies?: RawDependencyRow[];
  issueMeta?: Record<string, DependencyIssueMeta>;
  title: string;
  subtitle?: string;
  onOpenItem: (item: HealthAttentionItem) => void;
  onClose: () => void;
}

type FilterKey = 'All' | 'Critical' | 'High' | 'Overdue' | 'Flagged' | 'Unassigned';

export default function HealthPanel({ scope, board, rows, resultCap, entityConfig, entityName, dependencies, issueMeta, title, subtitle, onOpenItem, onClose }: HealthPanelProps) {
  const { health, kpis, isLoading, error } = useHealthSignals(scope, { board, rows, resultCap, entityConfig, entityName, dependencies, issueMeta });
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');

  const filtered = useMemo((): HealthAttentionItem[] => {
    switch (activeFilter) {
      case 'Critical': return health.items.filter(i => i.riskBand === 'Critical');
      case 'High': return health.items.filter(i => i.riskBand === 'High');
      case 'Overdue': return health.items.filter(i => i.daysOverdue !== null && i.daysOverdue > 0);
      case 'Flagged': return health.items.filter(i => i.signals.some(s => s.label.includes('Flagged')));
      case 'Unassigned': return health.items.filter(i => !i.assignee?.id);
      default: return health.items;
    }
  }, [health.items, activeFilter]);

  const shown = filtered.slice(0, MAX_ITEMS_SHOWN);

  const { summary } = health;

  const filterOptions: { key: FilterKey; label: string; count: number }[] = [
    { key: 'All', label: 'All', count: health.items.length },
    { key: 'Critical', label: 'Critical', count: summary.criticalCount },
    { key: 'High', label: 'High', count: summary.highCount },
    { key: 'Overdue', label: 'Overdue', count: summary.overdueCount },
    { key: 'Flagged', label: 'Flagged', count: summary.flaggedCount },
    { key: 'Unassigned', label: 'Unassigned', count: summary.unassignedHighPriorityCount },
  ].filter(o => o.key === 'All' || o.count > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--ds-surface)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        background: 'var(--ds-surface-raised)',
        borderBottom: '1px solid var(--ds-border)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CatyPulseIcon size={16} title="Health" />
            <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: 'var(--ds-text)' }}>
              Health
            </span>
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', marginTop: 4 }}>
            {title}
            {!isLoading && ` · ${summary.totalAnalyzed} items analysed`}
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close health panel"
          aria-label="Close health panel"
          style={{
            width: 28, height: 28, border: 'none', borderRadius: 4,
            background: 'var(--ds-background-neutral)',
            color: 'var(--ds-icon-subtle)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>
          Analysing {subtitle ?? 'scope'}…
        </div>
      )}

      {error && !isLoading && (
        <div style={{ padding: 16 }}>
          <div style={{ padding: '8px 12px', background: 'var(--ds-background-danger)', borderRadius: 4, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)' }}>
            <AlertTriangle size={13} style={{ marginRight: 8 }} />
            Could not load health data: {(error as Error).message}
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* KPI tiles */}
          <div style={{
            background: 'var(--ds-surface-raised)',
            borderBottom: '1px solid var(--ds-border)',
            padding: '12px 16px',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}>
            {kpis.map(kpi => (
              <div key={kpi.key} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 6,
                background: 'var(--ds-surface-sunken)',
                border: '1px solid var(--ds-border)',
                minWidth: 56,
              }}>
                <span style={{
                  fontSize: 'var(--ds-font-size-500)', fontWeight: 700, lineHeight: 1,
                  color: kpi.tone === 'danger' ? 'var(--ds-text-danger)'
                    : kpi.tone === 'warning' ? 'var(--ds-text-warning)'
                    : 'var(--ds-text)',
                }}>
                  {kpi.value}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {kpi.label}
                </span>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          {health.items.length > 0 && (
            <div style={{
              background: 'var(--ds-surface-raised)',
              borderBottom: '1px solid var(--ds-border)',
              padding: '8px 16px',
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', fontWeight: 700, marginRight: 4 }}>Filter:</span>
              {filterOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setActiveFilter(opt.key)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 12,
                    border: activeFilter === opt.key ? '1px solid var(--ds-border-focused)' : '1px solid var(--ds-border)',
                    background: activeFilter === opt.key ? 'var(--ds-background-selected)' : 'var(--ds-surface-raised)',
                    color: activeFilter === opt.key ? 'var(--ds-link)' : 'var(--ds-text-subtle)',
                    fontSize: 'var(--ds-font-size-100)',
                    fontWeight: activeFilter === opt.key ? 700 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.label} ({opt.count})
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {health.items.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '48px 32px', gap: 8, textAlign: 'center',
            }}>
              <span style={{ fontSize: 'var(--ds-font-size-600)' }}>✓</span>
              <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text)' }}>Looks healthy</span>
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', maxWidth: 240 }}>
                No blocked, overdue, stale, or high-risk work items found in this scope.
              </span>
            </div>
          )}

          {/* Attention items — capped at 10 */}
          {shown.length > 0 && (
            <>
              <div style={{
                padding: '8px 16px 4px',
                fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
                color: 'var(--ds-text-subtlest)',
                flexShrink: 0,
              }}>
                Work items for attention · {shown.length}{filtered.length > MAX_ITEMS_SHOWN ? ` of ${filtered.length}` : ''}
              </div>
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shown.map(item => (
                  <AttentionItemCard key={item.id} item={item} onOpen={onOpenItem} />
                ))}
              </div>
            </>
          )}

          {filtered.length === 0 && health.items.length > 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>
              No items match this filter.
            </div>
          )}

          {/* Module-level insights */}
          {summary.moduleLevelInsights.length > 0 && (
            <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
              <div style={{
                background: 'var(--ds-surface-raised)',
                border: '1px solid var(--ds-border)',
                borderRadius: 8, padding: '12px 16px',
              }}>
                <div style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
                  color: 'var(--ds-text-subtlest)', marginBottom: 8,
                }}>
                  Signals
                </div>
                {summary.moduleLevelInsights.map((insight, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 6, alignItems: 'flex-start',
                    padding: '4px 0',
                    borderTop: i > 0 ? '1px solid var(--ds-border)' : undefined,
                  }}>
                    <span style={{ fontSize: 'var(--ds-font-size-200)', flexShrink: 0 }}>·</span>
                    <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', lineHeight: 1.4 }}>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capability gaps */}
          {summary.capabilityGaps.length > 0 && (
            <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
              <div style={{
                background: 'var(--ds-surface-sunken)',
                border: '1px solid var(--ds-border)',
                borderRadius: 6, padding: '8px 12px',
              }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                  <Info size={12} style={{ color: 'var(--ds-icon-subtle)', flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: 'var(--ds-text-subtlest)' }}>
                    Data coverage
                  </span>
                </div>
                {summary.capabilityGaps.map((gap, i) => (
                  <div key={i} style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', lineHeight: 1.4, marginTop: i > 0 ? 4 : 0 }}>
                    · {gap}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
