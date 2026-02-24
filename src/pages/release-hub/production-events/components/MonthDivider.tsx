import { format } from 'date-fns';

interface Props {
  month: Date;
  eventCount: number;
  featureCount: number;
  incidentCount: number;
}

export function MonthDivider({ month, eventCount, featureCount, incidentCount }: Props) {
  const label = format(month, 'MMMM yyyy').toUpperCase();
  const parts: string[] = [];
  parts.push(`${eventCount} event${eventCount !== 1 ? 's' : ''}`);
  if (featureCount > 0) parts.push(`${featureCount} feature${featureCount !== 1 ? 's' : ''}`);
  if (incidentCount > 0) parts.push(`${incidentCount} incident${incidentCount !== 1 ? 's' : ''}`);

  return (
    <tr>
      <td
        colSpan={6}
        style={{
          padding: '14px 12px 8px',
          borderBottom: '2px solid #E2E8F0',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 400, color: '#94A3B8', marginLeft: 12 }}>
          {parts.join(' · ')}
        </span>
      </td>
    </tr>
  );
}
