/**
 * DevelopmentSection — PRs, commits, branches, builds, deployments
 * ════════════════════════════════════════════════════════════════════════════
 */
import { cn } from '@/lib/utils';
import {
  GitPullRequest, GitCommit, GitBranch, Hammer, Rocket, ExternalLink,
} from 'lucide-react';
import type { DevelopmentItem, DevItemType } from '@/types/issue-view.types';
import { formatDistanceToNow } from 'date-fns';

interface DevelopmentSectionProps {
  isDark: boolean;
  items: DevelopmentItem[];
}

const TYPE_ICONS: Record<DevItemType, React.ReactNode> = {
  pullRequest: <GitPullRequest className="w-3.5 h-3.5" />,
  commit: <GitCommit className="w-3.5 h-3.5" />,
  branch: <GitBranch className="w-3.5 h-3.5" />,
  build: <Hammer className="w-3.5 h-3.5" />,
  deployment: <Rocket className="w-3.5 h-3.5" />,
};

const STATE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  open:        { bg: '#DEEBFF', text: '#0747A6', darkBg: '#1A2332', darkText: '#4C9AFF' },
  merged:      { bg: '#E3FCEF', text: '#006644', darkBg: '#1A2E1A', darkText: '#57D9A3' },
  declined:    { bg: '#FFEBE6', text: '#BF2600', darkBg: '#2E1A1A', darkText: '#FF8F73' },
  passed:      { bg: '#E3FCEF', text: '#006644', darkBg: '#1A2E1A', darkText: '#57D9A3' },
  failed:      { bg: '#FFEBE6', text: '#BF2600', darkBg: '#2E1A1A', darkText: '#FF8F73' },
  in_progress: { bg: '#DEEBFF', text: '#0747A6', darkBg: '#1A2332', darkText: '#4C9AFF' },
  unknown:     { bg: '#F4F5F7', text: 'var(--ds-text-accent-gray, #505258)', darkBg: '#292929', darkText: '#A1A1A1' },
};

function formatRelative(date?: string): string {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}

export function DevelopmentSection({ isDark, items }: DevelopmentSectionProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-4">
        <p className={cn('font-body text-sm', isDark ? 'text-[#878787]' : 'text-[var(--ds-text-subtlest, #6B6E76)]')}>
          No development activity found
        </p>
      </div>
    );
  }

  // Group by type
  const grouped = items.reduce<Record<DevItemType, DevelopmentItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<DevItemType, DevelopmentItem[]>);

  return (
    <div className="space-y-3">
      {(Object.entries(grouped) as [DevItemType, DevelopmentItem[]][]).map(([type, typeItems]) => (
        <div key={type}>
          <span className={cn(
            'text-[10px] font-body font-semibold uppercase tracking-wider mb-1 block',
            isDark ? 'text-[#878787]' : 'text-[var(--ds-text-subtlest, #6B6E76)]',
          )}>
            {type === 'pullRequest' ? 'Pull Requests' : type.charAt(0).toUpperCase() + type.slice(1) + 's'} ({typeItems.length})
          </span>

          {typeItems.map((devItem) => {
            const stateStyle = STATE_COLORS[devItem.state ?? 'unknown'] ?? STATE_COLORS.unknown;

            return (
              <a
                key={devItem.id}
                href={devItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group flex items-center gap-2 px-2 py-2 rounded-md transition-colors',
                  isDark ? 'hover:bg-[#1F1F1F]' : 'hover:bg-[#F4F5F7]',
                )}
              >
                <span className={isDark ? 'text-[#A1A1A1]' : 'text-[var(--ds-text-accent-gray, #505258)]'}>
                  {TYPE_ICONS[type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-body text-sm truncate', isDark ? 'text-[#EDEDED]' : 'text-[var(--ds-text, #292A2E)]')}>
                    {devItem.title}
                  </p>
                  <div className={cn('flex items-center gap-2 text-xs font-body', isDark ? 'text-[#878787]' : 'text-[var(--ds-text-subtlest, #6B6E76)]')}>
                    {devItem.repoName && <span>{devItem.repoName}</span>}
                    {devItem.author && <span>{devItem.author.displayName}</span>}
                    {devItem.updated && <span>{formatRelative(devItem.updated)}</span>}
                  </div>
                </div>
                {devItem.state && (
                  <span
                    className="text-[10px] font-body font-medium px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      backgroundColor: isDark ? stateStyle.darkBg : stateStyle.bg,
                      color: isDark ? stateStyle.darkText : stateStyle.text,
                    }}
                  >
                    {devItem.state}
                  </span>
                )}
                <ExternalLink className={cn(
                  'w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                  isDark ? 'text-[#878787]' : 'text-[var(--ds-text-accent-gray, #505258)]',
                )} />
              </a>
            );
          })}
        </div>
      ))}
    </div>
  );
}
