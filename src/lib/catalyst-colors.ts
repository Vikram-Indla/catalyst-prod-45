/**
 * Catalyst V5 Color System for Capacity Planner
 * NO ORANGE (#f97316) - NO RED (#ef4444)
 */

export const CATALYST = {
  blue: {
    primary: '#2563eb',
    dark: '#1d4ed8',
    light: '#3b82f6',
    bg: 'rgba(37, 99, 235, 0.08)',
  },
  teal: {
    primary: '#0d9488',
    dark: '#0f766e',
    bg: 'rgba(13, 148, 136, 0.08)',
  },
  olive: {
    primary: '#4f8a4f',
    dark: '#3d6b3d',
    bg: 'rgba(79, 138, 79, 0.08)',
  },
  bronze: {
    primary: '#8b7355',
    dark: '#6b5842',
    bg: 'rgba(139, 115, 85, 0.08)',
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
 * Assignment → Color mapping
 * Each assignment gets a unique brand shade
 */
export const ASSIGNMENT_COLORS: Record<string, string> = {
  'Senaei BAU': '#2563eb',           // Blue
  'Innovation Platform': '#1d4ed8',   // Blue Dark
  'Inspection Project': '#0d9488',    // Teal
  'International Relations': '#0f766e', // Teal Dark
  'MIM Website': '#4f8a4f',           // Olive
  'Senaei OPS': '#3d6b3d',            // Olive Dark
  'Sectorial Services': '#8b7355',    // Bronze
  'Tahommena': '#6b5842',             // Bronze Dark
  'Data Platform': '#3b82f6',         // Blue Light
  'Unassigned': '#a3a3a3',            // Grey
};

/**
 * Get assignment color by name
 */
export function getAssignmentColor(name: string | null | undefined): string {
  if (!name) return CATALYST.grey[400];
  return ASSIGNMENT_COLORS[name] || CATALYST.blue.primary;
}

/**
 * Get allocation status with colors and border
 * Used for left border coloring on cards
 */
export function getAllocationStatus(percentage: number): { 
  status: 'available' | 'partial' | 'full' | 'over';
  color: string;
  bg: string;
  border: string;
} {
  if (percentage === 0) return { 
    status: 'available', 
    color: CATALYST.teal.primary, 
    bg: CATALYST.teal.bg, 
    border: CATALYST.teal.primary 
  };
  if (percentage < 100) return { 
    status: 'partial', 
    color: CATALYST.teal.primary, 
    bg: CATALYST.teal.bg, 
    border: CATALYST.teal.primary 
  };
  if (percentage === 100) return { 
    status: 'full', 
    color: CATALYST.blue.primary, 
    bg: CATALYST.blue.bg, 
    border: CATALYST.blue.primary 
  };
  return { 
    status: 'over', 
    color: CATALYST.bronze.primary, 
    bg: CATALYST.bronze.bg, 
    border: CATALYST.bronze.primary 
  };
}

/**
 * Allocation status colors — NO ORANGE, NO RED
 * 0% = Grey, <100% = Teal, 100% = Blue, >100% = Bronze
 */
export function getAllocationColors(percentage: number): { bg: string; text: string; bar: string } {
  if (percentage === 0) return { 
    bg: CATALYST.grey[100], 
    text: CATALYST.grey[500], 
    bar: CATALYST.grey[300] 
  };
  if (percentage < 100) return { 
    bg: CATALYST.teal.bg, 
    text: CATALYST.teal.primary, 
    bar: CATALYST.teal.primary 
  };
  if (percentage === 100) return { 
    bg: CATALYST.blue.bg, 
    text: CATALYST.blue.primary, 
    bar: CATALYST.blue.primary 
  };
  // Over 100% = Bronze (not red)
  return { 
    bg: CATALYST.bronze.bg, 
    text: CATALYST.bronze.primary, 
    bar: CATALYST.bronze.primary 
  };
}

/**
 * Get allocation bar color only
 */
export function getAllocationBarColor(percentage: number): string {
  return getAllocationColors(percentage).bar;
}

/**
 * Timeline cell colors — NO ORANGE, NO RED
 */
export function getTimelineCellColors(percentage: number): { bg: string; text: string } {
  if (percentage === 0) return { bg: CATALYST.grey[100], text: CATALYST.grey[500] };
  if (percentage < 100) return { bg: 'rgba(13, 148, 136, 0.12)', text: CATALYST.teal.primary };
  if (percentage === 100) return { bg: 'rgba(37, 99, 235, 0.12)', text: CATALYST.blue.primary };
  // Over 100% = Bronze
  return { bg: 'rgba(139, 115, 85, 0.12)', text: CATALYST.bronze.primary };
}

/**
 * Utilization bar color — Blue/Teal only
 */
export function getUtilizationColor(percentage: number): string {
  if (percentage >= 100) return CATALYST.blue.primary;
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
