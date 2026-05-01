/**
 * SyncStatusCard — 4 KPI cards summary bar
 * Phase 3, Task 3
 */
import { FolderGit2, FileStack, RefreshCw, AlertTriangle } from 'lucide-react';
import type { JiraProject, SyncLogEntry } from '@/types/workhub.types';

interface SyncStatusCardProps {
  projects: JiraProject[];
  totalItems: number;
  syncLogs: SyncLogEntry[];
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
  return `${diffDays}d ago`;
}

export function SyncStatusCards({ projects, totalItems, syncLogs }: SyncStatusCardProps) {
  const activeCount = projects.filter(p => p.is_active).length;

  // Most recent sync across all projects
  const lastSyncDates = projects
    .filter(p => p.last_synced_at)
    .map(p => new Date(p.last_synced_at!).getTime());
  const lastSyncTime = lastSyncDates.length > 0
    ? getRelativeTime(new Date(Math.max(...lastSyncDates)).toISOString())
    : 'Never';

  // Errors in last 24h
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const recentErrors = syncLogs.filter(
    l => l.status === 'failed' && l.started_at > oneDayAgo
  ).length;

  const cards = [
    { icon: FolderGit2, value: activeCount, label: 'Projects Connected', iconBg: '#dbeafe', iconColor: 'var(--cp-blue)' },
    { icon: FileStack, value: totalItems, label: 'Total Items', iconBg: '#d1fae5', iconColor: '#059669' },
    { icon: RefreshCw, value: lastSyncTime, label: 'Last Sync', iconBg: '#e0e7ff', iconColor: '#4f46e5' },
    {
      icon: AlertTriangle,
      value: recentErrors === 0 ? 'All Clear' : `${recentErrors} Errors`,
      label: recentErrors === 0 ? 'No Issues' : 'Action Required',
      iconBg: recentErrors === 0 ? 'var(--ds-background-success, var(--ds-background-success, #dcfce7))' : '#fee2e2',
      iconColor: recentErrors === 0 ? 'var(--sem-success)' : 'var(--sem-danger)',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="flex items-center gap-3 p-4 rounded-lg border"
            style={{
              background: 'var(--cp-float)',
              borderColor: 'var(--divider)',
              borderRadius: 'var(--wh-radius-lg)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: card.iconBg }}
            >
              <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
            </div>
            <div>
              <div
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--wh-font-display)', color: 'var(--fg-1)' }}
              >
                {card.value}
              </div>
              <div className="text-xs" style={{ color: 'var(--fg-4)' }}>
                {card.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
