const COLORS = ['#7C3AED', '#2563EB', '#0D9488', '#D97706', '#DC2626'];

const MOCK_WORKLOAD = [
  { name: 'Vikram Patel', count: 8 },
  { name: 'Sara Al-Rashid', count: 6 },
  { name: 'Omar Hassan', count: 5 },
  { name: 'Noura Al-Qahtani', count: 4 },
  { name: 'Khalid Ibrahim', count: 2 },
];

export function TeamWorkload() {
  const max = Math.max(...MOCK_WORKLOAD.map(w => w.count));

  return (
    <div className="space-y-2.5">
      {MOCK_WORKLOAD.map((w, i) => (
        <div key={w.name} className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 20, height: 20, background: COLORS[i % COLORS.length], color: '#FFFFFF', fontSize: 9, fontWeight: 600 }}
          >
            {w.name.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="flex-shrink-0 truncate" style={{ width: 80, fontSize: 12, color: '#334155' }}>
            {w.name.split(' ')[0]}
          </span>
          <div className="flex-1" style={{ height: 8, borderRadius: 4, background: '#F1F5F9' }}>
            <div
              style={{
                width: `${(w.count / max) * 100}%`,
                height: '100%', borderRadius: 4, background: COLORS[i % COLORS.length],
                transition: 'width 500ms ease',
              }}
            />
          </div>
          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#64748B', minWidth: 16, textAlign: 'right' }}>
            {w.count}
          </span>
        </div>
      ))}
    </div>
  );
}
