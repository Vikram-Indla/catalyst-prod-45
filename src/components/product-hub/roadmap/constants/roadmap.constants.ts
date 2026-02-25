/**
 * Product Roadmap — Design tokens & constants
 * All colors from the mandatory token system — no deviations.
 * Font: Plus Jakarta Sans (body), JetBrains Mono (data)
 */

// ── Type Colors ──
export const TYPE_COLORS: Record<string, { solid: string; light: string; label: string }> = {
  project:            { solid: '#2563EB', light: '#EFF6FF', label: 'Project' },
  enhancement:        { solid: '#0D9488', light: '#F0FDFA', label: 'Enhancement' },
  improvement:        { solid: '#D97706', light: '#FFFBEB', label: 'Improvement' },
  sustainable:        { solid: '#16A34A', light: '#F0FDF4', label: 'Sustainable' },
  entity_integration: { solid: '#8B5CF6', light: '#F5F3FF', label: 'Entity Integration' },
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
  Planned:   { color: '#94A3B8', bg: '#F8FAFC', label: 'Planned' },
  Completed: { color: '#0D9488', bg: '#F0FDFA', label: 'Completed' },
  Cancelled: { color: '#EF4444', bg: '#FEF2F2', label: 'Cancelled' },
};

// ── Ink / Surface ──
export const INK = {
  1: '#0F172A',
  2: '#334155',
  3: '#64748B',
  4: '#94A3B8',
};

export const SURFACE = {
  page: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
};

// ── Typography — Catalyst spec: Plus Jakarta Sans + JetBrains Mono ──
export const FONT = {
  body: "'Plus Jakarta Sans', Inter, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

// ── Layout (4px grid) ──
export const ROW_HEIGHT = 44;
export const GROUP_HEADER_HEIGHT = 36;
export const LIST_PANEL_WIDTH = 340;
export const DETAIL_PANEL_WIDTH = 420;

// ── Owner palette (for avatar backgrounds) ──
export const OWNER_COLORS = ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#E11D48', '#059669'];

// ── Scrollbar CSS (applied globally via roadmap container) ──
export const SCROLLBAR_CSS = `
  .roadmap-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
  .roadmap-scroll::-webkit-scrollbar-track { background: transparent; }
  .roadmap-scroll::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 3px; }
  .roadmap-scroll::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
`;
