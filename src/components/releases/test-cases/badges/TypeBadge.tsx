/**
 * TypeBadge — Test case type badge with consistent styling
 */

import { cn } from '@/lib/utils';
import type { TestCaseType } from '@/types/test-cases';

const typeStyles: Record<TestCaseType, string> = {
  functional: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  regression: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700',
  smoke: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
  integration: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700',
  e2e: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700',
  performance: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
  security: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  usability: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
};

const typeLabels: Record<TestCaseType, string> = {
  functional: 'Functional',
  regression: 'Regression',
  smoke: 'Smoke',
  integration: 'Integration',
  e2e: 'E2E',
  performance: 'Performance',
  security: 'Security',
  usability: 'Usability',
};

interface TypeBadgeProps {
  type: TestCaseType;
  size?: 'sm' | 'default';
  className?: string;
}

export function TypeBadge({ type, size = 'default', className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs',
        typeStyles[type],
        className
      )}
    >
      {typeLabels[type]}
    </span>
  );
}

// Re-export the type for backwards compatibility
export type { TestCaseType } from '@/types/test-cases';
