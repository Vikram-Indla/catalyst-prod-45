/**
 * StatusLozenge — 3-colour status badge
 */
import React from 'react';
import { getLozengeColors } from './helpers';

export function StatusLozenge({ status, category }: { status: string; category?: string | null }) {
  const s = getLozengeColors(status, category);
  return (
    <span style={{
      display: 'inline-block', height: 20, lineHeight: '20px', fontSize: 11,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
      borderRadius: 3, padding: '0 6px', whiteSpace: 'nowrap',
      background: s.bg, color: s.color,
    }}>{status}</span>
  );
}
