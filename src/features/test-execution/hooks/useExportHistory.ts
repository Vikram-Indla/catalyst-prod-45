/**
 * Module 3C-2: Export History Hook
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExportHistoryItem } from '../types/batch-export';

export function useExportHistory(projectId: string | null) {
  return useQuery({
    queryKey: ['export-history', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .rpc('get_export_history', {
          p_project_id: projectId,
          p_limit: 20,
        });

      if (error) throw error;

      return (data as unknown as ExportHistoryItem[]) || [];
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}
