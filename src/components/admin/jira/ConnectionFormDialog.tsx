import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ConnectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: any;
  onSuccess: () => void;
}

export function ConnectionFormDialog({ open, onOpenChange, connection, onSuccess }: ConnectionFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState({
    name: connection?.name || "",
    jira_url: connection?.jira_url || "",
    instance_type: connection?.instance_type || "cloud",
    auth_method: connection?.auth_method || "basic",
    username: "",
    api_token: "",
    oauth_token: "",
    oauth_secret: "",
    personal_access_token: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create or update connection
      const connectionData = {
        name: formData.name,
        jira_url: formData.jira_url,
        instance_type: formData.instance_type,
        auth_method: formData.auth_method,
        is_active: true,
      };

      let connectionId = connection?.id;

      if (connection?.id) {
        const { error } = await supabase
          .from("jira_connections")
          .update(connectionData)
          .eq("id", connection.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("jira_connections")
          .insert(connectionData)
          .select()
          .single();
        if (error) throw error;
        connectionId = data.id;
      }

      // Store credentials
      const credentialData: any = {
        connection_id: connectionId,
        auth_method: formData.auth_method,
      };

      if (formData.auth_method === "basic") {
        credentialData.username = formData.username;
        credentialData.api_token = formData.api_token;
      } else if (formData.auth_method === "oauth") {
        credentialData.oauth_token = formData.oauth_token;
        credentialData.oauth_secret = formData.oauth_secret;
      } else if (formData.auth_method === "pat") {
        credentialData.personal_access_token = formData.personal_access_token;
      }

      const { error: credError } = await supabase
        .from("jira_auth_credentials")
        .upsert(credentialData);
      
      if (credError) throw credError;

      toast.success(connection ? "Connection updated" : "Connection created");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("jira-test-connection", {
        body: {
          jiraUrl: formData.jira_url,
          authMethod: formData.auth_method,
          credentials: {
            username: formData.username,
            apiToken: formData.api_token,
            oauthToken: formData.oauth_token,
            oauthSecret: formData.oauth_secret,
            personalAccessToken: formData.personal_access_token,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(data.message || "Connection test failed");
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{connection ? "Edit" : "Add"} Jira Connection</DialogTitle>
          <DialogDescription>
            Configure connection to your Jira instance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Production Jira"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jira_url">Jira URL</Label>
            <Input
              id="jira_url"
              value={formData.jira_url}
              onChange={(e) => setFormData({ ...formData, jira_url: e.target.value })}
              placeholder="https://your-domain.atlassian.net"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instance_type">Instance Type</Label>
              <Select
                value={formData.instance_type}
                onValueChange={(value) => setFormData({ ...formData, instance_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloud">Jira Cloud</SelectItem>
                  <SelectItem value="server">Jira Server</SelectItem>
                  <SelectItem value="datacenter">Jira Data Center</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth_method">Authentication</Label>
              <Select
                value={formData.auth_method}
                onValueChange={(value) => setFormData({ ...formData, auth_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Auth (API Token)</SelectItem>
                  <SelectItem value="oauth">OAuth 1.0</SelectItem>
                  <SelectItem value="pat">Personal Access Token</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={formData.auth_method} className="w-full">
            <TabsContent value="basic" className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="username">Email / Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_token">API Token</Label>
                <Input
                  id="api_token"
                  type="password"
                  value={formData.api_token}
                  onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                  placeholder="Enter API token"
                />
              </div>
            </TabsContent>

            <TabsContent value="oauth" className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="oauth_token">OAuth Token</Label>
                <Input
                  id="oauth_token"
                  type="password"
                  value={formData.oauth_token}
                  onChange={(e) => setFormData({ ...formData, oauth_token: e.target.value })}
                  placeholder="Enter OAuth token"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oauth_secret">OAuth Secret</Label>
                <Input
                  id="oauth_secret"
                  type="password"
                  value={formData.oauth_secret}
                  onChange={(e) => setFormData({ ...formData, oauth_secret: e.target.value })}
                  placeholder="Enter OAuth secret"
                />
              </div>
            </TabsContent>

            <TabsContent value="pat" className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="personal_access_token">Personal Access Token</Label>
                <Input
                  id="personal_access_token"
                  type="password"
                  value={formData.personal_access_token}
                  onChange={(e) => setFormData({ ...formData, personal_access_token: e.target.value })}
                  placeholder="Enter personal access token"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || !formData.jira_url}
            >
              {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Test Connection
            </Button>
            <Button type="submit" disabled={loading} className="bg-brand-gold hover:bg-brand-gold-hover">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {connection ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
