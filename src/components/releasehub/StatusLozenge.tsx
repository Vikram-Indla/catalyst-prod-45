import React from 'react';
import { LOZENGE } from '@/constants/releasehub.design';

type LozengeColor = 'grey' | 'blue' | 'green';

const COLOR_MAP: Record<string, LozengeColor> = {
  // Change statuses
  new: 'grey', in_uat: 'blue', in_beta: 'blue', in_production: 'green', in_qa: 'blue',
  // Release statuses
  planning: 'blue', in_progress: 'blue', released: 'green', archived: 'grey',
  todo: 'grey', done: 'green',
  // Sign-off
  approved: 'green', rejected: 'grey', pending: 'grey', waiting: 'blue',
  // Test
  pass: 'green', fail: 'grey', not_started: 'grey',
  // Generic
  active: 'blue', on_hold: 'grey', backlog: 'grey',
};

interface Props {
  status: string;
  label?: string;
}

export function StatusLozenge({ status, label }: Props) {
  const normalized = status?.toLowerCase().replace(/[\s-]/g, '_') || '';
  const colorKey = COLOR_MAP[normalized] || 'grey';
  const loz = LOZENGE[colorKey];
  const displayLabel = label || status?.replace(/_/g, ' ') || '—';

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
      {displayLabel}
    </span>
  );
}
