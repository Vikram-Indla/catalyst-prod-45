import React, { useState, useMemo } from 'react';
import { X, Activity, AlertTriangle, Info } from '@/lib/atlaskit-icons';
import { useBoardInsights } from '@/hooks/useBoardInsights';
import AttentionItemCard from './AttentionItemCard';
import type { Board } from '@/types/board';
import type { AttentionItem } from '@/hooks/useBoardInsights';
import { useNavigate } from 'react-router-dom';

interface BoardInsightsPanelProps {
  board: Board;
  projectKey?: string;
  onClose: () => void;
}

type FilterKey = 'All' | 'Critical' | 'High' | 'Overdue' | 'Flagged' | 'Unassigned';

export default function BoardInsightsPanel({ board, projectKey, onClose }: BoardInsightsPanelProps) {
  const { result, isLoading, error } = useBoardInsights(board);
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');

  const filtered = useMemo((): AttentionItem[] => {
    switch (activeFilter) {
      case 'Critical': return result.items.filter(i => i.riskBand === 'Critical');
      case 'High': return result.items.filter(i => i.riskBand === 'High');
      case 'Overdue': return result.items.filter(i => i.daysOverdue !== null && i.daysOverdue > 0);
      case 'Flagged': return result.items.filter(i => i.signals.some(s => s.label.includes('Flagged')));
      case 'Unassigned': return result.items.filter(i => !i.assigneeId);
      default: return result.items;
    }
  }, [result.items, activeFilter]);

  function handleOpenItem(item: AttentionItem) {
    if (!item.itemKey || !item.projectKey) return;
    const pk = projectKey ?? item.projectKey;
    navigate(`/project-hub/${pk}/issues/${item.itemKey}`);
  }

  const { summary } = result;

  const filterOptions: { key: FilterKey; label: string; count: number }[] = [
    { key: 'All', label: 'All', count: result.items.length },
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
            <Activity size={16} style={{ color: 'var(--ds-icon-subtle)' }} />
            <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: 'var(--ds-text)' }}>
              Board Health
            </span>
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', marginTop: 4 }}>
            {board.name}
            {!isLoading && ` · ${summary.totalAnalyzed} items analysed`}
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close board health panel"
          aria-label="Close board health panel"
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

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>
          Analysing board…
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={{ padding: 16 }}>
          <div style={{ padding: '8px 12px', background: 'var(--ds-background-danger)', borderRadius: 4, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)' }}>
            <AlertTriangle size={13} style={{ marginRight: 8 }} />
            Could not load board insights: {(error as Error).message}
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Summary stats */}
          <div style={{
            background: 'var(--ds-surface-raised)',
            borderBottom: '1px solid var(--ds-border)',
            padding: '12px 16px',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}>
            {[
              { label: 'Analysed', value: summary.totalAnalyzed, variant: 'neutral' },
              { label: 'Attention', value: summary.attentionCount, variant: summary.attentionCount > 0 ? 'warning' : 'neutral' },
              { label: 'Critical', value: summary.criticalCount, variant: summary.criticalCount > 0 ? 'danger' : 'neutral' },
              { label: 'Overdue', value: summary.overdueCount, variant: summary.overdueCount > 0 ? 'danger' : 'neutral' },
              { label: 'Flagged', value: summary.flaggedCount, variant: summary.flaggedCount > 0 ? 'warning' : 'neutral' },
              { label: 'Stale 7d+', value: summary.staleCount, variant: summary.staleCount > 0 ? 'warning' : 'neutral' },
            ].map(stat => (
              <div key={stat.label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 6,
                background: 'var(--ds-surface-sunken)',
                border: '1px solid var(--ds-border)',
                minWidth: 56,
              }}>
                <span style={{
                  fontSize: 'var(--ds-font-size-500)', fontWeight: 700, lineHeight: 1,
                  color: stat.variant === 'danger' ? 'var(--ds-text-danger)'
                    : stat.variant === 'warning' ? 'var(--ds-text-warning)'
                    : 'var(--ds-text)',
                }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          {result.items.length > 0 && (
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
          {result.items.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '48px 32px', gap: 8, textAlign: 'center',
            }}>
              <span style={{ fontSize: 'var(--ds-font-size-600)' }}>✓</span>
              <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text)' }}>Board looks healthy</span>
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', maxWidth: 240 }}>
                No blocked, overdue, stale, or high-risk work items found on this board.
              </span>
            </div>
          )}

          {/* Attention items */}
          {filtered.length > 0 && (
            <>
              <div style={{
                padding: '8px 16px 4px',
                fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
                color: 'var(--ds-text-subtlest)',
                flexShrink: 0,
              }}>
                Work items for attention · {filtered.length}
              </div>
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(item => (
                  <AttentionItemCard key={item.id} item={item} onOpen={handleOpenItem} />
                ))}
              </div>
            </>
          )}

          {filtered.length === 0 && result.items.length > 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>
              No items match this filter.
            </div>
          )}

          {/* Board-level insights */}
          {summary.boardLevelInsights.length > 0 && (
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
                  Board signals
                </div>
                {summary.boardLevelInsights.map((insight, i) => (
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

        </div>
      )}
    </div>
  );
}
