// ============================================================
// CATALYST NOTIFICATION SYSTEM - Notification Settings
// ============================================================

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  Mail,
  MessageSquare,
  UserPlus,
  Eye,
  RefreshCw,
  AlertTriangle,
  Check,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications_enabled: boolean;
  in_app_notifications_enabled: boolean;
  slack_enabled: boolean;
  notify_work_item_assigned: boolean;
  notify_work_item_state_change: boolean;
  notify_comments: boolean;
  notify_mentions: boolean;
  notify_subscriptions: boolean;
  notify_dependencies: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly';
}

// ============================================================
// COMPONENT
// ============================================================

export function NotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch preferences
  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newPrefs, error: createError } = await supabase
            .from('user_notification_preferences')
            .insert({
              user_id: user.id,
              email_notifications_enabled: true,
              in_app_notifications_enabled: true,
              slack_enabled: false,
              notify_work_item_assigned: true,
              notify_work_item_state_change: true,
              notify_comments: true,
              notify_mentions: true,
              notify_subscriptions: true,
              notify_dependencies: true,
              email_frequency: 'immediate',
            })
            .select()
            .single();

          if (createError) throw createError;
          return newPrefs as NotificationPreferences;
        }
        throw error;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user?.id,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { error } = await supabase
        .from('user_notification_preferences')
        .update(updates)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['notification-preferences', user?.id] });

      const previous = queryClient.getQueryData<NotificationPreferences>([
        'notification-preferences',
        user?.id,
      ]);

      queryClient.setQueryData<NotificationPreferences>(
        ['notification-preferences', user?.id],
        (old) => (old ? { ...old, ...updates } : old)
      );

      return { previous };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(
        ['notification-preferences', user?.id],
        context?.previous
      );
      toast.error('Failed to update preferences');
      console.error('Preference update error:', error);
    },
    onSuccess: () => {
      toast.success('Preferences updated');
    },
  });

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !preferences) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Failed to load notification preferences
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Notification Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure how and when you receive notifications from Catalyst
        </p>
      </div>

      {/* Channels Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose where you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* In-App */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <Label className="font-medium">In-app notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications in the bell icon
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.in_app_notifications_enabled}
              onCheckedChange={(checked) =>
                handleToggle('in_app_notifications_enabled', checked)
              }
            />
          </div>

          <Separator />

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-destructive/10">
                <Mail className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <Label className="font-medium">Email notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.email_notifications_enabled}
              onCheckedChange={(checked) =>
                handleToggle('email_notifications_enabled', checked)
              }
            />
          </div>

          <Separator />

          {/* Slack - Future */}
          <div className="flex items-center justify-between opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
                <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
              </div>
              <div>
                <Label className="font-medium">Slack notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Coming soon — Connect your Slack workspace
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Event Types Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Event Preferences
          </CardTitle>
          <CardDescription>
            Choose which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Assignments */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Assigned to me</Label>
                  <p className="text-xs text-muted-foreground">
                    When someone assigns a work item to you
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.notify_work_item_assigned}
                onCheckedChange={(checked) =>
                  handleToggle('notify_work_item_assigned', checked)
                }
              />
            </div>

            {/* Status Changes */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Status changes</Label>
                  <p className="text-xs text-muted-foreground">
                    When a work item's status is updated
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.notify_work_item_state_change}
                onCheckedChange={(checked) =>
                  handleToggle('notify_work_item_state_change', checked)
                }
              />
            </div>

            {/* Comments */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Comments</Label>
                  <p className="text-xs text-muted-foreground">
                    When someone comments on your work items
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.notify_comments}
                onCheckedChange={(checked) =>
                  handleToggle('notify_comments', checked)
                }
              />
            </div>

            {/* Mentions */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 flex items-center justify-center text-muted-foreground font-bold">
                  @
                </span>
                <div>
                  <Label className="font-medium">Mentions</Label>
                  <p className="text-xs text-muted-foreground">
                    When someone @mentions you
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.notify_mentions}
                onCheckedChange={(checked) =>
                  handleToggle('notify_mentions', checked)
                }
              />
            </div>

            {/* Watched Items */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Watched items</Label>
                  <p className="text-xs text-muted-foreground">
                    Updates to items you're watching
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.notify_subscriptions}
                onCheckedChange={(checked) =>
                  handleToggle('notify_subscriptions', checked)
                }
              />
            </div>

            {/* Dependencies */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Dependencies</Label>
                  <p className="text-xs text-muted-foreground">
                    When blocked/blocking items change
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.notify_dependencies}
                onCheckedChange={(checked) =>
                  handleToggle('notify_dependencies', checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save indicator */}
      {updateMutation.isPending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-background border rounded-lg shadow-lg">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}

      {updateMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-background border rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-teal-500" />
          <span className="text-sm">Saved</span>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
