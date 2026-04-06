import React from 'react';
import { DEPLOY_RESULT_BADGE } from '@/constants/releasehub.design';

export function DeployResultBadge({ result }: { result: string | null | undefined }) {
  if (!result) return null;
  const normalized = result.toLowerCase();
  const badge = DEPLOY_RESULT_BADGE[normalized];
  if (!badge) return null;
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
      {result.replace(/_/g, ' ')}
    </span>
  );
}
