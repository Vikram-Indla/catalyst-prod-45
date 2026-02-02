/**
 * useAqdCheckout - Hook for week checkout functionality
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type CheckoutDecision = 'resolved' | 'carry' | 'leave';

export interface ItemDecision {
  item_id: string;
  decision: CheckoutDecision;
}

interface CheckoutParams {
  weekId: string;
  decisions: ItemDecision[];
}

interface CheckoutResult {
  success: boolean;
  new_week_id?: string;
  carried_count: number;
  resolved_count: number;
  left_count: number;
}

export function useAqdCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ weekId, decisions }: CheckoutParams): Promise<CheckoutResult> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('You must be logged in to checkout a week');
      }

      const { data, error } = await supabase.rpc('aqd_checkout_week', {
        p_week_id: weekId,
        p_user_id: userData.user.id,
        p_decisions: decisions as unknown as Json,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as unknown as CheckoutResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['aqd-weeks'] });
      queryClient.invalidateQueries({ queryKey: ['aqd-items'] });
      queryClient.invalidateQueries({ queryKey: ['aqd-lists'] });
      
      toast.success('Week checked out successfully', {
        description: `${result.resolved_count} resolved, ${result.carried_count} carried over`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to checkout week', {
        description: error.message,
      });
    },
  });
}
