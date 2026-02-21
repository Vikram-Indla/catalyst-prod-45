import type { ProjectHealth } from '@/types/projecthub';
import { PROJECT_HEALTH_DISPLAY } from '@/types/projecthub';

const HEALTH_STYLES: Record<string, { dot: string; text: string }> = {
  on_track: { dot: '#22C55E', text: '#15803D' },
  at_risk: { dot: '#F59E0B', text: '#D97706' },
  off_track: { dot: '#EF4444', text: '#DC2626' },
};

export function ProjectHealthBadge({ health }: { health: ProjectHealth }) {
  const s = HEALTH_STYLES[health] || HEALTH_STYLES.on_track;
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
