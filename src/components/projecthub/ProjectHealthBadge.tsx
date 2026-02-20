import type { ProjectHealth } from '@/types/projecthub';
import { PROJECT_HEALTH_DISPLAY } from '@/types/projecthub';

const HEALTH_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  on_track: { bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A' },
  at_risk: { bg: '#FFFBEB', text: '#D97706', dot: '#D97706' },
  off_track: { bg: '#FEF2F2', text: '#DC2626', dot: '#DC2626' },
};

export function ProjectHealthBadge({ health }: { health: ProjectHealth }) {
  const s = HEALTH_STYLES[health] || HEALTH_STYLES.on_track;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{ fontSize: 12, color: s.text, whiteSpace: 'nowrap' }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {PROJECT_HEALTH_DISPLAY[health] || health}
    </span>
  );
}
