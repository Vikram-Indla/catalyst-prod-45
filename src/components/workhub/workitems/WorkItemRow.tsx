/**
 * WorkItemRow — Single table row for a Jira issue from wh_issues
 */

import { Clock, ExternalLink } from 'lucide-react';
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';
import { formatDistanceToNow } from 'date-fns';

interface WorkItemRowProps {
  item: JiraIssue;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenDrawer: () => void;
}

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  Epic: { bg: '#dbeafe', fg: '#1d4ed8' },
  Story: { bg: '#dcfce7', fg: '#15803d' },
  Bug: { bg: '#fef2f2', fg: '#dc2626' },
  'QA Bug': { bg: '#fef2f2', fg: '#dc2626' },
  Task: { bg: '#fefce8', fg: '#a16207' },
  'Sub-task': { bg: '#f3f4f6', fg: '#4b5563' },
  Defect: { bg: '#fce7f3', fg: '#be185d' },
  'Production Incident': { bg: '#fef2f2', fg: '#b91c1c' },
  'Change Request': { bg: '#ede9fe', fg: '#6d28d9' },
  Backend: { bg: '#e0f2fe', fg: '#0369a1' },
  Frontend: { bg: '#fef3c7', fg: '#92400e' },
  Figma: { bg: '#fce7f3', fg: '#a21caf' },
  'Business Request': { bg: '#f0fdf4', fg: '#166534' },
  'BRD Task': { bg: '#ecfdf5', fg: '#047857' },
  'Business Gap': { bg: '#fff7ed', fg: '#c2410c' },
  Integration: { bg: '#e0e7ff', fg: '#4338ca' },
  'API Requirement': { bg: '#dbeafe', fg: '#2563eb' },
};

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
};

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#2563eb',
  Lowest: '#64748b',
};

export function WorkItemRow({ item, isSelected, onToggleSelect, onOpenDrawer }: WorkItemRowProps) {
  const typeStyle = TYPE_COLORS[item.issue_type] || { bg: '#f1f5f9', fg: '#475569' };
  const statusStyle = STATUS_COLORS[item.status] || { bg: '#f1f5f9', fg: '#475569' };
  const priorityColor = PRIORITY_COLORS[item.priority] || '#64748b';
  const synced = item.synced_at
    ? formatDistanceToNow(new Date(item.synced_at), { addSuffix: true })
    : '—';

  return (
    <div
      className="group grid items-center border-b hover:bg-[#f8fafc] cursor-pointer transition-colors"
      style={{
        gridTemplateColumns: '36px 100px 90px 1fr 120px 100px 120px 80px 90px',
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

      {/* 2. Issue Key */}
      <span
        className="text-[12px] font-semibold truncate hover:text-[var(--wh-primary)]"
        style={{ fontFamily: 'var(--wh-font-mono, monospace)', color: 'var(--wh-primary, #2563eb)' }}
      >
        {item.issue_key}
      </span>

      {/* 3. Type */}
      <div>
        <span
          className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: typeStyle.bg, color: typeStyle.fg }}
        >
          {item.issue_type}
        </span>
      </div>

      {/* 4. Summary */}
      <span
        className="text-[13px] truncate pr-2"
        style={{
          fontWeight: item.hierarchy_level === 0 ? 700 : item.hierarchy_level === 1 ? 500 : 400,
          color: 'var(--wh-text-primary, #0f172a)',
        }}
      >
        {item.summary}
      </span>

      {/* 5. Status */}
      <div>
        <span
          className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.fg }}
        >
          {item.status}
        </span>
      </div>

      {/* 6. Project */}
      <span
        className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-semibold"
        style={{ backgroundColor: '#f1f5f9', color: '#334155' }}
      >
        {item.project_key}
      </span>

      {/* 7. Assignee */}
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

      {/* 8. Priority */}
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--wh-text-secondary, #64748b)' }}>
          {item.priority}
        </span>
      </div>

      {/* 9. Synced */}
      <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
        <Clock className="w-3 h-3" />
        <span className="truncate">{synced}</span>
      </div>
    </div>
  );
}
