import React from 'react';
import { CHG_STATUS_LABELS, CHG_STATUS_LOZENGE, LOZENGE } from '@/constants/releasehub.design';

interface Props {
  status: string;
}

/**
 * StatusLozenge for change statuses — immutable 3-color guardrail
 * Height: 20px | 11px/700/uppercase/0.03em | Radius: 3px
 * GREY → NEW | BLUE → IN_UAT, IN_BETA | GREEN → IN_PRODUCTION
 */
export function ChgStatusBadge({ status }: Props) {
  const label = CHG_STATUS_LABELS[status] || status?.replace(/_/g, ' ') || '—';
  const loz = CHG_STATUS_LOZENGE[status] || LOZENGE.grey;

  return (
    <span
      className="inline-flex items-center whitespace-nowrap"
      style={{
        height: 20,
        padding: '0 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        backgroundColor: loz.bg,
        color: loz.text,
        lineHeight: '20px',
      }}
    >
      {label}
    </span>
  );
}
