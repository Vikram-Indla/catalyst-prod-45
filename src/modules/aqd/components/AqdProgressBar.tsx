// Aqd¹⁰ Progress Bar Component
import React from 'react';

interface AqdProgressBarProps {
  filled: number;
  total: number;
}

export function AqdProgressBar({ filled, total }: AqdProgressBarProps) {
  const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
  
  return (
    <div className="aqd-progress">
      <div className="aqd-progress-header">
        <span className="aqd-progress-label">Weekly Progress</span>
        <span className="aqd-progress-value">
          {filled}/{total} priorities ({percentage}%)
        </span>
      </div>
      <div className="aqd-progress-track">
        <div 
          className="aqd-progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
