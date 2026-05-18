/**
 * Catalyst V5 Color System for Capacity Planner
 * CIO Executive Cockpit - Refined Colors
 * 
 * STATUS COLORS (Catalyst V5):
 * - Available: Teal #0d9488
 * - Optimal: Blue var(--cp-workstream-catalyst-primary, #2563eb)
 * - Over-allocated: Orange #d97706
 * - Error: Red #ef4444
 * 
 * DEPRECATED: olive, bronze, gold, champagne, grey (Golden Hour palette)
 */

import type { ResourceAllocation } from '@/modules/capacity-planner/types';

// ============= CATALYST V5 PRIMARY COLORS =============
export const CATALYST_V5 = {
  available: {
    hex: 'var(--cp-color-teal)',
    bg: 'var(--cp-bg-teal-light)',
    bgSolid: 'var(--cp-color-teal-lightest)',
  },
  optimal: {
    hex: 'var(--cp-color-blue)',
    bg: 'var(--cp-bg-blue-light)',
    bgSolid: 'var(--cp-color-blue-lightest)',
  },
  overAllocated: {
    hex: 'var(--cp-color-orange)',
    bg: 'var(--cp-bg-orange-light)',
    bgSolid: 'var(--cp-color-orange-lightest)',
  },
  error: {
    hex: 'var(--cp-color-red)',
    bg: 'var(--cp-bg-red-light)',
    bgSolid: 'var(--cp-color-red-lightest)',
  },
  // Additional colors for Test Cycle Command Center
  primary: 'var(--cp-color-blue)',
  primaryHover: 'var(--cp-color-blue-hover)',
  primaryLight: 'var(--cp-color-blue-lighter)',
  primaryLighter: 'var(--cp-color-blue-lightest)',
  teal: 'var(--cp-color-teal)',
  tealHover: 'var(--cp-color-teal-hover)',
  tealLight: 'var(--cp-color-teal-light)',
  tealLighter: 'var(--cp-color-teal-lightest)',
  warning: 'var(--cp-color-orange)',
  warningHover: 'var(--cp-color-orange-hover)',
  warningLight: 'var(--cp-color-orange-lighter)',
  warningLighter: 'var(--cp-color-orange-lightest)',
  danger: 'var(--cp-color-red)',
  dangerHover: 'var(--cp-color-red-hover)',
  dangerLight: 'var(--cp-color-red-lighter)',
  dangerLighter: 'var(--cp-color-red-lightest)',
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: 'var(--cp-ink-2, #334155)',
    800: '#1e293b',
    900: '#0f172a',
  },
};

// Test Cycle Status Colors - Catalyst V5
export const TEST_STATUS_COLORS = {
  passed: { bg: 'var(--cp-status-passed-bg)', text: 'var(--cp-status-passed-text)', border: 'var(--cp-status-passed-border)' },
  failed: { bg: 'var(--cp-status-failed-bg)', text: 'var(--cp-status-failed-text)', border: 'var(--cp-status-failed-border)' },
  blocked: { bg: 'var(--cp-status-blocked-bg)', text: 'var(--cp-status-blocked-text)', border: 'var(--cp-status-blocked-border)' },
  in_progress: { bg: 'var(--cp-status-in-progress-bg)', text: 'var(--cp-status-in-progress-text)', border: 'var(--cp-status-in-progress-border)' },
  not_started: { bg: 'var(--cp-status-not-started-bg)', text: 'var(--cp-status-not-started-text)', border: 'var(--cp-status-not-started-border)' },
} as const;

// Test Priority Colors - Catalyst V5
export const TEST_PRIORITY_COLORS = {
  critical: { bg: 'var(--cp-priority-critical-bg)', text: 'var(--cp-priority-critical-text)' },
  high: { bg: 'var(--cp-priority-high-bg)', text: 'var(--cp-priority-high-text)' },
  medium: { bg: 'var(--cp-priority-medium-bg)', text: 'var(--cp-priority-medium-text)' },
  low: { bg: 'var(--cp-priority-low-bg)', text: 'var(--cp-priority-low-text)' },
} as const;

// Legacy export for backwards compatibility - DEPRECATED
export const CATALYST_GOLDEN_HOUR = {
  olive: 'var(--cp-color-teal)',    // Mapped to Teal
  bronze: 'var(--cp-color-orange)',   // Mapped to Orange
  gold: 'var(--cp-color-blue)',     // Mapped to Blue
  champagne: 'var(--cp-color-slate-500)', // Mapped to Slate
  grey: 'var(--cp-color-slate-400)',     // Mapped to Slate light
};

export const CATALYST = {
  blue: {
    600: 'var(--cp-color-blue)',
    500: 'var(--cp-color-blue-light)',
    100: 'var(--cp-color-blue-lighter)',
    50: 'var(--cp-color-blue-lightest)',
    primary: 'var(--cp-color-blue)',
    dark: 'var(--cp-color-blue-hover)',
    light: 'var(--cp-color-blue-light)',
    bg: 'var(--cp-bg-blue-light)',
  },
  teal: {
    600: 'var(--cp-color-teal)',
    500: 'var(--cp-color-teal-light)',
    100: 'var(--cp-color-teal-lighter)',
    50: 'var(--cp-color-teal-lightest)',
    primary: 'var(--cp-color-teal)',
    dark: 'var(--cp-color-teal-hover)',
    bg: 'var(--cp-bg-teal-light)',
  },
  orange: {
    600: 'var(--cp-color-orange)',
    500: 'var(--cp-color-orange-light)',
    100: 'var(--cp-color-orange-lighter)',
    50: 'var(--cp-color-orange-lightest)',
    primary: 'var(--cp-color-orange)',
    dark: 'var(--cp-color-orange-hover)',
    bg: 'var(--cp-bg-orange-light)',
  },
  red: {
    600: 'var(--cp-color-red)',
    500: 'var(--cp-color-red-light)',
    100: 'var(--cp-color-red-lighter)',
    50: 'var(--cp-color-red-lightest)',
    primary: 'var(--cp-color-red)',
    dark: 'var(--cp-color-red-hover)',
    bg: 'var(--cp-bg-red-light)',
  },
  // Keep amber as alias to orange for backwards compat
  amber: {
    600: 'var(--cp-color-orange)',
    500: 'var(--cp-color-orange-light)',
    100: 'var(--cp-color-orange-lighter)',
    50: 'var(--cp-color-orange-lightest)',
  },
  // DEPRECATED - mapped to new colors
  olive: {
    primary: 'var(--cp-color-teal)', // Now Teal
    dark: 'var(--cp-color-teal-hover)',
    bg: 'var(--cp-bg-teal-light)',
  },
  bronze: {
    600: 'var(--cp-color-orange)', // Now Orange
    500: 'var(--cp-color-orange-light)',
    100: 'var(--cp-color-orange-lighter)',
    50: 'var(--cp-color-orange-lightest)',
    primary: 'var(--cp-color-orange)',
    dark: 'var(--cp-color-orange-hover)',
    bg: 'var(--cp-bg-orange-light)',
  },
  slate: {
    900: 'var(--cp-color-slate-900)',
    800: 'var(--cp-color-slate-800)',
    700: 'var(--cp-color-slate-700)',
    600: 'var(--cp-color-slate-600)',
    500: 'var(--cp-color-slate-500)',
    400: 'var(--cp-color-slate-400)',
    300: 'var(--cp-color-slate-300)',
    200: 'var(--cp-color-slate-200)',
    100: 'var(--cp-color-slate-100)',
    50: 'var(--cp-color-slate-50)',
  },
  grey: {
    50: 'var(--cp-color-grey-50)',
    100: 'var(--cp-color-grey-100)',
    200: 'var(--cp-color-grey-200)',
    300: 'var(--cp-color-grey-300)',
    400: 'var(--cp-color-grey-400)',
    500: 'var(--cp-color-grey-500)',
    600: 'var(--cp-color-grey-600)',
    700: 'var(--cp-color-grey-700)',
    900: 'var(--cp-color-grey-900)',
  },
};

/**
 * Assignment themes — Catalyst V5 compliant
 * Using only: Blue, Teal, Orange, Slate
 */
export const ASSIGNMENT_THEMES: Record<string, { bg: string; text: string; accent: string }> = {
  'Senaei BAU': { bg: 'var(--cp-theme-senaei-bau-bg)', text: 'var(--cp-theme-senaei-bau-text)', accent: 'var(--cp-theme-senaei-bau-accent)' },           // Blue
  'Innovation Platform': { bg: 'var(--cp-theme-innovation-bg)', text: 'var(--cp-theme-innovation-text)', accent: 'var(--cp-theme-innovation-accent)' },  // Blue Dark
  'Inspection Project': { bg: 'var(--cp-theme-inspection-bg)', text: 'var(--cp-theme-inspection-text)', accent: 'var(--cp-theme-inspection-accent)' },   // Teal
  'International Relations': { bg: 'var(--cp-theme-international-bg)', text: 'var(--cp-theme-international-text)', accent: 'var(--cp-theme-international-accent)' }, // Teal Dark
  'MIM Website': { bg: 'var(--cp-theme-mim-bg)', text: 'var(--cp-theme-mim-text)', accent: 'var(--cp-theme-mim-accent)' },          // Teal Light
  'Senaei OPS': { bg: 'var(--cp-theme-senaei-ops-bg)', text: 'var(--cp-theme-senaei-ops-text)', accent: 'var(--cp-theme-senaei-ops-accent)' },           // Blue Light
  'Sectorial Services': { bg: 'var(--cp-theme-sectorial-bg)', text: 'var(--cp-theme-sectorial-text)', accent: 'var(--cp-theme-sectorial-accent)' },   // Slate
  'Tahommena': { bg: 'var(--cp-theme-tahommena-bg)', text: 'var(--cp-theme-tahommena-text)', accent: 'var(--cp-theme-tahommena-accent)' },            // Teal
  'Data Platform': { bg: 'var(--cp-theme-data-platform-bg)', text: 'var(--cp-theme-data-platform-text)', accent: 'var(--cp-theme-data-platform-accent)' },        // Blue Light
  'Unassigned': { bg: 'var(--cp-theme-unassigned-bg)', text: 'var(--cp-theme-unassigned-text)', accent: 'var(--cp-theme-unassigned-accent)' },           // Slate
};

/**
 * Get assignment theme with bg, text, accent colors
 */
export function getAssignmentTheme(name: string | null | undefined): { bg: string; text: string; accent: string } {
  if (!name) return ASSIGNMENT_THEMES['Unassigned'];
  return ASSIGNMENT_THEMES[name] || { bg: 'var(--cp-color-blue-lightest)', text: 'var(--cp-theme-senaei-bau-text)', accent: 'var(--cp-color-blue)' };
}

/**
 * Assignment colors - Catalyst V5 compliant
 */
export const ASSIGNMENT_COLORS: Record<string, string> = {
  'Senaei BAU': 'var(--cp-color-blue)',           // Blue
  'Innovation Platform': 'var(--cp-color-blue-hover)',  // Blue Dark
  'Inspection Project': 'var(--cp-color-teal)',   // Teal
  'International Relations': 'var(--cp-color-teal-hover)', // Teal Dark
  'MIM Website': 'var(--cp-color-teal-light)',          // Teal Light
  'Senaei OPS': 'var(--cp-color-blue-light)',           // Blue Light
  'Sectorial Services': 'var(--cp-color-slate-500)',   // Slate
  'Tahommena': 'var(--cp-color-teal)',            // Teal
  'Data Platform': 'var(--cp-color-blue-light)',        // Blue Light
  'Unassigned': 'var(--cp-color-slate-400)',           // Slate
};

export function getAssignmentColor(name: string | null | undefined): string {
  if (!name) return CATALYST.slate[400];
  return ASSIGNMENT_COLORS[name] || CATALYST.blue.primary;
}

/**
 * Allocation theme with status levels - Catalyst V5
 * Available -> Teal
 * Optimal -> Blue
 * Over-allocated -> Orange
 * Critical -> Red
 */
export function getAllocationTheme(percentage: number): { 
  status: 'available' | 'partial' | 'optimal' | 'stretched' | 'critical';
  bg: string;
  text: string;
  bar: string;
  label: string;
  labelColor: string;
  labelBg: string;
} {
  if (percentage === 0) return { 
    status: 'available', 
    bg: CATALYST_V5.available.bgSolid, 
    text: CATALYST_V5.available.hex, 
    bar: CATALYST_V5.available.hex, 
    label: 'AVAILABLE',
    labelColor: CATALYST_V5.available.hex,
    labelBg: CATALYST_V5.available.bgSolid
  };
  if (percentage < 100) return { 
    status: 'partial', 
    bg: CATALYST_V5.available.bgSolid, 
    text: CATALYST_V5.available.hex, 
    bar: CATALYST_V5.available.hex, 
    label: 'PARTIAL',
    labelColor: CATALYST_V5.available.hex,
    labelBg: CATALYST_V5.available.bgSolid
  };
  if (percentage === 100) return { 
    status: 'optimal', 
    bg: CATALYST_V5.optimal.bgSolid, 
    text: CATALYST_V5.optimal.hex, 
    bar: CATALYST_V5.optimal.hex, 
    label: 'AT CAPACITY',
    labelColor: CATALYST_V5.optimal.hex,
    labelBg: CATALYST_V5.optimal.bgSolid
  };
  if (percentage <= 120) return { 
    status: 'stretched', 
    bg: CATALYST_V5.overAllocated.bgSolid, 
    text: CATALYST_V5.overAllocated.hex, 
    bar: CATALYST_V5.overAllocated.hex, 
    label: 'STRETCHED',
    labelColor: CATALYST_V5.overAllocated.hex,
    labelBg: CATALYST_V5.overAllocated.bgSolid
  };
  return { 
    status: 'critical', 
    bg: CATALYST_V5.error.bgSolid, 
    text: CATALYST_V5.error.hex, 
    bar: CATALYST_V5.error.hex, 
    label: 'CRITICAL',
    labelColor: CATALYST_V5.error.hex,
    labelBg: CATALYST_V5.error.bgSolid
  };
}

/**
 * Get allocation status with colors and border - Catalyst V5
 */
export function getAllocationStatus(percentage: number): { 
  status: 'available' | 'partial' | 'full' | 'over';
  color: string;
  bg: string;
  border: string;
  bar: string;
} {
  if (percentage === 0) return { 
    status: 'available', 
    color: CATALYST_V5.available.hex, 
    bg: CATALYST_V5.available.bg, 
    border: CATALYST_V5.available.hex,
    bar: CATALYST_V5.available.hex
  };
  if (percentage < 100) return { 
    status: 'partial', 
    color: CATALYST_V5.available.hex, 
    bg: CATALYST_V5.available.bg, 
    border: CATALYST_V5.available.hex,
    bar: CATALYST_V5.available.hex
  };
  if (percentage === 100) return { 
    status: 'full', 
    color: CATALYST_V5.optimal.hex, 
    bg: CATALYST_V5.optimal.bg, 
    border: CATALYST_V5.optimal.hex,
    bar: CATALYST_V5.optimal.hex
  };
  return { 
    status: 'over', 
    color: CATALYST_V5.overAllocated.hex, 
    bg: CATALYST_V5.overAllocated.bg, 
    border: CATALYST_V5.overAllocated.hex,
    bar: CATALYST_V5.overAllocated.hex
  };
}

/**
 * Allocation colors (legacy)
 */
export function getAllocationColors(percentage: number): { bg: string; text: string; bar: string } {
  const theme = getAllocationTheme(percentage);
  return { bg: theme.bg, text: theme.text, bar: theme.bar };
}

/**
 * Get allocation bar color only
 */
export function getAllocationBarColor(percentage: number): string {
  return getAllocationTheme(percentage).bar;
}

/**
 * Timeline cell colors - Catalyst V5
 */
export function getTimelineCellColors(percentage: number): { bg: string; text: string } {
  if (percentage === 0) return { bg: CATALYST.grey[100], text: CATALYST.grey[500] };
  if (percentage < 80) return { bg: CATALYST_V5.available.bg, text: CATALYST_V5.available.hex };
  if (percentage <= 100) return { bg: CATALYST_V5.optimal.bg, text: CATALYST_V5.optimal.hex };
  if (percentage <= 120) return { bg: CATALYST_V5.overAllocated.bg, text: CATALYST_V5.overAllocated.hex };
  return { bg: CATALYST_V5.error.bg, text: CATALYST_V5.error.hex };
}

/**
 * Utilization bar color - Catalyst V5
 */
export function getUtilizationColor(percentage: number): string {
  if (percentage > 100) return CATALYST_V5.overAllocated.hex;
  if (percentage >= 90) return CATALYST_V5.optimal.hex;
  if (percentage >= 80) return CATALYST.blue.light;
  return CATALYST_V5.available.hex;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============= TIME-BOXED ALLOCATION HELPERS =============

/**
 * Get allocation status theme for time-boxed bookings - Catalyst V5
 */
export function getAllocationStatusTheme(percentage: number): {
  status: 'available' | 'partial' | 'optimal' | 'over';
  label: string;
  bg: string;
  text: string;
  bar: string;
  border: string;
} {
  if (percentage === 0) {
    return {
      status: 'available',
      label: 'Available',
      bg: CATALYST_V5.available.bgSolid,
      text: CATALYST_V5.available.hex,
      bar: CATALYST_V5.available.hex,
      border: CATALYST_V5.available.hex,
    };
  }
  if (percentage < 100) {
    return {
      status: 'partial',
      label: `${100 - percentage}% Available`,
      bg: CATALYST_V5.available.bgSolid,
      text: CATALYST_V5.available.hex,
      bar: CATALYST_V5.available.hex,
      border: CATALYST_V5.available.hex,
    };
  }
  if (percentage === 100) {
    return {
      status: 'optimal',
      label: 'Optimal',
      bg: CATALYST_V5.optimal.bgSolid,
      text: CATALYST_V5.optimal.hex,
      bar: CATALYST_V5.optimal.hex,
      border: CATALYST_V5.optimal.hex,
    };
  }
  // Over-allocated - Orange
  return {
    status: 'over',
    label: 'Over-allocated',
    bg: CATALYST_V5.overAllocated.bgSolid,
    text: CATALYST_V5.overAllocated.hex,
    bar: CATALYST_V5.overAllocated.hex,
    border: CATALYST_V5.overAllocated.hex,
  };
}

/**
 * Calculate total allocation for a specific period
 */
export function calculatePeriodAllocation(
  allocations: ResourceAllocation[],
  periodStart: Date,
  periodEnd: Date
): number {
  return allocations
    .filter((a) => {
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= periodEnd && allocEnd >= periodStart;
    })
    .reduce((sum, a) => sum + a.allocation_percent, 0);
}

/**
 * Get allocations that overlap with a specific period
 */
export function getAllocationsForPeriod(
  allocations: ResourceAllocation[],
  periodStart: Date,
  periodEnd: Date
): ResourceAllocation[] {
  return allocations.filter((a) => {
    const allocStart = new Date(a.start_date);
    const allocEnd = new Date(a.end_date);
    return allocStart <= periodEnd && allocEnd >= periodStart;
  });
}

// ============= STACKED BAR SEGMENT COLORS - Catalyst V5 =============
export const ALLOCATION_SEGMENT_COLORS = [
  'var(--cp-color-blue)', // Blue
  'var(--cp-color-teal)', // Teal
  'var(--cp-color-blue-light)', // Blue Light
  'var(--cp-color-teal-light)', // Teal Light
  'var(--cp-color-slate-500)', // Slate
];

// =====================================================
// DEFECT SEVERITY COLORS
// =====================================================
export const DEFECT_SEVERITY_COLORS = {
  critical: {
    dot: CATALYST_V5.danger,
    bg: CATALYST_V5.dangerLight,
    text: CATALYST_V5.danger,
    border: `${CATALYST_V5.danger}30`,
  },
  high: {
    dot: CATALYST_V5.warning,
    bg: CATALYST_V5.warningLight,
    text: CATALYST_V5.warning,
    border: `${CATALYST_V5.warning}30`,
  },
  medium: {
    dot: CATALYST_V5.primary,
    bg: CATALYST_V5.primaryLight,
    text: CATALYST_V5.primary,
    border: `${CATALYST_V5.primary}30`,
  },
  low: {
    dot: CATALYST_V5.slate[400],
    bg: CATALYST_V5.slate[100],
    text: CATALYST_V5.slate[500],
    border: `${CATALYST_V5.slate[400]}30`,
  },
  major: {
    dot: CATALYST_V5.warning,
    bg: CATALYST_V5.warningLight,
    text: CATALYST_V5.warning,
    border: `${CATALYST_V5.warning}30`,
  },
  minor: {
    dot: CATALYST_V5.primary,
    bg: CATALYST_V5.primaryLight,
    text: CATALYST_V5.primary,
    border: `${CATALYST_V5.primary}30`,
  },
  trivial: {
    dot: CATALYST_V5.slate[400],
    bg: CATALYST_V5.slate[100],
    text: CATALYST_V5.slate[500],
    border: `${CATALYST_V5.slate[400]}30`,
  },
} as const;

// =====================================================
// DEFECT STATUS COLORS
// =====================================================
export const DEFECT_STATUS_COLORS = {
  new: {
    bg: CATALYST_V5.dangerLighter,
    text: CATALYST_V5.danger,
    border: `${CATALYST_V5.danger}30`,
  },
  open: {
    bg: CATALYST_V5.dangerLighter,
    text: CATALYST_V5.danger,
    border: `${CATALYST_V5.danger}30`,
  },
  triaged: {
    bg: CATALYST_V5.warningLighter,
    text: CATALYST_V5.warning,
    border: `${CATALYST_V5.warning}30`,
  },
  in_progress: {
    bg: CATALYST_V5.primaryLighter,
    text: CATALYST_V5.primary,
    border: `${CATALYST_V5.primary}30`,
  },
  fixed: {
    bg: CATALYST_V5.tealLighter,
    text: CATALYST_V5.teal,
    border: `${CATALYST_V5.teal}30`,
  },
  verified: {
    bg: CATALYST_V5.tealLighter,
    text: CATALYST_V5.teal,
    border: `${CATALYST_V5.teal}30`,
  },
  resolved: {
    bg: CATALYST_V5.tealLighter,
    text: CATALYST_V5.teal,
    border: `${CATALYST_V5.teal}30`,
  },
  closed: {
    bg: CATALYST_V5.slate[100],
    text: CATALYST_V5.slate[500],
    border: `${CATALYST_V5.slate[300]}30`,
  },
  rejected: {
    bg: CATALYST_V5.slate[100],
    text: CATALYST_V5.slate[500],
    border: `${CATALYST_V5.slate[300]}30`,
  },
  reopened: {
    bg: CATALYST_V5.warningLighter,
    text: CATALYST_V5.warning,
    border: `${CATALYST_V5.warning}30`,
  },
} as const;

// =====================================================
// DEFECT PRIORITY COLORS
// =====================================================
export const DEFECT_PRIORITY_COLORS = {
  critical: {
    bg: 'var(--cp-defect-priority-critical-bg)', // rose-50
    text: 'var(--cp-defect-priority-critical-text)', // rose-600
    border: 'var(--cp-defect-priority-critical-border)',
    colorful: true,
  },
  high: {
    bg: CATALYST_V5.warningLighter,
    text: CATALYST_V5.warning,
    border: `${CATALYST_V5.warning}30`,
    colorful: true,
  },
  medium: {
    bg: 'transparent',
    text: CATALYST_V5.slate[600],
    border: 'transparent',
    colorful: false,
  },
  low: {
    bg: 'transparent',
    text: CATALYST_V5.slate[400],
    border: 'transparent',
    colorful: false,
  },
} as const;
