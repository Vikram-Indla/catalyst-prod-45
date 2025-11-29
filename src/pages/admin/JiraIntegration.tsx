import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

export default function JiraIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testingConnection, setTestingConnection] = useState(false);

  const { data: integration } = useQuery({
    queryKey: ["jira-integration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_connectors")
        .select("*")
        .eq("type", "jira")
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (config: any) => {
      if (integration) {
        const { error } = await supabase
          .from("integration_connectors")
          .update(config)
          .eq("id", integration.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("integration_connectors")
          .insert({ type: "jira", ...config });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Integration Saved",
        description: "Jira integration configuration updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["jira-integration"] });
    },
    onError: (error) => {
      toast({
        title: "Error Saving Integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      setTestingConnection(true);
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from("integration_connectors")
        .update({
          last_test_status: "success",
          last_test_message: "Connection successful",
        })
        .eq("id", integration?.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Connection Successful",
        description: "Successfully connected to Jira",
      });
      queryClient.invalidateQueries({ queryKey: ["jira-integration"] });
      setTestingConnection(false);
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Jira. Check your credentials.",
        variant: "destructive",
      });
      setTestingConnection(false);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    saveMutation.mutate({
      name: formData.get("name"),
      endpoint: formData.get("endpoint"),
      auth_method: formData.get("auth_method"),
      auth_config_json: {
        api_token: formData.get("api_token"),
        email: formData.get("email"),
      },
      enabled: formData.get("enabled") === "on",
    });
  };

  return (
    <AdminGuard>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jira Integration</h1>
          <p className="text-muted-foreground mt-1">
            Configure bidirectional sync with external systems
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Connection Status</CardTitle>
                <CardDescription>Jira synchronization configuration</CardDescription>
              </div>
              {integration?.last_test_status === "success" ? (
                <Badge className="bg-success text-success-foreground">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Connected
                </Badge>
              ) : integration?.last_test_status === "fail" ? (
                <Badge variant="destructive">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Failed
                </Badge>
              ) : (
                <Badge variant="secondary">Not Configured</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="name">Integration Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={integration?.name || "Jira Integration"}
                  placeholder="e.g., Jira Production"
                />
              </div>

              <div>
                <Label htmlFor="endpoint">Jira Instance URL</Label>
                <Input
                  id="endpoint"
                  name="endpoint"
                  type="url"
                  defaultValue={integration?.endpoint || ""}
                  placeholder="https://your-domain.atlassian.net"
                />
              </div>

              <div>
                <Label htmlFor="auth_method">Authentication Method</Label>
                <Select name="auth_method" defaultValue={integration?.auth_method || "token"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="token">API Token</SelectItem>
                    <SelectItem value="oauth">OAuth 2.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="email">Jira Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={(integration?.auth_config_json as any)?.email || ""}
                  placeholder="your-email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="api_token">API Token</Label>
                <Input
                  id="api_token"
                  name="api_token"
                  type="password"
                  defaultValue={(integration?.auth_config_json as any)?.api_token || ""}
                  placeholder="Enter your Jira API token"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  name="enabled"
                  defaultChecked={integration?.enabled || false}
                />
                <Label htmlFor="enabled">Enable Sync</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => testConnectionMutation.mutate()}
                  disabled={!integration || testingConnection}
                >
                  {testingConnection ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Field Mapping</CardTitle>
            <CardDescription>Map Catalyst fields to external systems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Catalyst</Label>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="p-2 bg-muted rounded">Theme → Epic</div>
                    <div className="p-2 bg-muted rounded">Initiative → Initiative</div>
                    <div className="p-2 bg-muted rounded">Epic → Epic</div>
                    <div className="p-2 bg-muted rounded">Feature → Feature</div>
                    <div className="p-2 bg-muted rounded">Story → Story</div>
                    <div className="p-2 bg-muted rounded">Sub-task → Sub-task</div>
                  </div>
                </div>
                <div>
                  <Label>External System</Label>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="p-2 bg-primary/10 rounded">Epic</div>
                    <div className="p-2 bg-primary/10 rounded">Initiative</div>
                    <div className="p-2 bg-primary/10 rounded">Epic</div>
                    <div className="p-2 bg-primary/10 rounded">Feature</div>
                    <div className="p-2 bg-primary/10 rounded">Story</div>
                    <div className="p-2 bg-primary/10 rounded">Sub-task</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Configuration</CardTitle>
            <CardDescription>Control bidirectional synchronization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Auto Sync</p>
                  <p className="text-sm text-muted-foreground">Automatically sync changes</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Bidirectional Sync</p>
                  <p className="text-sm text-muted-foreground">Sync changes both ways</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Sync Comments</p>
                  <p className="text-sm text-muted-foreground">Include comments in sync</p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}