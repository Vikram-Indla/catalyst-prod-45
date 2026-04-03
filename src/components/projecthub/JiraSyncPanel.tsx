import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatTimeAgo(date: string | null | undefined): string {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function useSyncConnection() {
  return useQuery({
    queryKey: ['sync-connection'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sync_connections')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 30000,
    staleTime: 15_000,
  });
}

export function useSyncHealthLatest() {
  return useQuery({
    queryKey: ['sync-health-latest'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sync_health')
        .select('checked_at, status, details')
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 30000,
    staleTime: 15_000,
  });
}

export function SyncCTALabel() {
  const { data: conn } = useSyncConnection();
  const { data: health } = useSyncHealthLatest();

  return (
    <>
      <span className={cn("w-2 h-2 rounded-full", conn ? "bg-green-500" : "bg-slate-300")} />
      <span>↔ Jira Sync</span>
      <span className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
        {conn
          ? `Connected · Synced ${formatTimeAgo(health?.checked_at)}`
          : 'Not connected'}
      </span>
    </>
  );
}

function StatBox({ value, label, valueColor }: { value: number | string; label: string; valueColor?: string }) {
  return (
    <div className="text-center py-2 bg-slate-50 dark:bg-slate-800 rounded">
      <div className={cn("text-lg font-[650] text-slate-900 dark:text-white", valueColor)}>{value}</div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("font-medium text-slate-700 dark:text-slate-300", valueColor)}>{value}</span>
    </div>
  );
}

export function JiraSyncPanel() {
  const queryClient = useQueryClient();
  const { data: conn } = useSyncConnection();
  const [syncing, setSyncing] = useState(false);

  const { data: syncStats } = useQuery({
    queryKey: ['sync-stats'],
    queryFn: async () => {
      const [projectsRes, issuesRes, queueRes, healthRes, failedRes] = await Promise.all([
        supabase.from('sync_entity_map').select('id', { count: 'exact', head: true }).eq('catalyst_entity_type', 'project'),
        supabase.from('catalyst_issues').select('id', { count: 'exact', head: true }),
        supabase.from('sync_events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('sync_health').select('*').order('checked_at', { ascending: false }).limit(5),
        supabase.from('sync_events').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      ]);
      return {
        projectCount: projectsRes.count || 0,
        issueCount: issuesRes.count || 0,
        queueDepth: queueRes.count || 0,
        lastChecked: (healthRes.data as any)?.[0]?.checked_at ?? null,
        failedCount: failedRes.count || 0,
        webhookActive: !!conn?.webhook_id,
      };
    },
    refetchInterval: 30000,
  });

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.rpc('process_sync_events', { batch_size: 50 });
      if (error) throw error;
      toast.success('Sync triggered — processing pending events.');
      queryClient.invalidateQueries({ queryKey: ['sync-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sync-health-latest'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
    } catch (err) {
      toast.error(`Sync failed: ${String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Jira Sync Status</h4>
        <span className="text-[11px] text-slate-400">{formatTimeAgo(syncStats?.lastChecked)}</span>
      </div>

      {/* Stats boxes */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox value={syncStats?.projectCount ?? '—'} label="Projects" />
        <StatBox value={syncStats?.issueCount ?? '—'} label="Issues synced" />
        <StatBox
          value={syncStats?.queueDepth ?? 0}
          label="Queue depth"
          valueColor={(syncStats?.queueDepth ?? 0) === 0 ? 'text-green-600' : 'text-amber-600'}
        />
      </div>

      {/* Detail rows */}
      <div className="space-y-2 text-[13px]">
        <DetailRow label="Direction" value="↔ Bi-directional" />
        <DetailRow label="Failed events" value={syncStats?.failedCount ?? 0}
          valueColor={(syncStats?.failedCount ?? 0) === 0 ? 'text-green-600' : 'text-red-600'} />
        <DetailRow label="Webhook status"
          value={
            <span className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", syncStats?.webhookActive ? "bg-green-500" : "bg-red-500")} />
              {syncStats?.webhookActive ? 'Active' : 'Inactive'}
            </span>
          }
        />
      </div>

      {/* Sync Now button */}
      <button
        onClick={handleSyncNow}
        disabled={syncing}
        className="w-full h-9 mt-3 bg-blue-600 text-white rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        style={{ border: 'none', cursor: 'pointer' }}
      >
        {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}
