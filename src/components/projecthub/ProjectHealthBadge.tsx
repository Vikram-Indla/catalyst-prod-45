import type { ProjectHealth } from '@/types/projecthub';
import { PROJECT_HEALTH_DISPLAY } from '@/types/projecthub';

const HEALTH_STYLES_LIGHT: Record<string, { dot: string; text: string }> = {
  on_track: { dot: 'var(--ds-text-success, #22C55E)', text: '#15803D' },
  at_risk: { dot: 'var(--ds-text-warning, #F59E0B)', text: 'var(--ds-text-warning, #D97706)' },
  off_track: { dot: 'var(--ds-text-danger, #EF4444)', text: 'var(--ds-text-danger, #DC2626)' },
};

const HEALTH_STYLES_DARK: Record<string, { dot: string; text: string }> = {
  on_track: { dot: '#4ADE80', text: '#86EFAC' },
  at_risk: { dot: '#FBBF24', text: '#FDE68A' },
  off_track: { dot: '#F87171', text: 'var(--ds-border-danger, #FCA5A5)' },
};

export function ProjectHealthBadge({ health }: { health: ProjectHealth }) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const styles = isDark ? HEALTH_STYLES_DARK : HEALTH_STYLES_LIGHT;
  const s = styles[health] || styles.on_track;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        fontWeight: 500,
        color: s.text,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, background: s.dot, flexShrink: 0 }} />
      {PROJECT_HEALTH_DISPLAY[health] || health}
    </span>
  );
}