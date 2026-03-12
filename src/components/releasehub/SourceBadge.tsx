import React from 'react';
import { SOURCE_BADGE } from '@/constants/releasehub.design';

export function SourceBadge({ source }: { source: string }) {
  const normalized = source?.toLowerCase() || 'catalyst';
  const badge = SOURCE_BADGE[normalized] || SOURCE_BADGE.catalyst;
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
      {source?.toUpperCase() || 'CATALYST'}
    </span>
  );
}
