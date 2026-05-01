/**
 * RelatedIssuesSection — Linked issues from wh_work_item_links
 * ════════════════════════════════════════════════════════════════════════════
 * Handles raw link rows from useWhLinks (source_item_id, target_item_id,
 * link_type_id, link_type_name, target_key, target_summary, etc.)
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Link2, Trash2, ExternalLink } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';

interface RelatedIssuesSectionProps {
  isDark: boolean;
  links: any[]; // Raw wh_work_item_links rows
  onUnlink?: (linkId: string) => void;
  onOpenIssue?: (key: string, mode: 'select' | 'newTab') => void;
  onLinkIssue?: () => void;
}

interface GroupedLink {
  linkTypeName: string;
  items: any[];
}

function LinkedIssueRow({
  link, isDark, onUnlink, onOpen,
}: {
  link: any; isDark: boolean; onUnlink?: () => void; onOpen?: () => void;
}) {
  const key = link.target_key ?? link.source_key ?? link.linked_issue_key ?? '';
  const summary = link.target_summary ?? link.source_summary ?? link.linked_summary ?? 'Linked issue';
  const status = link.target_status ?? link.source_status ?? '';
  const issueType = link.target_issue_type ?? link.source_issue_type ?? '';
  const direction = link.direction ?? (link.target_key ? 'outward' : 'inward');

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
        direction === 'outward'
          ? isDark ? 'bg-[#1A2332] text-[#4C9AFF]' : 'bg-[#DEEBFF] text-[#0747A6]'
          : isDark ? 'bg-[#292929] text-[#A1A1A1]' : 'bg-[#F4F5F7] text-[var(--ds-text-accent-gray, #505258)]',
      )}>
        {direction === 'outward' ? '→' : '←'}
      </span>

      {issueType && <JiraIssueTypeIcon type={issueType} size={14} />}

      <span className={cn('font-mono text-xs shrink-0', isDark ? 'text-[#A1A1A1]' : 'text-[var(--ds-text-accent-gray, #505258)]')}>
        {key}
      </span>

      <span className={cn(
        'font-body text-sm truncate flex-1 min-w-0',
        isDark ? 'text-[#EDEDED]' : 'text-[var(--ds-text, #292A2E)]',
      )}>
        {summary}
      </span>

      {status && <StatusLozenge status={status} />}

      {/* Hover actions */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
        {onUnlink && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnlink(); }}
            className={cn('p-1 rounded transition-colors', isDark ? 'hover:bg-[#292929] text-[#878787]' : 'hover:bg-[#E2E8F0] text-[var(--ds-text-accent-gray, #505258)]')}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function RelatedIssuesSection({
  isDark, links, onUnlink, onOpenIssue, onLinkIssue,
}: RelatedIssuesSectionProps) {
  // Group raw link rows by link_type_name
  const grouped: GroupedLink[] = useMemo(() => {
    if (!links?.length) return [];
    const map = new Map<string, any[]>();
    for (const link of links) {
      const typeName = link.link_type_name ?? link.linkTypeName ?? 'Related';
      if (!map.has(typeName)) map.set(typeName, []);
      map.get(typeName)!.push(link);
    }
    return Array.from(map.entries())
      .map(([linkTypeName, items]) => ({ linkTypeName, items }))
      .sort((a, b) => a.linkTypeName.localeCompare(b.linkTypeName));
  }, [links]);

  if (grouped.length === 0) {
    return (
      <div className="text-center py-4">
        <p className={cn('font-body text-sm mb-3', isDark ? 'text-[#878787]' : 'text-[var(--ds-text-subtlest, #6B6E76)]')}>
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
      {grouped.map((group) => (
        <div key={group.linkTypeName}>
          <span className={cn(
            'text-[10px] font-body font-semibold uppercase tracking-wider mb-1 block',
            isDark ? 'text-[#878787]' : 'text-[var(--ds-text-subtlest, #6B6E76)]',
          )}>
            {group.linkTypeName} ({group.items.length})
          </span>
          {group.items.map((link, i) => (
            <LinkedIssueRow
              key={link.id ?? `${group.linkTypeName}-${i}`}
              link={link}
              isDark={isDark}
              onUnlink={onUnlink ? () => onUnlink(link.id) : undefined}
              onOpen={() => {
                const key = link.target_key ?? link.source_key ?? link.linked_issue_key;
                if (key) onOpenIssue?.(key, 'select');
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
