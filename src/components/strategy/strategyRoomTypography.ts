/**
 * Strategy Room Typography Contract
 * Single source of truth for all text styles in Strategy Room gadgets.
 * Do NOT change these values unless the entire Strategy Room is being redesigned.
 * 
 * Rules:
 * - No text-muted, opacity-60, opacity-50 inside content areas
 * - All text must use theme tokens (var(--text-*))
 * - Section titles never smaller than 12px
 * - Primary metrics always visually dominant (28-32px)
 */

// CSS class strings for consistent application
export const TYPOGRAPHY = {
  // Section title (e.g., "STRATEGIC PULSE", "EXPOSURE & GAPS")
  // text-sm = 14px, font-semibold, tracking-wide (never smaller than 12px)
  sectionTitle: 'text-sm font-semibold uppercase tracking-wide',
  
  // Card label (e.g., "Strategy Health", "Progress", "At Risk")
  // text-sm = 14px on desktop, font-medium (min 12px)
  cardLabel: 'text-sm font-medium',
  
  // Primary metric value (e.g., "2%", "10", "2")
  // text-3xl = 30px, font-semibold, leading-none
  // This must be the MOST visually dominant element
  primaryMetric: 'text-3xl font-semibold leading-none tabular-nums',
  
  // Secondary metric (e.g., within cards, smaller values)
  // text-xl = 20px, font-bold
  secondaryMetric: 'text-xl font-bold tabular-nums',
  
  // Subtext/qualifier (e.g., "4 objectives", "Need attention")
  // text-sm = 14px, normal weight, readable (NOT muted into invisibility)
  subtext: 'text-sm',
  
  // Data row label (inside cards like Risk Exposure, Alignment Gaps)
  // text-sm, readable secondary color
  dataRowLabel: 'text-sm',
  
  // Data row value
  // text-base = 16px, font-medium
  dataRowValue: 'text-base font-medium tabular-nums',
  
  // Microcopy (e.g., "Intervention needed", "2 high severity")
  // text-sm, readable (NOT muted)
  microcopy: 'text-sm',
  
  // CTA buttons inside cards
  ctaButton: 'text-sm font-medium',
} as const;

// Color tokens - NEVER use opacity modifiers on text
export const TEXT_COLORS = {
  // Primary content - highest contrast, always readable
  primary: 'var(--text-primary)',
  
  // Secondary content - supporting text, still clearly readable
  secondary: 'var(--text-secondary)',
  
  // Status colors for metrics
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  danger: 'var(--status-danger)',
  bronze: 'var(--secondary-bronze)',
} as const;

// Tailwind text color classes (for className usage)
export const TEXT_CLASSES = {
  primary: 'text-primary',
  secondary: 'text-secondary',
} as const;
