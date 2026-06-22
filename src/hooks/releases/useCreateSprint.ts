import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sprint } from '@/types/phase3-releases';

export interface CreateSprintPayload {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  capacity?: number;
  release_id: string;
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSprintPayload): Promise<Sprint> => {
      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || `Create failed: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: (sprint) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', sprint.release_id] });
    },
  });
}
