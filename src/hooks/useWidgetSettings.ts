import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useWidgetSettings(
  widgetId: string,
  dashboardId = 'product-dashboard',
) {
  const { user, loading } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['widget-settings', user?.id, dashboardId, widgetId],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      // 1. Try per-user override first.
      const { data: userRow, error: userErr } = await supabase
        .from('user_widget_settings')
        .select('config')
        .eq('user_id', user!.id)
        .eq('dashboard_id', dashboardId)
        .eq('widget_id', widgetId)
        .maybeSingle();

      if (userErr) throw userErr;
      if (userRow) return userRow.config as Record<string, unknown>;

      // 2. Fall back to tenant-wide default.
      const { data: tenantRow, error: tenantErr } = await supabase
        .from('dashboard_widget_defaults')
        .select('default_config')
        .eq('dashboard_id', dashboardId)
        .eq('widget_id', widgetId)
        .maybeSingle();

      if (tenantErr) throw tenantErr;
      if (tenantRow) return tenantRow.default_config as Record<string, unknown>;

      return {} as Record<string, unknown>;
    },
  });

  return {
    config: data ?? {},
    isLoading: loading || isLoading,
    isError,
    error,
  };
}
