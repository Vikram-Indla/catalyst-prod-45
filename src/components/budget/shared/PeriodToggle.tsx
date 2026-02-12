/**
 * Budget Planner V8 - Period Toggle Component
 * Reusable period selector (CODE-1 fix: Extract duplicate code)
 */

import { cn } from '@/lib/utils';
import type { BudgetPeriod } from '@/hooks/budget/useBudgetData';
import { PERIODS } from './BudgetConstants';

interface PeriodToggleProps {
  period: BudgetPeriod;
  onPeriodChange?: (period: BudgetPeriod) => void;
  className?: string;
}

export function PeriodToggle({ period, onPeriodChange, className }: PeriodToggleProps) {
  return (
    <div 
      className={cn("inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl", className)}
      role="tablist"
      aria-label="Budget period selector"
    >
      {PERIODS.map(p => (
        <button
          key={p.value}
          role="tab"
          aria-selected={period === p.value}
          aria-pressed={period === p.value}
          aria-label={`Select ${p.label} period`}
          onClick={() => onPeriodChange?.(p.value)}
          className={cn(
            'px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150',
            'focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2',
            p.value !== 'Full' && 'hidden',
            period === p.value
              ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
