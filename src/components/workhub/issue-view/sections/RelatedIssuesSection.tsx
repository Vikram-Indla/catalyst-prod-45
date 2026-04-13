/**
 * RelatedIssuesSection — Linked issues grouped by link type
 * ════════════════════════════════════════════════════════════════════════════
 */
import { cn } from '@/lib/utils';
import { Link2, LinkIcon, Trash2, ExternalLink } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { LinkGroup, LinkedIssue, IssueSummary } from '@/types/issue-view.types';

interface RelatedIssuesSectionProps {
  isDark: boolean;
  links: LinkGroup[];
  onUnlink?: (linkTypeId: string, issueKey: string) => void;
  onOpenIssue?: (key: string, mode: 'select' | 'newTab') => void;
  onLinkIssue?: () => void;
}

function LinkedIssueRow({
  link,
  isDark,
  onUnlink,
  onOpen,
}: {
  link: LinkedIssue;
  isDark: boolean;
  onUnlink?: () => void;
  onOpen?: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-2 rounded-md transition-colors cursor-pointer',
        isDark ? 'hover:bg-[#1F1F1F]' : 'hover:bg-[#F4F5F7]',
      )}
      onClick={onOpen}
    >
      {/* Direction badge */}
      <span className={cn(
        'text-[10px] font-body font-medium px-1.5 py-0.5 rounded shrink-0',
        link.direction === 'outward'
          ? isDark ? 'bg-[#1A2332] text-[#4C9AFF]' : 'bg-[#DEEBFF] text-[#0747A6]'
          : isDark ? 'bg-[#292929] text-[#A1A1A1]' : 'bg-[#F4F5F7] text-[#505258]',
      )}>
        {link.linkTypeName}
      </span>

      {/* Issue info */}
      <JiraIssueTypeIcon issueType={link.issue.issueType.name} size={14} />
      <span className={cn('font-mono text-xs shrink-0', isDark ? 'text-[#A1A1A1]' : 'text-[#505258]')}>
        {link.issue.key}
      </span>
      <span className={cn(
        'font-body text-sm truncate flex-1 min-w-0',
        isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]',
      )}>
        {link.issue.summary}
      </span>

      {/* Status */}
      <StatusLozenge status={link.issue.status.name} />

      {/* Actions (visible on hover) */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
        {onUnlink && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnlink(); }}
            className={cn(
              'p-1 rounded transition-colors',
              isDark ? 'hover:bg-[#292929] text-[#878787]' : 'hover:bg-[#E2E8F0] text-[#505258]',
            )}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
          className={cn(
            'p-1 rounded transition-colors',
            isDark ? 'hover:bg-[#292929] text-[#878787]' : 'hover:bg-[#E2E8F0] text-[#505258]',
          )}
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function RelatedIssuesSection({
  isDark,
  links,
  onUnlink,
  onOpenIssue,
  onLinkIssue,
}: RelatedIssuesSectionProps) {
  if (links.length === 0) {
    return (
      <div className="text-center py-4">
        <p className={cn('font-body text-sm mb-3', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
          No related issues
        </p>
        <button
          onClick={onLinkIssue}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-body font-medium transition-colors',
            'text-[#0C66E4] hover:bg-[#E9F2FF]',
          )}
        >
          <Link2 className="w-3 h-3" />
          Link issue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {links.map((group) => (
        <div key={group.linkTypeId}>
          {/* Group header */}
          <div className="flex items-center justify-between mb-1">
            <span className={cn(
              'text-[10px] font-body font-semibold uppercase tracking-wider',
              isDark ? 'text-[#878787]' : 'text-[#6B6E76]',
            )}>
              {group.linkTypeName} ({group.items.length})
            </span>
          </div>

          {/* Linked issue rows */}
          {group.items.map((link) => (
            <LinkedIssueRow
              key={`${link.linkTypeId}-${link.issue.key}`}
              link={link}
              isDark={isDark}
              onUnlink={onUnlink ? () => onUnlink(link.linkTypeId, link.issue.key) : undefined}
              onOpen={() => onOpenIssue?.(link.issue.key, 'select')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
