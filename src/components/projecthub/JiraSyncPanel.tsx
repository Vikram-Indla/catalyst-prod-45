import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

interface SyncHealthRow {
  id: string;
  status: string;
  events_received: number;
  events_processed: number;
  events_failed: number;
  avg_latency_ms: number;
  checked_at: string;
}

export function JiraSyncPanel() {
  const { data: health } = useQuery({
    queryKey: ['sync-health'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sync_health')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as SyncHealthRow | null;
    },
    staleTime: 30_000,
  });

  const { data: connections } = useQuery({
    queryKey: ['sync-connections'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sync_connections')
        .select('*');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const projectCount = connections?.length ?? 0;
  const issuesSynced = health?.events_processed ?? 0;
  const queueDepth = (health?.events_received ?? 0) - (health?.events_processed ?? 0) - (health?.events_failed ?? 0);
  const lastChecked = health?.checked_at
    ? formatDistanceToNowStrict(new Date(health.checked_at), { addSuffix: true })
    : 'Never';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Jira Sync Status</h4>
        <span className="text-[11px] text-slate-400">{lastChecked}</span>
      </div>

      {/* Stats boxes */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Connected', value: projectCount },
          { label: 'Synced', value: issuesSynced },
          { label: 'Queue', value: Math.max(0, queueDepth) },
        ].map(s => (
          <div key={s.label} className="text-center py-2 bg-slate-50 dark:bg-slate-800 rounded">
            <div className="text-lg font-[650] text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Detail rows */}
      <div className="space-y-2 text-[13px]">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Status</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{health?.status ?? 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Failed events</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{health?.events_failed ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Avg latency</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{health?.avg_latency_ms ?? 0}ms</span>
        </div>
      </div>

      {/* Sync Now button */}
      <button
        className="w-full h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-colors"
        style={{ border: 'none', cursor: 'pointer' }}
      >
        <RefreshCw size={14} />
        Sync Now
      </button>
    </div>
  );
}
