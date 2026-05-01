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
    solid: 'var(--ds-icon-accent-yellow, #B38600)', light: '#FFFBEB', label: 'Business Request',
    gradient: 'linear-gradient(135deg, var(--ds-icon-accent-yellow, #B38600), #8A6700)',
    hover: '#8A6700',
  },
};

// ── Priority Colors ──
export const PRIORITY_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  P0: { color: 'var(--ds-text-danger, #EF4444)', bg: 'var(--ds-background-danger, #FEF2F2)', label: 'Critical' },
  P1: { color: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', label: 'High' },
  P2: { color: 'var(--ds-text-brand, #2563EB)', bg: 'var(--ds-background-selected, #EFF6FF)', label: 'Medium' },
};

// ── Status Colors ──
export const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  Active:    { color: 'var(--ds-text-success, #16A34A)', bg: '#F0FDF4', label: 'Active' },
  Planned:   { color: 'var(--ds-text-subtlest, #94A3B8)', bg: 'var(--bg-1, #F8FAFC)', label: 'Planned' },
  Completed: { color: '#0D9488', bg: '#F0FDFA', label: 'Completed' },
  Cancelled: { color: 'var(--ds-text-danger, #EF4444)', bg: 'var(--ds-background-danger, #FEF2F2)', label: 'Cancelled' },
};

// ── Ink / Surface ──
export const INK = {
  1: 'var(--fg-1, #0F172A)',  // primary text
  2: 'var(--ds-text-subtle, #334155)',  // secondary text (AUDIT #17: not muted)
  3: 'var(--ds-text-subtlest, #64748B)',  // tertiary
  4: 'var(--ds-text-subtlest, #94A3B8)',  // muted
};

export const SURFACE = {
  page: 'var(--bg-1, #F8FAFC)',
  card: 'var(--ds-text-inverse, #FFFFFF)',
  border: 'var(--bd-default, #E2E8F0)',
  borderLight: 'var(--ds-surface-sunken, #F1F5F9)',
};

// ── Dark Mode Variants (Dark mode One Surface Model) ──
export const INK_DARK = {
  1: 'rgba(255,255,255,0.92)',
  2: 'rgba(255,255,255,0.72)',
  3: 'rgba(255,255,255,0.60)',
  4: 'rgba(255,255,255,0.50)',
};

export const SURFACE_DARK = {
  page: 'var(--ds-surface, #0A0A0A)',
  card: 'transparent',
  border: 'var(--ds-border, #2E2E2E)',
  borderLight: 'var(--ds-border, #292929)',
};

// ── Typography — Catalyst spec: Sora (headings) + Inter (body) + JetBrains Mono (data) ──
export const FONT = {
  heading: "'Sora', 'Plus Jakarta Sans', sans-serif",
  body: "Inter, 'Plus Jakarta Sans', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

// ── Layout (AUDIT #23: 36px rows) ──
export const ROW_HEIGHT = 36;
export const GROUP_HEADER_HEIGHT = 38;
export const LIST_PANEL_WIDTH = 420;
export const DETAIL_PANEL_WIDTH = 420;

// ── Avatar (AUDIT #3: always blue) ──
export const AVATAR_BG = 'var(--ds-text-brand, #2563EB)';

// ── Owner palette (for avatar backgrounds) — AUDIT #3: all blue ──
export const OWNER_COLORS = ['var(--ds-text-brand, #2563EB)'];

// ── Scrollbar CSS ──
export const SCROLLBAR_CSS = `
  .roadmap-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
  .roadmap-scroll::-webkit-scrollbar-track { background: transparent; }
  .roadmap-scroll::-webkit-scrollbar-thumb { background: var(--bd-default, #E2E8F0); border-radius: 3px; }
  .roadmap-scroll::-webkit-scrollbar-thumb:hover { background: var(--ds-text-disabled, #CBD5E1); }
`;
