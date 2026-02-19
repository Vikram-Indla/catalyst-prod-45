const MOCK_OVERDUE = [
  { key: 'DMA-12', title: 'API Rate Limiting', days: 3 },
  { key: 'DMA-27', title: 'Localization', days: 5 },
  { key: 'DMA-33', title: 'Audit Trail', days: 1 },
  { key: 'DMA-41', title: 'Dashboard Filters', days: 2 },
];

export function OverdueItems() {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span style={{ fontSize: 32, fontWeight: 700, color: '#D97706', fontFamily: "'Sora', sans-serif" }}>4</span>
        <span style={{ fontSize: 12, color: '#64748B' }}>items past due date</span>
      </div>
      <div className="space-y-2">
        {MOCK_OVERDUE.map(item => (
          <div key={item.key} className="flex items-center gap-2">
            <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#2563EB', fontWeight: 500 }}>
              {item.key}
            </span>
            <span className="flex-1 truncate" style={{ fontSize: 12, color: '#334155' }}>{item.title}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#DC2626' }}>{item.days}d overdue</span>
          </div>
        ))}
      </div>
    </div>
  );
}
