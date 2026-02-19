const MOCK_STATUSES = [
  { name: 'To Do', count: 3, color: '#A3A3A3' },
  { name: 'In Progress', count: 5, color: '#2563EB' },
  { name: 'In Review', count: 4, color: '#D97706' },
  { name: 'Done', count: 30, color: '#0D9488' },
  { name: 'Cancelled', count: 3, color: '#D4D4D4' },
];

export function ItemsByStatus() {
  const max = Math.max(...MOCK_STATUSES.map(s => s.count));

  return (
    <div className="space-y-2.5">
      {MOCK_STATUSES.map(s => (
        <div key={s.name} className="flex items-center gap-2">
          <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: s.color }} />
          <span className="flex-shrink-0" style={{ width: 80, fontSize: 12, color: '#334155' }}>{s.name}</span>
          <div className="flex-1" style={{ height: 8, borderRadius: 4, background: '#F1F5F9' }}>
            <div
              style={{
                width: `${(s.count / max) * 100}%`,
                height: '100%', borderRadius: 4, background: s.color,
                transition: 'width 500ms ease',
              }}
            />
          </div>
          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#64748B', minWidth: 20, textAlign: 'right' }}>
            {s.count}
          </span>
        </div>
      ))}
    </div>
  );
}
