import React from 'react';
import { RELEASE_STATUS_LABELS, RELEASE_STATUS_LOZENGE, LOZENGE } from '@/constants/releasehub.design';

interface Props {
  status: string;
  onChange?: (status: string) => void;
}

/**
 * StatusLozenge for release statuses — immutable 3-color guardrail
 * Height: 20px | 11px/700/uppercase/0.03em | Radius: 3px
 * GREY → ARCHIVED | BLUE → PLANNING, IN_PROGRESS | GREEN → RELEASED
 */
export function ReleaseStatusBadge({ status }: Props) {
  const label = RELEASE_STATUS_LABELS[status] || status?.replace(/_/g, ' ') || '—';
  const loz = RELEASE_STATUS_LOZENGE[status] || LOZENGE.grey;

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
