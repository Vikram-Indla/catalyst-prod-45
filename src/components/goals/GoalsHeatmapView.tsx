/**
 * GoalsHeatmapView — Theme × Quarter grid with color-coded progress cells
 */
import type { Goal } from '@/types/goals';

interface Theme {
  id: string;
  title: string;
  color: string;
}

interface GoalsHeatmapViewProps {
  goals: Goal[];
  themes: Theme[];
}

const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];

export function GoalsHeatmapView({ goals, themes }: GoalsHeatmapViewProps) {
  // Build lookup: theme+quarter → goals
  const cellMap = new Map<string, Goal[]>();
  goals.forEach(g => {
    if (!g.fiscal_quarter) return;
    const key = `${g.theme_id}::${g.fiscal_quarter}`;
    const list = cellMap.get(key) || [];
    list.push(g);
    cellMap.set(key, list);
  });

  const gridCols = `200px repeat(${QUARTERS.length}, 1fr)`;

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#FFFFFF' }}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          height: 36,
          alignItems: 'center',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#94A3B8',
        }}
      >
        <span style={{ paddingLeft: 16 }}>Theme</span>
        {QUARTERS.map(q => (
          <span key={q} style={{ textAlign: 'center' }}>{q}</span>
        ))}
      </div>

      {/* Rows */}
      {themes.map(theme => (
        <div
          key={theme.id}
          style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            minHeight: 64,
            alignItems: 'stretch',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          {/* Theme label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
              background: '#FAFBFD',
              borderRight: '1px solid #F1F5F9',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: theme.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{theme.title}</span>
          </div>

          {/* Quarter cells */}
          {QUARTERS.map(q => {
            const cellGoals = cellMap.get(`${theme.id}::${q}`) || [];
            if (cellGoals.length === 0) {
              return (
                <div
                  key={q}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#CBD5E1',
                    fontSize: 13,
                    borderRight: '1px solid #F8FAFC',
                  }}
                >
                  —
                </div>
              );
            }

            const avgPct = Math.round(cellGoals.reduce((s, g) => s + (g.progress_pct || 0), 0) / cellGoals.length);
            const bg = avgPct >= 60
              ? 'rgba(22,163,74,0.06)'
              : avgPct >= 40
                ? 'rgba(217,119,6,0.06)'
                : 'rgba(239,68,68,0.06)';
            const textColor = avgPct >= 60 ? '#16A34A' : avgPct >= 40 ? '#D97706' : '#EF4444';
            const borderLeft = avgPct >= 60
              ? 'none'
              : avgPct >= 40
                ? '3px solid rgba(217,119,6,0.4)'
                : '3px solid rgba(239,68,68,0.4)';

            return (
              <div
                key={q}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: bg,
                  borderLeft,
                  borderRight: '1px solid #F8FAFC',
                  padding: '8px 4px',
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 700, color: textColor, lineHeight: 1.2 }}>
                  {avgPct}%
                </span>
                <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                  {cellGoals.length} goal{cellGoals.length !== 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
