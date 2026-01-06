/**
 * Notifications Section
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Bell, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationPreferences, EmailDigest, NotificationTypes } from '../../types/settings';

interface NotificationsSectionProps {
  preferences: NotificationPreferences | null;
  onUpdate: (preferences: Partial<NotificationPreferences>) => void;
  slackConnected?: boolean;
  isLoading?: boolean;
}

type NotificationChannel = 'email' | 'in_app' | 'slack';

const notificationItems: { key: keyof NotificationTypes; label: string; description: string }[] = [
  { key: 'test_assigned', label: 'Test Assigned', description: 'When a test is assigned to you' },
  { key: 'test_completed', label: 'Test Completed', description: 'When a test execution is completed' },
  { key: 'test_failed', label: 'Test Failed', description: 'When a test execution fails' },
  { key: 'cycle_started', label: 'Cycle Started', description: 'When a test cycle begins' },
  { key: 'cycle_completed', label: 'Cycle Completed', description: 'When a test cycle is completed' },
  { key: 'defect_assigned', label: 'Defect Assigned', description: 'When a defect is assigned to you' },
  { key: 'defect_resolved', label: 'Defect Resolved', description: 'When a defect you reported is resolved' },
  { key: 'mentioned', label: 'Mentions', description: 'When someone mentions you in a comment' },
];

export function NotificationsSection({
  preferences,
  onUpdate,
  slackConnected = false,
  isLoading,
}: NotificationsSectionProps) {
  const [activeChannel, setActiveChannel] = React.useState<NotificationChannel>('email');

  const channels = [
    { id: 'email' as NotificationChannel, label: 'Email', icon: Mail, enabled: preferences?.email_enabled ?? true },
    { id: 'in_app' as NotificationChannel, label: 'In-App', icon: Bell, enabled: preferences?.in_app_enabled ?? true },
    { id: 'slack' as NotificationChannel, label: 'Slack', icon: MessageSquare, enabled: preferences?.slack_enabled ?? false, disabled: !slackConnected },
  ];

  const handleChannelToggle = (channel: NotificationChannel, enabled: boolean) => {
    if (channel === 'email') onUpdate({ email_enabled: enabled });
    if (channel === 'in_app') onUpdate({ in_app_enabled: enabled });
    if (channel === 'slack') onUpdate({ slack_enabled: enabled });
  };

  const handleNotificationToggle = (key: keyof NotificationTypes, enabled: boolean) => {
    const currentPrefs = preferences?.preferences || {} as NotificationTypes;
    onUpdate({
      preferences: { ...currentPrefs, [key]: enabled } as NotificationTypes,
    });
  };

  const isNotificationEnabled = (key: keyof NotificationTypes) => {
    return preferences?.preferences?.[key] ?? true;
  };

  return (
    <div className="space-y-6">
      <section className="bg-background border border-border rounded-xl">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Choose how and when you want to be notified
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Channel Tabs */}
          <div className="flex gap-2">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <button
                  key={channel.id}
                  onClick={() => !channel.disabled && setActiveChannel(channel.id)}
                  disabled={channel.disabled}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                    activeChannel === channel.id
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted',
                    channel.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {channel.label}
                  {channel.disabled && (
                    <Badge variant="outline" className="text-[10px]">
                      Connect Slack
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium text-foreground">
                {activeChannel === 'email' && 'Email Notifications'}
                {activeChannel === 'in_app' && 'In-App Notifications'}
                {activeChannel === 'slack' && 'Slack Notifications'}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeChannel === 'email' && 'Receive notifications via email'}
                {activeChannel === 'in_app' && 'See notifications in the app'}
                {activeChannel === 'slack' && 'Get notifications in Slack'}
              </p>
            </div>
            <Switch
              checked={channels.find((c) => c.id === activeChannel)?.enabled ?? false}
              onCheckedChange={(v) => handleChannelToggle(activeChannel, v)}
            />
          </div>

          {/* Email Digest Setting */}
          {activeChannel === 'email' && (
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium text-foreground">Email Digest</p>
                <p className="text-sm text-muted-foreground">
                  How often to receive email summaries
                </p>
              </div>
              <Select
                value={preferences?.email_digest || 'instant'}
                onValueChange={(v) => onUpdate({ email_digest: v as EmailDigest })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notification Types */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Notification Types</h3>
            <div className="space-y-1">
              {notificationItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={isNotificationEnabled(item.key)}
                    onCheckedChange={(v) => handleNotificationToggle(item.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
