import React from 'react';
import { SOURCE_BADGE } from '@/constants/releasehub.design';

export function SourceBadge({ source }: { source: string }) {
  // Normalize: servicenow → catalyst (ServiceNow is banned)
  let normalized = source?.toLowerCase() || 'catalyst';
  if (normalized === 'servicenow') normalized = 'catalyst';
  const badge = SOURCE_BADGE[normalized] || SOURCE_BADGE.catalyst;
  const label = normalized === 'jira' ? 'JIRA' : 'CATALYST';
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
