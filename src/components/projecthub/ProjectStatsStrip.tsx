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
  { key: 'total', label: 'TOTAL PROJECTS', color: '#0F172A', border: '#334155', bg: '#FFF' },
  { key: 'active', label: 'ACTIVE', color: '#2563EB', border: '#2563EB', bg: '#FFF' },
  { key: 'atRisk', label: 'AT RISK / OFF TRACK', color: '#DC2626', border: '#DC2626', bg: '#FFF' },
  { key: 'totalEpics', label: 'TOTAL EPICS', color: '#2563EB', border: '#2563EB', bg: '#FFF' },
  { key: 'totalStories', label: 'TOTAL STORIES', color: '#7C3AED', border: '#7C3AED', bg: '#FFF' },
] as const;

export function ProjectStatsStrip({ stats }: StatsStripProps) {
  return (
    <div className="space-y-3">
      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3">
        {STAT_CARDS.map(c => (
          <div
            key={c.key}
            className="rounded-lg"
            style={{
              background: c.bg,
              border: '1px solid #E2E8F0',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>
              {stats[c.key]}
            </div>
          </div>
        ))}
      </div>

      {/* Work distribution — 3 separate cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-lg" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '12px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>TO DO</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", marginLeft: 'auto' }}>{stats.totalTodo}</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '12px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>IN PROGRESS</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace", marginLeft: 'auto' }}>{stats.totalInProgress}</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '12px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>DONE</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#16A34A', fontFamily: "'JetBrains Mono', monospace", marginLeft: 'auto' }}>{stats.totalDone}</span>
        </div>
      </div>
    </div>
  );
}
