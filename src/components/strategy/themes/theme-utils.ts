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
  on_track:  { label: 'On Track',  bg: 'var(--ds-background-success, rgba(220,252,231,0.7))',  text: 'var(--ds-background-success-bold, var(--ds-background-success-bold, #1F845A))', dot: 'var(--ds-text-success, var(--cp-success, #16A34A))' },
  at_risk:   { label: 'At Risk',   bg: 'var(--ds-background-warning, rgba(254,243,199,0.6))',  text: 'var(--ds-text-warning, var(--ds-text-warning, #974F0C))', dot: 'var(--ds-text-warning, var(--cp-warning, #D97706))' },
  off_track: { label: 'Off Track', bg: 'var(--ds-background-danger, rgba(254,226,226,0.6))',  text: 'var(--ds-text-danger, #991B1B)', dot: 'var(--ds-text-danger, var(--cp-danger, #DC2626))' },
  planned:   { label: 'Planned',   bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))', text: 'var(--ds-text-subtle, #475569)', dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))' },
  completed: { label: 'Completed', bg: 'var(--ds-background-discovery, rgba(238,242,255,0.7))', text: 'var(--ds-background-discovery-bold, var(--ds-background-discovery-bold, #3730a3))', dot: 'var(--ds-background-discovery-bold, #6366f1)' },
  draft:     { label: 'Planned',   bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))', text: 'var(--ds-text-subtle, #475569)', dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))' },
};

export const STATUS_CONFIG_DARK: Record<HealthStatus, StatusStyle> = {
  on_track:  { label: 'On Track',  bg: 'var(--ds-text, #172B4D)', text: 'var(--ds-background-success, #DFFCF0)', dot: 'var(--ds-text-success, var(--cp-success, #16A34A))' },
  at_risk:   { label: 'At Risk',   bg: '#2A2418', text: 'var(--ds-background-warning-bold, #E2B203)', dot: 'var(--ds-text-warning, var(--cp-warning, #D97706))' },
  off_track: { label: 'Off Track', bg: 'var(--ds-text, #172B4D)', text: 'var(--ds-border-danger, #FCA5A5)', dot: 'var(--ds-text-danger, var(--cp-danger, #DC2626))' },
  planned:   { label: 'Planned',   bg: 'var(--ds-surface-raised, var(--cp-ink-1, #1A1A1A))', text: 'var(--ds-text-disabled, #8590A2)', dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))' },
  completed: { label: 'Completed', bg: 'var(--ds-text, #172B4D)', text: 'var(--ds-background-information-bold, #0C66E4)', dot: 'var(--ds-background-discovery-bold, #6366f1)' },
  draft:     { label: 'Planned',   bg: 'var(--ds-surface-raised, var(--cp-ink-1, #1A1A1A))', text: 'var(--ds-text-disabled, #8590A2)', dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))' },
};

export function getStatusConfig(health: HealthStatus, isDark: boolean): StatusStyle {
  return isDark ? STATUS_CONFIG_DARK[health] : STATUS_CONFIG[health];
}

// ═══ BSC PERSPECTIVE — Light / Dark ═══
type BscStyle = { label: string; bg: string; text: string; border: string };
export const BSC_CONFIG: Record<string, BscStyle> = {
  'Financial':        { label: 'Financial',        bg: 'var(--ds-background-warning, rgba(254,243,199,0.3))', text: 'var(--ds-text-warning, var(--ds-text-warning, #974F0C))', border: 'var(--ds-background-warning, var(--ds-background-warning, #FFF7D6))' },
  'Customer':         { label: 'Customer',         bg: 'var(--ds-background-information, rgba(219,234,254,0.3))', text: 'var(--ds-link-pressed, #1e40af)', border: 'var(--ds-background-information, var(--ds-background-information, #E9F2FF))' },
  'Internal Process': { label: 'Internal Process', bg: 'var(--ds-background-success, rgba(204,251,241,0.3))', text: 'var(--ds-text-success, var(--ds-chart-green-bold, #216E4E))', border: 'var(--ds-background-success, #DFFCF0)' },
  'Learning & Growth':{ label: 'Learning & Growth',bg: 'var(--ds-background-discovery, rgba(237,233,254,0.3))', text: 'var(--ds-background-discovery-bold, var(--ds-background-discovery-bold, #5b21b6))', border: 'var(--ds-background-discovery, #F3F0FF)' },
  financial:        { label: 'Financial',        bg: 'var(--ds-background-warning, rgba(254,243,199,0.3))', text: 'var(--ds-text-warning, var(--ds-text-warning, #974F0C))', border: 'var(--ds-background-warning, var(--ds-background-warning, #FFF7D6))' },
  customer:         { label: 'Customer',         bg: 'var(--ds-background-information, rgba(219,234,254,0.3))', text: 'var(--ds-link-pressed, #1e40af)', border: 'var(--ds-background-information, var(--ds-background-information, #E9F2FF))' },
  internal_process: { label: 'Internal Process', bg: 'var(--ds-background-success, rgba(204,251,241,0.3))', text: 'var(--ds-text-success, var(--ds-chart-green-bold, #216E4E))', border: 'var(--ds-background-success, #DFFCF0)' },
  learning_growth:  { label: 'Learning & Growth',bg: 'var(--ds-background-discovery, rgba(237,233,254,0.3))', text: 'var(--ds-background-discovery-bold, var(--ds-background-discovery-bold, #5b21b6))', border: 'var(--ds-background-discovery, #F3F0FF)' },
};

export const BSC_CONFIG_DARK: Record<string, BscStyle> = {
  'Financial':        { label: 'Financial',        bg: 'var(--ds-background-warning-bold, rgba(251,191,36,0.12))',  text: 'var(--ds-background-warning-bold, var(--ds-background-warning-bold, #E2B203))', border: 'var(--ds-background-warning-bold, rgba(251,191,36,0.25))' },
  'Customer':         { label: 'Customer',         bg: 'var(--ds-background-information-bold, rgba(96,165,250,0.12))',  text: 'var(--ds-background-information-bold, var(--ds-link, #0C66E4))', border: 'var(--ds-background-information-bold, rgba(96,165,250,0.25))' },
  'Internal Process': { label: 'Internal Process', bg: 'var(--ds-background-success-bold, rgba(45,212,191,0.12))',  text: 'var(--ds-background-success, #DCFFF1)', border: 'var(--ds-background-success-bold, rgba(45,212,191,0.25))' },
  'Learning & Growth':{ label: 'Learning & Growth',bg: 'var(--ds-background-discovery-bold, rgba(167,139,250,0.12))', text: 'var(--ds-background-discovery, #F3F0FF)', border: 'var(--ds-background-discovery-bold, rgba(167,139,250,0.25))' },
  financial:        { label: 'Financial',        bg: 'var(--ds-background-warning-bold, rgba(251,191,36,0.12))',  text: 'var(--ds-background-warning-bold, var(--ds-background-warning-bold, #E2B203))', border: 'var(--ds-background-warning-bold, rgba(251,191,36,0.25))' },
  customer:         { label: 'Customer',         bg: 'var(--ds-background-information-bold, rgba(96,165,250,0.12))',  text: 'var(--ds-background-information-bold, var(--ds-link, #0C66E4))', border: 'var(--ds-background-information-bold, rgba(96,165,250,0.25))' },
  internal_process: { label: 'Internal Process', bg: 'var(--ds-background-success-bold, rgba(45,212,191,0.12))',  text: 'var(--ds-background-success, #DCFFF1)', border: 'var(--ds-background-success-bold, rgba(45,212,191,0.25))' },
  learning_growth:  { label: 'Learning & Growth',bg: 'var(--ds-background-discovery-bold, rgba(167,139,250,0.12))', text: 'var(--ds-background-discovery, #F3F0FF)', border: 'var(--ds-background-discovery-bold, rgba(167,139,250,0.25))' },
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
  critical: { label: 'Critical', color: 'var(--ds-text-danger, var(--cp-danger, #DC2626))' },
  high:     { label: 'High',     color: 'var(--ds-text-warning, var(--cp-warning, #D97706))' },
  medium:   { label: 'Medium',   color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' },
  low:      { label: 'Low',      color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))' },
};

// ═══ COLOR SWATCHES ═══
export const THEME_COLORS = [
  'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', 'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))', 'var(--ds-text-warning, var(--cp-warning, #D97706))', 'var(--cp-purple-60, var(--ds-background-discovery-bold, #7C3AED))', 'var(--ds-background-accent-magenta-bolder, #ec4899)',
  'var(--quality-high, var(--ds-background-success-bold, #059669))', 'var(--ds-text-danger, var(--cp-danger, #DC2626))', 'var(--ds-link, #0C66E4)', 'var(--ds-background-discovery-bold, #6E5DC6)', 'var(--ds-text-warning, #974F0C)',
];

// ═══ PROGRESS BAR COLOR ═══
export function getProgressColor(pct: number): string {
  if (pct >= 60) return 'var(--ds-text-success, var(--cp-success, #16A34A))';
  if (pct >= 40) return 'var(--ds-text-warning, var(--cp-warning, #D97706))';
  return 'var(--ds-text-danger, #EF4444)';
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
  if (!name) return 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))';
  const colors = ['var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', 'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))', 'var(--cp-purple-60, var(--ds-background-discovery-bold, #7C3AED))', 'var(--ds-text-warning, var(--cp-warning, #D97706))', 'var(--ds-background-accent-magenta-bolder, #BE185D)', 'var(--quality-high, var(--ds-background-success-bold, #059669))', 'var(--ds-text-danger, var(--cp-danger, #DC2626))'];
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
  bg: 'var(--ds-surface, #0A0A0A)',
  t1: 'var(--cp-t1)',
  t2: 'var(--cp-t2)',
  t3: 'var(--cp-t3)',
  t4: 'var(--cp-t4)',
  border: 'var(--ds-border, var(--cp-ink-1, #2E2E2E))',
  borderSubtle: 'var(--ds-border, var(--cp-ink-1, #292929))',
  hover: 'var(--ds-surface-overlay, #1F1F1F)',
  iconBgSubtle: 'var(--ds-border, var(--cp-ink-1, #292929))',
};
