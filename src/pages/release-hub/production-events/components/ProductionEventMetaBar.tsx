import type { PcEvent } from '../types/production-events.types';

interface Props {
  event: PcEvent;
}

export function ProductionEventMetaBar({ event }: Props) {
  const items = [
    { label: 'Epic', value: event.source_epic_key ?? '—' },
    {
      label: 'Release',
      value: event.linked_release_versions.join(', ') || '—',
      link: event.linked_release_versions[0] ? `/releasehub/all` : undefined,
    },
    {
      label: 'Change #',
      value: event.linked_change_numbers.join(', ') || '—',
    },
    { label: 'Status', value: event.status === 'active' ? 'Active' : 'Rolled Back' },
  ];

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 6,
        padding: '10px 14px', marginTop: 20, gap: 12,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {items.map(item => (
        <div key={item.label}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
            {item.label}
          </div>
          {item.link ? (
            <a
              href={item.link}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 12.5, fontWeight: 500, color: '#2563EB', textDecoration: 'none' }}
            >
              {item.value}
            </a>
          ) : (
            <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1E293B' }}>
              {item.value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
