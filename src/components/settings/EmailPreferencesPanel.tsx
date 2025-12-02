import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { toast } from 'sonner';
import { Mail, MessageSquare, Users, Cog, FileText, AlertCircle } from 'lucide-react';

// Source: Email_Preferences.doc
// Events that Trigger Email Notifications:
// 1. When a user is tagged in a comment
// 2. When a user is assigned a case in a cycle
// 3. When a user is assigned as an Automation Owner for a case
// 4. When someone assigns the user to a run-step of a run of a case in a cycle
// 5. When a step in a case is updated where the user is the automation owner

export function EmailPreferencesPanel() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  
  const [localPrefs, setLocalPrefs] = useState({
    email_notifications_enabled: true,
    // Per AIO Tests documentation
    notify_tagged_in_comment: true,
    notify_same_comment_edited: false, // Off by default per docs
    notify_case_assigned_cycle: true,
    notify_automation_owner_assigned: true,
    notify_run_step_assigned: true,
    notify_step_updated_as_owner: false, // Off by default per docs
    // Keep existing general preferences
    notify_work_item_assigned: true,
    notify_work_item_state_change: true,
    notify_subscriptions: true,
    notify_dependencies: true,
    notify_objectives: true
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        email_notifications_enabled: preferences.email_notifications_enabled ?? true,
        notify_tagged_in_comment: preferences.notify_mentions ?? true,
        notify_same_comment_edited: false,
        notify_case_assigned_cycle: true,
        notify_automation_owner_assigned: true,
        notify_run_step_assigned: true,
        notify_step_updated_as_owner: false,
        notify_work_item_assigned: preferences.notify_work_item_assigned ?? true,
        notify_work_item_state_change: preferences.notify_work_item_state_change ?? true,
        notify_subscriptions: preferences.notify_subscriptions ?? true,
        notify_dependencies: preferences.notify_dependencies ?? true,
        notify_objectives: preferences.notify_objectives ?? true
      });
    }
  }, [preferences]);

  const handleSave = () => {
    updatePreferences({
      email_notifications_enabled: localPrefs.email_notifications_enabled,
      notify_mentions: localPrefs.notify_tagged_in_comment,
      notify_work_item_assigned: localPrefs.notify_work_item_assigned,
      notify_work_item_state_change: localPrefs.notify_work_item_state_change,
      notify_subscriptions: localPrefs.notify_subscriptions,
      notify_dependencies: localPrefs.notify_dependencies,
      notify_objectives: localPrefs.notify_objectives
    });
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
          Configure email notifications. Toggle on/off the events for which you want to receive notifications.
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

        {/* Test Management Notifications - Per AIO Tests Documentation */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Test Management Notifications
          </h4>

          <div className="space-y-3 pl-6">
            {/* Event 1: Tagged in comment */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>When tagged in a comment</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications when someone mentions you in a comment
                </p>
              </div>
              <Switch
                checked={localPrefs.notify_tagged_in_comment}
                onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, notify_tagged_in_comment: checked })}
                disabled={!localPrefs.email_notifications_enabled}
              />
            </div>

            {/* Sub-option for comment edited */}
            <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
              <div className="space-y-0.5">
                <Label className="text-sm">Notify for same comment if edited</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notification even if the same comment is edited
                </p>
              </div>
              <Switch
                checked={localPrefs.notify_same_comment_edited}
                onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, notify_same_comment_edited: checked })}
                disabled={!localPrefs.email_notifications_enabled || !localPrefs.notify_tagged_in_comment}
              />
            </div>

            {/* Event 2: Assigned a case in cycle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>When assigned a case in a cycle</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications when you are assigned a case
                </p>
              </div>
              <Switch
                checked={localPrefs.notify_case_assigned_cycle}
                onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, notify_case_assigned_cycle: checked })}
                disabled={!localPrefs.email_notifications_enabled}
              />
            </div>

            {/* Event 3: Assigned as Automation Owner */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>When assigned as Automation Owner</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications when assigned as automation owner for a case
                </p>
              </div>
              <Switch
                checked={localPrefs.notify_automation_owner_assigned}
                onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, notify_automation_owner_assigned: checked })}
                disabled={!localPrefs.email_notifications_enabled}
              />
            </div>

            {/* Event 4: Assigned to run-step */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>When assigned to a run-step</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications when assigned to a run-step of a run
                </p>
              </div>
              <Switch
                checked={localPrefs.notify_run_step_assigned}
                onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, notify_run_step_assigned: checked })}
                disabled={!localPrefs.email_notifications_enabled}
              />
            </div>

            {/* Event 5: Step updated where user is automation owner */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>When a step is updated (as Automation Owner)</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications when steps are added, removed, or updated in cases you own
                </p>
              </div>
              <Switch
                checked={localPrefs.notify_step_updated_as_owner}
                onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, notify_step_updated_as_owner: checked })}
                disabled={!localPrefs.email_notifications_enabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* General Work Item Notifications */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Work Item Notifications
          </h4>

          <div className="space-y-3 pl-6">
            {[
              { key: 'notify_work_item_assigned', label: 'Assignments', desc: 'When you are assigned a work item' },
              { key: 'notify_work_item_state_change', label: 'Status Changes', desc: 'When work item status changes' },
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

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4" />
            Note
          </h4>
          <p className="text-sm text-muted-foreground">
            For single assignments, one email is sent per assignment. For bulk assignments, 
            all links to updated entities are included in one email.
          </p>
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