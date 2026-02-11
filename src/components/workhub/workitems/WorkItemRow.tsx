/**
 * WorkItemRow — Single table row with hierarchy indentation
 */

import { ChevronRight, ChevronDown, Clock, Plus } from 'lucide-react';
import { TypeBadge, StatusBadge, AvatarChip } from '@/components/workhub/shared';
import type { WorkItemFull, WorkItemType } from '@/types/workhub.types';
import { formatDistanceToNow } from 'date-fns';

interface WorkItemRowProps {
  item: WorkItemFull;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onOpenDrawer: () => void;
  onOpenThemeEditor: (itemId: string, anchorEl: HTMLElement) => void;
}

const INDENT = { 0: 12, 1: 36, 2: 60 } as Record<number, number>;

const SUMMARY_WEIGHT: Record<WorkItemType, number> = {
  Epic: 700,
  Story: 500,
  Subtask: 400,
  Bug: 400,
  Task: 400,
  Incident: 400,
};

export function WorkItemRow({
  item,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onOpenDrawer,
  onOpenThemeEditor,
}: WorkItemRowProps) {
  const indent = INDENT[item.depth] ?? 60;
  const hasChildren = item.children_count > 0;
  const synced = item.last_synced_at
    ? formatDistanceToNow(new Date(item.last_synced_at), { addSuffix: true })
    : '—';

  return (
    <div
      className="group grid items-center border-b hover:bg-[#f8fafc] cursor-pointer transition-colors"
      style={{
        gridTemplateColumns: '36px 28px 110px 70px 1fr 100px 140px 130px 100px 80px 100px',
        height: 'var(--wh-row-height)',
        borderColor: '#f1f5f9',
        fontFamily: 'var(--wh-font-sans)',
      }}
    >
      {/* 1. Checkbox */}
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded accent-[var(--wh-primary)] cursor-pointer"
          style={{ accentColor: 'var(--wh-primary)' }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* 2. Expand */}
      <div className="flex justify-center" style={{ paddingLeft: `${indent}px` }}>
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); onToggleExpand(); }}
            className="p-0.5 rounded hover:bg-slate-200 transition-all"
            style={{ transition: 'var(--wh-transition-fast)' }}
          >
            {isExpanded
              ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--wh-text-secondary)' }} />
              : <ChevronRight className="w-4 h-4" style={{ color: 'var(--wh-text-tertiary)' }} />
            }
          </button>
        ) : (
          <span className="w-4" />
        )}
      </div>

      {/* 3. Key */}
      <button
        onClick={onOpenDrawer}
        className="text-left text-[13px] font-medium truncate hover:text-[var(--wh-primary)] transition-colors"
        style={{
          fontFamily: 'var(--wh-font-mono)',
          color: 'var(--wh-text-primary)',
        }}
      >
        {item.item_key}
      </button>

      {/* 4. Type */}
      <div>
        <TypeBadge type={item.item_type} size="sm" />
      </div>

      {/* 5. Summary */}
      <button
        onClick={onOpenDrawer}
        className="text-left text-[13px] truncate hover:text-[var(--wh-primary)] transition-colors"
        style={{
          fontWeight: SUMMARY_WEIGHT[item.item_type] || 400,
          color: 'var(--wh-text-primary)',
          maxWidth: '280px',
        }}
      >
        {item.summary}
      </button>

      {/* 6. Status */}
      <div>
        <StatusBadge status={item.status} size="sm" />
      </div>

      {/* 7. Assignee */}
      <div className="flex items-center gap-1.5 min-w-0">
        {item.assignee_name ? (
          <>
            <AvatarChip name={item.assignee_name} color={item.assignee_color || undefined} size={24} />
            <span className="text-[12px] truncate" style={{ color: 'var(--wh-text-secondary)' }}>
              {item.assignee_name.split(' ')[0]} {item.assignee_name.split(' ').slice(-1)[0]?.[0]}.
            </span>
          </>
        ) : (
          <span className="text-[12px] italic" style={{ color: 'var(--wh-text-tertiary)' }}>Unassigned</span>
        )}
      </div>

      {/* 8. Theme */}
      <div>
        {item.theme_name ? (
          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--wh-text-secondary)' }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.theme_color || 'var(--wh-text-tertiary)' }} />
            <span className="truncate">{item.theme_name}</span>
          </span>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onOpenThemeEditor(item.id, e.currentTarget as HTMLElement); }}
            className="text-[11px] font-medium px-2 py-0.5 rounded border border-dashed transition-colors hover:border-[var(--wh-primary)] hover:text-[var(--wh-primary)]"
            style={{ borderColor: 'var(--wh-border)', color: 'var(--wh-text-tertiary)' }}
          >
            <Plus className="w-3 h-3 inline mr-0.5" />
            Add
          </button>
        )}
      </div>

      {/* 9. Release */}
      <div className="text-[12px] font-medium truncate" style={{ color: 'var(--wh-text-secondary)' }}>
        {item.release_name || '—'}
      </div>

      {/* 10. Project */}
      <div>
        {item.project_key && (
          <span
            className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-medium border"
            style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: 'var(--wh-text-secondary)' }}
          >
            {item.project_key}
          </span>
        )}
      </div>

      {/* 11. Synced */}
      <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--wh-text-tertiary)' }}>
        <Clock className="w-3 h-3" />
        <span className="truncate">{synced}</span>
      </div>
    </div>
  );
}
