/**
 * WorkItemRow — Single table row for a Jira issue from wh_issues
 * GUARDRAIL: Uses StatusLozenge from @/components/ui/StatusLozenge for all status rendering.
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';
import { format } from 'date-fns';

interface WorkItemRowProps {
  item: JiraIssue;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  avatarUrl?: string | null;
  themeName?: string | null;
  themeColor?: string | null;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onOpenDrawer: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: 'var(--ds-text-danger, #dc2626)',
  High: 'var(--ds-background-warning-bold, #E2B203)',
  Medium: 'var(--ds-text-warning, #d97706)',
  Low: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
  Lowest: 'var(--ds-text-subtlest, #64748b)',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
}

export function WorkItemRow({
  item, depth, hasChildren, isExpanded, isSelected,
  avatarUrl, themeName, themeColor,
  onToggleExpand, onToggleSelect, onOpenDrawer,
}: WorkItemRowProps) {
  const priorityColor = PRIORITY_COLORS[item.priority] || 'var(--ds-text-subtlest, #64748b)';
  const indentPx = depth * 24;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="group grid items-center border-b hover:bg-[var(--ds-surface-sunken,#f8fafc)] cursor-pointer transition-colors"
      style={{
        gridTemplateColumns: '36px 36px minmax(140px, auto) 1fr 120px 140px 120px 130px 90px 90px 90px',
        height: 'var(--wh-row-height, 44px)',
        borderColor: 'var(--bg-1)',
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
          style={{ accentColor: 'var(--cp-blue)' }}
        />
      </div>

      {/* 2. Type Icon with tooltip */}
      <div className="flex justify-center relative group/type">
        <JiraIssueTypeIcon type={item.issue_type} size={16} />
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover/type:opacity-100 pointer-events-none transition-opacity z-50"
          style={{ backgroundColor: 'var(--ds-text, #172B4D)', color: 'var(--bg-app)' }}
        >
          {item.issue_type}
        </div>
      </div>

      {/* 3. Issue Key + Expand */}
      <div className="flex items-center gap-1.5 min-w-0" style={{ paddingLeft: `${indentPx}px` }}>
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); onToggleExpand(); }}
            className="w-4 h-4 flex items-center justify-center shrink-0 rounded hover:bg-slate-200 transition-colors"
          >
            {isExpanded
              ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--fg-3)' }} />
              : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--fg-4)' }} />
            }
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="text-[12px] font-semibold truncate" style={{ fontFamily: 'var(--wh-font-mono, monospace)', color: 'var(--cp-blue)' }}>
          {item.issue_key}
        </span>
      </div>

      {/* 4. Summary */}
      <span className="text-[13px] truncate pr-2" style={{ fontWeight: depth === 0 ? 700 : depth === 1 ? 500 : 400, color: 'var(--fg-1)' }}>
        {item.summary}
      </span>

      {/* 5. Status — StatusLozenge guardrail */}
      <div>
        <StatusLozenge status={item.status} />
      </div>

      {/* 5b. Sprint/Iteration */}
      <div className="flex items-center min-w-0">
        {Array.isArray(item.sprint_release) && item.sprint_release.length > 0 ? (
          <span
            className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-full"
            style={{ backgroundColor: 'var(--ds-background-success, #DFFCF0)', color: 'var(--ds-background-success-bold, #1F845A)', border: '1px solid var(--ds-background-success, #DFFCF0)' }}
            title={item.sprint_release.map((v: any) => v.name).join(', ')}
          >
            {item.sprint_release[0]?.name}
            {item.sprint_release.length > 1 && ` +${item.sprint_release.length - 1}`}
          </span>
        ) : (
          <span className="text-[10.5px] italic" style={{ color: 'var(--fg-4)' }}>—</span>
        )}
      </div>

      {/* 6. Theme */}
      <div className="flex items-center gap-1.5 min-w-0">
        {themeName ? (
          <>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: themeColor || 'var(--fg-4)' }} />
            <span className="text-[11px] truncate" style={{ color: 'var(--fg-3)' }}>{themeName}</span>
          </>
        ) : (
          <span className="text-[10.5px] italic" style={{ color: 'var(--fg-4)' }}>—</span>
        )}
      </div>

      {/* 7. Assignee */}
      <div className="flex items-center gap-1 min-w-0">
        {item.assignee_display_name ? (
          <>
            {avatarUrl && !imgError ? (
              <img src={avatarUrl} alt={item.assignee_display_name} className="w-5 h-5 rounded-full shrink-0 object-cover" onError={() => setImgError(true)} />
            ) : (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: 'var(--ds-background-discovery-bold, #6366f1)' }}>
                {item.assignee_display_name[0]?.toUpperCase()}
              </span>
            )}
            <span className="text-[11px] truncate" style={{ color: 'var(--fg-3)' }}>
              {item.assignee_display_name.split(' ').slice(0, 2).join(' ')}
            </span>
          </>
        ) : (
          <span className="text-[11px] italic" style={{ color: 'var(--fg-4)' }}>—</span>
        )}
      </div>

      {/* 8. Priority */}
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>{item.priority}</span>
      </div>

      {/* 9. Updated */}
      <span className="text-[10.5px] truncate" style={{ color: 'var(--fg-4)' }}>{formatDate(item.jira_updated_at)}</span>

      {/* 10. Created */}
      <span className="text-[10.5px] truncate" style={{ color: 'var(--fg-4)' }}>{formatDate(item.jira_created_at)}</span>
    </div>
  );
}
