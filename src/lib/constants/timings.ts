/**
 * Centralized timing constants — replace magic numbers across the codebase.
 * Usage: import { TIMINGS } from '@/lib/constants/timings';
 */

export const TIMINGS = {
  /** Default debounce for search inputs (ms) */
  DEBOUNCE_SEARCH: 300,

  /** Toast auto-dismiss duration (ms) */
  TOAST_DURATION: 3000,

  /** CSS transition duration for interactive elements (ms) */
  TRANSITION_DEFAULT: 150,

  /** Animation delay for staggered reveals (ms) */
  ANIMATION_STAGGER: 50,

  /** Refetch intervals for data polling */
  REFETCH: {
    /** Real-time-ish data (board view, sync status) */
    FAST: 30_000,
    /** Dashboard/analytics data */
    NORMAL: 2 * 60_000,
    /** Reference data (departments, statuses, labels) */
    SLOW: 30 * 60_000,
  },

  /** staleTime for TanStack Query */
  STALE: {
    /** Frequently changing data */
    SHORT: 60_000,
    /** Standard entity data */
    MEDIUM: 5 * 60_000,
    /** Reference/config data */
    LONG: 30 * 60_000,
  },
} as const;
