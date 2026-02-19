const COLORS = ['#7C3AED', '#2563EB', '#0D9488', '#D97706', '#DC2626'];

const MOCK_ACTIVITY = [
  { name: 'Vikram Patel', action: 'moved', key: 'DMA-15', title: 'User Dashboard', detail: 'to In Review', time: '2h ago' },
  { name: 'Sara Al-Rashid', action: 'completed', key: 'DMA-22', title: 'Search API', detail: '', time: '4h ago' },
  { name: 'Omar Hassan', action: 'commented on', key: 'DMA-08', title: 'Auth Module', detail: '', time: '5h ago' },
  { name: 'Noura Al-Qahtani', action: 'created', key: 'DMA-44', title: 'Mobile Nav', detail: '', time: '1d ago' },
  { name: 'Khalid Ibrahim', action: 'assigned', key: 'DMA-33', title: 'Audit Trail', detail: 'to Omar', time: '1d ago' },
];

export function RecentActivity() {
  return (
    <div className="space-y-3">
      {MOCK_ACTIVITY.map((a, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 24, height: 24, background: COLORS[i % COLORS.length], color: '#FFFFFF', fontSize: 10, fontWeight: 600 }}
          >
            {a.name.split(' ').map(w => w[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ fontSize: 12, color: '#334155' }}>
              <span style={{ fontWeight: 600 }}>{a.name.split(' ')[0]}</span>
              {' '}{a.action}{' '}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2563EB', fontWeight: 500 }}>{a.key}</span>
              {' — '}{a.title}
              {a.detail && <span style={{ color: '#64748B' }}> {a.detail}</span>}
            </div>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: 11, color: '#94A3B8' }}>{a.time}</span>
        </div>
      ))}
    </div>
  );
}
