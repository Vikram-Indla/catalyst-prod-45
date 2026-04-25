/**
 * AllWorkEmptyState — Designed empty states for every scenario (CG-07: 10/10)
 */
import { FileStack, Search, AlertCircle, Filter, MessageSquare, Clock, History, ListTree, Link2, Paperclip, Tag } from 'lucide-react';

type EmptyType =
  | 'no-items' | 'no-results' | 'error' | 'no-filters'
  | 'no-comments' | 'no-worklogs' | 'no-history'
  | 'no-subtasks' | 'no-links' | 'no-attachments' | 'no-labels';

interface Props {
  type: EmptyType;
  message?: string;
  query?: string;
  onAction?: () => void;
  onClear?: () => void;
  onRetry?: () => void;
}

const CONFIG: Record<EmptyType, { icon: typeof FileStack; title: string; subtitle: string; actionLabel?: string }> = {
  'no-items': { icon: FileStack, title: 'No work items yet', subtitle: 'Create your first work item to get started', actionLabel: 'Create work item' },
  'no-results': { icon: Search, title: 'No results found', subtitle: 'Try different keywords or remove filters', actionLabel: 'Clear all filters' },
  'error': { icon: AlertCircle, title: 'Failed to load work items', subtitle: 'Something went wrong', actionLabel: 'Retry' },
  'no-filters': { icon: Filter, title: 'No items match your filters', subtitle: 'Try adjusting your filter criteria', actionLabel: 'Clear all filters' },
  'no-comments': { icon: MessageSquare, title: 'No comments yet', subtitle: 'Start the conversation' },
  'no-worklogs': { icon: Clock, title: 'No time logged', subtitle: 'Log your first work entry' },
  'no-history': { icon: History, title: 'No changes recorded yet', subtitle: 'Changes will appear here' },
  'no-subtasks': { icon: ListTree, title: 'No sub-tasks', subtitle: 'Break this item into smaller tasks', actionLabel: 'Add a sub-task' },
  'no-links': { icon: Link2, title: 'No linked work items', subtitle: 'Connect related work items', actionLabel: 'Link a work item' },
  'no-attachments': { icon: Paperclip, title: 'No attachments', subtitle: 'Add files to this work item', actionLabel: 'Attach a file' },
  'no-labels': { icon: Tag, title: 'No labels applied', subtitle: 'Categorize with labels' },
};

export function AllWorkEmptyState({ type, message, query, onAction, onClear, onRetry }: Props) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;
  const isError = type === 'error';
  const isSmall = ['no-comments', 'no-worklogs', 'no-history', 'no-subtasks', 'no-links', 'no-attachments', 'no-labels'].includes(type);

  const title = type === 'no-results' && query ? `No results for "${query}"` : (message && isError ? cfg.title : cfg.title);
  const subtitle = isError && message ? message : cfg.subtitle;

  const actionHandler = onAction || onClear || onRetry;
  const actionLabel = cfg.actionLabel;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border ${isSmall ? 'py-8' : 'py-16'}`}
      style={{ borderColor: 'var(--bd-default, #2E2E2E)', backgroundColor: 'var(--bg-app)' }}
    >
      <Icon
        className={isSmall ? 'w-8 h-8 mb-2' : 'w-10 h-10 mb-3'}
        style={{ color: isError ? 'var(--sem-danger)' : 'var(--fg-3)' }}
        aria-hidden="true"
      />
      <p
        className={`${isSmall ? 'text-[13px]' : 'text-[14px]'} font-medium mb-1`}
        style={{ color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
      >
        {title}
      </p>
      <p
        className={`${isSmall ? 'text-[11px]' : 'text-[13px]'} ${actionHandler && actionLabel ? 'mb-4' : ''}`}
        style={{ color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)' }}
      >
        {subtitle}
      </p>
      {actionHandler && actionLabel && (
        isError || type === 'no-items' ? (
          <button
            onClick={actionHandler}
            className="px-4 py-2 text-[13px] font-medium rounded-md text-white transition-colors duration-[80ms] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            style={{ backgroundColor: isError ? 'var(--sem-danger)' : 'var(--cp-blue)' }}
          >
            {actionLabel}
          </button>
        ) : (
          <button
            onClick={actionHandler}
            className="text-[13px] font-medium transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            style={{ color: 'var(--cp-blue)' }}
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}
