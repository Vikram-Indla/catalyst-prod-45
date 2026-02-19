/**
 * Theme shared utilities — status pills, BSC tags, formatters, color constants
 */
import type { StrategicTheme, BscPerspective } from '@/types/strategic-themes';

// ═══ STATUS ═══
export type HealthStatus = 'on_track' | 'at_risk' | 'off_track' | 'planned' | 'completed' | 'draft';

export function deriveHealthStatus(theme: StrategicTheme): HealthStatus {
  if (theme.status === 'draft') return 'draft';
  if (theme.status === 'archived') return 'completed';
  if (theme.progress_pct >= 70) return 'on_track';
  if (theme.progress_pct >= 40) return 'at_risk';
  return 'off_track';
}

export const STATUS_CONFIG: Record<HealthStatus, { label: string; bg: string; text: string; dot: string }> = {
  on_track:  { label: 'On Track',  bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  at_risk:   { label: 'At Risk',   bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
  off_track: { label: 'Off Track', bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  planned:   { label: 'Planned',   bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  completed: { label: 'Completed', bg: '#EEF2FF', text: '#3730A3', dot: '#6366F1' },
  draft:     { label: 'Draft',     bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
};

// ═══ BSC PERSPECTIVE ═══
export const BSC_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  financial:        { label: 'Financial',        bg: '#FEF3C7', text: '#92400E' },
  customer:         { label: 'Customer',         bg: '#DBEAFE', text: '#1E40AF' },
  internal_process: { label: 'Internal Process', bg: '#CCFBF1', text: '#115E59' },
  learning_growth:  { label: 'Learning & Growth',bg: '#EDE9FE', text: '#5B21B6' },
};

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
