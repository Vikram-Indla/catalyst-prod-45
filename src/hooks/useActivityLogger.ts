/**
 * useActivityLogger — Hook for logging user actions to th_user_activity
 */
import { supabase } from '@/integrations/supabase/client';

export function useActivityLogger() {
  const logActivity = async (
    action: string,
    entityType?: string,
    entityId?: string,
    entityName?: string,
    details?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any).rpc('log_user_activity', {
        p_user_id: user.id,
        p_action: action,
        p_entity_type: entityType || null,
        p_entity_id: entityId || null,
        p_entity_name: entityName || null,
        p_details: details || {},
      });
    } catch (err) {
      console.error('Log activity error:', err);
    }
  };

  return { logActivity };
}
