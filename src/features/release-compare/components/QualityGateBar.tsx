/**
 * Quality Gate Bar Component
 * Visual bar showing gate status with pass/fail/pending segments
 */

import React from 'react';
import CheckMarkIcon from '@atlaskit/icon/glyph/check';
import WarningIcon from '@atlaskit/icon/core/warning';
import CloseIcon from '@atlaskit/icon/core/close';

interface QualityGateBarProps {
  passing: number;
  failing: number;
  pending: number;
  total: number;
  isWinner?: boolean;
}

export function QualityGateBar({ passing, failing, pending, total, isWinner }: QualityGateBarProps) {
  // Determine icon state
  const allPassing = passing === total;
  const majorityFailing = failing > total / 2;
  
  const Icon = allPassing ? CheckMarkIcon : majorityFailing ? CloseIcon : WarningIcon;
  const iconColor = allPassing ? 'var(--ds-chart-teal-bold, #0d9488)' : majorityFailing ? 'var(--ds-text-danger, #ef4444)' : 'var(--ds-text-warning, #d97706)';
  
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
      
      <div className="flex flex-col gap-2">
        {/* Icon + count */}
        <div className="flex items-center gap-2">
          <Icon label="" size="small" primaryColor={iconColor} />
          <span className="text-sm font-medium text-slate-700">
            {passing} / {total} Passing
          </span>
        </div>
        
        {/* Visual bar */}
        <div className="flex h-2 rounded overflow-hidden bg-slate-100">
          {Array.from({ length: total }).map((_, i) => {
            let color = 'var(--ds-text-disabled, #cbd5e1)'; // Pending (Gray 300)
            if (i < passing) {
              color = 'var(--ds-chart-teal-bold, #0d9488)'; // Pass (Teal)
            } else if (i < passing + failing) {
              color = 'var(--ds-text-danger, #ef4444)'; // Fail (Danger)
            }
            
            return (
              <div
                key={i}
                className="flex-1"
                style={{ 
                  backgroundColor: color,
                  marginRight: i < total - 1 ? '2px' : 0
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
