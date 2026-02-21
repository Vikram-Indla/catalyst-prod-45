import type { ProjectStatus } from '@/types/projecthub';
import { PROJECT_STATUS_DISPLAY } from '@/types/projecthub';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  active: { bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A', border: '#86EFAC' },
  on_hold: { bg: '#FFFBEB', text: '#D97706', dot: '#D97706', border: '#FCD34D' },
  planning: { bg: '#ECFEFF', text: '#0891B2', dot: '#0891B2', border: '#67E8F9' },
  completed: { bg: '#F0FDFA', text: '#0D9488', dot: '#0D9488', border: '#5EEAD4' },
  cancelled: { bg: '#FEF2F2', text: '#DC2626', dot: '#DC2626', border: '#FCA5A5' },
  archived: { bg: '#F1F5F9', text: '#64748B', dot: '#64748B', border: '#CBD5E1' },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.active;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px 3px 8px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontSize: 11,
        fontWeight: 600,
        color: s.text,
        whiteSpace: 'nowrap',
        borderRadius: 99,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {PROJECT_STATUS_DISPLAY[status] || status}
    </span>
  );
}
