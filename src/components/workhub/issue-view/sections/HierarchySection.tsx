/**
 * HierarchySection — Parent + children/subtasks within the AllWork tab
 * ════════════════════════════════════════════════════════════════════════════
 */
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Plus, ExternalLink } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { AllWorkItem } from '@/types/allwork.types';

interface HierarchySectionProps {
  issueKey: string;
  isDark: boolean;
  parentKey: string | null;
  parentSummary: string | null;
  childCount: number;
  parentItem?: AllWorkItem | null;
  children?: AllWorkItem[];
  onOpenIssue?: (key: string, mode: 'select' | 'newTab') => void;
  onChangeParent?: () => void;
  onAddSubtask?: () => void;
}

function IssueRow({
  item,
  isDark,
  badge,
  onOpen,
}: {
  item: { key: string; summary: string; issueType?: string; status?: string; assigneeName?: string; updated?: string };
  isDark: boolean;
  badge?: string;
  onOpen?: (key: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-2 py-2 rounded-md transition-colors cursor-pointer',
        isDark ? 'hover:bg-[var(--ds-surface-overlay, #1F1F1F)]' : 'hover:bg-[var(--ds-surface-sunken, #F4F5F7)]',
      )}
      onClick={() => onOpen?.(item.key)}
    >
      {item.issueType && <JiraIssueTypeIcon type={item.issueType} size={16} />}
      <span className={cn('font-mono text-xs font-medium shrink-0', isDark ? 'text-[var(--ds-text-subtlest, #A1A1A1)]' : 'text-[var(--ds-text-accent-gray, #505258)]')}>
        {item.key}
      </span>
      <span className={cn(
        'font-body text-sm truncate flex-1 min-w-0',
        isDark ? 'text-[var(--ds-text, #EDEDED)]' : 'text-[var(--ds-text, #292A2E)]',
      )}>
        {item.summary}
      </span>
      {item.status && <StatusLozenge status={item.status} />}
      {badge && (
        <span className={cn(
          'text-[10px] font-body font-medium px-1.5 py-0.5 rounded shrink-0',
          isDark ? 'bg-[var(--ds-border, #292929)] text-[var(--ds-text-subtlest, #878787)]' : 'bg-[var(--ds-surface-sunken, #F4F5F7)] text-[var(--ds-text-subtlest, #6B6E76)]',
        )}>
          {badge}
        </span>
      )}
    </div>
  );
}

export function HierarchySection({
  issueKey,
  isDark,
  parentKey,
  parentSummary,
  childCount,
  parentItem,
  children: childItems = [],
  onOpenIssue,
  onChangeParent,
  onAddSubtask,
}: HierarchySectionProps) {
  const hasParent = !!parentKey;
  const hasChildren = childCount > 0 || childItems.length > 0;

  if (!hasParent && !hasChildren) {
    return (
      <div className="text-center py-4">
        <p className={cn('font-body text-sm mb-3', isDark ? 'text-[var(--ds-text-subtlest, #878787)]' : 'text-[var(--ds-text-subtlest, #6B6E76)]')}>
          No hierarchy items linked
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onChangeParent}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-body font-medium transition-colors',
              'text-[#0C66E4] hover:bg-[#E9F2FF]',
            )}
          >
            <ArrowUp className="w-3 h-3" />
            Link parent
          </button>
          <button
            onClick={onAddSubtask}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-body font-medium transition-colors',
              'text-[#0C66E4] hover:bg-[#E9F2FF]',
            )}
          >
            <Plus className="w-3 h-3" />
            Add subtask
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Parent */}
      {hasParent && (
        <div>
          <span className={cn(
            'text-[10px] font-body font-semibold uppercase tracking-wider mb-1 block',
            isDark ? 'text-[var(--ds-text-subtlest, #878787)]' : 'text-[var(--ds-text-subtlest, #6B6E76)]',
          )}>
            Parent
          </span>
          <IssueRow
            item={{
              key: parentKey!,
              summary: parentSummary ?? 'Parent issue',
              issueType: parentItem?.issue_type,
              status: parentItem?.status,
            }}
            isDark={isDark}
            badge="parent"
            onOpen={(key) => onOpenIssue?.(key, 'select')}
          />
        </div>
      )}

      {/* Children / Subtasks */}
      {hasChildren && (
        <div className={hasParent ? 'mt-2' : ''}>
          <span className={cn(
            'text-[10px] font-body font-semibold uppercase tracking-wider mb-1 block',
            isDark ? 'text-[var(--ds-text-subtlest, #878787)]' : 'text-[var(--ds-text-subtlest, #6B6E76)]',
          )}>
            Children ({childItems.length || childCount})
          </span>
          {childItems.length > 0 ? (
            childItems.map((child) => (
              <IssueRow
                key={child.issue_key}
                item={{
                  key: child.issue_key,
                  summary: child.summary,
                  issueType: child.issue_type,
                  status: child.status,
                  assigneeName: child.assignee_display_name ?? undefined,
                }}
                isDark={isDark}
                onOpen={(key) => onOpenIssue?.(key, 'select')}
              />
            ))
          ) : (
            <p className={cn('font-body text-xs py-2', isDark ? 'text-[var(--ds-text-subtlest, #878787)]' : 'text-[var(--ds-text-subtlest, #6B6E76)]')}>
              {childCount} subtask{childCount > 1 ? 's' : ''} (load to view)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
