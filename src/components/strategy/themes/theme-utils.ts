/**
 * Theme shared utilities — status pills, BSC tags, formatters, color constants
 */
import type { StrategicTheme } from '@/types/strategic-themes';

// ═══ HEALTH STATUS (computed from progress + AI score) ═══
export type HealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'planned' | 'completed' | 'draft';

export function deriveHealthStatus(theme: StrategicTheme): HealthStatus {
  // Non-active themes show lifecycle status
  if (theme.status === 'draft') return 'planned'; // Map draft → planned display
  if (theme.status === 'archived') return 'completed';

  // For active themes, compute from progress + AI health
  const score = theme.ai_health_score ?? 0;
  const progress = theme.progress_pct ?? 0;

  if (score >= 70 && progress >= 50) return 'on_track';
  if (score >= 40 || progress >= 30) return 'at_risk';
  return 'off_track';
}

// Linear-style desaturated status badges
export const STATUS_CONFIG: Record<HealthStatus, { label: string; bg: string; text: string; dot: string }> = {
  on_track:  { label: 'On Track',  bg: 'rgba(220,252,231,0.7)',  text: '#15803d', dot: '#16A34A' },
  at_risk:   { label: 'At Risk',   bg: 'rgba(254,243,199,0.6)',  text: '#92400E', dot: '#D97706' },
  off_track: { label: 'Off Track', bg: 'rgba(254,226,226,0.6)',  text: '#991B1B', dot: '#DC2626' },
  planned:   { label: 'Planned',   bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  completed: { label: 'Completed', bg: 'rgba(238,242,255,0.7)', text: '#3730A3', dot: '#6366F1' },
  draft:     { label: 'Planned',   bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
};

// ═══ BSC PERSPECTIVE — outlined/ghost style ═══
export const BSC_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  'Financial':        { label: 'Financial',        bg: 'rgba(254,243,199,0.3)', text: '#92400E', border: '#FDE68A' },
  'Customer':         { label: 'Customer',         bg: 'rgba(219,234,254,0.3)', text: '#1E40AF', border: '#BFDBFE' },
  'Internal Process': { label: 'Internal Process', bg: 'rgba(204,251,241,0.3)', text: '#115E59', border: '#99F6E4' },
  'Learning & Growth':{ label: 'Learning & Growth',bg: 'rgba(237,233,254,0.3)', text: '#5B21B6', border: '#DDD6FE' },
  // snake_case compat
  financial:        { label: 'Financial',        bg: 'rgba(254,243,199,0.3)', text: '#92400E', border: '#FDE68A' },
  customer:         { label: 'Customer',         bg: 'rgba(219,234,254,0.3)', text: '#1E40AF', border: '#BFDBFE' },
  internal_process: { label: 'Internal Process', bg: 'rgba(204,251,241,0.3)', text: '#115E59', border: '#99F6E4' },
  learning_growth:  { label: 'Learning & Growth',bg: 'rgba(237,233,254,0.3)', text: '#5B21B6', border: '#DDD6FE' },
};

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
