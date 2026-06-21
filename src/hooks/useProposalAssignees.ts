import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AssigneeChoice } from '@/components/shared/JiraTable';

export function useProposalAssignees() {
  return useQuery<AssigneeChoice[]>({
    queryKey: ['proposal-assignees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name', { ascending: true });
      return (data ?? []).map((p) => ({
        id: p.id as string,
        name: (p.full_name as string | null) ?? 'Unknown',
        avatarUrl: (p as any).avatar_url as string | null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
