/**
 * Test Breakdown Grid Component
 * 2x2 grid showing test status breakdown
 */

import React from 'react';
import { Check, X, AlertTriangle, Circle } from 'lucide-react';

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
      icon: Check, 
      count: passed, 
      label: 'Passed',
      bgColor: '#ccfbf1',
      iconColor: '#0d9488'
    },
    { 
      icon: X, 
      count: failed, 
      label: 'Failed',
      bgColor: '#fee2e2',
      iconColor: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))'
    },
    { 
      icon: AlertTriangle, 
      count: blocked, 
      label: 'Blocked',
      bgColor: '#fef3c7',
      iconColor: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))'
    },
    { 
      icon: Circle, 
      count: notRun, 
      label: 'Not Run',
      bgColor: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #f1f5f9))',
      iconColor: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))'
    },
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
      
      <div className="grid grid-cols-2 gap-1 text-xs">
        {cells.map((cell) => (
          <div 
            key={cell.label}
            className="flex items-center gap-1.5 px-2 py-1 rounded"
            style={{ backgroundColor: cell.bgColor }}
          >
            <cell.icon className="w-3 h-3" style={{ color: cell.iconColor }} />
            <span className="font-medium" style={{ color: cell.iconColor }}>
              {cell.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
