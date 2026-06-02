// ============================================================================
// TableHeader — Workstreams table header cell
// Extracted from WorkstreamsPage.tsx
// ============================================================================

import React from 'react';
import { COLORS } from './workstreams-constants';

export const TableHeader: React.FC<{
  children?: React.ReactNode;
  width: string;
  center?: boolean;
}> = ({ children, width, center }) => (
  <th
    style={{
      padding: '14px 20px',
      textAlign: center ? 'center' : 'left',
      fontSize: '11px',
      fontWeight: 600,
      color: COLORS.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      width,
    }}
  >
    {children}
  </th>
);
