import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import Spinner from '@atlaskit/spinner';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import WarningIcon from '@atlaskit/icon/core/warning';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import DatabaseIcon from '@atlaskit/icon/core/database';

/* ─── types ───────────────────────────────────────────────────────────────── */

interface SyncLogEntry {
  id: string;
  sync_type: string;
  status: string;
  issues_fetched: number | null;
  issues_upserted: number | null;
  issues_pruned: number | null;
  error_message: string | null;
  warnings: string[] | null;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
  projects_synced: string[] | null;
}

interface ProjectSyncState {
  project_key: string;
  last_synced_at: string | null;
  last_successful_sync_at: string | null;
  last_sync_status: string | null;
  issues_synced: number | null;
  consecutive_failures: number;
}

/* ─── helpers ──────────────────────────────────────────────────────────────── */

function statusColour(status: string): string {
  if (status === 'success') return 'var(--ds-icon-success, #22A06B)';
  if (status === 'warning') return 'var(--ds-icon-warning, #D97008)';
  if (status === 'error')   return 'var(--ds-icon-danger, #AE2A19)';
  return 'var(--ds-icon, #44546F)';
}

function StatusIcon({ status }: { status: string }) {
  const colour = statusColour(status);
  if (status === 'success') return <span style={{ display: 'inline-flex', color: colour }}><CheckCircleIcon label="" size="small" /></span>;
  if (status === 'warning') return <span style={{ display: 'inline-flex', color: colour }}><WarningIcon label="" size="small" /></span>;
  if (status === 'error')   return <span style={{ display: 'inline-flex', color: colour }}><CrossCircleIcon label="" size="small" /></span>;
  return <span style={{ display: 'inline-flex', color: colour }}><RefreshIcon label="" size="small" /></span>;
}

function HealthBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    GREEN:  { bg: '#E3FCEF', text: '#006644', label: 'Healthy' },
    YELLOW: { bg: '#FFFAE6', text: '#7A5200', label: 'Degraded' },
    RED:    { bg: '#FFECEB', text: '#AE2A19', label: 'Critical' },
  };
  const s = map[status] ?? map['RED'];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 uppercase tracking-widest"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.text }} />
      {s.label}
    </span>
  );
}

/* ─── main component ────────────────────────────────────────────────────────── */

interface SyncHealthDashboardProps {
  connectionId?: string;
}

export function SyncHealthDashboard({ connectionId: _connectionId }: SyncHealthDashboardProps) {

  // ── ph_sync_log ──────────────────────────────────────────────────────────
  const { data: logs, isLoading: logsLoading } = useQuery<SyncLogEntry[]>({
    queryKey: ['ph-sync-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_sync_log')
        .select('id, sync_type, status, issues_fetched, issues_upserted, issues_pruned, error_message, warnings, duration_ms, started_at, completed_at, projects_synced')
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SyncLogEntry[];
    },
    refetchInterval: 30_000,
  });

  // ── ph_project_sync_state (Strategy 2+3) ─────────────────────────────────
  const { data: projectStates, isLoading: statesLoading } = useQuery<ProjectSyncState[]>({
    queryKey: ['ph-project-sync-state'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_project_sync_state')
        .select('project_key, last_synced_at, last_successful_sync_at, last_sync_status, issues_synced, consecutive_failures')
        .order('project_key');
      if (error) {
        // Table might not exist yet (pre-migration) — return empty gracefully
        console.warn('[SyncHealthDashboard] ph_project_sync_state not available:', error.message);
        return [];
      }
      return (data ?? []) as ProjectSyncState[];
    },
    refetchInterval: 30_000,
  });

  if (logsLoading || statesLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="medium" />
      </div>
    );
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const total       = logs?.length ?? 0;
  const success     = logs?.filter(l => l.status === 'success').length ?? 0;
  const warningCnt  = logs?.filter(l => l.status === 'warning').length ?? 0;
  const failed      = logs?.filter(l => l.status === 'error').length ?? 0;
  const successRate = total > 0 ? (success / total) * 100 : 0;
  const lastSuccess = logs?.find(l => l.status === 'success');
  const recentLogs  = logs?.slice(0, 15) ?? [];

  let consecutiveFailures = 0;
  for (const l of recentLogs) {
    if (l.status === 'error') consecutiveFailures++;
    else break;
  }
  const healthStatus = consecutiveFailures === 0 ? 'GREEN' : consecutiveFailures <= 3 ? 'YELLOW' : 'RED';

  return (
    <div className="space-y-6">

      {/* ── Health banner ──────────────────────────────────────────────────── */}
      <div
        className="rounded-lg border flex items-center justify-between"
        style={{
          borderColor: healthStatus === 'GREEN' ? '#B3D4FF' : healthStatus === 'YELLOW' ? '#FFE380' : '#FF8F73',
          background:  healthStatus === 'GREEN' ? '#DEEBFF22' : healthStatus === 'YELLOW' ? '#FFFAE622' : '#FFECEB22',
        }}
      >
        <div>
          <div className="flex items-center mb-1">
            <span className=" " style={{ color: 'var(--ds-text, #172B4D)' }}>Sync health</span>
            <HealthBadge status={healthStatus} />
            {consecutiveFailures > 0 && (
              <span className="" style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>
                {consecutiveFailures} consecutive failure{consecutiveFailures !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {lastSuccess?.started_at
            ? (
              <p className="" style={{ color: 'var(--ds-text-subtle, #42526E)' }}>
                Last successful sync{' '}
                <span className="font-medium">
                  {formatDistanceToNow(new Date(lastSuccess.started_at), { addSuffix: true })}
                </span>
                {' '}· {lastSuccess.issues_fetched ?? 0} issues fetched
              </p>
            ) : (
              <p className="" style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>
                No successful sync recorded — check the Jira API token.
              </p>
            )}
        </div>
        <p className="" style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>
          {total} syncs tracked
        </p>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { Icon: RefreshIcon,     label: 'Total syncs',  value: total,                          colour: 'var(--ds-icon-brand, #0052CC)' },
          { Icon: CheckCircleIcon, label: 'Success rate', value: `${successRate.toFixed(1)}%`,   colour: 'var(--ds-icon-success, #22A06B)' },
          { Icon: WarningIcon,     label: 'Warnings',     value: warningCnt,                     colour: 'var(--ds-icon-warning, #D97008)' },
          { Icon: CrossCircleIcon, label: 'Errors',       value: failed,                         colour: 'var(--ds-icon-danger, #AE2A19)' },
        ].map(({ Icon, label, value, colour }) => (
          <div
            key={label}
            className="rounded-lg border flex items-center gap-3"
            style={{ borderColor: 'var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #FFFFFF)' }}
          >
            <div
              className="h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: colour + '18' }}
            >
              <Icon style={{ width: 16, height: 16, color: colour }} label="" />
            </div>
            <div>
              <p className=" font-medium uppercase tracking-wider" style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>
                {label}
              </p>
              <p className=" leading-tight" style={{ color: 'var(--ds-text, #172B4D)', fontFamily: 'monospace' }}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Per-project sync state ─────────────────────────────────────────── */}
      {(projectStates?.length ?? 0) > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--ds-border, #DFE1E6)' }}>
          <div className=" py-3 border-b" style={{ borderColor: 'var(--ds-border, #DFE1E6)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
            <span className=" uppercase tracking-wider" style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Per-project sync state
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
                {['Project', 'Status', 'Last synced', 'Issues', 'Failures'].map(h => (
                  <th key={h} className=" text-left" style={{ fontSize: 12, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectStates!.map(ps => (
                <tr key={ps.project_key} style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                  <td className=" " style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
                    {ps.project_key}
                  </td>
                  <td className=" ">
                    {ps.last_sync_status ? (
                      <div className="flex items-center gap-1">
                        <StatusIcon status={ps.last_sync_status} />
                        <span style={{ fontSize: 12, color: statusColour(ps.last_sync_status) }}>
                          {ps.last_sync_status}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>—</span>
                    )}
                  </td>
                  <td className=" " style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
                    {ps.last_synced_at
                      ? formatDistanceToNow(new Date(ps.last_synced_at), { addSuffix: true })
                      : <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>Never</span>}
                  </td>
                  <td className=" " style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--ds-text, #172B4D)' }}>
                    {ps.issues_synced ?? '—'}
                  </td>
                  <td className=" ">
                    {ps.consecutive_failures > 0 ? (
                      <span
                        className="rounded-full py-0.5 "
                        style={{ fontSize: 10, background: '#FFECEB', color: '#AE2A19' }}
                      >
                        {ps.consecutive_failures}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recent sync log ───────────────────────────────────────────────── */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--ds-border, #DFE1E6)' }}>
        <div className=" py-3 border-b" style={{ borderColor: 'var(--ds-border, #DFE1E6)', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
          <span className=" uppercase tracking-wider" style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>
            Recent sync activity
          </span>
        </div>
        <div>
          {recentLogs.length === 0 && (
            <div className=" py-8 text-center" style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              No sync history found. The cron job may not have run yet.
            </div>
          )}
          {recentLogs.map((log, i) => (
            <div
              key={log.id}
              className="flex items-start justify-between py-3 "
              style={{
                borderBottom: i < recentLogs.length - 1 ? '1px solid var(--ds-border, #DFE1E6)' : undefined,
                background: 'var(--ds-surface, #FFFFFF)',
              }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5"><StatusIcon status={log.status} /></div>
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap">
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
                      {log.sync_type}
                    </span>
                    {(log.projects_synced?.length ?? 0) > 0 && (
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ds-text-subtlest, #6B778C)' }}>
                        [{log.projects_synced!.join(', ')}]
                      </span>
                    )}
                    {log.issues_fetched != null && (
                      <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #42526E)' }}>
                        {log.issues_fetched} fetched · {log.issues_upserted ?? 0} upserted
                        {(log.issues_pruned ?? 0) > 0 && ` · ${log.issues_pruned} pruned`}
                      </span>
                    )}
                    {log.duration_ms != null && (
                      <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                        {(log.duration_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  {log.error_message && (
                    <p className="mt-0.5 truncate max-w-lg" style={{ fontSize: 11, color: 'var(--ds-text-danger, #AE2A19)' }}>
                      {log.error_message}
                    </p>
                  )}
                  {(log.warnings?.length ?? 0) > 0 && !log.error_message && (
                    <p className="mt-0.5" style={{ fontSize: 11, color: 'var(--ds-icon-warning, #D97008)' }}>
                      {log.warnings!.join(' · ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                  {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                </p>
                <p style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                  {format(new Date(log.started_at), 'HH:mm:ss')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Strategy legend ───────────────────────────────────────────────── */}
      <div
        className="rounded-lg flex items-start gap-3 py-3"
        style={{ background: 'var(--ds-surface-sunken, #F7F8F9)', border: '1px solid var(--ds-border, #DFE1E6)' }}
      >
        <DatabaseIcon label="" size="small" />
        <p className="leading-relaxed" style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
          <strong style={{ color: 'var(--ds-text, #172B4D)' }}>5-layer hybrid sync</strong>
          {' '}— Layer 1: Jira webhook push (real-time). Layer 2: 15-min smart incremental
          per-project (2026-05-25, replaces fixed -30m window). Layer 3: on-demand full sync
          for recovery. Projects synced:{' '}
          <strong style={{ color: 'var(--ds-text, #172B4D)', fontFamily: 'monospace' }}>
            BAU · MWR · ICP · IRP · IN · INV · IP · TAH
          </strong>
          {' '}(expanded from BAU-only on 2026-05-25).
        </p>
      </div>
    </div>
  );
}
