import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export function useAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const now = new Date().toISOString();
      
      // Get active announcements
      const { data: activeAnnouncements, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now);

      if (error) throw error;

      // Get dismissed announcements
      const { data: dismissals } = await supabase
        .from('announcement_dismissals')
        .select('announcement_id')
        .eq('user_id', user.id);

      const dismissedIds = new Set(dismissals?.map(d => d.announcement_id) || []);

      // Filter out dismissed dismissible announcements
      return activeAnnouncements.filter(
        announcement => !announcement.is_dismissible || !dismissedIds.has(announcement.id)
      );
    },
    enabled: !!user,
  });

  const dismissMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) return;
      
      const { error } = await supabase
        .from('announcement_dismissals')
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', user?.id] });
    },
  });

  return {
    announcements,
    isLoading,
    dismiss: dismissMutation.mutate,
  };
}
