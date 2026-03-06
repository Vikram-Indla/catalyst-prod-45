import type { WorkItemStatus } from '@/types/r360';

const STATUS_MAP = {
  TO_DO: { bg: '#DFE1E6', color: '#253858', label: 'TO DO' },
  IN_PROGRESS: { bg: '#DEEBFF', color: '#0747A6', label: 'IN PROGRESS' },
  IN_REVIEW: { bg: '#DEEBFF', color: '#0747A6', label: 'IN REVIEW' },
  DONE: { bg: '#E3FCEF', color: '#006644', label: 'DONE' },
} as const;

export function StatusLozenge({ status }: { status: WorkItemStatus }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.TO_DO;
  return (
    <span
      className="r3p-lozenge"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
