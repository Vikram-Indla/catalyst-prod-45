// ============================================================================
// ATOM: ProgressBar — Horizontal progress indicator
// ============================================================================

import React from 'react';
import { COLORS } from '../colors';

interface ProgressBarProps {
  percent: number;
  width?: number;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  percent, 
  width = 140, 
  height = 8 
}) => {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  
  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: COLORS.borderLight,
        borderRadius: `${height / 2}px`,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: `${clampedPercent}%`,
          height: '100%',
          backgroundColor: COLORS.accent,
          borderRadius: `${height / 2}px`,
          transition: 'width 0.3s ease'
        }}
      />
    </div>
  );
};

export default ProgressBar;
