import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { format } from "date-fns";

interface SyncHealthDashboardProps {
  connectionId: string;
}

export function SyncHealthDashboard({ connectionId }: SyncHealthDashboardProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["jira-sync-health", connectionId],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("jira_sync_logs")
        .select("*")
        .eq("connection_id", connectionId)
        .order("synced_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const total = logs.length;
      const success = logs.filter((l) => l.status === "success").length;
      const failed = logs.filter((l) => l.status === "failed").length;
      const conflicts = logs.filter((l) => l.status === "conflict").length;
      const lastSync = logs[0]?.completed_at || logs[0]?.started_at;

      const successRate = total > 0 ? (success / total) * 100 : 0;

      return {
        total,
        success,
        failed,
        conflicts,
        lastSync,
        successRate,
        recentLogs: logs.slice(0, 10),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-gold" />
              Total Syncs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conflicts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failed || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Sync Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.lastSync && (
            <div className="text-sm text-muted-foreground mb-3">
              Last sync: {format(new Date(stats.lastSync), "MMM dd, yyyy HH:mm:ss")}
            </div>
          )}
          <div className="space-y-2">
            {stats?.recentLogs.map((log) => {
              const errorDetails = log.error_details as any;
              const syncDate = log.completed_at || log.started_at;
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        log.status === "success"
                          ? "default"
                          : log.status === "failed"
                          ? "destructive"
                          : "outline"
                      }
                      className={
                        log.status === "success"
                          ? "bg-green-500 hover:bg-green-600"
                          : log.status === "conflict"
                          ? "bg-amber-500 hover:bg-amber-600"
                          : ""
                      }
                    >
                      {log.status}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium">
                        {log.entity_type} • {log.sync_type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(syncDate), "HH:mm:ss")}
                      </div>
                    </div>
                  </div>
                  {errorDetails?.message && (
                    <div className="text-xs text-destructive max-w-md truncate">
                      {errorDetails.message}
                    </div>
                  )}
                </div>
              );
             })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

