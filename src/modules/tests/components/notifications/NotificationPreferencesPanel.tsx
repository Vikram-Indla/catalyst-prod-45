import React from 'react';
import { Bell, Mail, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
            <div><Label className="text-sm font-medium">Assignments</Label><p className="text-xs text-muted-foreground">When items are assigned to you</p></div>
            <Switch checked={preferences?.notify_case_assigned_cycle ?? true} onCheckedChange={(v) => updatePreferences({ notify_case_assigned_cycle: v })} disabled={isUpdating} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Execution Updates</Label><p className="text-xs text-muted-foreground">When executions complete</p></div>
            <Switch checked={preferences?.notify_execution_completed ?? true} onCheckedChange={(v) => updatePreferences({ notify_execution_completed: v })} disabled={isUpdating} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Cycle Completion</Label><p className="text-xs text-muted-foreground">When cycles finish</p></div>
            <Switch checked={preferences?.notify_cycle_completed ?? true} onCheckedChange={(v) => updatePreferences({ notify_cycle_completed: v })} disabled={isUpdating} />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Delivery Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Email Notifications</Label></div>
            <Switch checked={preferences?.email_notifications_enabled ?? true} onCheckedChange={(v) => updatePreferences({ email_notifications_enabled: v })} disabled={isUpdating} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}