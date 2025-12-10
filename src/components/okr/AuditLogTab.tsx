import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Target, FileText, AlertCircle } from "lucide-react";

interface AuditLogTabProps {
  objectiveId: string;
}

// Fields to exclude from change display (noise/metadata)
const EXCLUDED_FIELDS = [
  'updated_at', 
  'created_at', 
  'id', 
  'score_config',
  'program_increment_ids',
  'contributors',
  'tags',
  'updated_by',
  'created_by',
];

// Human-readable field names
const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  summary: 'Summary',
  description: 'Description',
  tier: 'Tier',
  status: 'Status',
  health: 'Health',
  owner_id: 'Owner',
  start_date: 'Start Date',
  due_date: 'Due Date',
  is_blocked: 'Blocked',
  current_value: 'Current Value',
  goal_value: 'Goal Value',
  baseline_value: 'Baseline Value',
  metric_type: 'Metric Type',
  confidence_score: 'Confidence Score',
  work_progress: 'Work Progress',
  key_result_progress: 'KR Progress',
  portfolio_id: 'Portfolio',
  program_id: 'Program',
  category: 'Category',
  type: 'Type',
};

export function AuditLogTab({ objectiveId }: AuditLogTabProps) {
  const { data: auditLogs = [], isLoading, isError, error } = useQuery({
    queryKey: ["audit-logs", objectiveId],
    queryFn: async () => {
      // Fetch objective audit logs - use left join for profiles
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

      // Combine logs
      const allLogs = [...(objectiveLogs || []), ...krLogs];

      // Fetch profiles for all actor_ids
      const actorIds = [...new Set(allLogs.map(log => log.actor_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", actorIds);
        
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }

      // Attach profiles to logs and sort
      const logsWithProfiles = allLogs.map(log => ({
        ...log,
        profile: log.actor_id ? profilesMap[log.actor_id] : null,
      })).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return logsWithProfiles;
    },
  });

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading audit log...</div>;
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
        <p className="text-muted-foreground">Unable to load audit history</p>
        <p className="text-xs text-muted-foreground mt-1">{(error as Error)?.message || 'Unknown error'}</p>
      </Card>
    );
  }

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes("created")) return "default";
    if (action.includes("updated") || action.includes("status_changed")) return "secondary";
    if (action.includes("deleted")) return "destructive";
    return "outline";
  };

  const getEntityIcon = (entityType: string) => {
    if (entityType === 'key_result') return <Target className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  const getEntityLabel = (entityType: string) => {
    if (entityType === 'key_result') return 'Key Result';
    return 'Objective';
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy, HH:mm");
    } catch {
      return dateStr;
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      // Don't show [object Object] - just show a summary or skip
      return '(complex value)';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const getChangedFields = (before: any, after: any) => {
    if (!before || !after) return [];
    
    const changes: { field: string; from: any; to: any }[] = [];
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    
    for (const key of allKeys) {
      if (EXCLUDED_FIELDS.includes(key)) continue;
      
      const beforeVal = before?.[key];
      const afterVal = after?.[key];
      
      // Skip if both are objects (complex fields)
      if (typeof beforeVal === 'object' && beforeVal !== null) continue;
      if (typeof afterVal === 'object' && afterVal !== null) continue;
      
      // Compare stringified values for simple comparison
      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        changes.push({ 
          field: FIELD_LABELS[key] || key, 
          from: beforeVal, 
          to: afterVal 
        });
      }
    }
    
    return changes;
  };

  const getUserDisplay = (log: any) => {
    const profile = log.profile;
    const name = profile?.full_name || 'System';
    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'SY';
    
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-xs bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">{name}</span>
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
        auditLogs.map((log) => {
          const changes = getChangedFields(log.before_json, log.after_json);
          
          return (
            <Card key={log.id} className="p-4">
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {getEntityIcon(log.entity_type)}
                      <span>{getEntityLabel(log.entity_type)}</span>
                    </div>
                    {getUserDisplay(log)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {log.created_at && formatDate(log.created_at)}
                  </div>
                </div>

                {/* Changes section - only show for updates with actual changes */}
                {log.action !== 'created' && changes.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Changes:</div>
                    <div className="space-y-1.5 pl-2">
                      {changes.map((change, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{change.field}:</span>{' '}
                          <span className="text-muted-foreground line-through">
                            {formatValue(change.from)}
                          </span>
                          {' → '}
                          <span>{formatValue(change.to)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
