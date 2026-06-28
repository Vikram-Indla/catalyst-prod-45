/**
 * Product Roadmap — Design tokens & constants
 * AUDIT FIX: Updated per 25-issue audit
 * Color system: Product Hub renders every item as a Business Request.
 * Avatar=Blue ALWAYS. No purple (AI reserved).
 */

// ── Type Colors: single canonical Business Request identity ──
export const TYPE_COLORS: Record<string, { 
  solid: string; 
  light: string; 
  label: string; 
  gradient: string;
  hover: string;
}> = {
  business_request: {
    solid: 'var(--ds-icon-accent-yellow)', light: 'var(--ds-background-warning)', label: 'Business Request',
    gradient: 'linear-gradient(135deg, var(--ds-icon-accent-yellow), #8A6700)',
    hover: 'var(--ds-text-warning)',
  },
};

// ── Priority Colors ──
export const PRIORITY_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  P0: { color: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)', label: 'Critical' },
  P1: { color: 'var(--ds-text-warning, var(--cp-warning))', bg: 'var(--ds-background-warning)', label: 'High' },
  P2: { color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', bg: 'var(--ds-background-selected)', label: 'Medium' },
};

// ── Status Colors ──
export const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  Active:    { color: 'var(--ds-text-success, var(--cp-success))', bg: 'var(--ds-background-success)', label: 'Active' },
  Planned:   { color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', bg: 'var(--bg-1)', label: 'Planned' },
  Completed: { color: 'var(--cp-teal-60)', bg: 'var(--ds-background-success)', label: 'Completed' },
  Cancelled: { color: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)', label: 'Cancelled' },
};

// ── Ink / Surface ──
export const INK = {
  1: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))',  // primary text
  2: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))',  // secondary text (AUDIT #17: not muted)
  3: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',  // tertiary
  4: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))',  // muted
};

export const SURFACE = {
  page: 'var(--bg-1)',
  card: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  border: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken)))',
  borderLight: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
};

// ── Dark Mode Variants (Dark mode One Surface Model) ──
export const INK_DARK = {
  1: 'var(--ds-surface, rgba(255,255,255,0.92))',
  2: 'var(--ds-surface, rgba(255,255,255,0.72))',
  3: 'var(--ds-surface, rgba(255,255,255,0.60))',
  4: 'var(--ds-surface, rgba(255,255,255,0.50))',
};

export const SURFACE_DARK = {
  page: 'var(--ds-surface)',
  card: 'transparent',
  border: 'var(--ds-border, var(--cp-ink-1))',
  borderLight: 'var(--ds-border, var(--cp-ink-1))',
};

// 2026-06-09 ADS compliance sweep — roadmap module was using
// Sora/Inter/JetBrains Mono. Banned. Replaced with the canonical
// Atlassian Design System font stacks (atlassian.design/foundations/typography).
export const FONT = {
  heading: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
  body: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

// ── Layout (AUDIT #23: 36px rows) ──
export const ROW_HEIGHT = 36;
export const GROUP_HEADER_HEIGHT = 38;
export const LIST_PANEL_WIDTH = 420;
export const DETAIL_PANEL_WIDTH = 420;

// ── Avatar (AUDIT #3: always blue) ──
export const AVATAR_BG = 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))';

// ── Owner palette (for avatar backgrounds) — AUDIT #3: all blue ──
export const OWNER_COLORS = ['var(--ds-text-brand, var(--cp-workstream-catalyst-primary))'];

// ── Scrollbar CSS ──
export const SCROLLBAR_CSS = `
  .roadmap-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
  .roadmap-scroll::-webkit-scrollbar-track { background: transparent; }
  .roadmap-scroll::-webkit-scrollbar-thumb { background: var(--bd-default, var(--cp-border, var(--cp-bg-sunken))); border-radius: 3px; }
  .roadmap-scroll::-webkit-scrollbar-thumb:hover { background: var(--ds-text-disabled); }
`;
