interface StatsStripProps {
  stats: {
    total: number;
    active: number;
    atRisk: number;
    totalEpics: number;
    totalStories: number;
    totalTodo: number;
    totalInProgress: number;
    totalDone: number;
  };
}

const STAT_CARDS = [
  { key: 'total', label: 'TOTAL PROJECTS', color: 'var(--fg-1)' },
  { key: 'active', label: 'ACTIVE', color: 'var(--cp-blue)' },
  { key: 'atRisk', label: 'AT RISK / OFF TRACK', color: 'var(--sem-danger)' },
  { key: 'totalEpics', label: 'TOTAL EPICS', color: 'var(--cp-blue)' },
  { key: 'totalStories', label: 'TOTAL STORIES', color: 'var(--cp-blue)' },
] as const;

const WORK_CARDS = [
  { key: 'totalTodo', label: 'TO DO', dotColor: 'rgba(237,237,237,0.40)', valueColor: 'var(--fg-2)', iconBg: 'var(--cp-bd-zone)' },
  { key: 'totalInProgress', label: 'IN PROGRESS', dotColor: '#3B82F6', valueColor: 'var(--cp-blue)', iconBg: 'var(--cp-blue-wash)' },
  { key: 'totalDone', label: 'DONE', dotColor: '#22C55E', valueColor: 'var(--sem-success)', iconBg: 'rgba(74,222,128,0.06)' },
] as const;

export function ProjectStatsStrip({ stats }: StatsStripProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 5 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {STAT_CARDS.map(c => (
          <div
            key={c.key}
            style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--bd-default, rgba(255,255,255,0.10))',
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>
              {stats[c.key]}
            </div>
          </div>
        ))}
      </div>

      {/* 3 work distribution cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {WORK_CARDS.map(c => (
          <div
            key={c.key}
            style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--bd-default, rgba(255,255,255,0.10))',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: c.iconBg,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 6, background: c.dotColor }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {c.label}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: c.valueColor, fontFamily: "'JetBrains Mono', monospace", marginLeft: 'auto' }}>
              {stats[c.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
