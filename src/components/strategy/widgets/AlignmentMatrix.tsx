/**
 * AlignmentMatrix — Widget 10: 7 horizontal bars for workstream alignment
 * Row 4, span 3
 */

interface WorkstreamBar {
  name: string;
  score: number;
  color: string;
}

const WORKSTREAMS: WorkstreamBar[] = [
  { name: 'Senaie', score: 88, color: '#06B6D4' },
  { name: 'Catalyst', score: 92, color: '#8B5CF6' },
  { name: 'Tahommona', score: 76, color: '#6366F1' },
  { name: 'Delivery', score: 81, color: '#F97316' },
  { name: 'MIM', score: 69, color: '#EC4899' },
  { name: 'Standalone', score: 84, color: '#84CC16' },
  { name: 'Data & AI', score: 95, color: '#14B8A6' },
];

export function AlignmentMatrix() {
  return (
    <div className="space-y-1.5">
      {WORKSTREAMS.map(ws => (
        <div key={ws.name} className="flex items-center gap-2">
          <span style={{ width: 60, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {ws.name}
          </span>
          <div className="flex-1" style={{ height: 6, borderRadius: 3, background: '#F8FAFC', overflow: 'hidden' }}>
            <div style={{
              width: `${ws.score}%`,
              height: '100%',
              borderRadius: 3,
              background: ws.color,
              opacity: 0.85,
              transition: 'width 800ms ease-out',
            }} />
          </div>
          <span style={{ width: 30, fontSize: 11, fontWeight: 600, textAlign: 'right', color: 'var(--catalyst-text-primary)', flexShrink: 0 }}>
            {ws.score}%
          </span>
        </div>
      ))}
    </div>
  );
}
