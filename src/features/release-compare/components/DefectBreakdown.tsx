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
    { label: 'B', count: blocker, color: 'var(--ds-text-danger)' },  // Danger
    { label: 'C', count: critical, color: 'var(--ds-text-warning)' }, // Warning
    { label: 'M', count: major, color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },    // Primary
    { label: 'm', count: minor, color: 'var(--ds-text-subtlest)' },    // Gray 400
  ];
  
  return (
    <div className="relative">
      {isWinner && (
        <div 
          className="absolute -top-1 -right-1 text-lg z-10"
          style={{ color: 'var(--ds-chart-teal-bold)' }}
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
