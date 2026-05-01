import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
    queryKey: ['jira-connection-status'],
    queryFn: async () => {
      // 1. Check ph_jira_connection (authoritative singleton — has actual credentials)
      const { data: phConn } = await supabase
        .from('ph_jira_connection')
        .select('id, site_url, status, project_count, last_tested_at')
        .single();
      if (phConn?.status === 'connected') {
        return { id: phConn.id, jira_base_url: phConn.site_url, jira_project_key: null, is_active: true, webhook_id: null, source: 'workhub' as const, connected: true, projectCount: phConn.project_count };
      }

      // 2. Fallback: sync_connections (V2)
      const { data: v2, error: v2err } = await supabase
        .from('sync_connections')
        .select('id, jira_base_url, jira_project_key, is_active, webhook_id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (v2 && !v2err) return { ...v2, source: 'v2' as const, connected: true };

      // 3. Fallback: jira_connections (legacy admin)
      const { data: legacy } = await supabase
        .from('jira_connections')
        .select('id, jira_url, is_active')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (legacy) return { id: legacy.id, jira_base_url: legacy.jira_url, jira_project_key: null, is_active: true, webhook_id: null, source: 'legacy' as const, connected: true };

      return null;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useSyncHealthLatest() {
  return useQuery({
    queryKey: ['sync-health-latest'],
    queryFn: async () => {
      // Try ph_sync_log first (authoritative sync history)
      const { data: syncLog } = await typedQuery('ph_sync_log')
        .select('completed_at, status, issues_upserted, duration_ms')
        .in('status', ['success', 'warning'])
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (syncLog) return { checked_at: syncLog.completed_at, status: syncLog.status, details: { issues: syncLog.issues_upserted, duration_ms: syncLog.duration_ms } };

      // Fallback: sync_health (V2)
      const { data } = await supabase
        .from('sync_health')
        .select('checked_at, status, details')
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
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

function StatBox({ value, label, valueColor, icon }: { value: number | string; label: string; valueColor?: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center py-3 px-2 bg-slate-50/80 dark:bg-white/[0.03] rounded-lg border border-slate-100 dark:border-white/[0.06]">
      <div className={cn("text-xl font-[700] text-slate-900 dark:text-white tabular-nums font-['Sora',sans-serif]", valueColor)}>
        {value}
      </div>
      <div className="text-[10px] font-medium uppercase tracking-[0.04em] text-slate-400 dark:text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-[13px] text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("text-[13px] font-[600] text-slate-700 dark:text-slate-200", valueColor)}>{value}</span>
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
      const results = { projectCount: 0, issueCount: 0, queueDepth: 0, lastChecked: null as string | null, failedCount: 0, webhookActive: false };
      try {
        // Read from authoritative tables — direct queries, no RPCs
        const [phConnRes, issuesRes, syncLogRes, writeBackRes] = await Promise.all([
          supabase.from('ph_jira_connection').select('project_count, total_issue_count, last_tested_at').single(),
          typedQuery('ph_issues').select('id', { count: 'exact', head: true }),
          typedQuery('ph_sync_log').select('completed_at, status').order('completed_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('jira_write_back_queue').select('id', { count: 'exact', head: true }).in('status', ['queued', 'approved']),
        ]);
        results.projectCount = phConnRes.data?.project_count || 0;
        results.issueCount = issuesRes.count || phConnRes.data?.total_issue_count || 0;
        results.queueDepth = writeBackRes.count || 0;
        results.lastChecked = syncLogRes.data?.completed_at || phConnRes.data?.last_tested_at || null;
        results.webhookActive = !!phConnRes.data?.last_tested_at;
      } catch (e) { console.error('Sync stats error:', e); }
      return results;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      // Read configured projects from wh_config so the edge function knows what to sync
      const { data: configRows } = await typedQuery('wh_config')
        .select('key, value')
        .in('key', ['sync_projects', 'sync_project_config', 'sync_lookback_months']);
      const cfg: Record<string, any> = {};
      configRows?.forEach((c: any) => {
        try { cfg[c.key] = typeof c.value === 'string' ? JSON.parse(c.value) : c.value; } catch { cfg[c.key] = c.value; }
      });

      const { data, error } = await supabase.functions.invoke('wh-jira-sync', {
        body: {
          sync_type: 'full',
          projects: cfg.sync_projects || undefined,
          project_configs: cfg.sync_project_config || undefined,
        },
      });
      if (error) throw error;

      // Handle multiple response formats from different versions of the edge function
      if (data?.success) {
        const count = data.issues_upserted ?? data.issues_fetched ?? 0;
        toast.success(`Sync complete: ${count} issues synced`);
      } else if (data?.status === 'processing' || data?.status === 'started') {
        toast.success('Sync triggered — processing in background. Stats will update shortly.');
      } else if (data?.error) {
        toast.error(`Sync error: ${data.error}`);
      } else {
        // Treat any non-error response as success
        toast.success('Sync triggered successfully');
      }

      // Refresh all related queries after a short delay for background processing
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['sync-stats'] });
        queryClient.invalidateQueries({ queryKey: ['sync-health-latest'] });
        queryClient.invalidateQueries({ queryKey: ['jira-connection-status'] });
        queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
        queryClient.invalidateQueries({ queryKey: ['wh', 'sync-health'] });
        queryClient.invalidateQueries({ queryKey: ['wh', 'sync-logs'] });
        queryClient.invalidateQueries({ queryKey: ['project-sync-data'] });
      }, 3000);
    } catch (err) {
      toast.error(`Sync failed: ${String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with connection indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2684FF] to-[#0052CC] flex items-center justify-center shadow-sm">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <path d="M22.9 11.4L13 1.5 12 .5 4.1 8.4.5 12l3.6 3.6L12 23.5l7.9-7.9.4-.4 2.6-2.6-2.6-2.6zM12 15.3L8.7 12 12 8.7l3.3 3.3-3.3 3.3z" fill="var(--ds-surface, #fff)"/>
            </svg>
          </div>
          <div>
            <h4 className="text-[13px] font-[650] text-slate-900 dark:text-white leading-tight">Jira Sync</h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {conn ? 'Connected' : 'Not connected'} · Last sync {formatTimeAgo(syncStats?.lastChecked)}
            </span>
          </div>
        </div>
        <span className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900",
          conn ? "bg-green-500" : "bg-slate-300"
        )} />
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-white/[0.06]" />

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1.5">
        <StatBox value={syncStats?.projectCount ?? '—'} label="Projects" />
        <StatBox value={syncStats?.issueCount ?? '—'} label="Issues" />
        <StatBox
          value={syncStats?.queueDepth ?? 0}
          label="Queue"
          valueColor={(syncStats?.queueDepth ?? 0) === 0 ? 'text-emerald-600' : 'text-amber-600'}
        />
      </div>

      {/* Detail rows */}
      <div className="space-y-0 px-0.5">
        <DetailRow label="Direction" value="↔ Bi-directional" />
        <DetailRow label="Failed events" value={syncStats?.failedCount ?? 0}
          valueColor={(syncStats?.failedCount ?? 0) === 0 ? 'text-emerald-600' : 'text-red-600'} />
        <DetailRow label="Webhook"
          value={
            <span className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", syncStats?.webhookActive ? "bg-emerald-500" : "bg-red-500")} />
              {syncStats?.webhookActive ? 'Active' : 'Inactive'}
            </span>
          }
        />
      </div>

      {/* Sync Now button */}
      <button
        onClick={handleSyncNow}
        disabled={syncing}
        className={cn(
          "w-full h-10 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-all",
          "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]",
          "hover:from-blue-500 hover:to-blue-600 hover:shadow-[0_4px_12px_rgba(37,99,235,0.35)]",
          "active:from-blue-700 active:to-blue-800",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
          "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none"
        )}
        style={{ border: 'none', cursor: syncing ? 'wait' : 'pointer' }}
      >
        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}
