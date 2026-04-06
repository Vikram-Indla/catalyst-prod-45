import React from 'react';
import { RISK_BADGE } from '@/constants/releasehub.design';

const RISK_MAP: Record<string, string> = {
  low: 'standard',
  medium: 'standard',
  critical: 'emergency',
};

export function RiskBadge({ risk }: { risk: string }) {
  let normalized = risk?.toLowerCase() || 'standard';
  if (RISK_MAP[normalized]) normalized = RISK_MAP[normalized];
  const badge = RISK_BADGE[normalized] || RISK_BADGE.standard;
  const label = normalized.toUpperCase();
  return (
    <span
      className="inline-flex items-center whitespace-nowrap"
      style={{
        height: 18,
        padding: '0 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        backgroundColor: badge.bg,
        color: badge.text,
        lineHeight: '18px',
      }}
    >
      {label}
    </span>
  );
}
