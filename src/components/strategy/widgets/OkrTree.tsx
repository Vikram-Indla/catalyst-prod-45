/**
 * OkrTree — Widget 3: Collapsible theme/goal tree
 * Row 2, span 6
 * DATA SOURCE: es_strategic_themes + es_goals
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ProgressBar } from '../shared/ProgressBar';
import { useStrategicThemes, useGoals } from '@/hooks/strategy/useStrategyData';

function getProgressColor(v: number) {
  if (v >= 70) return '#0D9488';
  if (v >= 50) return '#D97706';
  return '#EF4444';
}

export function OkrTree() {
  const { data: themes, isLoading: tL } = useStrategicThemes();
  const { data: goals, isLoading: gL } = useGoals();

  const isLoading = tL || gL;

  const treeData = useMemo(() => {
    if (!themes || !goals) return [];
    return themes.map(theme => {
      const themeGoals = goals.filter(g => g.theme_id === theme.id);
      const avgProgress = themeGoals.length
        ? Math.round(themeGoals.reduce((s, g) => s + (Number(g.progress_pct) || 0), 0) / themeGoals.length)
        : 0;
      return {
        id: theme.id,
        name: theme.title,
        color: theme.color || '#2563EB',
        progress: avgProgress,
        goals: themeGoals.map(g => ({
          id: g.id,
          name: g.title,
          progress: Number(g.progress_pct) || 0,
        })),
      };
    });
  }, [themes, goals]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Initialize expanded state when data loads
  useMemo(() => {
    if (treeData.length > 0 && Object.keys(expanded).length === 0) {
      const init: Record<string, boolean> = {};
      treeData.forEach(t => { init[t.id] = true; });
      setExpanded(init);
    }
  }, [treeData]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i}>
            <div style={{ height: 32, background: 'var(--catalyst-bg-hover)', borderRadius: 6 }} />
            <div className="ml-5 mt-1 space-y-1">
              {[1, 2, 3].map(j => (
                <div key={j} style={{ height: 24, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--catalyst-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>No strategic themes defined</span>
      </div>
    );
  }

  const toggleAll = () => {
    const allExpanded = Object.values(expanded).every(Boolean);
    setExpanded(Object.fromEntries(treeData.map(t => [t.id, !allExpanded])));
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={toggleAll}
          style={{ fontSize: 10, color: 'var(--catalyst-text-link)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
        >
          {Object.values(expanded).every(Boolean) ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {treeData.map(theme => {
          const isOpen = expanded[theme.id] ?? true;
          const Chevron = isOpen ? ChevronDown : ChevronRight;
          return (
            <div key={theme.id} style={{ marginBottom: 8 }}>
              <button
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setExpanded(p => ({ ...p, [theme.id]: !p[theme.id] }))}
                className="flex items-center gap-2 w-full"
                style={{
                  padding: '8px 6px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'background 120ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--catalyst-bg-hover, #F8FAFC)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: theme.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--catalyst-text-primary)', flex: 1, textAlign: 'left' }}>
                  {theme.name}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: getProgressColor(theme.progress), marginRight: 4 }}>
                  {theme.progress}%
                </span>
                <Chevron size={14} style={{ color: 'var(--catalyst-text-tertiary)', transition: 'transform 150ms' }} />
              </button>

              {isOpen && (
                <div style={{ paddingLeft: 20 }}>
                  {theme.goals.map(goal => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-2"
                      style={{
                        padding: '6px 4px',
                        cursor: 'pointer',
                        borderRadius: 4,
                        transition: 'background-color 120ms ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--catalyst-bg-surface-2, #F1F5F9)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: getProgressColor(goal.progress), flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--catalyst-text-primary)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {goal.name}
                      </span>
                      <div style={{ width: 80 }}>
                        <ProgressBar value={goal.progress} height={4} showLabel />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
