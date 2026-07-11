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
      gap: '4px',
      padding: '8px 14px',
      backgroundColor: isActive ? COLORS.surfaceWhite : 'transparent',
      border: 'none',
      borderRadius: '6px',
      fontSize: 'var(--ds-font-size-300)',
      fontWeight: 500,
      color: isActive ? COLORS.textPrimary : COLORS.textMuted,
      cursor: 'pointer',
      fontFamily: 'inherit',
      boxShadow: isActive ? '0 1px 3px var(--ds-shadow-raised)' : 'none',
    }}
  >
    {icon}
    {label}
  </button>
);
