/**
 * Product Roadmap — Design tokens & constants
 * AUDIT FIX: Updated per 25-issue audit
 * Color system: Project=Slate, Enhancement=Teal, Entity Integration=Amber, Improvement=Green
 * Avatar=Blue ALWAYS. No purple (AI reserved).
 */

// ── Type Colors (AUDIT #4: distinct per type) ──
export const TYPE_COLORS: Record<string, { 
  solid: string; 
  light: string; 
  label: string; 
  gradient: string;
  hover: string;
}> = {
  project: { 
    solid: '#475569', light: 'var(--bg-1, #F8FAFC)', label: 'Project',
    gradient: 'linear-gradient(135deg, #475569, #334155)',
    hover: '#334155',
  },
  enhancement: { 
    solid: '#0D9488', light: '#F0FDFA', label: 'Enhancement',
    gradient: 'linear-gradient(135deg, #0D9488, #0F766E)',
    hover: '#0F766E',
  },
  improvement: { 
    solid: '#16A34A', light: '#F0FDF4', label: 'Improvement',
    gradient: 'linear-gradient(135deg, #16A34A, #15803D)',
    hover: '#15803D',
  },
  entity_integration: { 
    solid: '#D97706', light: '#FFFBEB', label: 'Entity Integration',
    gradient: 'linear-gradient(135deg, #D97706, #B45309)',
    hover: '#B45309',
  },
};

// ── Priority Colors ──
export const PRIORITY_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  P0: { color: '#EF4444', bg: '#FEF2F2', label: 'Critical' },
  P1: { color: '#D97706', bg: '#FFFBEB', label: 'High' },
  P2: { color: '#2563EB', bg: '#EFF6FF', label: 'Medium' },
};

// ── Status Colors ──
export const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  Active:    { color: '#16A34A', bg: '#F0FDF4', label: 'Active' },
  Planned:   { color: '#94A3B8', bg: 'var(--bg-1, #F8FAFC)', label: 'Planned' },
  Completed: { color: '#0D9488', bg: '#F0FDFA', label: 'Completed' },
  Cancelled: { color: '#EF4444', bg: '#FEF2F2', label: 'Cancelled' },
};

// ── Ink / Surface ──
export const INK = {
  1: 'var(--fg-1, #0F172A)',  // primary text
  2: '#334155',  // secondary text (AUDIT #17: not muted)
  3: '#64748B',  // tertiary
  4: '#94A3B8',  // muted
};

export const SURFACE = {
  page: 'var(--bg-1, #F8FAFC)',
  card: '#FFFFFF',
  border: 'var(--bd-default, #E2E8F0)',
  borderLight: '#F1F5F9',
};

// ── Dark Mode Variants (Nocturne One Surface Model) ──
export const INK_DARK = {
  1: 'rgba(255,255,255,0.92)',
  2: 'rgba(255,255,255,0.72)',
  3: 'rgba(255,255,255,0.60)',
  4: 'rgba(255,255,255,0.50)',
};

export const SURFACE_DARK = {
  page: '#0A0A0A',
  card: 'transparent',
  border: '#2E2E2E',
  borderLight: '#292929',
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
export const AVATAR_BG = '#2563EB';

// ── Owner palette (for avatar backgrounds) — AUDIT #3: all blue ──
export const OWNER_COLORS = ['#2563EB'];

// ── Scrollbar CSS ──
export const SCROLLBAR_CSS = `
  .roadmap-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
  .roadmap-scroll::-webkit-scrollbar-track { background: transparent; }
  .roadmap-scroll::-webkit-scrollbar-thumb { background: var(--bd-default, #E2E8F0); border-radius: 3px; }
  .roadmap-scroll::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
`;
