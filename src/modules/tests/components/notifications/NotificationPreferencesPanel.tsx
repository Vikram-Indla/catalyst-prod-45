import React from 'react';
import { Bell, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '../../hooks/useTestNotifications';

export function NotificationPreferencesPanel() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Event Notifications</CardTitle>
          <CardDescription>Choose which events trigger notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Case Assigned to Cycle</Label><p className="text-xs text-muted-foreground">When test cases are assigned to you</p></div>
            <Switch checked={preferences?.notify_case_assigned_cycle ?? true} onCheckedChange={(v) => updatePreferences({ notify_case_assigned_cycle: v })} disabled={isUpdating} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Run Step Assigned</Label><p className="text-xs text-muted-foreground">When run steps are assigned</p></div>
            <Switch checked={preferences?.notify_run_step_assigned ?? true} onCheckedChange={(v) => updatePreferences({ notify_run_step_assigned: v })} disabled={isUpdating} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Test Failure</Label><p className="text-xs text-muted-foreground">When tests fail</p></div>
            <Switch checked={preferences?.notify_on_test_failure ?? true} onCheckedChange={(v) => updatePreferences({ notify_on_test_failure: v })} disabled={isUpdating} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Cycle Complete</Label><p className="text-xs text-muted-foreground">When cycles finish</p></div>
            <Switch checked={preferences?.notify_on_cycle_complete ?? true} onCheckedChange={(v) => updatePreferences({ notify_on_cycle_complete: v })} disabled={isUpdating} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Tagged in Comment</Label><p className="text-xs text-muted-foreground">When someone @mentions you</p></div>
            <Switch checked={preferences?.notify_tagged_in_comment ?? true} onCheckedChange={(v) => updatePreferences({ notify_tagged_in_comment: v })} disabled={isUpdating} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Automation Owner Assigned</Label><p className="text-xs text-muted-foreground">When automation ownership changes</p></div>
            <Switch checked={preferences?.notify_automation_owner_assigned ?? true} onCheckedChange={(v) => updatePreferences({ notify_automation_owner_assigned: v })} disabled={isUpdating} />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Delivery & Digests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Email Notifications</Label><p className="text-xs text-muted-foreground">Receive notifications via email</p></div>
            <Switch checked={preferences?.email_notifications_enabled ?? true} onCheckedChange={(v) => updatePreferences({ email_notifications_enabled: v })} disabled={isUpdating} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Daily Test Summary</Label><p className="text-xs text-muted-foreground">Receive a daily digest</p></div>
            <Switch checked={preferences?.daily_test_summary ?? false} onCheckedChange={(v) => updatePreferences({ daily_test_summary: v })} disabled={isUpdating} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Weekly Test Report</Label><p className="text-xs text-muted-foreground">Receive weekly summary</p></div>
            <Switch checked={preferences?.weekly_test_report ?? false} onCheckedChange={(v) => updatePreferences({ weekly_test_report: v })} disabled={isUpdating} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
