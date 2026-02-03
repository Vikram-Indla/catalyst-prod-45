import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type ActivityAction = 'create' | 'update' | 'delete' | 'restore' | 'access';

interface LogActivityParams {
  planId: string | null;
  action: ActivityAction;
  details: Record<string, any>;
}

export function useLogActivity() {
  return useMutation({
    mutationFn: async ({ planId, action, details }: LogActivityParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('planhub_activity_log').insert({
        plan_id: planId,
        action,
        details,
        user_id: user.id,
      });
    },
  });
}

// Debounced access logging (prevent spam)
let accessTimeout: NodeJS.Timeout | null = null;
const loggedAccess = new Set<string>();

export function useLogPlanAccess() {
  const logActivity = useLogActivity();

  return (planId: string) => {
    // Skip if recently logged
    if (loggedAccess.has(planId)) return;
    
    // Debounce
    if (accessTimeout) clearTimeout(accessTimeout);
    
    accessTimeout = setTimeout(() => {
      logActivity.mutate({
        planId,
        action: 'access',
        details: { type: 'plan_view' },
      });
      
      loggedAccess.add(planId);
      
      // Clear after 5 minutes
      setTimeout(() => loggedAccess.delete(planId), 5 * 60 * 1000);
    }, 1000);
  };
}

// Helper to log task mutations
export function useLogTaskActivity() {
  const logActivity = useLogActivity();

  return {
    logCreate: (planId: string, taskName: string, taskType: string) => {
      logActivity.mutate({
        planId,
        action: 'create',
        details: { type: 'task', name: taskName, task_type: taskType },
      });
    },
    logUpdate: (planId: string, taskId: string, field: string, oldValue: any, newValue: any) => {
      logActivity.mutate({
        planId,
        action: 'update',
        details: { type: 'task', task_id: taskId, field, old_value: oldValue, new_value: newValue },
      });
    },
    logDelete: (planId: string, taskName: string) => {
      logActivity.mutate({
        planId,
        action: 'delete',
        details: { type: 'task', name: taskName },
      });
    },
  };
}

// Helper to log plan mutations
export function useLogPlanActivity() {
  const logActivity = useLogActivity();

  return {
    logCreate: (planId: string, planName: string, templateUsed?: string) => {
      logActivity.mutate({
        planId,
        action: 'create',
        details: { type: 'plan', name: planName, template_used: templateUsed || null },
      });
    },
    logUpdate: (planId: string, field: string, oldValue: any, newValue: any) => {
      logActivity.mutate({
        planId,
        action: 'update',
        details: { type: 'plan', field, old_value: oldValue, new_value: newValue },
      });
    },
    logDelete: (planId: string, planName: string) => {
      logActivity.mutate({
        planId,
        action: 'delete',
        details: { type: 'plan', name: planName },
      });
    },
  };
}
