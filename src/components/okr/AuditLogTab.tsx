import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Clock, User, FileText, Target } from "lucide-react";

interface AuditLogTabProps {
  objectiveId: string;
}

export function AuditLogTab({ objectiveId }: AuditLogTabProps) {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", objectiveId],
    queryFn: async () => {
      // Fetch objective audit logs
      const { data: objectiveLogs, error: objError } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("entity_type", "objective")
        .eq("entity_id", objectiveId)
        .order("created_at", { ascending: false });

      if (objError) throw objError;

      // Fetch key_results_v2 for this objective to get their IDs
      const { data: keyResults } = await supabase
        .from("key_results_v2")
        .select("id")
        .eq("objective_id", objectiveId);

      const krIds = keyResults?.map(kr => kr.id) || [];

      // Fetch key result audit logs if there are key results
      let krLogs: any[] = [];
      if (krIds.length > 0) {
        const { data, error: krError } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("entity_type", "key_result")
          .in("entity_id", krIds)
          .order("created_at", { ascending: false });

        if (!krError && data) {
          krLogs = data;
        }
      }

      // Combine and sort by created_at
      const allLogs = [...(objectiveLogs || []), ...krLogs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allLogs;
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

  const getEntityIcon = (entityType: string) => {
    if (entityType === 'key_result') return <Target className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  const getEntityLabel = (entityType: string) => {
    if (entityType === 'key_result') return 'Key Result';
    return 'Objective';
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
                    {getEntityIcon(log.entity_type)}
                    <span>{getEntityLabel(log.entity_type)}</span>
                  </div>
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
