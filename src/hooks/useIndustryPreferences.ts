import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface IndustryPreferences {
  id: string;
  user_id: string;
  column_order: string[];
  column_visibility: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

const DEFAULT_COLUMN_ORDER = [
  'request_key', 
  'rank', 
  'title', 
  'process_step', 
  'business_score', 
  'submitted_date',
  'planned_quarter', 
  'end_date', 
  'ageing',
  'delivery_platform',
  'requestor',
  'business_owner',
  'department',
  'created_by'
];
const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
  request_key: true,
  rank: true,
  title: true,
  process_step: true,
  business_score: true,
  submitted_date: false,
  planned_quarter: true,
  end_date: true,
  ageing: true,
  delivery_platform: false,
  requestor: false,
  business_owner: false,
  department: false,
  created_by: false,
};

export function useIndustryPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['industry-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_industry_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data as IndustryPreferences | null;
    },
    enabled: !!user?.id,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async ({ 
      column_order, 
      column_visibility 
    }: { 
      column_order?: string[]; 
      column_visibility?: Record<string, boolean>;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: any = {};
      if (column_order) updateData.column_order = column_order;
      if (column_visibility) updateData.column_visibility = column_visibility;

      // Try to update existing or insert new
      const { data: existing } = await supabase
        .from('user_industry_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('user_industry_preferences')
          .update(updateData)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('user_industry_preferences')
          .insert([{
            user_id: user.id,
            column_order: column_order || DEFAULT_COLUMN_ORDER,
            column_visibility: column_visibility || DEFAULT_COLUMN_VISIBILITY,
          }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    // Optimistic update for real-time UI response
    onMutate: async ({ column_order, column_visibility }) => {
      await queryClient.cancelQueries({ queryKey: ['industry-preferences', user?.id] });
      
      const previousData = queryClient.getQueryData<IndustryPreferences | null>(['industry-preferences', user?.id]);
      
      queryClient.setQueryData<IndustryPreferences | null>(['industry-preferences', user?.id], (old) => {
        if (!old) {
          return {
            id: 'temp',
            user_id: user?.id || '',
            column_order: column_order || DEFAULT_COLUMN_ORDER,
            column_visibility: column_visibility || DEFAULT_COLUMN_VISIBILITY,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return {
          ...old,
          ...(column_order && { column_order }),
          ...(column_visibility && { column_visibility }),
        };
      });
      
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(['industry-preferences', user?.id], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-preferences', user?.id] });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    columnOrder: query.data?.column_order || DEFAULT_COLUMN_ORDER,
    columnVisibility: query.data?.column_visibility || DEFAULT_COLUMN_VISIBILITY,
    updateColumnOrder: (order: string[]) => updatePreferencesMutation.mutate({ column_order: order }),
    updateColumnVisibility: (visibility: Record<string, boolean>) => 
      updatePreferencesMutation.mutate({ column_visibility: visibility }),
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
}
