/**
 * Catalyst V5 Color System for Capacity Planner
 * CIO Executive Cockpit - Refined Colors
 */

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
  amber: {
    600: '#d97706',
    500: '#f59e0b',
    100: '#fef3c7',
    50: '#fffbeb',
  },
  olive: {
    primary: '#4f8a4f',
    dark: '#3d6b3d',
    bg: 'rgba(79, 138, 79, 0.08)',
  },
  bronze: {
    600: '#8b7355',
    500: '#a68b5b',
    100: '#f5f0e8',
    50: '#faf8f5',
    primary: '#8b7355',
    dark: '#6b5842',
    bg: 'rgba(139, 115, 85, 0.08)',
  },
  slate: {
    900: '#0f172a',
    800: '#1e293b',
    700: '#334155',
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
 * Assignment themes — Distinct colors per group for visual distinction
 * CATALYST COMPLIANT: Only Blue, Teal, Olive, Bronze, Amber, Slate
 * NO PURPLE/VIOLET/INDIGO/FUCHSIA
 */
export const ASSIGNMENT_THEMES: Record<string, { bg: string; text: string; accent: string }> = {
  'Senaei BAU': { bg: '#eff6ff', text: '#1e40af', accent: '#2563eb' },           // Blue
  'Innovation Platform': { bg: '#eff6ff', text: '#1e3a8a', accent: '#1d4ed8' },  // Blue Dark (was indigo)
  'Inspection Project': { bg: '#f0fdfa', text: '#115e59', accent: '#0d9488' },   // Teal
  'International Relations': { bg: '#f0fdfa', text: '#134e4a', accent: '#0f766e' }, // Teal Dark
  'MIM Website': { bg: '#f0fdf4', text: '#166534', accent: '#4f8a4f' },          // Olive
  'Senaei OPS': { bg: '#f0fdf4', text: '#14532d', accent: '#3d6b3d' },           // Olive Dark
  'Sectorial Services': { bg: '#faf8f5', text: '#78716c', accent: '#8b7355' },   // Bronze
  'Tahommena': { bg: '#faf8f5', text: '#57534e', accent: '#6b5842' },            // Bronze Dark (was fuchsia)
  'Data Platform': { bg: '#dbeafe', text: '#1e40af', accent: '#3b82f6' },        // Blue Light (was violet)
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
 * Legacy assignment color function - returns accent color
 * CATALYST COMPLIANT: NO PURPLE/VIOLET/INDIGO/FUCHSIA
 */
export const ASSIGNMENT_COLORS: Record<string, string> = {
  'Senaei BAU': '#2563eb',           // Blue
  'Innovation Platform': '#1d4ed8',  // Blue Dark (was indigo #4f46e5)
  'Inspection Project': '#0d9488',   // Teal
  'International Relations': '#0f766e', // Teal Dark
  'MIM Website': '#4f8a4f',          // Olive
  'Senaei OPS': '#3d6b3d',           // Olive Dark
  'Sectorial Services': '#8b7355',   // Bronze
  'Tahommena': '#6b5842',            // Bronze Dark (was fuchsia #c026d3)
  'Data Platform': '#3b82f6',        // Blue Light (was violet #7c3aed)
  'Unassigned': '#94a3b8',           // Slate
};

export function getAssignmentColor(name: string | null | undefined): string {
  if (!name) return CATALYST.grey[400];
  return ASSIGNMENT_COLORS[name] || CATALYST.blue.primary;
}

/**
 * Allocation theme with 5 levels - refined for CIO visibility
 * Includes labelColor and labelBg for status badges
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
    bg: '#f0fdfa', 
    text: '#0d9488', 
    bar: '#0d9488', 
    label: 'AVAILABLE',
    labelColor: '#0d9488',
    labelBg: '#f0fdfa'
  };
  if (percentage < 100) return { 
    status: 'partial', 
    bg: '#f0fdfa', 
    text: '#0d9488', 
    bar: '#0d9488', 
    label: 'PARTIAL',
    labelColor: '#0d9488',
    labelBg: '#f0fdfa'
  };
  if (percentage === 100) return { 
    status: 'optimal', 
    bg: '#eff6ff', 
    text: '#2563eb', 
    bar: '#2563eb', 
    label: 'OPTIMAL',
    labelColor: '#2563eb',
    labelBg: '#eff6ff'
  };
  if (percentage <= 120) return { 
    status: 'stretched', 
    bg: '#fffbeb', 
    text: '#d97706', 
    bar: '#d97706', 
    label: 'STRETCHED',
    labelColor: '#d97706',
    labelBg: '#fffbeb'
  };
  return { 
    status: 'critical', 
    bg: '#faf8f5', 
    text: '#8b7355', 
    bar: '#8b7355', 
    label: 'CRITICAL',
    labelColor: '#8b7355',
    labelBg: '#faf8f5'
  };
}

/**
 * Get allocation status with colors and border (legacy support)
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
    color: CATALYST.teal.primary, 
    bg: CATALYST.teal.bg, 
    border: CATALYST.teal.primary,
    bar: CATALYST.teal.primary
  };
  if (percentage < 100) return { 
    status: 'partial', 
    color: CATALYST.teal.primary, 
    bg: CATALYST.teal.bg, 
    border: CATALYST.teal.primary,
    bar: CATALYST.teal.primary
  };
  if (percentage === 100) return { 
    status: 'full', 
    color: CATALYST.blue.primary, 
    bg: CATALYST.blue.bg, 
    border: CATALYST.blue.primary,
    bar: CATALYST.blue.primary
  };
  return { 
    status: 'over', 
    color: CATALYST.bronze.primary, 
    bg: CATALYST.bronze.bg, 
    border: CATALYST.bronze.primary,
    bar: CATALYST.bronze.primary
  };
}

/**
 * Allocation status colors (legacy)
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
 * Timeline cell colors
 */
export function getTimelineCellColors(percentage: number): { bg: string; text: string } {
  if (percentage === 0) return { bg: CATALYST.grey[100], text: CATALYST.grey[500] };
  if (percentage < 80) return { bg: 'rgba(13, 148, 136, 0.12)', text: CATALYST.teal.primary };
  if (percentage <= 100) return { bg: 'rgba(37, 99, 235, 0.12)', text: CATALYST.blue.primary };
  if (percentage <= 120) return { bg: 'rgba(217, 119, 6, 0.12)', text: CATALYST.amber[600] };
  return { bg: 'rgba(139, 115, 85, 0.12)', text: CATALYST.bronze.primary };
}

/**
 * Utilization bar color
 */
export function getUtilizationColor(percentage: number): string {
  if (percentage > 100) return CATALYST.bronze.primary;
  if (percentage >= 90) return CATALYST.blue.primary;
  if (percentage >= 80) return CATALYST.blue.light;
  return CATALYST.teal.primary;
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
