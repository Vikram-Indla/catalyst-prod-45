import React from 'react';
import { RISK_BADGE } from '@/constants/releasehub.design';

export function RiskBadge({ risk }: { risk: string }) {
  const normalized = risk?.toLowerCase() || 'standard';
  const badge = RISK_BADGE[normalized] || RISK_BADGE.standard;
  return (
    <span
      className="inline-flex items-center whitespace-nowrap"
      style={{
        height: 18,
        padding: '0 6px',
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        backgroundColor: badge.bg,
        color: badge.text,
        lineHeight: '18px',
      }}
    >
      {risk?.toUpperCase() || 'STANDARD'}
    </span>
  );
}
