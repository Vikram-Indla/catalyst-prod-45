/**
 * BulkActionsBar — Jira-style floating bottom bar for project backlog bulk actions
 * Wraps the shared JiraBulkActionBar with project-hub specific wiring
 */
import { JiraBulkActionBar } from '@/components/shared/JiraBulkActionBar';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds?: string[];
  items?: Array<{ id: string; issue_key?: string; title?: string; summary?: string; status?: string; priority?: string; assignee_name?: string }>;
  onClear: () => void;
  onSetStatus: (statusId: string) => void;
  onSetPriority: (priority: string) => void;
  onFlag: () => void;
  onDelete: () => void;
  statuses: { id: string; name: string; category: string }[];
}

export function BulkActionsBar({
  selectedCount,
  selectedIds = [],
  items = [],
  onClear,
  onDelete,
}: BulkActionsBarProps) {
  const ids = selectedIds.length > 0 ? selectedIds : Array.from({ length: selectedCount }, (_, i) => String(i));

  return (
    <JiraBulkActionBar
      selectedIds={ids}
      items={items}
      onClear={onClear}
      onDelete={() => { onDelete(); }}
      entityLabel="work item"
    />
  );
}
