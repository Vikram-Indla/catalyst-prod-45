// ============================================================================
// MOLECULE: EmptyState — Empty state with icon and text
// ============================================================================

import React from 'react';
import { COLORS } from '../colors';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
        backgroundColor: COLORS.surfacePage,
        border: `2px dashed ${COLORS.borderDefault}`,
        borderRadius: '12px',
        textAlign: 'center'
      }}
    >
      {/* ICON */}
      <div style={{ color: COLORS.textLight, marginBottom: '16px' }}>
        {icon}
      </div>

      {/* TITLE */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: COLORS.textSecondary,
          margin: '0 0 6px 0'
        }}
      >
        {title}
      </h3>

      {/* DESCRIPTION */}
      <p style={{ fontSize: '14px', color: COLORS.textMuted, margin: 0 }}>
        {description}
      </p>
    </div>
  );
};

export default EmptyState;
