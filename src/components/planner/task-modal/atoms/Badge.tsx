// ============================================================================
// ATOM: Badge — Small rounded badge for counts
// ============================================================================

import React from 'react';
import { COLORS } from '../colors';

interface BadgeProps {
  count: number;
  isActive?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ 
  count, 
  isActive = false 
}) => {
  if (count <= 0) return null;
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '20px',
        height: '20px',
        padding: '0 6px',
        borderRadius: '10px',
        backgroundColor: isActive ? COLORS.accentLight : COLORS.surfaceHover,
        color: isActive ? COLORS.accent : COLORS.textMuted,
        fontSize: '11px',
        fontWeight: 600,
        marginLeft: '6px'
      }}
    >
      {count}
    </span>
  );
};

export default Badge;
