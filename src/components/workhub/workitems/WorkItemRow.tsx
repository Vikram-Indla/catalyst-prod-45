/**
 * WorkItemRow — Single table row for a Jira issue from wh_issues
 * Supports hierarchy indent and Jira type icons
 */

import { ChevronRight, ChevronDown } from 'lucide-react';
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';
import { format } from 'date-fns';

interface WorkItemRowProps {
  item: JiraIssue;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onOpenDrawer: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  'To Do': { bg: '#f1f5f9', fg: '#475569' },
  'In Progress': { bg: '#dbeafe', fg: '#2563eb' },
  'In BETA': { bg: '#e0f2fe', fg: '#0284c7' },
  'In Review': { bg: '#fef3c7', fg: '#d97706' },
  Done: { bg: '#dcfce7', fg: '#16a34a' },
  Closed: { bg: '#f0fdf4', fg: '#15803d' },
  Blocked: { bg: '#fef2f2', fg: '#dc2626' },
  'Ready for QA': { bg: '#fdf4ff', fg: '#a21caf' },
  'Ready for UAT': { bg: '#fdf4ff', fg: '#7c3aed' },
  Cancelled: { bg: '#f3f4f6', fg: '#6b7280' },
  Backlog: { bg: '#f1f5f9', fg: '#64748b' },
};

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#2563eb',
  Lowest: '#64748b',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
}

export function WorkItemRow({
  item, depth, hasChildren, isExpanded, isSelected,
  onToggleExpand, onToggleSelect, onOpenDrawer,
}: WorkItemRowProps) {
  const statusStyle = STATUS_COLORS[item.status] || { bg: '#f1f5f9', fg: '#475569' };
  const priorityColor = PRIORITY_COLORS[item.priority] || '#64748b';
  const indentPx = depth * 24;

  return (
    <div
      className="group grid items-center border-b hover:bg-[#f8fafc] cursor-pointer transition-colors"
      style={{
        gridTemplateColumns: '36px minmax(140px, auto) 1fr 120px 100px 130px 90px 90px',
        height: 'var(--wh-row-height, 44px)',
        borderColor: '#f1f5f9',
        fontFamily: 'var(--wh-font-sans)',
      }}
      onClick={onOpenDrawer}
    >
      {/* 1. Checkbox */}
      <div className="flex justify-center" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded cursor-pointer"
          style={{ accentColor: 'var(--wh-primary, #2563eb)' }}
        />
      </div>

      {/* 2. Issue Key + Type Icon + Expand */}
      <div
        className="flex items-center gap-1.5 min-w-0"
        style={{ paddingLeft: `${indentPx}px` }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); onToggleExpand(); }}
            className="w-4 h-4 flex items-center justify-center shrink-0 rounded hover:bg-slate-200 transition-colors"
          >
            {isExpanded
              ? <ChevronDown className="w-3.5 h-3.5" style={{ color: '#64748b' }} />
              : <ChevronRight className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            }
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Jira type icon */}
        {item.type_icon_url ? (
          <img
            src={item.type_icon_url}
            alt={item.issue_type}
            className="w-4 h-4 shrink-0"
            title={item.issue_type}
          />
        ) : (
          <span
            className="w-4 h-4 rounded-sm shrink-0 flex items-center justify-center text-[8px] font-bold"
            style={{ backgroundColor: '#e2e8f0', color: '#475569' }}
            title={item.issue_type}
          >
            {item.issue_type[0]}
          </span>
        )}

        {/* Issue key */}
        <span
          className="text-[12px] font-semibold truncate"
          style={{ fontFamily: 'var(--wh-font-mono, monospace)', color: 'var(--wh-primary, #2563eb)' }}
        >
          {item.issue_key}
        </span>
      </div>

      {/* 3. Summary */}
      <span
        className="text-[13px] truncate pr-2"
        style={{
          fontWeight: depth === 0 ? 700 : depth === 1 ? 500 : 400,
          color: 'var(--wh-text-primary, #0f172a)',
        }}
      >
        {item.summary}
      </span>

      {/* 4. Status */}
      <div>
        <span
          className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.fg }}
        >
          {item.status}
        </span>
      </div>

      {/* 5. Assignee */}
      <div className="flex items-center gap-1 min-w-0">
        {item.assignee_display_name ? (
          <>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ backgroundColor: '#6366f1' }}
            >
              {item.assignee_display_name[0]?.toUpperCase()}
            </span>
            <span className="text-[11px] truncate" style={{ color: 'var(--wh-text-secondary, #64748b)' }}>
              {item.assignee_display_name.split(' ').slice(0, 2).join(' ')}
            </span>
          </>
        ) : (
          <span className="text-[11px] italic" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>—</span>
        )}
      </div>

      {/* 6. Priority */}
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--wh-text-secondary, #64748b)' }}>
          {item.priority}
        </span>
      </div>

      {/* 7. Updated */}
      <span className="text-[10.5px] truncate" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
        {formatDate(item.jira_updated_at)}
      </span>

      {/* 8. Created */}
      <span className="text-[10.5px] truncate" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
        {formatDate(item.jira_created_at)}
      </span>
    </div>
  );
}
