import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  connectionId,
}: ConflictResolutionDialogProps) {
  const queryClient = useQueryClient();

  const { data: conflicts, isLoading } = useQuery({
    queryKey: ["jira-conflicts", connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jira_sync_logs")
        .select("*")
        .eq("connection_id", connectionId)
        .eq("status", "conflict")
        .order("synced_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({
      logId,
      resolution,
    }: {
      logId: string;
      resolution: "catalyst" | "jira" | "merge";
    }) => {
      const { data, error } = await supabase.functions.invoke("jira-resolve-conflict", {
        body: { logId, resolution },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Conflict resolved");
      queryClient.invalidateQueries({ queryKey: ["jira-conflicts"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to resolve: ${error.message}`);
    },
  });

  const resolveAll = useMutation({
    mutationFn: async (resolution: "catalyst" | "jira") => {
      const { data, error } = await supabase.functions.invoke("jira-resolve-all-conflicts", {
        body: { connectionId, resolution },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Resolved ${data.resolved} conflicts`);
      queryClient.invalidateQueries({ queryKey: ["jira-conflicts"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to resolve all: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conflict Resolution</DialogTitle>
          <DialogDescription>
            Resolve synchronization conflicts between Catalyst and Jira
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
          </div>
        ) : conflicts && conflicts.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="font-medium">{conflicts.length} Unresolved Conflicts</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveAll.mutate("catalyst")}
                  disabled={resolveAll.isPending}
                >
                  Prefer Catalyst (All)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveAll.mutate("jira")}
                  disabled={resolveAll.isPending}
                >
                  Prefer Jira (All)
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {conflicts.map((conflict) => {
                const errorDetails = conflict.error_details as any;
                return (
                  <div
                    key={conflict.id}
                    className="border rounded-lg p-4 hover:border-brand-gold transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive">Conflict</Badge>
                          <span className="text-sm text-muted-foreground">
                            {conflict.entity_type} • {conflict.sync_type}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(conflict.completed_at || conflict.started_at), "MMM dd, yyyy HH:mm")}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            resolveMutation.mutate({
                              logId: conflict.id,
                              resolution: "catalyst",
                            })
                          }
                          disabled={resolveMutation.isPending}
                        >
                          Keep Catalyst
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            resolveMutation.mutate({
                              logId: conflict.id,
                              resolution: "jira",
                            })
                          }
                          disabled={resolveMutation.isPending}
                        >
                          Keep Jira
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            resolveMutation.mutate({
                              logId: conflict.id,
                              resolution: "merge",
                            })
                          }
                          disabled={resolveMutation.isPending}
                        >
                          Merge
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="font-medium text-brand-gold">Catalyst Version</div>
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(errorDetails?.catalyst || {}, null, 2)}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-blue-500">Jira Version</div>
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(errorDetails?.jira || {}, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {errorDetails?.message && (
                      <div className="mt-3 text-xs text-destructive">
                        Error: {errorDetails.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">No Conflicts</h3>
            <p className="text-sm text-muted-foreground">
              All synchronization conflicts have been resolved
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
