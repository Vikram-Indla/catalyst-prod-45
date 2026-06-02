// ============================================================================
// SummaryCard — Workstreams summary statistic card
// Extracted from WorkstreamsPage.tsx
// ============================================================================

import React from 'react';
import { COLORS } from './workstreams-constants';

export const SummaryCard: React.FC<{
  value: number;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}> = ({ value, label, icon, isActive }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 20px',
      backgroundColor: isActive ? COLORS.accentLighter : COLORS.surfaceWhite,
      border: `1px solid ${isActive ? COLORS.accent : COLORS.borderLight}`,
      borderRadius: '12px',
      minWidth: '140px',
    }}
  >
    {icon}
    <div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 700,
          color: isActive ? COLORS.accent : COLORS.textPrimary,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '13px', color: COLORS.textMuted, marginTop: '2px' }}>{label}</div>
    </div>
  </div>
);
