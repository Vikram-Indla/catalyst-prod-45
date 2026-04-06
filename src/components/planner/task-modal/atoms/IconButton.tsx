// ============================================================================
// ATOM: IconButton — 38px square button with icon
// ============================================================================

import React, { useState } from 'react';
import { COLORS } from '../colors';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  size?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  onClick, 
  title,
  size = 38
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        backgroundColor: isHovered ? COLORS.surfaceHover : 'transparent',
        border: `1px solid ${isHovered ? COLORS.borderDefault : COLORS.borderLight}`,
        borderRadius: '12px',
        color: isHovered ? COLORS.textSecondary : COLORS.textMuted,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        padding: 0
      }}
    >
      {icon}
    </button>
  );
};

export default IconButton;
