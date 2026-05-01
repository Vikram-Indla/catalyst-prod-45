/**
 * Critical Alert Banner
 * Urgent notification for contracts ending within 90 days
 */

import { AlertCircle, ArrowRight } from 'lucide-react';
import type { ContractResourceWithStatus } from '@/types/contract-horizon';

interface CriticalAlertProps {
  criticalCount: number;
  criticalResources: ContractResourceWithStatus[];
  onViewAll: () => void;
}

export function CriticalAlert({ criticalCount, criticalResources, onViewAll }: CriticalAlertProps) {
  if (criticalCount === 0) return null;

  const names = criticalResources.slice(0, 4).map(r => r.name);
  const remaining = criticalCount - 4;
  const description = remaining > 0 
    ? `${names.join(', ')}, and ${remaining} others require renewal decisions before March 30, 2026`
    : `${names.join(', ')} require renewal decisions soon`;

  return (
    <div className="mb-5">
      <div 
        className="relative flex items-center gap-4 p-4 pr-5 rounded-[14px] border border-red-200 dark:border-red-500/30"
        style={{
          background: 'linear-gradient(135deg, var(--ds-background-danger, #fef2f2) 0%, #fee2e2 100%)'
        }}
      >
        {/* Left accent bar */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[14px]"
          style={{
            background: 'linear-gradient(180deg, #f87171 0%, var(--ds-text-danger, #dc2626) 100%)'
          }}
        />
        
        {/* Icon */}
        <div 
          className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(145deg, var(--ds-text-danger, #ef4444) 0%, var(--ds-text-danger, #dc2626) 100%)',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
          }}
        >
          <AlertCircle className="w-5 h-5 text-white" />
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <div className="text-[14px] font-bold text-red-700 dark:text-red-300 mb-0.5">
            Immediate Attention: {criticalCount} Contracts Ending Soon
          </div>
          <div className="text-[12px] text-red-800 dark:text-red-200 leading-relaxed">
            {description}
          </div>
        </div>
        
        {/* Button */}
        <button
          onClick={onViewAll}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-white text-[12px] font-semibold transition-all hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(145deg, var(--ds-text-danger, #ef4444) 0%, var(--ds-text-danger, #dc2626) 100%)',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
          }}
        >
          View All
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
