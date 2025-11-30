import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Settings, Map, RefreshCw, Link as LinkIcon } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { ConnectionFormDialog } from "@/components/admin/jira/ConnectionFormDialog";
import { FieldMappingDialog } from "@/components/admin/jira/FieldMappingDialog";
import { ProjectMappingDialog } from "@/components/admin/jira/ProjectMappingDialog";
import { SyncLogsViewer } from "@/components/admin/jira/SyncLogsViewer";
import { SyncSettingsDialog } from "@/components/admin/jira/SyncSettingsDialog";
import { WebhookSetupDialog } from "@/components/admin/jira/WebhookSetupDialog";
import { StatusMappingDialog } from "@/components/admin/jira/StatusMappingDialog";
import { HistoricalMigrationDialog } from "@/components/admin/jira/HistoricalMigrationDialog";
import { ConflictResolutionDialog } from "@/components/admin/jira/ConflictResolutionDialog";
import { SyncHealthDashboard } from "@/components/admin/jira/SyncHealthDashboard";
import { JiraSetupGuide } from "@/components/admin/jira/JiraSetupGuide";
import { JiraIntegrationHelp } from "@/components/admin/jira/JiraIntegrationHelp";

interface JiraConnection {
  id: string;
  name: string;
  jira_url: string;
  instance_type: string;
  auth_method: string;
  is_active: boolean;
  last_test_status: string | null;
  last_test_message: string | null;
  last_sync_at: string | null;
}

export default function JiraIntegrationConfig() {
  const queryClient = useQueryClient();
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [showProjectMapping, setShowProjectMapping] = useState(false);
  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showWebhookSetup, setShowWebhookSetup] = useState(false);
  const [showStatusMapping, setShowStatusMapping] = useState(false);
  const [showHistoricalMigration, setShowHistoricalMigration] = useState(false);
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingConnection, setEditingConnection] = useState<any>(null);
  const [syncingConnection, setSyncingConnection] = useState<string | null>(null);

  const { data: connections, isLoading } = useQuery({
    queryKey: ["jira-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jira_connections")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as JiraConnection[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("jira_connections")
        .delete()
        .eq("id", connectionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Connection deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["jira-connections"] });
      setSelectedConnection(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete connection: ${error.message}`);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("jira-sync-work-items", {
        body: { connectionId, syncDirection: "bidirectional" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Sync complete: ${data.syncedToJira} to Jira, ${data.syncedFromJira} from Jira`);
      if (data.errors?.length > 0) {
        toast.error(`${data.errors.length} errors occurred`);
      }
      queryClient.invalidateQueries({ queryKey: ["jira-connections"] });
    },
    onError: (error: any) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const handleSync = (connectionId: string) => {
    setSyncingConnection(connectionId);
    syncMutation.mutate(connectionId);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Not Tested</Badge>;
    
    const variants = {
      success: "default",
      failed: "destructive",
      pending: "outline",
    } as const;
    
    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || "outline"}
        className={status === 'success' ? 'bg-brand-gold hover:bg-brand-gold-hover text-white' : ''}
      >
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background overflow-hidden">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Jira Integration Configuration</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure bidirectional synchronization between Catalyst and Jira instances
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowHelp(true)}
              className="border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white"
            >
              📚 Documentation
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Jira Connections</CardTitle>
                  <CardDescription>
                    Manage connections to Jira Cloud, Server, and Data Center instances
                  </CardDescription>
                </div>
                <Button 
                  className="bg-brand-gold hover:bg-brand-gold-hover text-white"
                  onClick={() => {
                    setEditingConnection(null);
                    setShowConnectionDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Connection
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
                  </div>
                ) : connections && connections.length > 0 ? (
                  <div className="space-y-3">
                    {connections.map((conn) => (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:border-brand-gold transition-colors cursor-pointer"
                        onClick={() => setSelectedConnection(conn.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <LinkIcon className="w-4 h-4 text-brand-gold" />
                            <div>
                              <h3 className="font-medium">{conn.name}</h3>
                              <p className="text-sm text-muted-foreground">{conn.jira_url}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm">
                            <div className="text-muted-foreground">
                              {conn.instance_type} · {conn.auth_method}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {conn.last_sync_at 
                                ? `Last synced: ${new Date(conn.last_sync_at).toLocaleString()}`
                                : 'Never synced'}
                            </div>
                          </div>
                          {getStatusBadge(conn.last_test_status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnection(conn.id);
                              setShowSyncSettings(true);
                            }}
                            title="Sync Settings"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnection(conn.id);
                              setShowFieldMapping(true);
                            }}
                            title="Field Mappings"
                          >
                            <Map className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnection(conn.id);
                              setShowProjectMapping(true);
                            }}
                            title="Project Mappings"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnection(conn.id);
                              setShowSyncLogs(true);
                            }}
                            title="View Logs"
                          >
                            📋
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnection(conn.id);
                              setShowWebhookSetup(true);
                            }}
                            title="Webhook Setup"
                          >
                            🔗
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnection(conn.id);
                              setShowStatusMapping(true);
                            }}
                            title="Status Mapping"
                          >
                            🔄
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnection(conn.id);
                              setShowHistoricalMigration(true);
                            }}
                            title="Historical Migration"
                          >
                            📥
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnection(conn.id);
                              setShowConflictResolution(true);
                            }}
                            title="Resolve Conflicts"
                          >
                            ⚠️
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSync(conn.id);
                            }}
                            disabled={syncingConnection === conn.id}
                          >
                            {syncingConnection === conn.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this connection?")) {
                                deleteMutation.mutate(conn.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <LinkIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-medium mb-2">No connections configured</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add your first Jira connection to start synchronizing work items
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {!connections || connections.length === 0 ? (
              <JiraSetupGuide hasConnections={false} />
            ) : null}

            {selectedConnection && (
              <Card>
                <CardHeader>
                  <CardTitle>Sync Health & Metrics</CardTitle>
                  <CardDescription>
                    Real-time synchronization health and performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SyncHealthDashboard connectionId={selectedConnection} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <ConnectionFormDialog
          open={showConnectionDialog}
          onOpenChange={setShowConnectionDialog}
          connection={editingConnection}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["jira-connections"] });
            setEditingConnection(null);
          }}
        />

        {selectedConnection && (
          <>
            <FieldMappingDialog
              open={showFieldMapping}
              onOpenChange={setShowFieldMapping}
              connectionId={selectedConnection}
            />
            <ProjectMappingDialog
              open={showProjectMapping}
              onOpenChange={setShowProjectMapping}
              connectionId={selectedConnection}
            />
            <SyncLogsViewer
              open={showSyncLogs}
              onOpenChange={setShowSyncLogs}
              connectionId={selectedConnection}
            />
            <SyncSettingsDialog
              open={showSyncSettings}
              onOpenChange={setShowSyncSettings}
              connectionId={selectedConnection}
            />
            <WebhookSetupDialog
              open={showWebhookSetup}
              onOpenChange={setShowWebhookSetup}
              connectionId={selectedConnection}
            />
            <StatusMappingDialog
              open={showStatusMapping}
              onOpenChange={setShowStatusMapping}
              connectionId={selectedConnection}
            />
            <HistoricalMigrationDialog
              open={showHistoricalMigration}
              onOpenChange={setShowHistoricalMigration}
              connectionId={selectedConnection}
            />
            <ConflictResolutionDialog
              open={showConflictResolution}
              onOpenChange={setShowConflictResolution}
              connectionId={selectedConnection}
            />
          </>
        )}

        <JiraIntegrationHelp open={showHelp} onOpenChange={setShowHelp} />
      </div>
    </AdminGuard>
  );
}
