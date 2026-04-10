// ============================================================================
// ViewToggleButton — List/Grid view toggle button
// Extracted from WorkstreamsPage.tsx
// ============================================================================

import React from 'react';
import { COLORS } from './workstreams-constants';

export const ViewToggleButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      backgroundColor: isActive ? COLORS.surfaceWhite : 'transparent',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: 500,
      color: isActive ? COLORS.textPrimary : COLORS.textMuted,
      cursor: 'pointer',
      fontFamily: 'inherit',
      boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
    }}
  >
    {icon}
    {label}
  </button>
);
