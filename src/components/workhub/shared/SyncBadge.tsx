/**
 * SyncBadge — Shared component showing last sync time and source
 * Phase 3, Task 8
 */
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface SyncBadgeProps {
  lastSyncedAt?: string;
  syncSource?: 'jira' | 'catalyst' | 'manual';
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, 'MMM d, yyyy');
}

const sourcePillStyles: Record<string, { bg: string; color: string; label: string }> = {
  jira: { bg: '#dbeafe', color: '#2563eb', label: 'Jira' },
  catalyst: { bg: '#ccfbf1', color: '#0d9488', label: 'Catalyst' },
  manual: { bg: '#f4f4f5', color: '#71717a', label: 'Manual' },
};

export function SyncBadge({ lastSyncedAt, syncSource }: SyncBadgeProps) {
  const timeText = lastSyncedAt ? getRelativeTime(lastSyncedAt) : 'Never synced';
  const source = syncSource ? sourcePillStyles[syncSource] : null;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{ fontSize: '12px', color: 'var(--wh-text-tertiary)' }}
    >
      <RefreshCw className="w-3.5 h-3.5" />
      <span>{timeText}</span>
      {source && (
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ backgroundColor: source.bg, color: source.color }}
        >
          {source.label}
        </span>
      )}
    </span>
  );
}
