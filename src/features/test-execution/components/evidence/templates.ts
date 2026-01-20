// ============================================================
// Quick Templates Config for Result Recording
// ============================================================

import type { QuickTemplateConfig } from '../../types/evidence';

export const QUICK_TEMPLATES: QuickTemplateConfig[] = [
  {
    id: 'passed',
    label: '✓ As Expected',
    icon: '✓',
    content: 'Result matches expected behavior. All conditions verified successfully.',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-400',
  },
  {
    id: 'deviation',
    label: '⚠ Minor Deviation',
    icon: '⚠',
    content: 'Minor deviation observed: [describe]. Functionally correct but with cosmetic differences.',
    bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  {
    id: 'failed',
    label: '✕ Did Not Match',
    icon: '✕',
    content: 'Result does NOT match expected. Observed: [describe actual behavior]',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-400',
  },
];
