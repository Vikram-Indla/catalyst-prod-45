import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Loader2 } from 'lucide-react';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesDialog({ open, onOpenChange }: NotificationPreferencesDialogProps) {
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();

  if (isLoading || !preferences) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Notifications */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Email Notifications</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="email-enabled" className="flex-1">
                <div className="font-normal">Enable email notifications</div>
                <div className="text-xs text-muted-foreground">Receive notifications via email</div>
              </Label>
              <Switch
                id="email-enabled"
                checked={preferences.email_notifications_enabled}
                onCheckedChange={(checked) => updatePreferences({ email_notifications_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email-frequency" className="flex-1">Email frequency</Label>
              <Select
                value={preferences.email_frequency}
                onValueChange={(value) => updatePreferences({ email_frequency: value as any })}
                disabled={!preferences.email_notifications_enabled}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm">In-App Notifications</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="in-app-enabled" className="flex-1">
                <div className="font-normal">Enable in-app notifications</div>
                <div className="text-xs text-muted-foreground">Show notifications in the app</div>
              </Label>
              <Switch
                id="in-app-enabled"
                checked={preferences.in_app_notifications_enabled}
                onCheckedChange={(checked) => updatePreferences({ in_app_notifications_enabled: checked })}
              />
            </div>
          </div>

          {/* Notification Types */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm">Notification Types</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-work-item-assigned" className="flex-1">
                <div className="font-normal">Work item assigned to me</div>
              </Label>
              <Switch
                id="notify-work-item-assigned"
                checked={preferences.notify_work_item_assigned}
                onCheckedChange={(checked) => updatePreferences({ notify_work_item_assigned: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-work-item-state-change" className="flex-1">
                <div className="font-normal">Work item state changes</div>
              </Label>
              <Switch
                id="notify-work-item-state-change"
                checked={preferences.notify_work_item_state_change}
                onCheckedChange={(checked) => updatePreferences({ notify_work_item_state_change: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-comments" className="flex-1">
                <div className="font-normal">Comments and discussions</div>
              </Label>
              <Switch
                id="notify-comments"
                checked={preferences.notify_comments}
                onCheckedChange={(checked) => updatePreferences({ notify_comments: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-mentions" className="flex-1">
                <div className="font-normal">@mentions</div>
              </Label>
              <Switch
                id="notify-mentions"
                checked={preferences.notify_mentions}
                onCheckedChange={(checked) => updatePreferences({ notify_mentions: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-subscriptions" className="flex-1">
                <div className="font-normal">Subscribed items</div>
              </Label>
              <Switch
                id="notify-subscriptions"
                checked={preferences.notify_subscriptions}
                onCheckedChange={(checked) => updatePreferences({ notify_subscriptions: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-dependencies" className="flex-1">
                <div className="font-normal">Dependencies</div>
              </Label>
              <Switch
                id="notify-dependencies"
                checked={preferences.notify_dependencies}
                onCheckedChange={(checked) => updatePreferences({ notify_dependencies: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-objectives" className="flex-1">
                <div className="font-normal">Objectives and key results</div>
              </Label>
              <Switch
                id="notify-objectives"
                checked={preferences.notify_objectives}
                onCheckedChange={(checked) => updatePreferences({ notify_objectives: checked })}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
