import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { toast } from 'sonner';
import { Mail, Clock, FileText } from 'lucide-react';

export function EmailPreferencesPanel() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  
  const [localPrefs, setLocalPrefs] = useState({
    email_notifications_enabled: true,
    email_frequency: 'daily',
    notify_mentions: true,
    notify_work_item_assigned: true,
    notify_comments: true,
    notify_work_item_state_change: true,
    notify_subscriptions: true,
    notify_dependencies: true,
    notify_objectives: true
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        email_notifications_enabled: preferences.email_notifications_enabled ?? true,
        email_frequency: preferences.email_frequency ?? 'daily',
        notify_mentions: preferences.notify_mentions ?? true,
        notify_work_item_assigned: preferences.notify_work_item_assigned ?? true,
        notify_comments: preferences.notify_comments ?? true,
        notify_work_item_state_change: preferences.notify_work_item_state_change ?? true,
        notify_subscriptions: preferences.notify_subscriptions ?? true,
        notify_dependencies: preferences.notify_dependencies ?? true,
        notify_objectives: preferences.notify_objectives ?? true
      });
    }
  }, [preferences]);

  const handleSave = () => {
    updatePreferences(localPrefs);
    toast.success('Email preferences saved');
  };

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-brand-gold" />
          <CardTitle>Email Preferences</CardTitle>
        </div>
        <CardDescription>
          Configure how and when you receive email notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications via email
            </p>
          </div>
          <Switch
            checked={localPrefs.email_notifications_enabled}
            onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, email_notifications_enabled: checked })}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Digest Settings
          </h4>
          
          <div className="flex items-center justify-between">
            <Label>Digest Frequency</Label>
            <Select
              value={localPrefs.email_frequency}
              onValueChange={(value) => setLocalPrefs({ ...localPrefs, email_frequency: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notification Types
          </h4>

          <div className="space-y-3">
            {[
              { key: 'notify_mentions', label: 'Mentions', desc: 'When someone mentions you' },
              { key: 'notify_work_item_assigned', label: 'Assignments', desc: 'When you are assigned an item' },
              { key: 'notify_comments', label: 'Comments', desc: 'When someone comments on your items' },
              { key: 'notify_work_item_state_change', label: 'Status Changes', desc: 'When item status changes' },
              { key: 'notify_subscriptions', label: 'Subscriptions', desc: 'Updates on subscribed items' },
              { key: 'notify_dependencies', label: 'Dependencies', desc: 'Dependency updates' },
              { key: 'notify_objectives', label: 'Objectives', desc: 'OKR and objective updates' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={localPrefs[item.key as keyof typeof localPrefs] as boolean}
                  onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, [item.key]: checked })}
                  disabled={!localPrefs.email_notifications_enabled}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
