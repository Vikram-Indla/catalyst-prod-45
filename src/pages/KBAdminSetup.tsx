import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';

interface TrainStatus {
  total_questions: number;
  embedded: number;
  remaining: number;
  percentage: number;
}

export default function KBAdminSetup() {
  const [status, setStatus] = useState<TrainStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<{ time: string; action: string; result: any }[]>([]);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("kb-train", {
        body: { action: "status" },
      });
      if (error) throw error;
      setStatus(data);
    } catch (e: any) {
      addLog("status", { error: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Elapsed time counter for long-running ops
  useEffect(() => {
    if (!actionLoading) { setElapsed(0); return; }
    const start = Date.now();
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [actionLoading]);

  const addLog = (action: string, result: any) => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), action, result }, ...prev]);
  };

  const runAction = async (action: string, label: string) => {
    setActionLoading(label);
    try {
      const { data, error } = await supabase.functions.invoke("kb-train", {
        body: { action },
      });
      if (error) throw error;
      addLog(label, data);
      await fetchStatus();
    } catch (e: any) {
      addLog(label, { error: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const total = status?.total_questions ?? 0;
  const embedded = status?.embedded ?? 0;
  const remaining = status?.remaining ?? 0;
  const pct = status?.percentage ?? 0;

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <CatalystPageHeader title="KB Admin — Training Setup" />

      {/* Status Card */}
      <div className="border rounded-lg p-6 space-y-4 bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Training Status</h2>
          <button onClick={fetchStatus} disabled={loading} className="text-xs px-3 py-1 rounded border hover:bg-accent disabled:opacity-50">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {status ? (
          <>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold">{total}</div><div className="text-xs text-muted-foreground">Total Questions</div></div>
              <div><div className="text-2xl font-bold text-primary">{embedded}</div><div className="text-xs text-muted-foreground">Embedded</div></div>
              <div><div className="text-2xl font-bold text-destructive">{remaining}</div><div className="text-xs text-muted-foreground">Remaining</div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Progress</span><span>{pct}%</span></div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Remaining: {remaining}</div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">{loading ? "Loading…" : "No data"}</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => runAction("embed_batch", "Embed Batch (50)")}
          disabled={!!actionLoading}
          className="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-sm font-medium"
        >
          Embed Batch (50)
        </button>
        <button
          onClick={() => runAction("embed_all", "Embed ALL (1,500)")}
          disabled={!!actionLoading}
          className="px-4 py-2 rounded bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 text-sm font-medium"
        >
          Embed ALL (1,500)
        </button>
        <button
          onClick={() => runAction("warm_cache", "Warm Cache")}
          disabled={!!actionLoading}
          className="px-4 py-2 rounded border hover:bg-accent disabled:opacity-50 text-sm font-medium"
        >
          Warm Cache
        </button>
      </div>

      {/* Loading indicator */}
      {actionLoading && (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div>
            <div className="text-sm font-medium">Running: {actionLoading}</div>
            <div className="text-xs text-muted-foreground">Elapsed: {Math.floor(elapsed / 60)}m {elapsed % 60}s</div>
          </div>
        </div>
      )}

      {/* Results Log */}
      <div className="border rounded-lg p-4 space-y-2 bg-card">
        <h2 className="text-sm font-semibold">Results Log</h2>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No actions run yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="text-xs border rounded p-2 bg-muted/30">
                <div className="font-medium">[{log.time}] {log.action}</div>
                <pre className="mt-1 whitespace-pre-wrap break-all text-muted-foreground">{JSON.stringify(log.result, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
