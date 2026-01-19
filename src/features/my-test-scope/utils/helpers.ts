/**
 * My Test Scope - Utility Functions
 */

import type { TestAssignment, TestScopeFilters } from '../types';

// Test status type
type TestStatus = 'not_run' | 'passed' | 'failed' | 'blocked';
type SortOption = 'score' | 'dueDate' | 'status' | 'priority';

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
    passed: { className: 'status-passed', label: 'Passed', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-400' },
    failed: { className: 'status-failed', label: 'Failed', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' },
    blocked: { className: 'status-blocked', label: 'Blocked', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
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
  if (status === 'passed') {
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
  tests: TestAssignment[],
  filters: TestScopeFilters
): TestAssignment[] {
  return tests.filter(test => {
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(test.status)) {
      return false;
    }
    
    // Priority filter
    if (filters.priority.length > 0 && !filters.priority.includes(test.priority)) {
      return false;
    }
    
    // Urgency filter
    if (filters.urgency.length > 0 && !filters.urgency.includes(test.urgency)) {
      return false;
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
    
    return true;
  });
}

/**
 * Sort tests based on sort option
 */
export function sortTests(
  tests: TestAssignment[],
  sortBy: SortOption,
  sortOrder: 'asc' | 'desc' = 'desc'
): TestAssignment[] {
  const multiplier = sortOrder === 'asc' ? 1 : -1;
  
  return [...tests].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return (b.priorityScore - a.priorityScore) * multiplier;
      case 'dueDate':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * multiplier;
      case 'status':
        const statusOrder = ['failed', 'blocked', 'not_run', 'passed'];
        return (statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)) * multiplier;
      case 'priority':
        const priorityOrder = ['critical', 'high', 'medium', 'low'];
        return (priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)) * multiplier;
      default:
        return 0;
    }
  });
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(summary: { totalTests: number; passedTests: number }): number {
  if (summary.totalTests === 0) return 0;
  return Math.round((summary.passedTests / summary.totalTests) * 100);
}

/**
 * Calculate pass rate
 */
export function calculatePassRate(summary: { passedTests: number; failedTests: number }): number {
  const total = summary.passedTests + summary.failedTests;
  if (total === 0) return 0;
  return Math.round((summary.passedTests / total) * 100);
}
