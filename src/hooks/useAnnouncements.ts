import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export function useAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const now = new Date().toISOString();
        
        // Get active announcements
        const { data: activeAnnouncements, error } = await typedQuery('announcements')
          .select('*')
          .eq('is_active', true)
          .lte('start_date', now)
          .gte('end_date', now);

        // If table doesn't exist (404) or other error, return empty gracefully
        if (error) return [];

        // Get dismissed announcements
        const { data: dismissals } = await typedQuery('announcement_dismissals')
          .select('announcement_id')
          .eq('user_id', user.id);

        const dismissedIds = new Set((dismissals as any[] || []).map((d: any) => d.announcement_id));

        return (activeAnnouncements as any[] || []).filter(
          (announcement: any) => !announcement.is_dismissible || !dismissedIds.has(announcement.id)
        );
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  const dismissMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) return;
      
      const { error } = await typedQuery('announcement_dismissals')
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
