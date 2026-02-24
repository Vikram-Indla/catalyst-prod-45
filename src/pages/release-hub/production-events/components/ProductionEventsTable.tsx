import type { ProductionEvent } from '../hooks/useProductionEvents';
import { ProductionEventRow } from './ProductionEventRow';

interface Props {
  events: (ProductionEvent & { eventType: string })[];
  loading: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

const COLUMNS = ['#', 'Event', 'Type', 'Release', 'Deployed', 'Stories'];

export function ProductionEventsTable({ events, loading, expandedId, onToggleExpand }: Props) {
  return (
    <div
      style={{
        background: '#FFFFFF', borderRadius: 10,
        border: '1px solid #E2E8F0',
        // Fix 13: box shadow
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {/* Fix 14: 2px bottom border on thead */}
        <thead>
          <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
            {COLUMNS.map(col => (
              <th
                key={col}
                style={{
                  padding: '10px 16px',
                  paddingLeft: col === '#' ? 20 : 16,
                  fontSize: 11, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  textAlign: col === '#' || col === 'Stories' ? 'center' : 'left',
                  fontFamily: "'Inter', sans-serif",
                  position: 'sticky', top: 0, zIndex: 1,
                  background: '#F8FAFC',
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`skel-${i}`}>
                {COLUMNS.map((_, ci) => (
                  <td key={ci} style={{ padding: '14px 16px' }}>
                    <div style={{
                      height: 14, width: ci === 1 ? '80%' : '50%',
                      background: '#F1F5F9', borderRadius: 4,
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                  </td>
                ))}
              </tr>
            ))
          )}

          {!loading && events.length === 0 && (
            <tr>
              <td
                colSpan={COLUMNS.length}
                style={{
                  padding: '48px 24px', textAlign: 'center',
                  fontSize: 14, color: '#64748B', fontFamily: "'Inter', sans-serif",
                }}
              >
                No production items found for this period.
              </td>
            </tr>
          )}

          {!loading && events.map((event, i) => (
            <ProductionEventRow
              key={event.id}
              event={event}
              index={i}
              expanded={expandedId === event.id}
              onToggle={() => onToggleExpand(event.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
