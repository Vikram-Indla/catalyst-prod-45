// ============================================================================
// ATOM: Avatar — Circular avatar with initials
// ============================================================================

import React from 'react';

interface AvatarProps {
  initials: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { width: 26, height: 26, fontSize: 11 },
  md: { width: 36, height: 50, fontSize: 12 },
  lg: { width: 40, height: 40, fontSize: 14 }
};

export const Avatar: React.FC<AvatarProps> = ({ 
  initials, 
  color, 
  size = 'sm' 
}) => {
  const dimensions = SIZES[size];
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        minWidth: `${dimensions.width}px`,
        minHeight: `${dimensions.height}px`,
        borderRadius: '50%',
        backgroundColor: color,
        color: '#ffffff',
        fontSize: `${dimensions.fontSize}px`,
        fontWeight: 600,
        flexShrink: 0,
        textTransform: 'uppercase'
      }}
    >
      {initials}
    </span>
  );
};

export default Avatar;
