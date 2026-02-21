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
  { key: 'total', label: 'TOTAL PROJECTS', color: '#0F172A' },
  { key: 'active', label: 'ACTIVE', color: '#2563EB' },
  { key: 'atRisk', label: 'AT RISK / OFF TRACK', color: '#DC2626' },
  { key: 'totalEpics', label: 'TOTAL EPICS', color: '#2563EB' },
  { key: 'totalStories', label: 'TOTAL STORIES', color: '#7C3AED' },
] as const;

const WORK_CARDS = [
  { key: 'totalTodo', label: 'TO DO', dotColor: '#94A3B8', valueColor: '#334155', iconBg: '#F1F5F9' },
  { key: 'totalInProgress', label: 'IN PROGRESS', dotColor: '#3B82F6', valueColor: '#2563EB', iconBg: '#EFF6FF' },
  { key: 'totalDone', label: 'DONE', dotColor: '#22C55E', valueColor: '#16A34A', iconBg: '#F0FDF4' },
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
              background: '#FFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
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
              background: '#FFF',
              border: '1px solid #E2E8F0',
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
              <span style={{ width: 10, height: 10, borderRadius: 5, background: c.dotColor }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
