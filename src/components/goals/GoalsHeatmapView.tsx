/**
 * GoalsHeatmapView — ECLIPSE D8: Dark mode parity
 */
import type { Goal } from '@/types/goals';

interface Theme { id: string; title: string; color: string; }
interface GoalsHeatmapViewProps {
  goals: Goal[];
  themes: Theme[];
  onCellClick?: (themeId: string, quarter: string) => void;
  isDark?: boolean;
}

const DK = {
  t1: 'var(--cp-t1)',
  t2: 'var(--cp-t2)',
  t3: 'var(--cp-t3)',
  border: '#2E2E2E',
  borderSubtle: '#2E2E2E',
};

const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

function getCellStyle(avgPct: number, isDark = false) {
  if (isDark) {
    if (avgPct >= 80) return { bg: 'rgba(22,163,74,0.20)', text: '#4ADE80', border: 'none' };
    if (avgPct >= 60) return { bg: 'rgba(22,163,74,0.12)', text: '#4ADE80', border: 'none' };
    if (avgPct >= 40) return { bg: 'rgba(217,119,6,0.12)', text: '#FBBF24', border: '3px solid rgba(217,119,6,0.3)' };
    if (avgPct >= 20) return { bg: 'rgba(239,68,68,0.12)', text: '#FCA5A5', border: '3px solid rgba(239,68,68,0.3)' };
    return { bg: 'rgba(239,68,68,0.20)', text: '#FCA5A5', border: '3px solid rgba(239,68,68,0.4)' };
  }
  if (avgPct >= 80) return { bg: 'rgba(22, 163, 74, 0.20)', text: '#15803D', border: 'none' };
  if (avgPct >= 60) return { bg: 'rgba(22, 163, 74, 0.12)', text: '#16A34A', border: 'none' };
  if (avgPct >= 40) return { bg: 'rgba(217, 119, 6, 0.12)', text: '#B45309', border: '3px solid rgba(217,119,6,0.3)' };
  if (avgPct >= 20) return { bg: 'rgba(239, 68, 68, 0.12)', text: '#DC2626', border: '3px solid rgba(239,68,68,0.3)' };
  return { bg: 'rgba(239, 68, 68, 0.20)', text: '#991B1B', border: '3px solid rgba(239,68,68,0.4)' };
}

function getThemeDotColor(goals: Goal[]): string {
  if (goals.length === 0) return '#CBD5E1';
  const avgProgress = goals.reduce((sum, g) => sum + (g.progress_pct || 0), 0) / goals.length;
  const hasOffTrack = goals.some(g => g.status === 'off_track');
  const hasAtRisk = goals.some(g => g.status === 'at_risk');
  if (hasOffTrack || avgProgress < 40) return '#EF4444';
  if (hasAtRisk || avgProgress < 60) return '#D97706';
  return '#16A34A';
}

export function GoalsHeatmapView({ goals, themes, onCellClick, isDark = false }: GoalsHeatmapViewProps) {
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

  const tableBorder = isDark ? DK.border : 'var(--divider)';
  const rowBorder = isDark ? DK.borderSubtle : 'var(--cp-bd-zone)';

  return (
    <div className="heatmap-scroll" style={{ borderRadius: 12, overflow: 'hidden', background: isDark ? 'transparent' : 'var(--bg-app)', border: `1px solid ${tableBorder}` }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: gridCols,
        height: 40, alignItems: 'center',
        background: isDark ? 'transparent' : 'var(--bg-app)', borderBottom: `2px solid ${tableBorder}`,
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: isDark ? DK.t3 : 'var(--fg-3)',
      }}>
        <span style={{ paddingLeft: 16 }}>Theme</span>
        {QUARTERS.map(q => (
          <span key={q} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {q}
            {q === currentQ && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cp-blue)', flexShrink: 0 }} />}
          </span>
        ))}
      </div>

      {/* Current quarter legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 16px', fontSize: 11, color: isDark ? DK.t3 : 'var(--fg-4)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cp-blue)', marginRight: 6 }} />
        Current quarter
      </div>

      {/* Rows */}
      {themes.map(theme => {
        const allThemeGoals = goals.filter(g => g.theme_id === theme.id);
        const dotColor = getThemeDotColor(allThemeGoals);

        return (
          <div
            key={theme.id}
            className="heatmap-row"
            style={{
              display: 'grid', gridTemplateColumns: gridCols,
              minHeight: 72, alignItems: 'stretch',
              borderBottom: `1px solid ${rowBorder}`,
              transition: 'background 100ms',
            }}
          >
            {/* Theme label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 16px', background: isDark ? 'transparent' : 'var(--bg-app)',
              borderRight: `1px solid ${rowBorder}`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? DK.t1 : 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme.title}</span>
            </div>

            {/* Cells */}
            {QUARTERS.map(q => {
              const cellGoals = cellMap.get(`${theme.id}::${q}`) || [];
              if (cellGoals.length === 0) {
                return (
                  <div key={q} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isDark ? DK.t3 : '#CBD5E1', fontSize: 12,
                    background: isDark ? 'transparent' : 'var(--bg-app)',
                    borderRight: `1px solid ${rowBorder}`,
                  }}>
                    —
                  </div>
                );
              }
              const avgPct = Math.round(cellGoals.reduce((s, g) => s + (g.progress_pct || 0), 0) / cellGoals.length);
              const style = getCellStyle(avgPct, isDark);

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
                    borderRight: `1px solid ${rowBorder}`,
                    padding: '8px 4px',
                    cursor: onCellClick ? 'pointer' : 'default',
                    transition: 'outline 150ms, box-shadow 150ms',
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, color: style.text, lineHeight: 1.2 }}>{avgPct}%</span>
                  <span style={{ fontSize: 12, color: isDark ? DK.t3 : 'var(--fg-4)', marginTop: 2 }}>{cellGoals.length} goal{cellGoals.length !== 1 ? 's' : ''}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      <style>{`
        .heatmap-row:hover { background: ${isDark ? '#111111' : '#FAFBFE'}; }
        .heatmap-cell:hover { outline: 2px solid #2563EB; outline-offset: -2px; border-radius: 4px; }
        @media (max-width: 767px) { .heatmap-scroll { overflow-x: auto; } .heatmap-scroll > div { min-width: 700px; } }
      `}</style>
    </div>
  );
}
