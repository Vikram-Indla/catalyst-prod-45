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
  border: 'var(--ds-border, var(--cp-ink-1))',
  borderSubtle: 'var(--ds-border, var(--cp-ink-1))',
};

const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

function getCellStyle(avgPct: number | null, isDark = false) {
  if (avgPct === null) {
    return { bg: isDark ? 'var(--ds-surface-overlay)' : 'var(--ds-surface-sunken)', text: 'var(--ds-text-subtlest)', border: 'none' };
  }
  if (isDark) {
    if (avgPct >= 80) return { bg: 'var(--ds-background-success-bold, rgba(22,163,74,0.20))', text: 'var(--ds-background-success)', border: 'none' };
    if (avgPct >= 60) return { bg: 'var(--ds-background-success-bold, rgba(22,163,74,0.12))', text: 'var(--ds-background-success)', border: 'none' };
    if (avgPct >= 40) return { bg: 'var(--ds-background-warning, rgba(217,119,6,0.12))', text: 'var(--ds-background-warning-bold, var(--ds-background-warning-bold))', border: '3px solid var(--ds-background-warning, rgba(217,119,6,0.3))' };
    if (avgPct >= 20) return { bg: 'var(--ds-background-danger, rgba(239,68,68,0.12))', text: 'var(--ds-border-danger)', border: '3px solid var(--ds-background-danger, rgba(239,68,68,0.3))' };
    return { bg: 'var(--ds-background-danger, rgba(239,68,68,0.20))', text: 'var(--ds-border-danger)', border: '3px solid var(--ds-background-danger, rgba(239,68,68,0.4))' };
  }
  if (avgPct >= 80) return { bg: 'var(--ds-background-success-bold, rgba(22, 163, 74, 0.20))', text: 'var(--ds-background-success-bold, var(--ds-background-success-bold))', border: 'none' };
  if (avgPct >= 60) return { bg: 'var(--ds-background-success-bold, rgba(22, 163, 74, 0.12))', text: 'var(--ds-text-success, var(--cp-success))', border: 'none' };
  if (avgPct >= 40) return { bg: 'var(--ds-background-warning, rgba(217, 119, 6, 0.12))', text: 'var(--ds-background-warning-bold, var(--ds-background-warning-bold))', border: '3px solid var(--ds-background-warning, rgba(217,119,6,0.3))' };
  if (avgPct >= 20) return { bg: 'var(--ds-background-danger, rgba(239, 68, 68, 0.12))', text: 'var(--ds-text-danger, var(--cp-danger))', border: '3px solid var(--ds-background-danger, rgba(239,68,68,0.3))' };
  return { bg: 'var(--ds-background-danger, rgba(239, 68, 68, 0.20))', text: 'var(--ds-text-danger)', border: '3px solid var(--ds-background-danger, rgba(239,68,68,0.4))' };
}

function getThemeDotColor(goals: Goal[]): string {
  if (goals.length === 0) return 'var(--ds-text-disabled)';
  const hasOffTrack = goals.some(g => g.status === 'off_track');
  const hasAtRisk = goals.some(g => g.status === 'at_risk');
  const measuredGoals = goals.filter(g => g.progress_pct != null);
  const avgProgress = measuredGoals.length > 0
    ? measuredGoals.reduce((sum, g) => sum + (g.progress_pct as number), 0) / measuredGoals.length
    : null;
  if (hasOffTrack || (avgProgress !== null && avgProgress < 40)) return 'var(--ds-text-danger)';
  if (hasAtRisk || (avgProgress !== null && avgProgress < 60)) return 'var(--ds-text-warning, var(--cp-warning))';
  if (avgProgress === null) return 'var(--ds-text-subtlest)';
  return 'var(--ds-text-success, var(--cp-success))';
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
        fontSize: 'var(--ds-font-size-100)', fontWeight: 600, textTransform: 'uppercase',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 16px', fontSize: 'var(--ds-font-size-100)', color: isDark ? DK.t3 : 'var(--fg-4)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cp-blue)', marginRight: 4 }} />
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
              <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: isDark ? DK.t1 : 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme.title}</span>
            </div>

            {/* Cells */}
            {QUARTERS.map(q => {
              const cellGoals = cellMap.get(`${theme.id}::${q}`) || [];
              if (cellGoals.length === 0) {
                return (
                  <div key={q} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isDark ? DK.t3 : 'var(--ds-text-disabled)', fontSize: 'var(--ds-font-size-200)',
                    background: isDark ? 'transparent' : 'var(--bg-app)',
                    borderRight: `1px solid ${rowBorder}`,
                  }}>
                    —
                  </div>
                );
              }
              const measuredCellGoals = cellGoals.filter(g => g.progress_pct != null);
              const avgPct = measuredCellGoals.length > 0
                ? Math.round(measuredCellGoals.reduce((s, g) => s + (g.progress_pct as number), 0) / measuredCellGoals.length)
                : null;
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
                  <span style={{ fontSize: 'var(--ds-font-size-600)', fontWeight: 700, color: style.text, lineHeight: 1.2 }}>{avgPct !== null ? `${avgPct}%` : '—'}</span>
                  <span style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? DK.t3 : 'var(--fg-4)', marginTop: 0 }}>{cellGoals.length} goal{cellGoals.length !== 1 ? 's' : ''}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      <style>{`
        .heatmap-row:hover { background: ${'var(--cp-bg-page)'}; }
        .heatmap-cell:hover { outline: 2px solid var(--ds-text-brand, var(--cp-workstream-catalyst-primary)); outline-offset: -2px; border-radius: 4px; }
        @media (max-width: 767px) { .heatmap-scroll { overflow-x: auto; } .heatmap-scroll > div { min-width: 700px; } }
      `}</style>
    </div>
  );
}
