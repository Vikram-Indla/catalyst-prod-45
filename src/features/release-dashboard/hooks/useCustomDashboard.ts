/**
 * Module 5C-3: Custom Dashboard Builder Hooks
 * Manages dashboard configuration, widgets, and templates
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import type {
  CustomDashboard,
  DashboardWidget,
  DashboardTemplate,
  WidgetType,
} from '../types/analytics';

// In-memory storage for dashboards (would be persisted to Supabase in production)
const dashboardsStore = new Map<string, CustomDashboard>();

// ─────────────────────────────────────────────────────────────────────────────
// Default Dashboard Templates
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'template-release-overview',
    name: 'Release Overview',
    description: 'High-level release status with key metrics and trends',
    category: 'release',
    widgets: [
      {
        type: 'metric_card',
        title: 'Execution Rate',
        dataSource: { metric: 'executionRate' },
        size: 'sm',
        position: { row: 0, col: 0 },
        config: { color: 'primary', icon: 'Activity' },
      },
      {
        type: 'metric_card',
        title: 'Pass Rate',
        dataSource: { metric: 'passRate' },
        size: 'sm',
        position: { row: 0, col: 1 },
        config: { color: 'success', icon: 'CheckCircle' },
      },
      {
        type: 'metric_card',
        title: 'Open Defects',
        dataSource: { metric: 'openDefects' },
        size: 'sm',
        position: { row: 0, col: 2 },
        config: { color: 'warning', icon: 'Bug' },
      },
      {
        type: 'metric_card',
        title: 'Health Score',
        dataSource: { metric: 'healthScore' },
        size: 'sm',
        position: { row: 0, col: 3 },
        config: { color: 'info', icon: 'Heart' },
      },
      {
        type: 'trend_chart',
        title: 'Execution Trend',
        dataSource: { metric: 'executionTrend' },
        size: 'lg',
        position: { row: 1, col: 0 },
        config: { chartType: 'area', showLegend: true },
      },
      {
        type: 'pie_chart',
        title: 'Test Status Distribution',
        dataSource: { metric: 'statusDistribution' },
        size: 'md',
        position: { row: 1, col: 2 },
        config: {},
      },
    ],
  },
  {
    id: 'template-quality-focus',
    name: 'Quality Focus',
    description: 'Detailed quality metrics and defect analysis',
    category: 'quality',
    widgets: [
      {
        type: 'gauge',
        title: 'Quality Score',
        dataSource: { metric: 'qualityScore' },
        size: 'sm',
        position: { row: 0, col: 0 },
        config: { thresholds: { danger: 50, warning: 70, success: 85 } },
      },
      {
        type: 'bar_chart',
        title: 'Defects by Severity',
        dataSource: { metric: 'defectsBySeverity' },
        size: 'md',
        position: { row: 0, col: 1 },
        config: { orientation: 'horizontal' },
      },
      {
        type: 'heatmap',
        title: 'Defect Aging',
        dataSource: { metric: 'defectAging' },
        size: 'lg',
        position: { row: 1, col: 0 },
        config: {},
      },
      {
        type: 'table',
        title: 'Quality Gates',
        dataSource: { metric: 'qualityGates' },
        size: 'lg',
        position: { row: 1, col: 2 },
        config: { columns: ['name', 'threshold', 'actual', 'status'] },
      },
    ],
  },
  {
    id: 'template-team-performance',
    name: 'Team Performance',
    description: 'Team productivity and contribution metrics',
    category: 'team',
    widgets: [
      {
        type: 'table',
        title: 'Tester Leaderboard',
        dataSource: { metric: 'testerPerformance' },
        size: 'lg',
        position: { row: 0, col: 0 },
        config: { sortBy: 'productivityScore', limit: 10 },
      },
      {
        type: 'bar_chart',
        title: 'Tests by Assignee',
        dataSource: { metric: 'testsByAssignee' },
        size: 'md',
        position: { row: 0, col: 2 },
        config: {},
      },
      {
        type: 'trend_chart',
        title: 'Team Velocity',
        dataSource: { metric: 'teamVelocity' },
        size: 'lg',
        position: { row: 1, col: 0 },
        config: { chartType: 'line' },
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useDashboardTemplates
// ─────────────────────────────────────────────────────────────────────────────

export function useDashboardTemplates() {
  return useQuery({
    queryKey: ['dashboard-templates'],
    queryFn: async () => {
      // Return built-in templates (could fetch from DB in future)
      return DEFAULT_TEMPLATES;
    },
    staleTime: Infinity,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useCustomDashboards - List all dashboards
// ─────────────────────────────────────────────────────────────────────────────

export function useCustomDashboards(releaseId?: string) {
  return useQuery({
    queryKey: ['custom-dashboards', releaseId],
    queryFn: async (): Promise<CustomDashboard[]> => {
      const dashboards = Array.from(dashboardsStore.values());
      
      if (releaseId) {
        return dashboards.filter(d => d.releaseId === releaseId || d.isGlobal);
      }
      
      return dashboards;
    },
    staleTime: 30000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useCustomDashboard - Get single dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function useCustomDashboard(dashboardId: string | null) {
  return useQuery({
    queryKey: ['custom-dashboard', dashboardId],
    queryFn: async (): Promise<CustomDashboard | null> => {
      if (!dashboardId) return null;
      return dashboardsStore.get(dashboardId) || null;
    },
    enabled: !!dashboardId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useCreateDashboard
// ─────────────────────────────────────────────────────────────────────────────

interface CreateDashboardInput {
  name: string;
  description?: string;
  releaseId?: string;
  templateId?: string;
  isGlobal?: boolean;
}

export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDashboardInput): Promise<CustomDashboard> => {
      let widgets: DashboardWidget[] = [];

      // Copy widgets from template if specified
      if (input.templateId) {
        const template = DEFAULT_TEMPLATES.find(t => t.id === input.templateId);
        if (template) {
          widgets = template.widgets.map(w => ({
            ...w,
            id: uuidv4(),
          }));
        }
      }

      const dashboard: CustomDashboard = {
        id: uuidv4(),
        name: input.name,
        description: input.description,
        releaseId: input.releaseId,
        isGlobal: input.isGlobal || false,
        widgets,
        createdBy: 'current-user', // Would get from auth
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: false,
        tags: [],
      };

      dashboardsStore.set(dashboard.id, dashboard);
      return dashboard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboards'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useUpdateDashboard
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateDashboardInput {
  dashboardId: string;
  name?: string;
  description?: string;
  widgets?: DashboardWidget[];
  isPublic?: boolean;
  tags?: string[];
}

export function useUpdateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDashboardInput): Promise<CustomDashboard> => {
      const existing = dashboardsStore.get(input.dashboardId);
      if (!existing) {
        throw new Error('Dashboard not found');
      }

      const updated: CustomDashboard = {
        ...existing,
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.widgets && { widgets: input.widgets }),
        ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
        ...(input.tags && { tags: input.tags }),
        updatedAt: new Date().toISOString(),
      };

      dashboardsStore.set(updated.id, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['custom-dashboard', data.id] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useDeleteDashboard
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboardId: string): Promise<void> => {
      dashboardsStore.delete(dashboardId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboards'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useAddWidget
// ─────────────────────────────────────────────────────────────────────────────

interface AddWidgetInput {
  dashboardId: string;
  type: WidgetType;
  title: string;
  dataSource: DashboardWidget['dataSource'];
  size?: DashboardWidget['size'];
  config?: Record<string, unknown>;
}

export function useAddWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddWidgetInput): Promise<DashboardWidget> => {
      const dashboard = dashboardsStore.get(input.dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Find next available position
      const maxRow = Math.max(...dashboard.widgets.map(w => w.position.row), -1);

      const widget: DashboardWidget = {
        id: uuidv4(),
        type: input.type,
        title: input.title,
        dataSource: input.dataSource,
        size: input.size || 'md',
        position: { row: maxRow + 1, col: 0 },
        config: input.config || {},
      };

      dashboard.widgets.push(widget);
      dashboard.updatedAt = new Date().toISOString();
      dashboardsStore.set(dashboard.id, dashboard);

      return widget;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboard', variables.dashboardId] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useRemoveWidget
// ─────────────────────────────────────────────────────────────────────────────

export function useRemoveWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dashboardId, widgetId }: { dashboardId: string; widgetId: string }): Promise<void> => {
      const dashboard = dashboardsStore.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      dashboard.widgets = dashboard.widgets.filter(w => w.id !== widgetId);
      dashboard.updatedAt = new Date().toISOString();
      dashboardsStore.set(dashboard.id, dashboard);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboard', variables.dashboardId] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useUpdateWidgetPosition
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateWidgetPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      dashboardId, 
      widgetId, 
      position 
    }: { 
      dashboardId: string; 
      widgetId: string; 
      position: { row: number; col: number } 
    }): Promise<void> => {
      const dashboard = dashboardsStore.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const widget = dashboard.widgets.find(w => w.id === widgetId);
      if (widget) {
        widget.position = position;
        dashboard.updatedAt = new Date().toISOString();
        dashboardsStore.set(dashboard.id, dashboard);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboard', variables.dashboardId] });
    },
  });
}
