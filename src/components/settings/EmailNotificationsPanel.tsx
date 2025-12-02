import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/types/userSettings.types';
import { AtSign, UserPlus, Cpu, Bug, CalendarClock, FileText } from 'lucide-react';

interface EmailNotificationsPanelProps {
  settings: NotificationSettings;
  onSave: (settings: NotificationSettings) => void;
}

export function EmailNotificationsPanel({ settings, onSave }: EmailNotificationsPanelProps) {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);

  const updateSettings = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => onSave(localSettings);
  const handleReset = () => setLocalSettings(DEFAULT_NOTIFICATION_SETTINGS);

  const categories = [
    {
      key: 'mentionNotifications' as const,
      icon: AtSign,
      title: '@Mentions',
      description: 'When someone mentions you in comments',
      settings: localSettings.mentionNotifications,
      options: (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Frequency</Label>
            <RadioGroup
              value={localSettings.mentionNotifications.frequency}
              onValueChange={(v) => updateSettings('mentionNotifications', { ...localSettings.mentionNotifications, frequency: v as 'immediate' | 'daily' | 'weekly' })}
            >
              <div className="flex items-center space-x-2"><RadioGroupItem value="immediate" id="mention-immediate" /><Label htmlFor="mention-immediate" className="text-sm">Immediately</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="daily" id="mention-daily" /><Label htmlFor="mention-daily" className="text-sm">Daily digest</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="weekly" id="mention-weekly" /><Label htmlFor="mention-weekly" className="text-sm">Weekly digest</Label></div>
            </RadioGroup>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="mention-context" 
              checked={localSettings.mentionNotifications.includeContext}
              onCheckedChange={(checked) => updateSettings('mentionNotifications', { ...localSettings.mentionNotifications, includeContext: !!checked })}
            />
            <Label htmlFor="mention-context" className="text-sm">Include surrounding context</Label>
          </div>
        </>
      ),
    },
    {
      key: 'assignmentNotifications' as const,
      icon: UserPlus,
      title: 'Assignments',
      description: 'Test cases or executions assigned to you',
      settings: localSettings.assignmentNotifications,
      options: (
        <>
          <div className="space-y-2">
            <div className="flex items-center space-x-2"><Checkbox id="assign-cases" checked={localSettings.assignmentNotifications.cases} onCheckedChange={(c) => updateSettings('assignmentNotifications', { ...localSettings.assignmentNotifications, cases: !!c })} /><Label htmlFor="assign-cases" className="text-sm">Case assignments</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="assign-exec" checked={localSettings.assignmentNotifications.executions} onCheckedChange={(c) => updateSettings('assignmentNotifications', { ...localSettings.assignmentNotifications, executions: !!c })} /><Label htmlFor="assign-exec" className="text-sm">Execution assignments</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="assign-cycles" checked={localSettings.assignmentNotifications.cycles} onCheckedChange={(c) => updateSettings('assignmentNotifications', { ...localSettings.assignmentNotifications, cycles: !!c })} /><Label htmlFor="assign-cycles" className="text-sm">Cycle assignments</Label></div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Notify if assigned more than</Label>
            <Input type="number" className="w-16 h-8" value={localSettings.assignmentNotifications.threshold} onChange={(e) => updateSettings('assignmentNotifications', { ...localSettings.assignmentNotifications, threshold: parseInt(e.target.value) || 0 })} />
            <span className="text-sm text-muted-foreground">cases</span>
          </div>
        </>
      ),
    },
    {
      key: 'automationNotifications' as const,
      icon: Cpu,
      title: 'Automation Owner',
      description: 'Automated test cases fail (for cases you own)',
      settings: localSettings.automationNotifications,
      options: (
        <>
          <div className="flex items-center space-x-2"><Checkbox id="auto-first" checked={localSettings.automationNotifications.firstOnly} onCheckedChange={(c) => updateSettings('automationNotifications', { ...localSettings.automationNotifications, firstOnly: !!c })} /><Label htmlFor="auto-first" className="text-sm">First failure only</Label></div>
          <div className="flex items-center gap-2"><Label className="text-sm">After</Label><Input type="number" className="w-16 h-8" value={localSettings.automationNotifications.threshold} onChange={(e) => updateSettings('automationNotifications', { ...localSettings.automationNotifications, threshold: parseInt(e.target.value) || 1 })} /><span className="text-sm text-muted-foreground">consecutive failures</span></div>
          <div className="flex items-center space-x-2"><Checkbox id="auto-logs" checked={localSettings.automationNotifications.includeLogs} onCheckedChange={(c) => updateSettings('automationNotifications', { ...localSettings.automationNotifications, includeLogs: !!c })} /><Label htmlFor="auto-logs" className="text-sm">Include logs</Label></div>
        </>
      ),
    },
    {
      key: 'defectNotifications' as const,
      icon: Bug,
      title: 'Defect Linking',
      description: 'Defects linked/unlinked from your test cases',
      settings: localSettings.defectNotifications,
      options: (
        <>
          <div className="space-y-2">
            <div className="flex items-center space-x-2"><Checkbox id="defect-created" checked={localSettings.defectNotifications.createdCases} onCheckedChange={(c) => updateSettings('defectNotifications', { ...localSettings.defectNotifications, createdCases: !!c })} /><Label htmlFor="defect-created" className="text-sm">Your created cases</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="defect-exec" checked={localSettings.defectNotifications.executions} onCheckedChange={(c) => updateSettings('defectNotifications', { ...localSettings.defectNotifications, executions: !!c })} /><Label htmlFor="defect-exec" className="text-sm">Your executions</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="defect-follow" checked={localSettings.defectNotifications.followedCases} onCheckedChange={(c) => updateSettings('defectNotifications', { ...localSettings.defectNotifications, followedCases: !!c })} /><Label htmlFor="defect-follow" className="text-sm">Cases you follow</Label></div>
          </div>
        </>
      ),
    },
    {
      key: 'cycleNotifications' as const,
      icon: CalendarClock,
      title: 'Cycle Status Changes',
      description: 'Cycles you\'re involved in change status',
      settings: localSettings.cycleNotifications,
      options: (
        <>
          <div className="space-y-2">
            <div className="flex items-center space-x-2"><Checkbox id="cycle-start" checked={localSettings.cycleNotifications.started} onCheckedChange={(c) => updateSettings('cycleNotifications', { ...localSettings.cycleNotifications, started: !!c })} /><Label htmlFor="cycle-start" className="text-sm">Cycle started</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="cycle-close" checked={localSettings.cycleNotifications.closed} onCheckedChange={(c) => updateSettings('cycleNotifications', { ...localSettings.cycleNotifications, closed: !!c })} /><Label htmlFor="cycle-close" className="text-sm">Cycle closed</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="cycle-scope" checked={localSettings.cycleNotifications.scopeChanges} onCheckedChange={(c) => updateSettings('cycleNotifications', { ...localSettings.cycleNotifications, scopeChanges: !!c })} /><Label htmlFor="cycle-scope" className="text-sm">Cases added/removed</Label></div>
          </div>
        </>
      ),
    },
    {
      key: 'reportNotifications' as const,
      icon: FileText,
      title: 'Report Delivery',
      description: 'Scheduled reports and subscriptions',
      settings: localSettings.reportNotifications,
      options: (
        <>
          <div className="space-y-2">
            <div className="flex items-center space-x-2"><Checkbox id="report-sched" checked={localSettings.reportNotifications.scheduled} onCheckedChange={(c) => updateSettings('reportNotifications', { ...localSettings.reportNotifications, scheduled: !!c })} /><Label htmlFor="report-sched" className="text-sm">Scheduled reports</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="report-sub" checked={localSettings.reportNotifications.subscriptions} onCheckedChange={(c) => updateSettings('reportNotifications', { ...localSettings.reportNotifications, subscriptions: !!c })} /><Label htmlFor="report-sub" className="text-sm">Report subscriptions</Label></div>
            <div className="flex items-center space-x-2"><Checkbox id="report-fail" checked={localSettings.reportNotifications.failed} onCheckedChange={(c) => updateSettings('reportNotifications', { ...localSettings.reportNotifications, failed: !!c })} /><Label htmlFor="report-fail" className="text-sm">Failed report generation</Label></div>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Email Notifications</h2>
          <p className="text-sm text-muted-foreground">Manage when you receive emails from Catalyst Tests</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="master-toggle">Enable all notifications</Label>
          <Switch
            id="master-toggle"
            checked={localSettings.emailNotificationsEnabled}
            onCheckedChange={(checked) => updateSettings('emailNotificationsEnabled', checked)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.key} className={!localSettings.emailNotificationsEnabled ? 'opacity-50' : ''}>
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-brand-gold" />
                  <div>
                    <CardTitle className="text-base">{category.title}</CardTitle>
                    <CardDescription className="text-xs">{category.description}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={category.settings.enabled}
                  onCheckedChange={(checked) => updateSettings(category.key, { ...category.settings, enabled: checked })}
                  disabled={!localSettings.emailNotificationsEnabled}
                />
              </CardHeader>
              {category.settings.enabled && localSettings.emailNotificationsEnabled && (
                <CardContent className="pt-0 px-4 pb-4 space-y-3 ml-8">
                  {category.options}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
        <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold-hover text-white">Save Settings</Button>
      </div>
    </div>
  );
}
