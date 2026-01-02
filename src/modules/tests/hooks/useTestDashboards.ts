/**
 * useTestDashboards Hook
 * CRUD operations for test dashboards and gadgets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export type GadgetType = 
  | 'execution_overview'
  | 'defect_summary'
  | 'traceability_summary'
  | 'traceability_detail'
  | 'execution_distribution'
  | 'burnup'
  | 'user_activity'
  | 'project_activity';

export interface GadgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GadgetConfig {
  title?: string;
  dateRange?: '7' | '14' | '30' | '90';
  cycleIds?: string[];
  showLegend?: boolean;
  compactMode?: boolean;
  colorScheme?: 'default' | 'monochrome';
  [key: string]: unknown;
}

export interface DashboardGadget {
  id: string;
  dashboard_id: string;
  gadget_type: GadgetType;
  position: GadgetPosition;
  config: GadgetConfig;
  created_at: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  program_id: string;
  layout: { columns: number; rowHeight: number } | null;
  is_default: boolean;
  visibility: 'private' | 'team' | 'public';
  template_id: string | null;
  created_at: string;
  updated_at: string;
  gadgets?: DashboardGadget[];
}

export interface CreateDashboardInput {
  name: string;
  description?: string;
  layout?: { columns: number; rowHeight: number };
  visibility?: 'private' | 'team' | 'public';
  isDefault?: boolean;
}

export interface CreateGadgetInput {
  gadgetType: GadgetType;
  position: GadgetPosition;
  config?: GadgetConfig;
}

export interface UpdateGadgetInput {
  id: string;
  position?: GadgetPosition;
  config?: GadgetConfig;
}

export function useTestDashboards(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // List all dashboards for program
  const {
    data: dashboards,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-dashboards', programId],
    queryFn: async () => {
      if (!programId) return [];

      const { data, error } = await supabase
        .from('test_dashboards')
        .select(`
          *,
          gadgets:test_dashboard_gadgets(*)
        `)
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(d => ({
        ...d,
        layout: d.layout as { columns: number; rowHeight: number } | null,
        visibility: d.visibility as 'private' | 'team' | 'public',
        gadgets: (d.gadgets || []).map((g: any) => ({
          ...g,
          gadget_type: g.gadget_type as GadgetType,
          position: g.position as GadgetPosition,
          config: g.config as GadgetConfig,
        })),
      })) as Dashboard[];
    },
    enabled: !!programId && !!user,
  });

  // Get default dashboard
  const defaultDashboard = dashboards?.find(d => d.is_default) || dashboards?.[0];

  // Create dashboard
  const createDashboardMutation = useMutation({
    mutationFn: async (input: CreateDashboardInput) => {
      if (!user || !programId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_dashboards')
        .insert({
          name: input.name,
          description: input.description || null,
          user_id: user.id,
          program_id: programId,
          layout: input.layout as Json || { columns: 12, rowHeight: 80 },
          visibility: input.visibility || 'private',
          is_default: input.isDefault || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-dashboards', programId] });
      toast.success('Dashboard created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update dashboard
  const updateDashboardMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; visibility?: string; layout?: unknown; isDefault?: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.visibility) updateData.visibility = updates.visibility;
      if (updates.layout) updateData.layout = updates.layout;
      if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

      const { data, error } = await supabase
        .from('test_dashboards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-dashboards', programId] });
      toast.success('Dashboard updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete dashboard
  const deleteDashboardMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('test_dashboards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-dashboards', programId] });
      toast.success('Dashboard deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Add gadget to dashboard
  const addGadgetMutation = useMutation({
    mutationFn: async ({ dashboardId, gadget }: { dashboardId: string; gadget: CreateGadgetInput }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_dashboard_gadgets')
        .insert({
          dashboard_id: dashboardId,
          gadget_type: gadget.gadgetType,
          position: gadget.position as unknown as Json,
          config: (gadget.config || {}) as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-dashboards', programId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update gadget
  const updateGadgetMutation = useMutation({
    mutationFn: async (input: UpdateGadgetInput) => {
      if (!user) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {};
      if (input.position) updateData.position = input.position as unknown as Json;
      if (input.config) updateData.config = input.config as unknown as Json;

      const { data, error } = await supabase
        .from('test_dashboard_gadgets')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-dashboards', programId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Remove gadget
  const removeGadgetMutation = useMutation({
    mutationFn: async (gadgetId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('test_dashboard_gadgets')
        .delete()
        .eq('id', gadgetId);

      if (error) throw error;
      return gadgetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-dashboards', programId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Duplicate dashboard
  const duplicateDashboardMutation = useMutation({
    mutationFn: async (dashboardId: string) => {
      if (!user || !programId) throw new Error('Not authenticated');

      // Get original dashboard with gadgets
      const original = dashboards?.find(d => d.id === dashboardId);
      if (!original) throw new Error('Dashboard not found');

      // Create new dashboard
      const { data: newDashboard, error: dashError } = await supabase
        .from('test_dashboards')
        .insert({
          name: `${original.name} (Copy)`,
          description: original.description,
          user_id: user.id,
          program_id: programId,
          layout: original.layout as Json,
          visibility: 'private',
          is_default: false,
        })
        .select()
        .single();

      if (dashError) throw dashError;

      // Copy gadgets
      if (original.gadgets && original.gadgets.length > 0) {
        const gadgetInserts = original.gadgets.map(g => ({
          dashboard_id: newDashboard.id,
          gadget_type: g.gadget_type,
          position: g.position as unknown as Json,
          config: g.config as unknown as Json,
        }));

        const { error: gadgetsError } = await supabase
          .from('test_dashboard_gadgets')
          .insert(gadgetInserts);

        if (gadgetsError) throw gadgetsError;
      }

      return newDashboard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-dashboards', programId] });
      toast.success('Dashboard duplicated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    dashboards: dashboards || [],
    defaultDashboard,
    isLoading,
    error,
    refetch,
    createDashboard: createDashboardMutation.mutateAsync,
    updateDashboard: updateDashboardMutation.mutateAsync,
    deleteDashboard: deleteDashboardMutation.mutateAsync,
    duplicateDashboard: duplicateDashboardMutation.mutateAsync,
    addGadget: addGadgetMutation.mutateAsync,
    updateGadget: updateGadgetMutation.mutateAsync,
    removeGadget: removeGadgetMutation.mutateAsync,
    isCreating: createDashboardMutation.isPending,
    isUpdating: updateDashboardMutation.isPending,
  };
}

// Hook for report scheduling
export function useReportSchedule(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['report-schedules', programId],
    queryFn: async () => {
      if (!programId) return [];

      const { data, error } = await supabase
        .from('test_report_schedules')
        .select('*')
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!programId && !!user,
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (input: {
      reportType: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      recipients: string[];
      format: 'pdf' | 'csv';
      time?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      config?: Record<string, unknown>;
    }) => {
      if (!user || !programId) throw new Error('Not authenticated');

      // Convert frequency to cron expression
      const time = input.time || '08:00';
      const [hour, minute] = time.split(':');
      let cronExpression = '';
      if (input.frequency === 'daily') {
        cronExpression = `${minute} ${hour} * * *`;
      } else if (input.frequency === 'weekly') {
        cronExpression = `${minute} ${hour} * * ${input.dayOfWeek || 1}`;
      } else if (input.frequency === 'monthly') {
        cronExpression = `${minute} ${hour} ${input.dayOfMonth || 1} * *`;
      }

      const { data, error } = await supabase
        .from('test_report_schedules')
        .insert({
          report_type: input.reportType,
          program_id: programId,
          created_by: user.id,
          recipients: input.recipients,
          format: input.format,
          schedule_cron: cronExpression,
          config: (input.config || {}) as unknown as Json,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules', programId] });
      toast.success('Schedule created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_report_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules', programId] });
      toast.success('Schedule deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    schedules: schedules || [],
    isLoading,
    createSchedule: createScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutateAsync,
    isCreating: createScheduleMutation.isPending,
  };
}
