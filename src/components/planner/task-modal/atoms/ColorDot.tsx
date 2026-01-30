// ============================================================================
// ATOM: ColorDot — 10px colored circle
// ============================================================================

import React from 'react';

interface ColorDotProps {
  color: string;
  size?: number;
}

export const ColorDot: React.FC<ColorDotProps> = ({ 
  color, 
  size = 10 
}) => {
  return (
    <span
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0
      }}
    />
  );
};

export default ColorDot;
