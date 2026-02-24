import type { PcEvent } from '../types/production-events.types';
import { ProductionEventImpactBlock } from './ProductionEventImpactBlock';
import { ProductionEventTicketList } from './ProductionEventTicketList';
import { ProductionEventMetaBar } from './ProductionEventMetaBar';

interface Props {
  event: PcEvent;
}

export function ProductionEventDetail({ event }: Props) {
  return (
    <div
      style={{
        background: '#FAFBFD', padding: '28px 32px 28px 68px',
        borderTop: '1px solid #F1F5F9',
      }}
    >
      {/* Display Title (serif) */}
      <h3 style={{
        fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700,
        color: '#020617', margin: '0 0 16px', lineHeight: 1.35,
      }}>
        {event.event_title}
      </h3>

      {/* What Changed */}
      {event.event_description && (
        <div>
          <div style={{
            fontSize: 11.5, fontWeight: 700, color: '#475569',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 8, fontFamily: "'Inter', sans-serif",
          }}>
            What Changed
          </div>
          <p style={{
            margin: 0, fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 400,
            color: '#1E293B', lineHeight: 1.72,
          }}>
            {event.event_description}
          </p>
        </div>
      )}

      {/* Investor Impact */}
      {event.investor_impact && (
        <ProductionEventImpactBlock impact={event.investor_impact} eventType={event.event_type} />
      )}

      {/* Consolidated Tickets */}
      <ProductionEventTicketList tickets={event.ticket_details} eventType={event.event_type} />

      {/* Metadata Bar */}
      <ProductionEventMetaBar event={event} />
    </div>
  );
}
