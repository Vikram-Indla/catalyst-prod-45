/**
 * Test Breakdown Grid Component
 * 2x2 grid showing test status breakdown
 */

import React from 'react';
import CheckMarkIcon from '@atlaskit/icon/glyph/check';
import CloseIcon from '@atlaskit/icon/core/close';
import WarningIcon from '@atlaskit/icon/core/warning';
// No @atlaskit/icon equivalent — inline SVG
const CircleIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
    <circle cx="12" cy="12" r="10" />
  </svg>
);

interface TestBreakdownGridProps {
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  isWinner?: boolean;
}

export function TestBreakdownGrid({ passed, failed, blocked, notRun, isWinner }: TestBreakdownGridProps) {
  const cells = [
    {
      icon: (color: string) => <CheckMarkIcon label="" size="small" primaryColor={color} />,
      count: passed,
      label: 'Passed',
      bgColor: 'var(--ds-background-success, #DCFFF1)',
      iconColor: 'var(--ds-chart-teal-bold, #0d9488)'
    },
    {
      icon: (color: string) => <CloseIcon label="" size="small" primaryColor={color} />,
      count: failed,
      label: 'Failed',
      bgColor: 'var(--ds-background-danger, #FFECEB)',
      iconColor: 'var(--ds-text-danger, #ef4444)'
    },
    {
      icon: (color: string) => <WarningIcon label="" size="small" primaryColor={color} />,
      count: blocked,
      label: 'Blocked',
      bgColor: 'var(--ds-background-warning, #FFF7D6)',
      iconColor: 'var(--ds-text-warning, #d97706)'
    },
    {
      icon: (color: string) => <CircleIcon size={12} />,
      count: notRun,
      label: 'Not Run',
      bgColor: 'var(--ds-surface-sunken, #f1f5f9)',
      iconColor: 'var(--ds-text-subtlest, #64748b)'
    },
  ];
  
  return (
    <div className="relative">
      {isWinner && (
        <div 
          className="absolute -top-1 -right-1 text-lg z-10"
          style={{ color: 'var(--ds-chart-teal-bold, #0d9488)' }}
        >
          ★
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-1 text-xs">
        {cells.map((cell) => (
          <div 
            key={cell.label}
            className="flex items-center gap-1.5 px-2 py-1 rounded"
            style={{ backgroundColor: cell.bgColor }}
          >
            {cell.icon(cell.iconColor)}
            <span className="font-medium" style={{ color: cell.iconColor }}>
              {cell.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
