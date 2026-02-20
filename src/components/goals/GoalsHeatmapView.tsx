/**
 * GoalsHeatmapView — Fix 4: CIO-grade heatmap with opacity-based colors
 * Fix 19: Click cells to filter tree view
 */
import type { Goal } from '@/types/goals';

interface Theme { id: string; title: string; color: string; }
interface GoalsHeatmapViewProps {
  goals: Goal[];
  themes: Theme[];
  onCellClick?: (themeId: string, quarter: string) => void;
}

const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];

// Determine current quarter
function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

function getCellStyle(avgPct: number) {
  if (avgPct >= 80) return { bg: 'rgba(22, 163, 74, 0.20)', text: '#15803D', border: 'none' };
  if (avgPct >= 60) return { bg: 'rgba(22, 163, 74, 0.12)', text: '#16A34A', border: 'none' };
  if (avgPct >= 40) return { bg: 'rgba(217, 119, 6, 0.12)', text: '#B45309', border: '3px solid rgba(217,119,6,0.3)' };
  if (avgPct >= 20) return { bg: 'rgba(239, 68, 68, 0.12)', text: '#DC2626', border: '3px solid rgba(239,68,68,0.3)' };
  return { bg: 'rgba(239, 68, 68, 0.20)', text: '#991B1B', border: '3px solid rgba(239,68,68,0.4)' };
}

export function GoalsHeatmapView({ goals, themes, onCellClick }: GoalsHeatmapViewProps) {
  const cellMap = new Map<string, Goal[]>();
  goals.forEach(g => {
    if (!g.fiscal_quarter) return;
    const key = `${g.theme_id}::${g.fiscal_quarter}`;
    const list = cellMap.get(key) || [];
    list.push(g);
    cellMap.set(key, list);
  });

  const gridCols = `200px repeat(${QUARTERS.length}, 1fr)`;
  const currentQ = getCurrentQuarter();

  return (
    <div className="heatmap-scroll" style={{ borderRadius: 10, overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: gridCols,
        height: 40, alignItems: 'center',
        background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
        fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: '#94A3B8',
      }}>
        <span style={{ paddingLeft: 16 }}>Theme</span>
        {QUARTERS.map(q => (
          <span key={q} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {q}
            {q === currentQ && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />}
          </span>
        ))}
      </div>

      {/* Rows */}
      {themes.map(theme => {
        // Compute theme-level health indicator
        const allThemeGoals = goals.filter(g => g.theme_id === theme.id);
        const themeAvg = allThemeGoals.length > 0
          ? Math.round(allThemeGoals.reduce((s, g) => s + (g.progress_pct || 0), 0) / allThemeGoals.length) : 0;
        const dotColor = themeAvg >= 70 ? '#16A34A' : themeAvg >= 40 ? '#D97706' : themeAvg > 0 ? '#EF4444' : '#CBD5E1';

        return (
          <div
            key={theme.id}
            className="heatmap-row"
            style={{
              display: 'grid', gridTemplateColumns: gridCols,
              minHeight: 72, alignItems: 'stretch',
              borderBottom: '1px solid #F1F5F9',
              transition: 'background 100ms',
            }}
          >
            {/* Theme label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 16px', background: '#FFFFFF',
              borderRight: '1px solid #F1F5F9',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme.title}</span>
            </div>

            {/* Cells */}
            {QUARTERS.map(q => {
              const cellGoals = cellMap.get(`${theme.id}::${q}`) || [];
              if (cellGoals.length === 0) {
                return (
                  <div key={q} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#CBD5E1', fontSize: 13,
                    background: '#F8FAFC',
                    borderRight: '1px solid #F1F5F9',
                  }}>
                    —
                  </div>
                );
              }
              const avgPct = Math.round(cellGoals.reduce((s, g) => s + (g.progress_pct || 0), 0) / cellGoals.length);
              const style = getCellStyle(avgPct);

              return (
                <div
                  key={q}
                  onClick={() => onCellClick?.(theme.id, q)}
                  className="heatmap-cell"
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: style.bg,
                    borderLeft: style.border !== 'none' ? style.border : undefined,
                    borderRight: '1px solid #F1F5F9',
                    padding: '8px 4px',
                    cursor: onCellClick ? 'pointer' : 'default',
                    transition: 'outline 150ms, box-shadow 150ms',
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 700, color: style.text, lineHeight: 1.2 }}>{avgPct}%</span>
                  <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{cellGoals.length} goal{cellGoals.length !== 1 ? 's' : ''}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      <style>{`
        .heatmap-row:hover { background: #FAFBFE; }
        .heatmap-cell:hover { outline: 2px solid #2563EB; outline-offset: -2px; border-radius: 4px; }
        @media (max-width: 767px) { .heatmap-scroll { overflow-x: auto; } .heatmap-scroll > div { min-width: 700px; } }
      `}</style>
    </div>
  );
}
