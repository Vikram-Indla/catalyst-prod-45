const MOCK_BLOCKED = [
  { key: 'DMA-08', title: 'Auth Module' },
  { key: 'DMA-19', title: 'Data Migration' },
  { key: 'DMA-34', title: 'Export API' },
];

export function BlockedItems() {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span style={{ fontSize: 32, fontWeight: 700, color: '#DC2626', fontFamily: "'Sora', sans-serif" }}>3</span>
        <span style={{ fontSize: 12, color: '#64748B' }}>blocked items</span>
      </div>
      <div className="space-y-2">
        {MOCK_BLOCKED.map(item => (
          <div key={item.key} className="flex items-center gap-2">
            <span
              className="cursor-pointer hover:underline"
              style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#2563EB', fontWeight: 500 }}
            >
              {item.key}
            </span>
            <span className="truncate" style={{ fontSize: 12, color: '#334155' }}>{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
