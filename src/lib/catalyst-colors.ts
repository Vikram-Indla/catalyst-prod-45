/**
 * Catalyst V5 Color System for Capacity Planner
 * CIO Executive Cockpit - Refined Colors
 * 
 * STATUS COLORS (Catalyst V5):
 * - Available: Teal #0d9488
 * - Optimal: Blue #2563eb
 * - Over-allocated: Orange #d97706
 * - Error: Red #ef4444
 * 
 * DEPRECATED: olive, bronze, gold, champagne, grey (Golden Hour palette)
 */

import type { ResourceAllocation } from '@/modules/capacity-planner/types';

// ============= CATALYST V5 PRIMARY COLORS =============
export const CATALYST_V5 = {
  available: {
    hex: '#0d9488',
    bg: 'rgba(13, 148, 136, 0.08)',
    bgSolid: '#f0fdfa',
  },
  optimal: {
    hex: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.08)',
    bgSolid: '#eff6ff',
  },
  overAllocated: {
    hex: '#d97706',
    bg: 'rgba(217, 119, 6, 0.08)',
    bgSolid: '#fffbeb',
  },
  error: {
    hex: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    bgSolid: '#fef2f2',
  },
  // Additional colors for Test Cycle Command Center
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#dbeafe',
  primaryLighter: '#eff6ff',
  teal: '#0d9488',
  tealHover: '#0f766e',
  tealLight: '#ccfbf1',
  tealLighter: '#f0fdfa',
  warning: '#d97706',
  warningHover: '#b45309',
  warningLight: '#fef3c7',
  warningLighter: '#fffbeb',
  danger: '#ef4444',
  dangerHover: '#dc2626',
  dangerLight: '#fee2e2',
  dangerLighter: '#fef2f2',
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: 'rgba(237,237,237,0.53)',
    800: '#1e293b',
    900: '#0f172a',
  },
};

// Test Cycle Status Colors - Catalyst V5
export const TEST_STATUS_COLORS = {
  passed: { bg: '#ccfbf1', text: '#0d9488', border: '#0d9488' },
  failed: { bg: '#fee2e2', text: '#ef4444', border: '#ef4444' },
  blocked: { bg: '#fef3c7', text: '#d97706', border: '#d97706' },
  in_progress: { bg: '#dbeafe', text: '#2563eb', border: '#2563eb' },
  not_started: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
} as const;

// Test Priority Colors - Catalyst V5
export const TEST_PRIORITY_COLORS = {
  critical: { bg: '#fee2e2', text: '#ef4444' },
  high: { bg: '#fef3c7', text: '#d97706' },
  medium: { bg: '#dbeafe', text: '#2563eb' },
  low: { bg: '#f1f5f9', text: '#475569' },
} as const;

// Legacy export for backwards compatibility - DEPRECATED
export const CATALYST_GOLDEN_HOUR = {
  olive: '#0d9488',    // Mapped to Teal
  bronze: '#d97706',   // Mapped to Orange
  gold: '#2563eb',     // Mapped to Blue
  champagne: '#64748b', // Mapped to Slate
  grey: '#94a3b8',     // Mapped to Slate light
};

export const CATALYST = {
  blue: {
    600: '#2563eb',
    500: '#3b82f6',
    100: '#dbeafe',
    50: '#eff6ff',
    primary: '#2563eb',
    dark: '#1d4ed8',
    light: '#3b82f6',
    bg: 'rgba(37, 99, 235, 0.08)',
  },
  teal: {
    600: '#0d9488',
    500: '#14b8a6',
    100: '#ccfbf1',
    50: '#f0fdfa',
    primary: '#0d9488',
    dark: '#0f766e',
    bg: 'rgba(13, 148, 136, 0.08)',
  },
  orange: {
    600: '#d97706',
    500: '#f59e0b',
    100: '#fef3c7',
    50: '#fffbeb',
    primary: '#d97706',
    dark: '#b45309',
    bg: 'rgba(217, 119, 6, 0.08)',
  },
  red: {
    600: '#ef4444',
    500: '#f87171',
    100: '#fee2e2',
    50: '#fef2f2',
    primary: '#ef4444',
    dark: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.08)',
  },
  // Keep amber as alias to orange for backwards compat
  amber: {
    600: '#d97706',
    500: '#f59e0b',
    100: '#fef3c7',
    50: '#fffbeb',
  },
  // DEPRECATED - mapped to new colors
  olive: {
    primary: '#0d9488', // Now Teal
    dark: '#0f766e',
    bg: 'rgba(13, 148, 136, 0.08)',
  },
  bronze: {
    600: '#d97706', // Now Orange
    500: '#f59e0b',
    100: '#fef3c7',
    50: '#fffbeb',
    primary: '#d97706',
    dark: '#b45309',
    bg: 'rgba(217, 119, 6, 0.08)',
  },
  slate: {
    900: '#0f172a',
    800: '#1e293b',
    700: 'rgba(237,237,237,0.53)',
    600: '#475569',
    500: '#64748b',
    400: '#94a3b8',
    300: '#cbd5e1',
    200: '#e2e8f0',
    100: '#f1f5f9',
    50: '#f8fafc',
  },
  grey: {
    50: '#fafafa',
    100: '#f5f5f4',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    900: '#0a0a0a',
  },
};

/**
 * Assignment themes — Catalyst V5 compliant
 * Using only: Blue, Teal, Orange, Slate
 */
export const ASSIGNMENT_THEMES: Record<string, { bg: string; text: string; accent: string }> = {
  'Senaei BAU': { bg: '#eff6ff', text: '#1e40af', accent: '#2563eb' },           // Blue
  'Innovation Platform': { bg: '#eff6ff', text: '#1e3a8a', accent: '#1d4ed8' },  // Blue Dark
  'Inspection Project': { bg: '#f0fdfa', text: '#115e59', accent: '#0d9488' },   // Teal
  'International Relations': { bg: '#f0fdfa', text: '#134e4a', accent: '#0f766e' }, // Teal Dark
  'MIM Website': { bg: '#f0fdfa', text: '#115e59', accent: '#14b8a6' },          // Teal Light
  'Senaei OPS': { bg: '#eff6ff', text: '#1e40af', accent: '#3b82f6' },           // Blue Light
  'Sectorial Services': { bg: '#f8fafc', text: '#475569', accent: '#64748b' },   // Slate
  'Tahommena': { bg: '#f0fdfa', text: '#0f766e', accent: '#0d9488' },            // Teal
  'Data Platform': { bg: '#dbeafe', text: '#1e40af', accent: '#3b82f6' },        // Blue Light
  'Unassigned': { bg: '#f8fafc', text: '#64748b', accent: '#94a3b8' },           // Slate
};

/**
 * Get assignment theme with bg, text, accent colors
 */
export function getAssignmentTheme(name: string | null | undefined): { bg: string; text: string; accent: string } {
  if (!name) return ASSIGNMENT_THEMES['Unassigned'];
  return ASSIGNMENT_THEMES[name] || { bg: '#eff6ff', text: '#1e40af', accent: '#2563eb' };
}

/**
 * Assignment colors - Catalyst V5 compliant
 */
export const ASSIGNMENT_COLORS: Record<string, string> = {
  'Senaei BAU': '#2563eb',           // Blue
  'Innovation Platform': '#1d4ed8',  // Blue Dark
  'Inspection Project': '#0d9488',   // Teal
  'International Relations': '#0f766e', // Teal Dark
  'MIM Website': '#14b8a6',          // Teal Light
  'Senaei OPS': '#3b82f6',           // Blue Light
  'Sectorial Services': '#64748b',   // Slate
  'Tahommena': '#0d9488',            // Teal
  'Data Platform': '#3b82f6',        // Blue Light
  'Unassigned': '#94a3b8',           // Slate
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
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#3b82f6', // Blue Light
  '#14b8a6', // Teal Light
  '#64748b', // Slate
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
    bg: '#fff1f2', // rose-50
    text: '#e11d48', // rose-600
    border: '#e11d4830',
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
