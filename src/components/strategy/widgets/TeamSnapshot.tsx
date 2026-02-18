/**
 * TeamSnapshot — Widget 9: 5 stat rows with change indicators
 * Row 4, span 3
 */

interface StatRow {
  label: string;
  value: string;
  change?: { direction: 'up' | 'down'; text: string; good: boolean };
}

const STATS: StatRow[] = [
  { label: 'Active Members', value: '247', change: { direction: 'up', text: '12', good: true } },
  { label: 'Workstreams', value: '7' },
  { label: 'Avg. Velocity', value: '34', change: { direction: 'up', text: '8%', good: true } },
  { label: 'Open Blockers', value: '9', change: { direction: 'up', text: '3', good: false } },
  { label: 'Sprint Completion', value: '87%', change: { direction: 'up', text: '5%', good: true } },
];

export function TeamSnapshot() {
  return (
    <div>
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className="flex items-center justify-between"
          style={{
            padding: '8px 0',
            borderBottom: i < STATS.length - 1 ? '1px solid var(--catalyst-border-default, #E2E8F0)' : 'none',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)' }}>{stat.label}</span>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--catalyst-text-primary)' }}>{stat.value}</span>
            {stat.change && (
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: stat.change.good ? '#0D9488' : '#EF4444',
              }}>
                {stat.change.direction === 'up' ? '↑' : '↓'} {stat.change.text}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
