/**
 * SyncLogTable — Sync history table
 * Phase 3, Task 4
 */
import { History, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { SyncLogEntry, JiraProject } from '@/types/workhub.types';

interface SyncLogTableProps {
  logs: SyncLogEntry[];
  projects: JiraProject[];
  isLoading: boolean;
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

const typeBadgeColors: Record<string, { bg: string; color: string }> = {
  full: { bg: '#dbeafe', color: '#2563eb' },
  incremental: { bg: '#ccfbf1', color: '#0d9488' },
  manual: { bg: '#f4f4f5', color: '#71717a' },
};

export function SyncLogTable({ logs, projects, isLoading }: SyncLogTableProps) {
  const getProjectKey = (projectId?: string) => {
    if (!projectId) return '—';
    const p = projects.find(pr => pr.id === projectId);
    return p?.project_key ?? '—';
  };

  const columns = ['Time', 'Project', 'Type', 'Status', 'Created', 'Updated', 'Unchanged', 'Duration', 'Errors'];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5" style={{ color: 'var(--wh-text-secondary)' }} />
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--wh-font-display)', color: 'var(--wh-text-primary)' }}
        >
          Sync History
        </h2>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--wh-border)', background: 'var(--wh-surface)' }}
      >
        <table className="w-full text-sm" style={{ fontFamily: 'var(--wh-font-sans)' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--wh-bg-muted)' }}>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--wh-text-tertiary)', borderBottom: '1px solid var(--wh-border)' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center" style={{ color: 'var(--wh-text-tertiary)' }}>
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading sync history...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center" style={{ color: 'var(--wh-text-tertiary)' }}>
                  No sync history yet. Click "Sync Now" on a project to start.
                </td>
              </tr>
            ) : (
              logs.map(log => {
                const typeStyle = typeBadgeColors[log.sync_type] || typeBadgeColors.manual;
                const errCount = Array.isArray(log.errors) ? log.errors.length : 0;
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-blue-50/30 transition-colors"
                    style={{ borderBottom: '1px solid var(--wh-border)', height: '44px' }}
                  >
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--wh-text-secondary)' }}>
                      {getRelativeTime(log.started_at)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-block px-2 py-0.5 text-xs font-semibold rounded"
                        style={{ backgroundColor: '#f0f0f0', color: 'var(--wh-text-primary)' }}
                      >
                        {getProjectKey(log.jira_project_id)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full"
                        style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}
                      >
                        {log.sync_type}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {log.status === 'running' && (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#2563eb' }}>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running
                        </span>
                      )}
                      {log.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#16a34a' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#dc2626' }}>
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--wh-text-secondary)' }}>
                      {log.items_created}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--wh-text-secondary)' }}>
                      {log.items_updated}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--wh-text-secondary)' }}>
                      {log.items_unchanged}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--wh-text-secondary)' }}>
                      {log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {errCount > 0 ? (
                        <span
                          className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full"
                          style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                        >
                          {errCount}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--wh-text-tertiary)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
