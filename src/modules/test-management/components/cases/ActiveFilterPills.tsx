/**
 * Active Filter Pills Component
 * Shows removable pills for active filters
 */

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CaseStatus } from '../../api/types';

interface FilterPill {
  key: string;
  label: string;
  value: string;
}

interface ActiveFilterPillsProps {
  statusFilters: CaseStatus[];
  priorityFilters: { id: string; name: string }[];
  typeFilters: { id: string; name: string }[];
  assignedTo: { id: string; name: string } | null;
  dateRange?: { from: string; to: string } | null;
  tags: string[];
  hasLinkedItemsOnly: boolean;
  aiGeneratedOnly: boolean;
  onRemoveStatus: (status: CaseStatus) => void;
  onRemovePriority: (priorityId: string) => void;
  onRemoveType: (typeId: string) => void;
  onRemoveAssigned: () => void;
  onRemoveDateRange: () => void;
  onRemoveTag: (tag: string) => void;
  onRemoveLinkedItemsOnly: () => void;
  onRemoveAiGeneratedOnly: () => void;
  onClearAll: () => void;
}

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  approved: 'Approved',
  needs_update: 'Needs Update',
  deprecated: 'Deprecated',
};

export function ActiveFilterPills({
  statusFilters,
  priorityFilters,
  typeFilters,
  assignedTo,
  dateRange,
  tags,
  hasLinkedItemsOnly,
  aiGeneratedOnly,
  onRemoveStatus,
  onRemovePriority,
  onRemoveType,
  onRemoveAssigned,
  onRemoveDateRange,
  onRemoveTag,
  onRemoveLinkedItemsOnly,
  onRemoveAiGeneratedOnly,
  onClearAll,
}: ActiveFilterPillsProps) {
  const pills: FilterPill[] = [];

  // Add status pills
  statusFilters.forEach((status) => {
    pills.push({
      key: `status-${status}`,
      label: 'Status',
      value: STATUS_LABELS[status] || status,
    });
  });

  // Add priority pills
  priorityFilters.forEach((priority) => {
    pills.push({
      key: `priority-${priority.id}`,
      label: 'Priority',
      value: priority.name,
    });
  });

  // Add type pills
  typeFilters.forEach((type) => {
    pills.push({
      key: `type-${type.id}`,
      label: 'Type',
      value: type.name,
    });
  });

  // Add assigned pill
  if (assignedTo) {
    pills.push({
      key: 'assigned',
      label: 'Assigned',
      value: assignedTo.name,
    });
  }

  // Add date range pill
  if (dateRange?.from || dateRange?.to) {
    const from = dateRange.from ? new Date(dateRange.from).toLocaleDateString() : '';
    const to = dateRange.to ? new Date(dateRange.to).toLocaleDateString() : '';
    pills.push({
      key: 'date-range',
      label: 'Date',
      value: from && to ? `${from} - ${to}` : from || to,
    });
  }

  // Add tag pills
  tags.forEach((tag) => {
    pills.push({
      key: `tag-${tag}`,
      label: 'Tag',
      value: tag,
    });
  });

  // Add linked items pill
  if (hasLinkedItemsOnly) {
    pills.push({
      key: 'linked-items',
      label: 'Filter',
      value: 'Has linked items',
    });
  }

  // Add AI generated pill
  if (aiGeneratedOnly) {
    pills.push({
      key: 'ai-generated',
      label: 'Filter',
      value: 'AI-generated',
    });
  }

  if (pills.length === 0) {
    return null;
  }

  const handleRemove = (key: string) => {
    if (key.startsWith('status-')) {
      onRemoveStatus(key.replace('status-', '') as CaseStatus);
    } else if (key.startsWith('priority-')) {
      onRemovePriority(key.replace('priority-', ''));
    } else if (key.startsWith('type-')) {
      onRemoveType(key.replace('type-', ''));
    } else if (key === 'assigned') {
      onRemoveAssigned();
    } else if (key === 'date-range') {
      onRemoveDateRange();
    } else if (key.startsWith('tag-')) {
      onRemoveTag(key.replace('tag-', ''));
    } else if (key === 'linked-items') {
      onRemoveLinkedItemsOnly();
    } else if (key === 'ai-generated') {
      onRemoveAiGeneratedOnly();
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-border bg-muted/30">
      {pills.map((pill) => (
        <Badge
          key={pill.key}
          variant="secondary"
          className="gap-1 pr-1 bg-primary/10 text-primary hover:bg-primary/20"
        >
          <span className="text-muted-foreground mr-1">{pill.label}:</span>
          <span>{pill.value}</span>
          <button
            onClick={() => handleRemove(pill.key)}
            className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      {pills.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
