import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SyncSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

interface SyncSettings {
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  sync_direction: string;
  conflict_resolution: string;
  sync_attachments: boolean;
  sync_comments: boolean;
  sync_work_logs: boolean;
}

export function SyncSettingsDialog({ open, onOpenChange, connectionId }: SyncSettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SyncSettings>({
    auto_sync_enabled: false,
    sync_interval_minutes: 15,
    sync_direction: "bidirectional",
    conflict_resolution: "jira_wins",
    sync_attachments: true,
    sync_comments: true,
    sync_work_logs: false,
  });

  useEffect(() => {
    if (open && connectionId) {
      loadSettings();
    }
  }, [open, connectionId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jira_connections")
        .select("sync_settings")
        .eq("id", connectionId)
        .single();

      if (error) throw error;
      if (data?.sync_settings) {
        setSettings(data.sync_settings as unknown as SyncSettings);
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("jira_connections")
        .update({ sync_settings: settings as any })
        .eq("id", connectionId);

      if (error) throw error;
      toast.success("Sync settings saved");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sync Settings</DialogTitle>
          <DialogDescription>
            Configure automatic synchronization behavior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Auto Sync</Label>
              <div className="text-sm text-muted-foreground">
                Enable automatic background synchronization
              </div>
            </div>
            <Switch
              id="auto-sync"
              checked={settings.auto_sync_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_sync_enabled: checked })
              }
            />
          </div>

          {settings.auto_sync_enabled && (
            <div className="space-y-2">
              <Label htmlFor="interval">Sync Interval (minutes)</Label>
              <Input
                id="interval"
                type="number"
                min="5"
                max="1440"
                value={settings.sync_interval_minutes}
                onChange={(e) =>
                  setSettings({ ...settings, sync_interval_minutes: parseInt(e.target.value) || 15 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum: 5 minutes, Maximum: 24 hours (1440 minutes)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="direction">Sync Direction</Label>
            <Select
              value={settings.sync_direction}
              onValueChange={(value) =>
                setSettings({ ...settings, sync_direction: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bidirectional">Bidirectional (Both ways)</SelectItem>
                <SelectItem value="catalyst_to_jira">Catalyst → Jira only</SelectItem>
                <SelectItem value="jira_to_catalyst">Jira → Catalyst only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conflict">Conflict Resolution</Label>
            <Select
              value={settings.conflict_resolution}
              onValueChange={(value) =>
                setSettings({ ...settings, conflict_resolution: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jira_wins">Jira Wins (Use Jira data)</SelectItem>
                <SelectItem value="catalyst_wins">Catalyst Wins (Use Catalyst data)</SelectItem>
                <SelectItem value="newest_wins">Newest Wins (Use most recent update)</SelectItem>
                <SelectItem value="manual">Manual Review Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <Label className="text-base mb-3 block">Additional Data</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="attachments">Sync Attachments</Label>
                  <div className="text-sm text-muted-foreground">
                    Include file attachments in synchronization
                  </div>
                </div>
                <Switch
                  id="attachments"
                  checked={settings.sync_attachments}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, sync_attachments: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="comments">Sync Comments</Label>
                  <div className="text-sm text-muted-foreground">
                    Include comments and discussions
                  </div>
                </div>
                <Switch
                  id="comments"
                  checked={settings.sync_comments}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, sync_comments: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="worklogs">Sync Work Logs</Label>
                  <div className="text-sm text-muted-foreground">
                    Include time tracking and work logs
                  </div>
                </div>
                <Switch
                  id="worklogs"
                  checked={settings.sync_work_logs}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, sync_work_logs: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-brand-gold hover:bg-brand-gold-hover">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
