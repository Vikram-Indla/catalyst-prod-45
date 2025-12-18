/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALYST INTERACTION PATTERNS — CROSS-PAGE CONSISTENCY CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file defines the SINGLE SOURCE OF TRUTH for interaction patterns across:
 * - Enterprise (Strategy Room, Snapshots, Strategic Backlog)
 * - Product (Product Room, Backlogs, Capacity)
 * - Program (Program Board, Delivery views)
 * 
 * GLOBAL INTERACTION CONTRACT:
 * Once a user learns an interaction in one area, it MUST behave the same everywhere.
 * 
 * ❌ No page-specific inventions
 * ❌ No "almost the same" behaviors
 */

// ═══════════════════════════════════════════════════════════════════════════
// HOVER STATES — Unified across all modules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard row hover - subtle background only
 * - No size change
 * - No shadow pop
 * - No color morphing
 */
export const ROW_HOVER = {
  /** CSS class for Tailwind - subtle 3-4% opacity highlight */
  className: 'hover:bg-accent/40',
  /** Inline style for custom implementations */
  style: { backgroundColor: 'hsl(var(--accent) / 0.35)' },
  /** Transition - fast but not jarring */
  transition: 'transition-[background-color] duration-100',
} as const;

/**
 * Clickable row styles - indicates navigation or drill-down
 */
export const CLICKABLE_ROW = {
  className: 'cursor-pointer',
  /** Hover with stronger affordance for clickable items */
  hoverClassName: 'hover:bg-accent/50',
} as const;

/**
 * Selected row styles - active state
 */
export const SELECTED_ROW = {
  className: 'ring-1 ring-inset',
  style: { 
    backgroundColor: 'var(--surface-active, hsl(var(--accent) / 0.6))',
    '--tw-ring-color': 'var(--brand-primary, hsl(var(--primary)))',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS STATES — Accessibility consistency
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Visible focus ring - same treatment everywhere
 */
export const FOCUS_RING = {
  className: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
  /** For inset focus (tables) */
  insetClassName: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// LOADING & REFRESH STATES — Same language everywhere
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Refreshing indicator - standardized text and styling
 * Used when data is being fetched but existing content is visible
 */
export const REFRESH_INDICATOR = {
  /** Standard text - NEVER change per module */
  text: 'Refreshing…',
  /** Style for the text */
  className: 'text-[11px] text-muted-foreground flex items-center gap-1.5',
  /** Spinner size */
  spinnerSize: 12,
} as const;

/**
 * Stale data indicator - standardized warning
 * Used when showing cached data after an error
 */
export const STALE_INDICATOR = {
  /** Standard text - same everywhere */
  text: 'Data may be stale',
  /** Alternative for longer context */
  altText: 'Showing last available data',
  /** Style - italic, subtle */
  className: 'text-[11px] text-muted-foreground/70 italic',
} as const;

/**
 * Empty state standards
 * - Calm, explanatory
 * - No alarmist language
 * - Same tone across modules
 */
export const EMPTY_STATE = {
  /** Icon opacity - not attention-grabbing */
  iconClassName: 'text-muted-foreground/50',
  /** Text style */
  textClassName: 'text-sm text-muted-foreground/70',
  /** Container */
  containerClassName: 'flex flex-col items-center justify-center py-8 gap-2',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CLICK & NAVIGATION RULES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Row click behavior contract:
 * - Row click = navigate OR open details (never both in same context)
 * - Hover state must clearly indicate clickability
 * - Cursor must change consistently
 * - Chevron indicates drill-down (if present)
 */
export const NAVIGATION_AFFORDANCE = {
  /** Chevron that appears on hover - secondary, discoverable */
  chevronClassName: 'opacity-0 group-hover:opacity-40 transition-opacity duration-100 text-muted-foreground',
  /** Chevron size */
  chevronSize: 14,
} as const;

/**
 * Selection behavior contract:
 * - Selection is NEVER implicit
 * - Selection ALWAYS uses checkbox or multi-select control
 * - Selection NEVER hijacks row click
 */
export const SELECTION_RULES = {
  /** Checkbox should be explicit, not hidden */
  checkboxClassName: 'flex-shrink-0',
  /** Selected state styling */
  selectedRowClassName: 'bg-primary/5 border-primary/20',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// DRAWER CONTRACT — One behavior to rule them all
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Drawer standards:
 * - Slide in from right
 * - Same width categories across all modules
 * - Same animation speed
 * - Same backdrop behavior
 */
export const DRAWER_WIDTHS = {
  narrow: 'w-[360px]',   // Detail panels, quick views
  medium: 'w-[480px]',   // Form drawers (DEFAULT)
  wide: 'w-[640px]',     // Complex forms, previews
  xl: 'w-[800px]',       // Large content
} as const;

/**
 * Drawer content structure:
 * - Header: item type + title
 * - Body: details, links, status
 * - Footer (if any): actions only
 */
export const DRAWER_STRUCTURE = {
  headerClassName: 'px-6 py-4 border-b border-border flex-shrink-0',
  bodyClassName: 'flex-1 overflow-y-auto px-6 py-4',
  footerClassName: 'px-6 py-4 border-t border-border flex-shrink-0',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply standard row hover behavior via inline styles
 * Use for onMouseEnter/onMouseLeave handlers
 */
export function applyRowHover(element: HTMLElement, isSelected: boolean = false) {
  if (!isSelected) {
    element.style.backgroundColor = 'hsl(var(--accent) / 0.35)';
  }
}

/**
 * Remove row hover effect
 * Use for onMouseLeave handlers
 */
export function removeRowHover(
  element: HTMLElement, 
  isSelected: boolean = false,
  defaultBg: string = 'transparent'
) {
  if (!isSelected) {
    element.style.backgroundColor = defaultBg;
  }
}

/**
 * Standard keyboard navigation for rows
 */
export function handleRowKeyDown(
  e: React.KeyboardEvent,
  onClick: () => void
) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onClick();
  }
}
