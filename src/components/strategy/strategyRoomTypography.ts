/**
 * Strategy Room Typography Contract
 * Single source of truth for all text styles in Strategy Room gadgets.
 * Do NOT change these values unless the entire Strategy Room is being redesigned.
 * 
 * HARD RULES:
 * - ALL text uses Tailwind semantic tokens: text-foreground, text-muted-foreground
 * - NO opacity-*, text-white, text-black, or custom color vars on text
 * - Section titles: 12px minimum
 * - Primary metrics: 28px (numbers), 18px (status words)
 * - Supporting text: 12px minimum, always readable
 */

// ─────────────────────────────────────────────────
// TYPOGRAPHY CLASSES (Exact pixel sizes as specified)
// ─────────────────────────────────────────────────

export const TYPOGRAPHY = {
  // Section header (e.g., "STRATEGIC PULSE", "EXPOSURE & GAPS")
  // 12px, semibold, uppercase, 0.08em tracking
  sectionTitle: 'text-[12px] font-semibold tracking-[0.08em] uppercase',
  
  // Card label (e.g., "Progress", "At Risk", "Strategy Health")
  // 12px, medium weight
  cardLabel: 'text-[12px] font-medium',
  
  // Primary metric - numbers (e.g., "2%", "25", "10")
  // 28px, semibold, tight leading
  primaryMetric: 'text-[28px] leading-[32px] font-semibold tabular-nums',
  
  // Primary metric - status words (e.g., "On Track", "Off Track")
  // 18px, semibold
  primaryMetricStatus: 'text-[18px] leading-[24px] font-semibold',
  
  // Card supporting line (e.g., "4 objectives", "Need attention")
  // 12px, regular leading
  subtext: 'text-[12px] leading-[16px]',
  
  // Secondary metric (e.g., smaller values in cards)
  // 16px, bold
  secondaryMetric: 'text-[16px] font-bold tabular-nums',
  
  // Data row label (inside cards like Risk Exposure)
  // 12px, regular
  dataRowLabel: 'text-[12px]',
  
  // Data row value
  // 14px, medium
  dataRowValue: 'text-[14px] font-medium tabular-nums',
  
  // Table header row (Coverage + OKR table headers)
  // 11px, semibold, uppercase, 0.06em tracking
  tableHeader: 'text-[11px] font-semibold tracking-[0.06em] uppercase',
  
  // Table body rows
  // 13px, medium weight
  tableCell: 'text-[13px] leading-[18px]',
  tableCellEmphasis: 'text-[13px] leading-[18px] font-medium',
  tableCellSecondary: 'text-[12px] leading-[16px]',
  
  // Badges and chips
  typeBadge: 'text-[11px] font-bold uppercase tracking-wide',
  statusBadge: 'text-[11px] font-semibold',
  
  // Microcopy (e.g., "+4 more", "2 high severity")
  // 12px, readable
  microcopy: 'text-[12px]',
  
  // CTA buttons inside cards
  ctaButton: 'text-[12px] font-medium',
  
  // Progress percentage
  progressPercent: 'text-[12px] font-medium tabular-nums',
  
  // Count badges
  countBadge: 'text-[11px] font-semibold tabular-nums',
} as const;

// ─────────────────────────────────────────────────
// COLOR CLASSES — Use ONLY these Tailwind classes
// NO opacity-*, NO text-white/*, NO inline color vars
// ─────────────────────────────────────────────────

export const TEXT_COLORS = {
  // Primary content - highest contrast, always readable
  // Maps to --foreground in both light and dark themes
  primary: 'text-foreground',
  
  // Secondary/muted content - supporting text, still clearly readable
  // Maps to --muted-foreground in both light and dark themes
  muted: 'text-muted-foreground',
} as const;

// ─────────────────────────────────────────────────
// FORBIDDEN PATTERNS (for code review)
// ─────────────────────────────────────────────────
// DO NOT USE in Strategy Room components:
// - text-[8px], text-[9px], text-[10px] - too small
// - opacity-30, opacity-40, opacity-50, opacity-60 on text
// - text-white, text-white/*, text-black/*
// - fill-white, stroke-white on icons (except status badges)
// - style={{ color: 'var(--text-muted)' }} - use Tailwind class instead
// - text-secondary (ambiguous) - use text-muted-foreground instead
// - grayscale, blur on content containers
// - pointer-events-none on visible content
