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
  { key: 'active', label: 'ACTIVE', color: '#16A34A' },
  { key: 'atRisk', label: 'AT RISK / OFF TRACK', color: '#DC2626' },
  { key: 'totalEpics', label: 'TOTAL EPICS', color: '#2563EB' },
  { key: 'totalStories', label: 'TOTAL STORIES', color: '#7C3AED' },
] as const;

const WORK_CARDS = [
  { key: 'totalTodo', label: 'TO DO', color: '#94A3B8', dot: '#94A3B8' },
  { key: 'totalInProgress', label: 'IN PROGRESS', color: '#2563EB', dot: '#2563EB' },
  { key: 'totalDone', label: 'DONE', color: '#16A34A', dot: '#16A34A' },
] as const;

export function ProjectStatsStrip({ stats }: StatsStripProps) {
  return (
    <div className="space-y-3">
      {/* 5 stat cards */}
      <div className="grid grid-cols-5 gap-3">
        {STAT_CARDS.map(c => (
          <div key={c.key} className="rounded-lg" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>
              {stats[c.key]}
            </div>
          </div>
        ))}
      </div>

      {/* 3 work distribution cards */}
      <div className="grid grid-cols-3 gap-3">
        {WORK_CARDS.map(c => (
          <div key={c.key} className="flex items-center gap-3 rounded-lg" style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '12px 16px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{c.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>
              {stats[c.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
