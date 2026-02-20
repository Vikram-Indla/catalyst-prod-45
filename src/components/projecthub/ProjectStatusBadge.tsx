import type { ProjectStatus } from '@/types/projecthub';
import { PROJECT_STATUS_DISPLAY } from '@/types/projecthub';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A' },
  on_hold: { bg: '#FFFBEB', text: '#D97706', dot: '#D97706' },
  planning: { bg: '#F0F9FF', text: '#0284C7', dot: '#0284C7' },
  completed: { bg: '#F0FDFA', text: '#0D9488', dot: '#0D9488' },
  cancelled: { bg: '#FEF2F2', text: '#DC2626', dot: '#DC2626' },
  archived: { bg: '#F1F5F9', text: '#64748B', dot: '#64748B' },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.active;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{ padding: '2px 10px 2px 8px', background: s.bg, fontSize: 11, fontWeight: 600, color: s.text, whiteSpace: 'nowrap' }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {PROJECT_STATUS_DISPLAY[status] || status}
    </span>
  );
}
