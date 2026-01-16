/**
 * Defect Breakdown Component
 * Shows defects by severity with color-coded dots
 */

import React from 'react';

interface DefectBreakdownProps {
  blocker: number;
  critical: number;
  major: number;
  minor: number;
  isWinner?: boolean;
}

export function DefectBreakdown({ blocker, critical, major, minor, isWinner }: DefectBreakdownProps) {
  const severities = [
    { label: 'B', count: blocker, color: '#ef4444' },  // Danger
    { label: 'C', count: critical, color: '#d97706' }, // Warning
    { label: 'M', count: major, color: '#2563eb' },    // Primary
    { label: 'm', count: minor, color: '#94a3b8' },    // Gray 400
  ];
  
  return (
    <div className="relative">
      {isWinner && (
        <div 
          className="absolute -top-1 -right-1 text-lg z-10"
          style={{ color: '#0d9488' }}
        >
          ★
        </div>
      )}
      
      <div className="flex items-center gap-3">
        {severities.map((sev) => (
          <div key={sev.label} className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: sev.color }}
            />
            <span className="text-xs font-medium text-slate-600">
              {sev.label}:{sev.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
