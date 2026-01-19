/**
 * My Test Scope - Utility Functions
 */

import type { TestStatus, TestScopeItem, TestScopeFilters, SortOption } from '../types';

/**
 * Get score badge class based on priority score
 */
export function getScoreClass(score: number): string {
  if (score >= 90) return 'bg-red-500 text-white';
  if (score >= 70) return 'bg-amber-500 text-white';
  if (score >= 50) return 'bg-blue-500 text-white';
  return 'bg-gray-400 text-white';
}

/**
 * Get score label based on priority score
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Critical';
  if (score >= 70) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

/**
 * Get status badge configuration
 */
export function getStatusConfig(status: TestStatus): {
  className: string;
  label: string;
  bgColor: string;
  textColor: string;
} {
  const configs: Record<TestStatus, { className: string; label: string; bgColor: string; textColor: string }> = {
    not_run: { className: 'status-not-run', label: 'Not Run', bgColor: 'bg-gray-100 dark:bg-gray-800', textColor: 'text-gray-600 dark:text-gray-400' },
    in_progress: { className: 'status-in-progress', label: 'Running', bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-400' },
    passed: { className: 'status-passed', label: 'Passed', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-400' },
    failed: { className: 'status-failed', label: 'Failed', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' },
    blocked: { className: 'status-blocked', label: 'Blocked', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
    skipped: { className: 'status-skipped', label: 'Skipped', bgColor: 'bg-gray-100 dark:bg-gray-800', textColor: 'text-gray-500 dark:text-gray-400' },
  };
  return configs[status] || configs.not_run;
}

/**
 * Format due date for display
 */
export function formatDueDate(dueDate: string | null, status: TestStatus): {
  text: string;
  className: string;
  isUrgent: boolean;
} {
  if (status === 'passed' || status === 'skipped') {
    return { text: 'Done', className: 'text-green-600 dark:text-green-400', isUrgent: false };
  }
  
  if (!dueDate) {
    return { text: 'No date', className: 'text-muted-foreground', isUrgent: false };
  }
  
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      text: `${Math.abs(diffDays)}d overdue`,
      className: 'text-red-600 dark:text-red-400 font-medium',
      isUrgent: true,
    };
  }
  
  if (diffDays === 0) {
    return {
      text: 'Today',
      className: 'text-amber-600 dark:text-amber-400 font-medium',
      isUrgent: true,
    };
  }
  
  if (diffDays === 1) {
    return { text: 'Tomorrow', className: 'text-amber-500 dark:text-amber-400', isUrgent: false };
  }
  
  return { text: `${diffDays}d`, className: 'text-muted-foreground', isUrgent: false };
}

/**
 * Filter tests based on current filters
 */
export function filterTests(
  tests: TestScopeItem[],
  filters: TestScopeFilters
): TestScopeItem[] {
  return tests.filter(test => {
    // Status filter
    if (filters.status !== 'all' && test.status !== filters.status) {
      return false;
    }
    
    // Priority filter
    if (filters.priority !== 'all') {
      if (filters.priority === 'critical' && test.score < 90) return false;
      if (filters.priority === 'high' && (test.score < 70 || test.score >= 90)) return false;
      if (filters.priority === 'medium' && (test.score < 50 || test.score >= 70)) return false;
      if (filters.priority === 'low' && test.score >= 50) return false;
    }
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (
        !test.key.toLowerCase().includes(search) &&
        !test.title.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    
    // Alert filters
    if (filters.alert === 'overdue' && (!test.is_overdue || test.status === 'passed')) {
      return false;
    }
    if (filters.alert === 'due_today') {
      const due = test.due_date ? new Date(test.due_date) : null;
      const isToday = due && due.toDateString() === new Date().toDateString();
      if (!isToday || test.status === 'passed') return false;
    }
    if (filters.alert === 'defects' && !test.has_defects) {
      return false;
    }
    if (filters.alert === 'incidents' && !test.has_incidents) {
      return false;
    }
    
    return true;
  });
}

/**
 * Sort tests based on sort option
 */
export function sortTests(
  tests: TestScopeItem[],
  sortBy: SortOption
): TestScopeItem[] {
  return [...tests].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.score - a.score;
      case 'due':
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case 'status':
        const statusOrder = ['failed', 'blocked', 'in_progress', 'not_run', 'passed', 'skipped'];
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      case 'title':
        return a.key.localeCompare(b.key);
      default:
        return 0;
    }
  });
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(summary: { total: number; passed: number; skipped?: number }): number {
  if (summary.total === 0) return 0;
  const completed = summary.passed + (summary.skipped || 0);
  return Math.round((completed / summary.total) * 100);
}

/**
 * Calculate pass rate
 */
export function calculatePassRate(summary: { passed: number; failed: number }): number {
  const total = summary.passed + summary.failed;
  if (total === 0) return 0;
  return Math.round((summary.passed / total) * 100);
}
