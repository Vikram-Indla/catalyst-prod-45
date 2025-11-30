import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface SyncLogsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

export function SyncLogsViewer({ open, onOpenChange, connectionId }: SyncLogsViewerProps) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (open && connectionId) {
      loadLogs();
    }
  }, [open, connectionId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jira_sync_logs")
        .select("*")
        .eq("connection_id", connectionId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Loader2 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      success: "default",
      error: "destructive",
      warning: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className={status === "success" ? "bg-brand-gold" : ""}>
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Sync Logs</DialogTitle>
          <DialogDescription>
            View synchronization history and status
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No sync logs found
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {getStatusIcon(log.status)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {log.entity_type || "Unknown"}
                          </span>
                          {getStatusBadge(log.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "PPpp")}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.sync_direction && (
                          <span className="inline-flex items-center gap-1">
                            Direction: {log.sync_direction.replace(/_/g, " → ")}
                          </span>
                        )}
                        {log.jira_issue_key && (
                          <span className="ml-3">
                            Jira: {log.jira_issue_key}
                          </span>
                        )}
                        {log.entity_id && (
                          <span className="ml-3">
                            ID: {log.entity_id.substring(0, 8)}
                          </span>
                        )}
                      </div>
                      {log.error_message && (
                        <div className="text-sm text-destructive mt-2 p-2 bg-destructive/10 rounded">
                          {log.error_message}
                        </div>
                      )}
                      {log.metadata && (
                        <details className="text-xs mt-2">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View metadata
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
