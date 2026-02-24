import type { PcEventTicket, PcEventType } from '../types/production-events.types';
import { getEventColors } from '../utils/event-colors';

interface Props {
  tickets: PcEventTicket[];
  eventType: PcEventType;
}

const JIRA_BASE = 'https://jira.example.com/browse/';

export function ProductionEventTicketList({ tickets, eventType }: Props) {
  const colors = getEventColors(eventType, false);

  if (!tickets.length) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        fontSize: 11.5, fontWeight: 700, color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 10, fontFamily: "'Inter', sans-serif",
      }}>
        Consolidated Tickets
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tickets.map((t, i) => (
          <div
            key={t.ticketKey}
            className="flex items-center gap-3"
            style={{
              padding: '8px 0',
              borderBottom: i < tickets.length - 1 ? '1px solid #F1F5F9' : 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <a
              href={`${JIRA_BASE}${t.ticketKey}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
                color: colors.ticketColor, textDecoration: 'none', flexShrink: 0,
              }}
            >
              {t.ticketKey}
            </a>
            <span style={{ fontSize: 12.5, color: '#1E293B', fontWeight: 400 }}>
              {t.summary ?? '—'}
            </span>
            {t.type && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#64748B', background: '#F1F5F9',
                padding: '1px 6px', borderRadius: 4, marginLeft: 'auto', flexShrink: 0,
              }}>
                {t.type}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
