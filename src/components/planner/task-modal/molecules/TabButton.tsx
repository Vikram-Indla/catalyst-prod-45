// ============================================================================
// MOLECULE: TabButton — Single tab button with optional badge
// ============================================================================

import React, { useState } from 'react';
import { COLORS } from '../colors';
import { Badge } from '../atoms';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({
  label,
  isActive,
  badge,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '16px 18px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '14px',
        fontWeight: 500,
        color: isActive ? COLORS.accent : (isHovered ? COLORS.textSecondary : COLORS.textMuted),
        whiteSpace: 'nowrap',
        transition: 'color 0.15s ease'
      }}
    >
      {label}
      
      {/* BADGE */}
      {badge !== undefined && badge > 0 && (
        <Badge count={badge} isActive={isActive} />
      )}
      
      {/* ACTIVE INDICATOR — 2px blue line at bottom */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            bottom: '-1px',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: COLORS.accent
          }}
        />
      )}
    </button>
  );
};

export default TabButton;
