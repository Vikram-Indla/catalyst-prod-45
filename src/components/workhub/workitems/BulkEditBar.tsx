/**
 * BulkEditBar — Appears when items are selected, blue bar with actions
 * Phase 9: Now logs to bulk ops audit trail
 */

import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useWHReleases } from '@/hooks/workhub/useReleases';
import { useWHThemes } from '@/hooks/workhub/useThemes';
import { useBulkUpdateWorkItems } from '@/hooks/workhub/useWorkItems';
import { useLogBulkOp } from '@/hooks/workhub/useBulkOpsLog';
import type { WorkItemStatus } from '@/types/workhub.types';

interface BulkEditBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClear: () => void;
}

const STATUSES: WorkItemStatus[] = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked', 'Cancelled'];

const FIELD_TO_OP: Record<string, string> = {
  status: 'change_status',
  release_id: 'assign_release',
  theme_id: 'assign_theme',
};

function BulkDropdown({ label, options, onSelect }: {
  label: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-md border border-white/20 hover:bg-white/15 transition-colors"
      >
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[180px] max-h-[200px] overflow-y-auto bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] rounded-lg border shadow-lg"
          style={{ zIndex: 'var(--wh-z-dropdown)', borderColor: 'var(--divider)' }}
        >
          {options.map(o => (
            <button
              key={o.id}
              onClick={() => { onSelect(o.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-[var(--ds-surface,#0A0A0A)] transition-colors"
              style={{ color: 'var(--fg-1)' }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BulkEditBar({ selectedCount, selectedIds, onClear }: BulkEditBarProps) {
  const { data: releases } = useWHReleases();
  const { data: themes } = useWHThemes();
  const bulkUpdate = useBulkUpdateWorkItems();
  const logBulkOp = useLogBulkOp();

  const handleBulk = (field: string, value: string) => {
    const operation = FIELD_TO_OP[field] || `change_${field}`;
    bulkUpdate.mutate({ issueKeys: selectedIds, field, value }, {
      onSuccess: () => {
        // Log the bulk operation
        logBulkOp.mutate({
          operation,
          affected_item_ids: selectedIds,
          field_changed: field,
          new_values: { [field]: value },
          item_count: selectedIds.length,
        });
        onClear();
      },
    });
  };

  return (
    <div
      className="flex items-center gap-3 px-4 rounded-t-lg animate-in slide-in-from-top-2 duration-200"
      style={{ height: '48px', backgroundColor: 'var(--cp-blue)' }}
      data-print-hide="true"
    >
      <span className="text-xs font-medium text-white">
        {selectedCount} selected
      </span>

      <div className="w-px h-5 bg-white/20" />

      <BulkDropdown
        label="Status"
        options={STATUSES.map(s => ({ id: s, label: s }))}
        onSelect={val => handleBulk('status', val)}
      />

      <BulkDropdown
        label="Release"
        options={(releases ?? []).map(r => ({ id: r.id, label: `${r.name} — ${r.title}` }))}
        onSelect={val => handleBulk('release_id', val)}
      />

      <BulkDropdown
        label="Theme"
        options={(themes ?? []).map(t => ({ id: t.id, label: t.name }))}
        onSelect={val => handleBulk('theme_id', val)}
      />

      <div className="flex-1" />

      <button
        onClick={onClear}
        className="flex items-center gap-1 px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/15 rounded transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        Clear
      </button>
    </div>
  );
}
