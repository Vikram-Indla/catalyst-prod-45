import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { executeRestore } from '@/services/governanceService';

export function useRestore() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return executeRestore(logId, user.id);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-closure-log'] });
      queryClient.invalidateQueries({ queryKey: ['ageing-items'] });
      queryClient.invalidateQueries({ queryKey: ['governance-score'] });
      queryClient.invalidateQueries({ queryKey: ['governance-restore'] });
    },

    onError: (err: Error) => {
      console.error('[useRestore] Failed:', err.message);
    },
  });
}
