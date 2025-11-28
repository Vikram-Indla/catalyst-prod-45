import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Clock, User } from "lucide-react";

interface AuditLogTabProps {
  objectiveId: string;
}

export function AuditLogTab({ objectiveId }: AuditLogTabProps) {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("entity_type", "objective")
        .eq("entity_id", objectiveId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading audit log...</div>;
  }

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("create")) return "default";
    if (action.includes("update")) return "secondary";
    if (action.includes("delete")) return "destructive";
    return "outline";
  };

  const formatFieldChange = (before: any, after: any, field: string) => {
    const beforeVal = before?.[field];
    const afterVal = after?.[field];
    
    if (beforeVal === afterVal) return null;
    
    return (
      <div className="text-sm space-y-1">
        <div className="font-medium text-foreground">{field}</div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground line-through">{String(beforeVal || 'null')}</span>
          <span>→</span>
          <span className="text-foreground">{String(afterVal || 'null')}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {auditLogs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No activity recorded yet
        </Card>
      ) : (
        auditLogs.map((log) => (
          <Card key={log.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {log.action}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>User</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {log.created_at && formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </div>
              </div>

              {log.before_json && log.after_json && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="text-xs font-medium text-muted-foreground">Changes:</div>
                  <div className="space-y-2 pl-4">
                    {Object.keys(log.after_json as object).map((field) =>
                      formatFieldChange(log.before_json, log.after_json, field)
                    ).filter(Boolean)}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
