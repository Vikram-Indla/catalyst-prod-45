interface StatsStripProps {
  stats: {
    total: number;
    onTrack: number;
    atRisk: number;
    totalEpics: number;
    totalStories: number;
    totalTodo: number;
    totalInProgress: number;
    totalDone: number;
  };
}

const STAT_CARDS = [
  { key: 'total', label: 'TOTAL PROJECTS', color: '#0F172A', border: '#334155', bg: 'transparent' },
  { key: 'onTrack', label: 'ON TRACK', color: '#16A34A', border: '#16A34A', bg: 'rgba(22,163,74,0.04)' },
  { key: 'atRisk', label: 'AT RISK / OFF TRACK', color: '#DC2626', border: '#DC2626', bg: 'rgba(220,38,38,0.04)' },
  { key: 'totalEpics', label: 'TOTAL EPICS', color: '#2563EB', border: '#2563EB', bg: 'transparent' },
  { key: 'totalStories', label: 'TOTAL STORIES', color: '#7C3AED', border: '#7C3AED', bg: 'transparent' },
] as const;

export function ProjectStatsStrip({ stats }: StatsStripProps) {
  const totalWork = stats.totalTodo + stats.totalInProgress + stats.totalDone;
  const todoPct = totalWork > 0 ? (stats.totalTodo / totalWork) * 100 : 0;
  const ipPct = totalWork > 0 ? (stats.totalInProgress / totalWork) * 100 : 0;
  const donePct = totalWork > 0 ? (stats.totalDone / totalWork) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Stat cards with left border accent */}
      <div className="grid grid-cols-5 gap-3">
        {STAT_CARDS.map(c => (
          <div
            key={c.key}
            className="rounded-lg"
            style={{
              background: c.bg !== 'transparent' ? c.bg : '#FFF',
              border: '1px solid #E2E8F0',
              borderLeft: `3px solid ${c.border}`,
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

      {/* Work distribution — integrated bar */}
      <div
        className="flex items-center gap-4 rounded-lg"
        style={{
          background: '#FFF',
          border: '1px solid #E2E8F0',
          padding: '12px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          WORK ITEMS
        </span>

        {/* Mini bar */}
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden', display: 'flex', maxWidth: 320 }}>
          {donePct > 0 && <div style={{ width: `${donePct}%`, background: '#16A34A', borderRadius: donePct === 100 ? 4 : '4px 0 0 4px' }} />}
          {ipPct > 0 && <div style={{ width: `${ipPct}%`, background: '#2563EB' }} />}
          {todoPct > 0 && <div style={{ width: `${todoPct}%`, background: '#CBD5E1' }} />}
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: '#E2E8F0' }} />

        {/* Labels */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>To Do</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>{stats.totalTodo}</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>In Progress</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{stats.totalInProgress}</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Done</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#16A34A', fontFamily: "'JetBrains Mono', monospace" }}>{stats.totalDone}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
