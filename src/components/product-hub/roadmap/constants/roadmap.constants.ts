/**
 * Product Roadmap — Design tokens & constants
 * All colors from the mandatory token system — no deviations.
 */

// ── Type Colors ──
export const TYPE_COLORS: Record<string, { solid: string; light: string; label: string }> = {
  project:     { solid: '#2563EB', light: '#EFF6FF', label: 'Project' },
  enhancement: { solid: '#0D9488', light: '#F0FDFA', label: 'Enhancement' },
  improvement: { solid: '#D97706', light: '#FFFBEB', label: 'Improvement' },
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

// ── Typography ──
export const FONT = {
  body: 'Inter, sans-serif',
  mono: 'JetBrains Mono, SF Mono, monospace',
};

// ── Layout ──
export const ROW_HEIGHT = 44;
export const GROUP_HEADER_HEIGHT = 36;
export const LIST_PANEL_WIDTH = 340;
export const DETAIL_PANEL_WIDTH = 420;

// ── Owner palette (for avatar backgrounds) ──
export const OWNER_COLORS = ['#2563EB', '#0D9488', '#D97706', '#7C3AED'];
