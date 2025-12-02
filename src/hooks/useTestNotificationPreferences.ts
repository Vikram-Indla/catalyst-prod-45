import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Per Email_Preferences.doc specification
export interface TestNotificationPreferences {
  id: string;
  user_id: string;
  email_notifications_enabled: boolean;
  notify_tagged_in_comment: boolean;
  notify_same_comment_edited: boolean;
  notify_case_assigned_cycle: boolean;
  notify_automation_owner_assigned: boolean;
  notify_run_step_assigned: boolean;
  notify_step_updated_as_owner: boolean;
  notify_on_test_failure: boolean;
  notify_on_cycle_complete: boolean;
  daily_test_summary: boolean;
  weekly_test_report: boolean;
  created_at: string;
  updated_at: string;
}

export function useTestNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['test-notification-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('test_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default
          const { data: newPrefs } = await supabase
            .from('test_notification_preferences')
            .insert({ user_id: user.id })
            .select()
            .single();
          return newPrefs as unknown as TestNotificationPreferences;
        }
        throw error;
      }
      return data as unknown as TestNotificationPreferences;
    },
    enabled: !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<TestNotificationPreferences>) => {
      if (!user) return;
      
      const { error } = await supabase
        .from('test_notification_preferences')
        .update(updates as any)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-notification-preferences', user?.id] });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
}
