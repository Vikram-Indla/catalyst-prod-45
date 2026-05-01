import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function StatusLozenge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    success: { bg: '#E3FCEF', text: '#006644' },
    error: { bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
    skipped: { bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
    processing: { bg: '#DEEBFF', text: '#0747A6' },
    Connected: { bg: '#E3FCEF', text: '#006644' },
    'Not Connected': { bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
  };
  const colors = map[status] || map.skipped;
  return (
    <span
      style={{
        display: 'inline-block',
        height: 20,
        lineHeight: '20px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderRadius: 4,
        padding: '0 8px',
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {status}
    </span>
  );
}

export function IntegrationTab() {
  // Section 1: Connection status
  const { data: connection, isLoading: connLoading } = useQuery({
    queryKey: ['jira-connection-status'],
    queryFn: async () => {
      const { data } = await (supabase
        .from('jira_connections') as any)
        .select('id, name, base_url, is_active')
        .eq('is_active', true)
        .maybeSingle();
      return data as { id: string; name: string; base_url: string; is_active: boolean } | null;
    },
  });

  // Section 2: Stat cards
  const { data: syncedCount = 0 } = useQuery({
    queryKey: ['jira-synced-count'],
    queryFn: async () => {
      const { count } = await (supabase
        .from('ph_work_items') as any)
        .select('id', { count: 'exact', head: true })
        .eq('jira_sync_status', 'synced');
      return count ?? 0;
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['jira-pending-count'],
    queryFn: async () => {
      const { count } = await (supabase
        .from('jira_write_back_queue') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count ?? 0;
    },
  });

  const { data: errorCount = 0 } = useQuery({
    queryKey: ['jira-error-count'],
    queryFn: async () => {
      const { count } = await (supabase
        .from('jira_write_back_queue') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed');
      return count ?? 0;
    },
  });

  // Section 3: Sync log
  const { data: syncLogs, isLoading: logsLoading, isError: logsError } = useQuery({
    queryKey: ['jira-sync-log-recent'],
    queryFn: async () => {
      const { data } = await (supabase
        .from('jira_sync_logs') as any)
        .select('id, event_type, jira_key, status, items_processed, items_created, items_updated, items_deleted, items_failed, sync_duration_ms, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      return (data ?? []) as any[];
    },
  });

  const statCards = [
    { label: 'Items Synced', value: syncedCount, icon: RefreshCw, iconClass: 'text-blue-600' },
    { label: 'Pending Write-back', value: pendingCount, icon: Clock, iconClass: 'text-amber-500' },
    { label: 'Errors', value: errorCount, icon: AlertCircle, iconClass: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 dark:bg-[var(--ds-surface,#0A0A0A)]">
      {/* Section 1 — Connection Status */}
      <div className="bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-[var(--bd-default,#E2E8F0)] dark:border-[var(--ds-border,#292929)] rounded-md p-4">
        <h3 className="text-sm font-semibold text-[var(--ds-text,#0F172A)] dark:text-white mb-3">Jira Connection</h3>
        {connLoading ? (
          <Skeleton className="h-10 w-64" />
        ) : connection ? (
          <div className="flex items-center gap-3">
            <CheckCircle size={18} className="text-green-600" />
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13, fontWeight: 650 }} className="text-[var(--fg-1)] dark:text-white">
                  {connection.name}
                </span>
                <StatusLozenge status="Connected" />
              </div>
              <span style={{ fontSize: 12 }} className="text-[var(--fg-3)] dark:text-gray-400">
                {connection.base_url}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-gray-400" />
            <div>
              <div className="flex items-center gap-2">
                <StatusLozenge status="Not Connected" />
              </div>
              <span style={{ fontSize: 13 }} className="text-[var(--fg-3)] dark:text-gray-400 mt-1 block">
                Configure in Admin → Jira Integration
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Section 2 — Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-[var(--bd-default,#E2E8F0)] dark:border-[var(--ds-border,#292929)] rounded-md p-4"
            >
              <Icon size={16} className={`absolute top-4 right-4 ${card.iconClass}`} />
              <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 700 }} className="text-[var(--fg-1)] dark:text-white">
                {card.value}
              </div>
              <div style={{ fontSize: 12 }} className="text-[var(--fg-3)] dark:text-gray-400 mt-1">
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 3 — Recent Sync Log */}
      <div className="bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-[var(--bd-default,#E2E8F0)] dark:border-[var(--ds-border,#292929)] rounded-md overflow-hidden">
        <h3 className="text-sm font-semibold text-[var(--ds-text,#0F172A)] dark:text-white p-4 pb-2">Recent Sync Events</h3>

        {logsError ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <AlertCircle size={16} className="text-red-400" />
            <span style={{ fontSize: 13 }} className="text-red-400">Failed to load sync data</span>
          </div>
        ) : logsLoading ? (
          <div className="p-4 space-y-0">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[50px] w-full" />
            ))}
          </div>
        ) : !syncLogs || syncLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <RefreshCw size={32} className="text-gray-300 dark:text-gray-600" />
            <span style={{ fontSize: 13 }} className="text-[var(--fg-4)] dark:text-gray-400">No sync events yet</span>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--bd-default,#E2E8F0)] dark:border-[var(--ds-border,#292929)]">
                {['Time', 'Event', 'Jira Key', 'Status', 'Items', 'Duration'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 text-[var(--ds-text-subtlest,#64748B)] dark:text-gray-400"
                    style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', height: 50, maxHeight: 50 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {syncLogs.map((log: any) => {
                const itemCount = (log.items_created ?? 0) + (log.items_updated ?? 0) + (log.items_deleted ?? 0) || log.items_processed || 0;
                return (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--bd-default,#E2E8F0)] dark:border-[var(--ds-border,#292929)]"
                    style={{ height: 50, maxHeight: 50 }}
                  >
                    <td className="px-4 text-[var(--fg-1)] dark:text-white" style={{ fontSize: 12 }}>
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 text-[var(--fg-1)] dark:text-white" style={{ fontSize: 12 }}>
                      {log.event_type}
                    </td>
                    <td className="px-4 text-[var(--fg-1)] dark:text-white" style={{ fontSize: 12 }}>
                      {log.jira_key || '—'}
                    </td>
                    <td className="px-4">
                      <StatusLozenge status={log.status} />
                    </td>
                    <td className="px-4 text-[var(--fg-1)] dark:text-white" style={{ fontSize: 12 }}>
                      {itemCount}
                    </td>
                    <td className="px-4 text-[var(--fg-3)] dark:text-gray-400" style={{ fontSize: 12 }}>
                      {log.sync_duration_ms != null ? `${log.sync_duration_ms}ms` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
