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
  primary: 'var(--ds-link)',      // Blue - Primary buttons, group headers
  primaryHover: 'var(--ds-link-pressed)', // Blue hover
  teal: 'var(--ds-chart-teal-bold)',         // Teal - Avatars, available, FAB
  orange: 'var(--ds-background-warning-bold)',       // Orange - At capacity, utilization
  orangeDark: 'var(--ds-background-warning-bold)',   // Orange dark for timeline
  red: 'var(--ds-background-danger-bold)',          // Red - Over allocated
  grey: {
    50: 'var(--ds-surface-sunken)',
    100: 'var(--ds-background-neutral-subtle)',
    200: 'var(--ds-border)',
    300: 'var(--ds-background-neutral-hovered)',
    400: 'var(--ds-text-disabled)',
    500: 'var(--ds-text-subtlest)',
    600: 'var(--ds-text-subtle)',
    700: 'var(--ds-text-subtle)',
    800: 'var(--ds-text)',
    900: 'var(--ds-text)',
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
  bg: 'var(--ds-background-information, rgba(37, 99, 235, 0.1))',
  text: 'var(--ds-link)',
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
    return { bg: 'var(--ds-background-success, rgba(13, 148, 136, 0.15))', text: BRAND_COLORS.teal };
  }
  if (percentage === 100) {
    return { bg: 'rgba(249, 115, 22, 0.15)', text: BRAND_COLORS.orangeDark }; // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  }
  // Over 100%
  return { bg: 'var(--ds-background-danger, rgba(239, 68, 68, 0.15))', text: BRAND_COLORS.red };
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
