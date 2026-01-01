/**
 * Capacity Planner Utility Functions
 * Brand colors and helper functions per specification
 */

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

/**
 * Brand Colors - Catalyst V5 compliant
 */
export const BRAND_COLORS = {
  primary: '#2563eb',      // Blue - Primary buttons, group headers
  primaryHover: '#1d4ed8', // Blue hover
  teal: '#0d9488',         // Teal - Avatars, available, FAB
  orange: '#f97316',       // Orange - At capacity, utilization
  orangeDark: '#ea580c',   // Orange dark for timeline
  red: '#dc2626',          // Red - Over allocated
  grey: {
    50: '#fafafa',
    100: '#f5f5f4',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#0a0a0a',
  }
} as const;

/**
 * Avatar background color - always teal
 */
export const AVATAR_COLOR = BRAND_COLORS.teal;

/**
 * Department badge styling
 */
export const DEPARTMENT_BADGE = {
  bg: 'rgba(37, 99, 235, 0.1)',
  text: '#2563eb',
};

/**
 * Get allocation bar color based on percentage
 * Grey for 0%, Teal for <100%, Orange for 100%+
 */
export function getAllocationBarColor(percentage: number): string {
  if (percentage <= 0) return BRAND_COLORS.grey[200];
  if (percentage < 100) return BRAND_COLORS.teal;
  return BRAND_COLORS.orange;
}

/**
 * Get timeline cell background and text colors
 * Grey for 0%, Teal for <100%, Orange for 100%, Red for >100%
 */
export function getTimelineCellColors(percentage: number): { bg: string; text: string } {
  if (percentage <= 0) {
    return { bg: BRAND_COLORS.grey[100], text: BRAND_COLORS.grey[500] };
  }
  if (percentage < 100) {
    return { bg: 'rgba(13, 148, 136, 0.15)', text: BRAND_COLORS.teal };
  }
  if (percentage === 100) {
    return { bg: 'rgba(249, 115, 22, 0.15)', text: BRAND_COLORS.orangeDark };
  }
  // Over 100%
  return { bg: 'rgba(239, 68, 68, 0.15)', text: BRAND_COLORS.red };
}

/**
 * Get allocation badge styling
 */
export function getAllocationBadgeStyle(percentage: number): { backgroundColor: string; color: string } {
  const color = getAllocationBarColor(percentage);
  return {
    backgroundColor: `${color}15`,
    color: color,
  };
}

/**
 * Utilization bar color based on percentage
 */
export function getUtilizationColor(percentage: number): string {
  if (percentage >= 80) return BRAND_COLORS.red;
  if (percentage >= 60) return BRAND_COLORS.orange;
  return BRAND_COLORS.teal;
}
