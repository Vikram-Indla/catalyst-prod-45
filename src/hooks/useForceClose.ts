import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executeForceClose, type ForceClosePayload } from '@/services/governanceService';

export function useForceClose() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ForceClosePayload) =>
      executeForceClose(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ageing-items'] });
      queryClient.invalidateQueries({ queryKey: ['governance-closure-log'] });
      queryClient.invalidateQueries({ queryKey: ['governance-score'] });
      queryClient.invalidateQueries({ queryKey: ['governance-restore'] });
    },

    onError: (err: Error) => {
      console.error('[useForceClose] Failed:', err.message);
    },
  });
}
