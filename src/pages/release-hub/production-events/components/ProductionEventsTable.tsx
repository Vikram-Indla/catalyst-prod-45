import { useMemo } from 'react';
import type { ProductionEvent } from '../hooks/useProductionEvents';
import type { PcPeriodType } from '../types/production-events.types';
import { ProductionEventRow } from './ProductionEventRow';
import { groupEventsByMonth, formatMonthYear, getTypeSummary } from '../utils/narrative-helpers';

interface Props {
  events: (ProductionEvent & { eventType: string })[];
  loading: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  periodType?: PcPeriodType;
}

const COLUMNS = ['#', 'Event', 'Type', 'Release', 'Deployed', 'Stories'];

export function ProductionEventsTable({ events, loading, expandedId, onToggleExpand, periodType }: Props) {
  // Fix 26: Group by month for quarterly view
  const eventsByMonth = useMemo(() => {
    if (periodType !== 'quarterly' || events.length === 0) return null;
    return groupEventsByMonth(events);
  }, [events, periodType]);

  // Global index counter for quarterly month groups
  let globalIndex = 0;

  return (
    <div
      style={{
        background: '#FFFFFF', borderRadius: 10,
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  background: '#F8FAFC', whiteSpace: 'nowrap',
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

          {/* Fix 26: Quarterly view with month dividers */}
          {!loading && eventsByMonth && Object.entries(eventsByMonth)
            .sort(([a], [b]) => b.localeCompare(a)) // newest month first
            .map(([monthKey, monthEvents]) => {
              const startIdx = globalIndex;
              globalIndex += monthEvents.length;
              return (
                <MonthGroup
                  key={monthKey}
                  monthKey={monthKey}
                  monthEvents={monthEvents}
                  startIndex={startIdx}
                  expandedId={expandedId}
                  onToggleExpand={onToggleExpand}
                />
              );
            })
          }

          {/* Non-quarterly: flat list */}
          {!loading && !eventsByMonth && events.map((event, i) => (
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

// Month divider + events sub-component
function MonthGroup({
  monthKey,
  monthEvents,
  startIndex,
  expandedId,
  onToggleExpand,
}: {
  monthKey: string;
  monthEvents: (ProductionEvent & { eventType: string })[];
  startIndex: number;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <>
      {/* Month divider row */}
      <tr>
        <td
          colSpan={6}
          style={{
            padding: '12px 20px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#0F172A',
            fontFamily: "'Inter', sans-serif",
          }}>
            {formatMonthYear(monthKey)}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 500, color: '#64748B',
            marginLeft: 8, fontFamily: "'Inter', sans-serif",
          }}>
            — {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''} · {getTypeSummary(monthEvents)}
          </span>
        </td>
      </tr>
      {monthEvents.map((event, i) => (
        <ProductionEventRow
          key={event.id}
          event={event}
          index={startIndex + i}
          expanded={expandedId === event.id}
          onToggle={() => onToggleExpand(event.id)}
        />
      ))}
    </>
  );
}
