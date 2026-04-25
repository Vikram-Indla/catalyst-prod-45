/**
 * DashboardWidgetGrid — 3-column grid, 16px gap
 * Handles widget visibility, ordering, and collapse state persistence
 */
import { useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { WIDGET_REGISTRY } from './widget-registry';

interface DashboardWidgetGridProps {
  projectId: string;
  projectKey: string;
}

interface WidgetConfig {
  widget_id: string;
  visible: boolean;
  position: number;
  collapsed: boolean;
}

export function useDashboardWidgetConfig(projectId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['dashboard-widget-config', projectId, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await typedQuery('dashboard_widget_config')
        .select('widget_id, visible, position, collapsed')
        .eq('project_id', projectId)
        .eq('user_id', userId);
      if (error) return [];
      return (data ?? []) as WidgetConfig[];
    },
    enabled: !!projectId && !!userId,
    staleTime: 60000,
  });

  // Auto-initialize defaults when no config exists
  const initRef = useRef(false);
  const initMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const rows = WIDGET_REGISTRY.map(def => ({
        project_id: projectId,
        user_id: userId,
        widget_id: def.id,
        visible: true,
        position: def.defaultPosition,
        collapsed: false,
      }));
      await typedQuery('dashboard_widget_config')
        .upsert(rows, { onConflict: 'project_id,user_id,widget_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widget-config', projectId, userId] });
    },
  });

  useEffect(() => {
    if (!isLoading && configs && configs.length === 0 && userId && !initRef.current) {
      initRef.current = true;
      initMutation.mutate();
    }
  }, [isLoading, configs, userId]);

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<WidgetConfig> & { widget_id: string }) => {
      if (!userId) return;
      const { error } = await typedQuery('dashboard_widget_config')
        .upsert({
          project_id: projectId,
          user_id: userId,
          widget_id: updates.widget_id,
          visible: updates.visible ?? true,
          position: updates.position ?? 0,
          collapsed: updates.collapsed ?? false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id,user_id,widget_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widget-config', projectId, userId] });
    },
  });

  const bulkUpsertMutation = useMutation({
    mutationFn: async (items: (Partial<WidgetConfig> & { widget_id: string })[]) => {
      if (!userId) return;
      const rows = items.map(item => ({
        project_id: projectId,
        user_id: userId,
        widget_id: item.widget_id,
        visible: item.visible ?? true,
        position: item.position ?? 0,
        collapsed: item.collapsed ?? false,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await typedQuery('dashboard_widget_config')
        .upsert(rows, { onConflict: 'project_id,user_id,widget_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widget-config', projectId, userId] });
    },
  });

  const widgets = useMemo(() => {
    const configMap = new Map((configs ?? []).map(c => [c.widget_id, c]));
    return WIDGET_REGISTRY.map(def => {
      const cfg = configMap.get(def.id);
      return {
        ...def,
        visible: cfg?.visible ?? true,
        position: cfg?.position ?? def.defaultPosition,
        collapsed: cfg?.collapsed ?? false,
      };
    }).sort((a, b) => a.position - b.position);
  }, [configs]);

  const visibleCount = widgets.filter(w => w.visible).length;

  return {
    widgets,
    visibleCount,
    isLoading,
    toggleVisibility: (widgetId: string) => {
      const current = widgets.find(w => w.id === widgetId);
      if (current) {
        upsertMutation.mutate({ widget_id: widgetId, visible: !current.visible, position: current.position, collapsed: current.collapsed });
      }
    },
    toggleCollapse: (widgetId: string) => {
      const current = widgets.find(w => w.id === widgetId);
      if (current) {
        upsertMutation.mutate({ widget_id: widgetId, visible: current.visible, position: current.position, collapsed: !current.collapsed });
      }
    },
    resetToDefaults: () => {
      bulkUpsertMutation.mutate(
        WIDGET_REGISTRY.map(def => ({
          widget_id: def.id,
          visible: true,
          position: def.defaultPosition,
          collapsed: false,
        }))
      );
    },
    setWidgetVisibility: (widgetId: string, visible: boolean) => {
      const current = widgets.find(w => w.id === widgetId);
      upsertMutation.mutate({ widget_id: widgetId, visible, position: current?.position ?? 0, collapsed: current?.collapsed ?? false });
    },
  };
}

// Fixed grid layout — 3 columns, 16px gap.
//
// Spans honor every widget's registry `minSpan`. List widgets (top-10
// tabular views) claim span=2 so their Title column has room to breathe —
// span=1 crushes titles into 3–5 wrap lines (caught Apr 19, 2026; see
// TruncateCell docstring + widget-registry `minSpan` comment).
//
// Widgets needing full horizontal breathing room (team-workload's bar
// chart; recent-activity stream) get span=3 for maximum legibility.
const GRID_LAYOUT: { widgetIds: string[]; spans: number[] }[] = [
  { widgetIds: ['milestones', 'release-health'], spans: [2, 1] },
  { widgetIds: ['items-by-status', 'overdue', 'on-hold'], spans: [1, 1, 1] },
  { widgetIds: ['prod-incidents', 'scope-change'], spans: [2, 1] },
  { widgetIds: ['qa-defects', 'time-in-status'], spans: [2, 1] },
  { widgetIds: ['team-workload'], spans: [3] },
  { widgetIds: ['recent-activity'], spans: [3] },
];

export default function DashboardWidgetGrid({ projectId, projectKey }: DashboardWidgetGridProps) {
  const { widgets, toggleCollapse } = useDashboardWidgetConfig(projectId);

  const widgetMap = useMemo(() => new Map(widgets.map(w => [w.id, w])), [widgets]);

  // Dev-only assertion: GRID_LAYOUT must honor every widget's registry
  // `minSpan`. If a span violates the minimum, log once so CI catches it in
  // dev; the span is auto-upgraded at render to prevent crushed titles.
  // (Production silently upgrades without noise.)
  if (import.meta.env?.DEV) {
    GRID_LAYOUT.forEach((row) => {
      row.widgetIds.forEach((id, colIdx) => {
        const w = widgetMap.get(id);
        const min = w?.minSpan ?? 1;
        const actual = row.spans[colIdx];
        if (actual < min) {
          console.warn(
            `[DashboardWidgetGrid] Widget "${id}" requires minSpan=${min} ` +
              `but layout assigned span=${actual}. Auto-upgrading at render. ` +
              `Update GRID_LAYOUT to silence this warning.`,
          );
        }
      });
    });
  }

  return (
    <div className="flex flex-col min-w-0 w-full max-w-full overflow-hidden" style={{ gap: 16 }}>
      {GRID_LAYOUT.map((row, rowIdx) => {
        const visibleInRow = row.widgetIds.filter(id => widgetMap.get(id)?.visible);
        if (visibleInRow.length === 0) return null;

        return (
          <div
            key={rowIdx}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 16,
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            {row.widgetIds.map((widgetId, colIdx) => {
              const w = widgetMap.get(widgetId);
              if (!w || !w.visible) return null;

              // Auto-upgrade span to honor the widget's minSpan invariant.
              const layoutSpan = row.spans[colIdx];
              const minSpan = w.minSpan ?? 1;
              const effectiveSpan = Math.max(layoutSpan, minSpan);

              const WidgetComponent = w.component;
              return (
                <div
                  key={widgetId}
                  style={{
                    gridColumn: `span ${effectiveSpan}`,
                    minWidth: 0,
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <WidgetComponent
                    projectId={projectId}
                    projectKey={projectKey}
                    collapsed={w.collapsed}
                    onToggleCollapse={() => toggleCollapse(widgetId)}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
