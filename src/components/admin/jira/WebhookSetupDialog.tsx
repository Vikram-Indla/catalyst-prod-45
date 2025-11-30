import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface WebhookSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

export function WebhookSetupDialog({ open, onOpenChange, connectionId }: WebhookSetupDialogProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      loadWebhookSettings();
      generateWebhookUrl();
    }
  }, [open, connectionId]);

  const generateWebhookUrl = () => {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin;
    const url = `${projectUrl}/functions/v1/jira-webhook-handler`;
    setWebhookUrl(url);
  };

  const loadWebhookSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("jira_connections")
        .select("sync_settings")
        .eq("id", connectionId)
        .single();

      if (error) throw error;
      const settings = data?.sync_settings as any;
      setWebhookEnabled(settings?.webhook_sync_enabled || false);
    } catch (error: any) {
      console.error("Error loading webhook settings:", error);
    }
  };

  const toggleWebhook = async (enabled: boolean) => {
    try {
      const { data: current } = await supabase
        .from("jira_connections")
        .select("sync_settings")
        .eq("id", connectionId)
        .single();

      const settings = (current?.sync_settings as any) || {};
      settings.webhook_sync_enabled = enabled;

      const { error } = await supabase
        .from("jira_connections")
        .update({ sync_settings: settings as any })
        .eq("id", connectionId);

      if (error) throw error;
      setWebhookEnabled(enabled);
      toast.success(`Webhook ${enabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Webhook URL copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Webhook Setup</DialogTitle>
          <DialogDescription>
            Configure Jira webhook for real-time synchronization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="webhook-enabled">Enable Webhook Sync</Label>
              <div className="text-sm text-muted-foreground">
                Receive real-time updates from Jira
              </div>
            </div>
            <Switch
              id="webhook-enabled"
              checked={webhookEnabled}
              onCheckedChange={toggleWebhook}
            />
          </div>

          {webhookEnabled && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Copy this webhook URL and configure it in your Jira instance under System → WebHooks
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Jira Webhook Configuration Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Go to your Jira instance as an administrator</li>
                  <li>Navigate to Settings → System → WebHooks</li>
                  <li>Click "Create a WebHook"</li>
                  <li>Enter a name (e.g., "Catalyst Integration")</li>
                  <li>Paste the webhook URL above</li>
                  <li>
                    Select events to monitor:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Issue created</li>
                      <li>Issue updated</li>
                      <li>Issue deleted</li>
                      <li>Comment created (optional)</li>
                      <li>Comment updated (optional)</li>
                    </ul>
                  </li>
                  <li>Leave authentication as "None" (Catalyst validates internally)</li>
                  <li>Save the webhook</li>
                </ol>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Important:</strong> Make sure your Jira instance can reach this webhook URL. 
                  For Jira Cloud, the URL must be publicly accessible. For Jira Server/Data Center, 
                  ensure network connectivity between Jira and Catalyst.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
