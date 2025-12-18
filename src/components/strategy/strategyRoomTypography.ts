/**
 * Strategy Room Typography Contract
 * Single source of truth for all text styles in Strategy Room gadgets.
 * Do NOT change these values unless the entire Strategy Room is being redesigned.
 * 
 * HARD RULES:
 * - No text-muted, opacity-60, opacity-50 inside content areas
 * - All text must use theme tokens (var(--text-*))
 * - Section titles never smaller than 12px (use text-xs minimum)
 * - Primary metrics always visually dominant (28-32px)
 * - Never use text-[9px], text-[10px], text-[11px], etc.
 * - Use text-xs (12px) as the minimum readable size
 */

// CSS class strings for consistent application
export const TYPOGRAPHY = {
  // ─────────────────────────────────────────────────
  // SECTION HEADERS
  // ─────────────────────────────────────────────────
  
  // Section title (e.g., "STRATEGIC PULSE", "EXPOSURE & GAPS", "OKR Tree")
  // text-sm = 14px, font-semibold, tracking-wide
  sectionTitle: 'text-sm font-semibold uppercase tracking-wide',
  
  // Section subtitle / description
  sectionSubtitle: 'text-xs',

  // ─────────────────────────────────────────────────
  // CARD CONTENT
  // ─────────────────────────────────────────────────
  
  // Card label (e.g., "Strategy Health", "Progress", "At Risk")
  // text-sm = 14px on desktop, font-medium (min 12px)
  cardLabel: 'text-sm font-medium',
  
  // Primary metric value (e.g., "2%", "10", "2")
  // text-3xl = 30px, font-semibold, leading-none - MOST DOMINANT
  primaryMetric: 'text-3xl font-semibold leading-none tabular-nums',
  
  // Secondary metric (e.g., within cards, smaller values)
  // text-xl = 20px, font-bold
  secondaryMetric: 'text-xl font-bold tabular-nums',
  
  // Subtext/qualifier (e.g., "4 objectives", "Need attention")
  // text-sm = 14px, normal weight, readable (NOT muted into invisibility)
  subtext: 'text-sm',
  
  // ─────────────────────────────────────────────────
  // DATA ROWS & TABLES
  // ─────────────────────────────────────────────────
  
  // Data row label (inside cards like Risk Exposure, Alignment Gaps)
  // text-sm, readable secondary color
  dataRowLabel: 'text-sm',
  
  // Data row value
  // text-base = 16px, font-medium
  dataRowValue: 'text-base font-medium tabular-nums',
  
  // Table header (column headers in grids)
  // text-xs = 12px, font-semibold, uppercase
  tableHeader: 'text-xs font-semibold uppercase tracking-wider',
  
  // Table cell - primary content
  // text-sm = 14px, font-medium for emphasis
  tableCell: 'text-sm',
  tableCellEmphasis: 'text-sm font-medium',
  
  // Table cell - secondary/supporting
  // text-xs = 12px minimum
  tableCellSecondary: 'text-xs',
  
  // ─────────────────────────────────────────────────
  // BADGES, CHIPS & SMALL TEXT
  // ─────────────────────────────────────────────────
  
  // Type badge (e.g., "THM", "OBJ", "KR")
  // text-xs = 12px, font-bold, uppercase - minimum readable size
  typeBadge: 'text-xs font-bold uppercase tracking-wide',
  
  // Status badge (e.g., "On Track", "At Risk")
  statusBadge: 'text-xs font-semibold',
  
  // Microcopy (e.g., "Intervention needed", "2 high severity")
  // text-xs = 12px, readable (NOT muted)
  microcopy: 'text-xs',
  
  // CTA buttons inside cards
  ctaButton: 'text-sm font-medium',
  
  // Progress percentage
  progressPercent: 'text-xs font-medium tabular-nums',
  
  // Count badges
  countBadge: 'text-xs font-semibold tabular-nums',
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

// ─────────────────────────────────────────────────
// FORBIDDEN PATTERNS (for code review)
// ─────────────────────────────────────────────────
// DO NOT USE in Strategy Room components:
// - text-[8px], text-[9px], text-[10px], text-[11px] - too small
// - opacity-30, opacity-40, opacity-50 on text
// - text-muted without explicit readable styling
// - grayscale, blur on content containers
// - pointer-events-none on visible content
