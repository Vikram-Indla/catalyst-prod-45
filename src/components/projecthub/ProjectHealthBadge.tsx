import type { ProjectHealth } from '@/types/projecthub';
import { PROJECT_HEALTH_DISPLAY } from '@/types/projecthub';

const HEALTH_STYLES_LIGHT: Record<string, { dot: string; text: string }> = {
  on_track: { dot: 'var(--ds-text-success)', text: 'var(--ds-background-success-bold)' },
  at_risk: { dot: 'var(--ds-text-warning, var(--cp-amber))', text: 'var(--ds-text-warning, var(--cp-warning))' },
  off_track: { dot: 'var(--ds-text-danger)', text: 'var(--ds-text-danger, var(--cp-danger))' },
};

const HEALTH_STYLES_DARK: Record<string, { dot: string; text: string }> = {
  on_track: { dot: 'var(--ds-background-success)', text: 'var(--ds-background-success)' },
  at_risk: { dot: 'var(--ds-background-warning-bold)', text: 'var(--ds-background-warning)' },
  off_track: { dot: 'var(--ds-background-danger)', text: 'var(--ds-border-danger)' },
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
        gap: 4,
        fontSize: 'var(--ds-font-size-200)',
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