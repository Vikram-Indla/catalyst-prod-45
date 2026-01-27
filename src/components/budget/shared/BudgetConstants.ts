/**
 * Budget Planner V8 - Shared Constants
 * Centralized configuration to ensure consistency across all tabs
 */

import type { BudgetPeriod } from '@/hooks/budget/useBudgetData';

// =============================================================================
// DEPARTMENT NAMES - Single source of truth (DS-2 fix)
// =============================================================================

/**
 * Canonical department order used across all budget tabs.
 * Uses 'Technical Support' as the full name, abbreviated to 'Tech Support' for display.
 */
export const DEPT_ORDER = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Governance'] as const;

/**
 * Department abbreviations for compact displays (tables, badges)
 */
export const DEPT_ABBREV: Record<string, string> = {
  'Delivery': 'Del',
  'Product': 'Prod',
  'Operations': 'Ops',
  'Technical Support': 'Tech',
  'Governance': 'Gov'
};

/**
 * Department filters for scenario planning and filtering UIs
 */
export const DEPARTMENT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Product', label: 'Product' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Technical Support', label: 'Tech Support' },
  { value: 'Governance', label: 'Governance' },
] as const;

// =============================================================================
// PERIOD CONFIGURATION
// =============================================================================

export const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'Q1', label: 'Q1' },
  { value: 'H1', label: 'H1' },
  { value: 'Full', label: 'Full Year' },
];

export const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  Q1: 'Q1 2026 (Jan–Mar)',
  H1: 'H1 2026 (Jan–Jun)',
  Full: 'Full Year 2026 (Jan–Dec)',
};

export const PERIOD_MONTHS: Record<BudgetPeriod, number> = {
  Q1: 3,
  H1: 6,
  Full: 12,
};

// =============================================================================
// MAGIC NUMBERS - Named constants (CODE-3 fix)
// =============================================================================

export const MAX_VISIBLE_ASSIGNMENTS = 8;
export const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const CRITICAL_EXPIRY_DAYS = 180; // 6 months for critical resource alerts
export const ENDING_SOON_DAYS = 90;
export const URGENT_DAYS = 60;

// =============================================================================
// EXTENSION OPTIONS - For scenario planning dropdowns
// =============================================================================

export const EXTENSION_OPTIONS = [
  { value: 0, label: 'No change' },
  { value: 1, label: '+1 month' },
  { value: 2, label: '+2 months' },
  { value: 3, label: '+3 months' },
  { value: 4, label: '+4 months' },
  { value: 5, label: '+5 months' },
  { value: 6, label: '+6 months' },
  { value: 7, label: '+7 months' },
  { value: 8, label: '+8 months' },
  { value: 9, label: '+9 months' },
  { value: 10, label: '+10 months' },
  { value: 11, label: '+11 months' },
  { value: 12, label: '+12 months' },
] as const;

// =============================================================================
// DESIGN TOKENS - Category colors using Tailwind classes (DS-1 fix)
// =============================================================================

export const BUDGET_TYPE_COLORS = {
  insourced: {
    text: 'text-blue-600 dark:text-blue-400',
    textDark: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    bgLight: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-500',
    borderLight: 'border-blue-300',
    accent: 'border-l-blue-500',
    gradient: 'from-blue-600 to-blue-500',
  },
  cosourced: {
    text: 'text-teal-600 dark:text-teal-400',
    textDark: 'text-teal-700 dark:text-teal-300',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    bgLight: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-500',
    borderLight: 'border-teal-300',
    accent: 'border-l-teal-500',
    gradient: 'from-teal-600 to-teal-500',
  },
  outsourced: {
    text: 'text-amber-600 dark:text-amber-400',
    textDark: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-500',
    borderLight: 'border-amber-300',
    accent: 'border-l-amber-500',
    gradient: 'from-amber-600 to-amber-500',
  },
  licenses: {
    text: 'text-violet-600 dark:text-violet-400',
    textDark: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    bgLight: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-500',
    borderLight: 'border-violet-300',
    accent: 'border-l-violet-500',
    gradient: 'from-violet-600 to-violet-500',
  },
} as const;

// Type helper to get budget type from assignment type
export function getBudgetTypeColors(type: string) {
  const typeMap: Record<string, keyof typeof BUDGET_TYPE_COLORS> = {
    'Insourced': 'insourced',
    'BAU': 'insourced',
    'Cosourced': 'cosourced',
    'Outsourced': 'outsourced',
    'Licenses': 'licenses',
  };
  return BUDGET_TYPE_COLORS[typeMap[type] || 'insourced'];
}

// =============================================================================
// QUALITY THRESHOLDS
// =============================================================================

export const QUALITY_THRESHOLDS = {
  good: 80,    // >= 80% = green/emerald
  warning: 50, // >= 50% = amber
  critical: 0, // < 50% = red
} as const;

export function getQualityColor(score: number) {
  if (score >= QUALITY_THRESHOLDS.good) return 'emerald';
  if (score >= QUALITY_THRESHOLDS.warning) return 'amber';
  return 'red';
}
