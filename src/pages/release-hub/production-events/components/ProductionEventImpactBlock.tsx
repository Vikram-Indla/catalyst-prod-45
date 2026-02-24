import type { PcEventType } from '../types/production-events.types';
import { getEventColors } from '../utils/event-colors';

interface Props {
  impact: string;
  eventType: PcEventType;
}

export function ProductionEventImpactBlock({ impact, eventType }: Props) {
  const colors = getEventColors(eventType, false);

  return (
    <div
      style={{
        borderLeft: `4px solid ${colors.border}`,
        background: colors.impactBg,
        borderRadius: 6,
        padding: '14px 18px',
        marginTop: 16,
      }}
    >
      <div style={{
        fontSize: 11.5, fontWeight: 700, color: colors.border,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 8, fontFamily: "'Inter', sans-serif",
      }}>
        Investor Impact
      </div>
      <p style={{
        margin: 0, fontFamily: 'Georgia, serif', fontSize: 14.5, fontWeight: 400,
        color: '#0F172A', lineHeight: 1.65,
      }}>
        {impact}
      </p>
    </div>
  );
}
