/**
 * Theme shared utilities — status pills, BSC tags, formatters, color constants
 * ECLIPSE D8-R4: Added dark mode config variants
 */
import type { StrategicTheme } from '@/types/strategic-themes';

// ═══ HEALTH STATUS (computed from progress + AI score) ═══
export type HealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'planned' | 'completed' | 'draft';

export function deriveHealthStatus(theme: StrategicTheme): HealthStatus {
  if (theme.status === 'draft') return 'planned';
  if (theme.status === 'archived') return 'completed';
  const score = theme.ai_health_score ?? 0;
  const progress = theme.progress_pct ?? 0;
  if (score >= 70 && progress >= 50) return 'on_track';
  if (score >= 40 || progress >= 30) return 'at_risk';
  return 'off_track';
}

// ═══ STATUS CONFIG — Light / Dark ═══
type StatusStyle = { label: string; bg: string; text: string; dot: string };
export const STATUS_CONFIG: Record<HealthStatus, StatusStyle> = {
  on_track:  { label: 'On Track',  bg: 'rgba(220,252,231,0.7)',  text: '#15803d', dot: '#16A34A' },
  at_risk:   { label: 'At Risk',   bg: 'rgba(254,243,199,0.6)',  text: '#92400E', dot: '#D97706' },
  off_track: { label: 'Off Track', bg: 'rgba(254,226,226,0.6)',  text: '#991B1B', dot: '#DC2626' },
  planned:   { label: 'Planned',   bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  completed: { label: 'Completed', bg: 'rgba(238,242,255,0.7)', text: '#3730A3', dot: '#6366F1' },
  draft:     { label: 'Planned',   bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
};

export const STATUS_CONFIG_DARK: Record<HealthStatus, StatusStyle> = {
  on_track:  { label: 'On Track',  bg: '#182820', text: '#86EFAC', dot: '#16A34A' },
  at_risk:   { label: 'At Risk',   bg: '#2A2418', text: '#FBBF24', dot: '#D97706' },
  off_track: { label: 'Off Track', bg: '#2A1C1E', text: '#FCA5A5', dot: '#DC2626' },
  planned:   { label: 'Planned',   bg: '#1A1A1A', text: '#B8BCC8', dot: '#94A3B8' },
  completed: { label: 'Completed', bg: '#1A2030', text: '#93C5FD', dot: '#6366F1' },
  draft:     { label: 'Planned',   bg: '#1A1A1A', text: '#B8BCC8', dot: '#94A3B8' },
};

export function getStatusConfig(health: HealthStatus, isDark: boolean): StatusStyle {
  return isDark ? STATUS_CONFIG_DARK[health] : STATUS_CONFIG[health];
}

// ═══ BSC PERSPECTIVE — Light / Dark ═══
type BscStyle = { label: string; bg: string; text: string; border: string };
export const BSC_CONFIG: Record<string, BscStyle> = {
  'Financial':        { label: 'Financial',        bg: 'rgba(254,243,199,0.3)', text: '#92400E', border: '#FDE68A' },
  'Customer':         { label: 'Customer',         bg: 'rgba(219,234,254,0.3)', text: '#1E40AF', border: '#BFDBFE' },
  'Internal Process': { label: 'Internal Process', bg: 'rgba(204,251,241,0.3)', text: '#115E59', border: '#99F6E4' },
  'Learning & Growth':{ label: 'Learning & Growth',bg: 'rgba(237,233,254,0.3)', text: '#5B21B6', border: '#DDD6FE' },
  financial:        { label: 'Financial',        bg: 'rgba(254,243,199,0.3)', text: '#92400E', border: '#FDE68A' },
  customer:         { label: 'Customer',         bg: 'rgba(219,234,254,0.3)', text: '#1E40AF', border: '#BFDBFE' },
  internal_process: { label: 'Internal Process', bg: 'rgba(204,251,241,0.3)', text: '#115E59', border: '#99F6E4' },
  learning_growth:  { label: 'Learning & Growth',bg: 'rgba(237,233,254,0.3)', text: '#5B21B6', border: '#DDD6FE' },
};

export const BSC_CONFIG_DARK: Record<string, BscStyle> = {
  'Financial':        { label: 'Financial',        bg: 'rgba(251,191,36,0.12)',  text: '#FBBF24', border: 'rgba(251,191,36,0.25)' },
  'Customer':         { label: 'Customer',         bg: 'rgba(96,165,250,0.12)',  text: '#93C5FD', border: 'rgba(96,165,250,0.25)' },
  'Internal Process': { label: 'Internal Process', bg: 'rgba(45,212,191,0.12)',  text: '#5EEAD4', border: 'rgba(45,212,191,0.25)' },
  'Learning & Growth':{ label: 'Learning & Growth',bg: 'rgba(167,139,250,0.12)', text: '#C4B5FD', border: 'rgba(167,139,250,0.25)' },
  financial:        { label: 'Financial',        bg: 'rgba(251,191,36,0.12)',  text: '#FBBF24', border: 'rgba(251,191,36,0.25)' },
  customer:         { label: 'Customer',         bg: 'rgba(96,165,250,0.12)',  text: '#93C5FD', border: 'rgba(96,165,250,0.25)' },
  internal_process: { label: 'Internal Process', bg: 'rgba(45,212,191,0.12)',  text: '#5EEAD4', border: 'rgba(45,212,191,0.25)' },
  learning_growth:  { label: 'Learning & Growth',bg: 'rgba(167,139,250,0.12)', text: '#C4B5FD', border: 'rgba(167,139,250,0.25)' },
};

export function getBscConfig(key: string, isDark: boolean): BscStyle | null {
  const map = isDark ? BSC_CONFIG_DARK : BSC_CONFIG;
  return map[key] || null;
}

// ═══ BSC filter options ═══
export const BSC_FILTER_OPTIONS = [
  { key: 'Financial', label: 'Financial' },
  { key: 'Customer', label: 'Customer' },
  { key: 'Internal Process', label: 'Internal Process' },
  { key: 'Learning & Growth', label: 'Learning & Growth' },
];

// ═══ PRIORITY ═══
export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#DC2626' },
  high:     { label: 'High',     color: '#D97706' },
  medium:   { label: 'Medium',   color: '#2563EB' },
  low:      { label: 'Low',      color: '#64748B' },
};

// ═══ COLOR SWATCHES ═══
export const THEME_COLORS = [
  '#2563EB', '#0D9488', '#D97706', '#7C3AED', '#EC4899',
  '#059669', '#DC2626', '#0284C7', '#4F46E5', '#CA8A04',
];

// ═══ PROGRESS BAR COLOR ═══
export function getProgressColor(pct: number): string {
  if (pct >= 60) return '#16A34A';
  if (pct >= 40) return '#D97706';
  return '#EF4444';
}

// ═══ FORMATTERS ═══
export function formatBudget(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toString();
}

export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function getAvatarColor(name: string | null): string {
  if (!name) return '#94A3B8';
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#EC4899', '#059669', '#DC2626'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function formatThemeId(sortOrder: number): string {
  return `ST-${String(sortOrder).padStart(3, '0')}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function capitalize(str: string | null): string {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ═══ STATUS BADGE RENDERER (dot + label) ═══
export function renderStatusBadge(health: HealthStatus) {
  const sc = STATUS_CONFIG[health];
  return { ...sc };
}

// ═══ DARK MODE TOKEN HELPERS ═══
export const DK = {
  bg: '#0A0A0A',
  t1: 'var(--cp-t1)',
  t2: 'var(--cp-t2)',
  t3: 'var(--cp-t3)',
  t4: 'var(--cp-t4)',
  border: 'rgba(255,255,255,0.08)',
  borderSubtle: 'rgba(255,255,255,0.05)',
  hover: 'rgba(255,255,255,0.03)',
  iconBgSubtle: 'rgba(255,255,255,0.06)',
};
