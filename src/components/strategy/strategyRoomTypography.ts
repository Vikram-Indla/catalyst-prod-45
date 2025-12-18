/**
 * Strategy Room Typography Contract — LOCKED (CIO Cockpit UX)
 * Single source of truth for all text styles in Strategy Room gadgets.
 * 
 * ⚠️ DO NOT MODIFY without explicit UX approval.
 * 
 * HARD RULES (NON-NEGOTIABLE):
 * 1. KPI VALUE: 30px, font-weight 600-700, NEVER smaller, NEVER muted
 * 2. KPI LABEL: 14px, font-weight 500, secondary color token
 * 3. KPI SUBTEXT: 12-13px, font-weight 400, muted color token, ALWAYS visible
 * 4. STATUS TEXT: 14-15px, font-weight 600, semantic color
 * 5. NO greying during loading/refresh
 * 6. NO skeletons after first successful load
 * 7. NO layout shift or twitching
 */

// ─────────────────────────────────────────────────
// TYPOGRAPHY CLASSES — LOCKED SIZES (Exact pixel values)
// ─────────────────────────────────────────────────

export const TYPOGRAPHY = {
  // ── Section Headers ──────────────────────────────
  // Section header (e.g., "STRATEGIC PULSE", "EXPOSURE & GAPS")
  // 12px, semibold, uppercase, 0.08em tracking
  sectionTitle: 'text-[12px] font-semibold tracking-[0.08em] uppercase',
  
  // ── KPI Card Typography (LOCKED) ─────────────────
  // Card label (e.g., "Progress", "At Risk", "Strategy Health")
  // 14px, medium weight — LOCKED per CIO spec
  cardLabel: 'text-[14px] font-medium',
  
  // Primary metric - numbers (e.g., "2%", "25", "10")
  // 30px, font-weight 600, line-height 1.15 — LOCKED per CIO spec
  // ⚠️ MUST NEVER become smaller or muted
  primaryMetric: 'text-[30px] leading-[34px] font-semibold tabular-nums',
  
  // Primary metric - status words (e.g., "On Track", "Off Track")
  // 15px, font-weight 600 — LOCKED per CIO spec
  primaryMetricStatus: 'text-[15px] leading-[20px] font-semibold',
  
  // Card supporting line (e.g., "4 objectives", "Need attention")
  // 13px, regular leading — LOCKED per CIO spec
  // ⚠️ MUST remain visible during refresh
  subtext: 'text-[13px] leading-[18px]',
  
  // ── Secondary Metrics ────────────────────────────
  // Secondary metric (e.g., smaller values in cards)
  // 16px, bold
  secondaryMetric: 'text-[16px] font-bold tabular-nums',
  
  // ── Data Rows (Exposure & Gaps) ──────────────────
  // Data row label (inside cards like Risk Exposure)
  // 12px, regular
  dataRowLabel: 'text-[12px]',
  
  // Data row value
  // 14px, medium
  dataRowValue: 'text-[14px] font-medium tabular-nums',
  
  // ── Table Typography (Coverage, OKR Tree) ────────
  // Table header row
  // 11px, semibold, uppercase, 0.06em tracking
  tableHeader: 'text-[11px] font-semibold tracking-[0.06em] uppercase',
  
  // Table body rows
  // 13px, medium weight
  tableCell: 'text-[13px] leading-[18px]',
  tableCellEmphasis: 'text-[13px] leading-[18px] font-medium',
  tableCellSecondary: 'text-[12px] leading-[16px]',
  
  // ── Badges and Chips ─────────────────────────────
  typeBadge: 'text-[11px] font-bold uppercase tracking-wide',
  statusBadge: 'text-[11px] font-semibold',
  
  // ── Microcopy ────────────────────────────────────
  // (e.g., "+4 more", "2 high severity")
  // 12px, readable
  microcopy: 'text-[12px]',
  
  // ── CTA Buttons ──────────────────────────────────
  ctaButton: 'text-[12px] font-medium',
  
  // ── Progress Elements ────────────────────────────
  progressPercent: 'text-[12px] font-medium tabular-nums',
  countBadge: 'text-[11px] font-semibold tabular-nums',
} as const;

// ─────────────────────────────────────────────────
// COLOR CLASSES — LOCKED
// Use ONLY these Tailwind classes for text colors
// ─────────────────────────────────────────────────

export const TEXT_COLORS = {
  // Primary content - highest contrast, always readable
  // Maps to --foreground in both light and dark themes
  // ⚠️ KPI VALUES MUST use this — NEVER muted
  primary: 'text-foreground',
  
  // Secondary/muted content - supporting text, still clearly readable
  // Maps to --muted-foreground in both light and dark themes
  muted: 'text-muted-foreground',
} as const;

// ─────────────────────────────────────────────────
// LOADING STATE RULES — LOCKED
// ─────────────────────────────────────────────────

export const LOADING_RULES = {
  // Initial load: skeleton allowed ONCE only
  // After first success: NEVER show skeleton again
  // During refresh: show subtle "Refreshing…" indicator in header ONLY
  // Content must remain fully visible during refresh
  // No opacity reduction, no greying, no layout shift
} as const;

// ─────────────────────────────────────────────────
// FORBIDDEN PATTERNS (for code review)
// ─────────────────────────────────────────────────
// DO NOT USE in Strategy Room components:
// ❌ text-[8px], text-[9px], text-[10px] - too small
// ❌ opacity-30, opacity-40, opacity-50, opacity-60 on text
// ❌ text-white, text-white/*, text-black/*
// ❌ fill-white, stroke-white on icons (except status badges)
// ❌ grayscale, blur on content containers
// ❌ pointer-events-none on visible content
// ❌ setData(undefined) after first successful load
// ❌ Skeleton components after first load
