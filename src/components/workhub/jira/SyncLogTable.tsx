/**
 * SyncLogTable — Sync history table
 * Phase 3, Task 4
 */
import { History, Loader2, CheckCircle2, XCircle } from '@/lib/atlaskit-icons';
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
  full: { bg: 'var(--ds-background-information, #E9F2FF)', color: 'var(--cp-blue)' },
  incremental: { bg: 'var(--ds-background-success, #DCFFF1)', color: 'var(--sem-success)' },
  manual: { bg: 'var(--ds-surface-sunken, #F7F8F9)', color: 'var(--fg-3)' },
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
        <History className="w-5 h-5" style={{ color: 'var(--fg-3)' }} />
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--wh-font-display)', color: 'var(--fg-1)' }}
        >
          Sync History
        </h2>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--divider)', background: 'var(--cp-float)' }}
      >
        <table className="w-full text-sm" style={{ fontFamily: 'var(--wh-font-sans)' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-1)' }}>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--fg-4)', borderBottom: '1px solid var(--divider)' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center" style={{ color: 'var(--fg-4)' }}>
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading sync history...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center" style={{ color: 'var(--fg-4)' }}>
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
                    style={{ borderBottom: '1px solid var(--divider)', height: '44px' }}
                  >
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--fg-3)' }}>
                      {getRelativeTime(log.started_at)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-block px-2 py-0.5 text-xs font-semibold rounded"
                        style={{ backgroundColor: 'var(--bg-3)', color: 'var(--fg-1)' }}
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
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--cp-blue)' }}>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running
                        </span>
                      )}
                      {log.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--sem-success)' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--sem-danger)' }}>
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--fg-3)' }}>
                      {log.items_created}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--fg-3)' }}>
                      {log.items_updated}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--fg-3)' }}>
                      {log.items_unchanged}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--fg-3)' }}>
                      {log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {errCount > 0 ? (
                        <span
                          className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full"
                          style={{ backgroundColor: 'var(--ds-background-danger, #FFECEB)', color: 'var(--sem-danger)' }}
                        >
                          {errCount}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--fg-4)' }}>—</span>
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
