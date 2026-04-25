/**
 * DashboardWidgetGrid — 12-column position-driven grid.
 *
 * Apr 25, 2026 — context-based edit mode (RCA fix).
 *   Each widget component (DemandFulfilmentGadget, QADefectsWidget, etc.)
 *   already wraps itself in <WidgetWrapper>. The grid does NOT add a
 *   second wrapper — it just sets the grid-cell `gridColumn: span N` and
 *   broadcasts edit-mode state via context. WidgetWrapper consumes the
 *   context to render the drag handle / resize buttons / collapse chevron
 *   on each widget's own header — no double chrome.
 *
 * Visible widgets render in ascending `position`. Effective span =
 *   max(span ?? defaultSpan, minSpan ?? 1), clamped to 12.
 * `gridAutoFlow: row dense` lets later cards backfill earlier gaps.
 */
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { WIDGET_REGISTRY, type WidgetSpan } from './widget-registry';

interface DashboardWidgetGridProps {
  projectId: string;
  projectKey: string;
  isEditing?: boolean;
  draftWidgets?: ResolvedWidget[];
  onReorder?: (sourceId: string, targetId: string, edge: 'before' | 'after') => void;
  onResize?: (widgetId: string, direction: 'wider' | 'narrower') => void;
  onToggleCollapse?: (widgetId: string) => void;
}

export interface DashboardWidgetConfig {
  widget_id: string;
  visible: boolean;
  position: number;
  collapsed: boolean;
  span: number | null;
}

export interface ResolvedWidget {
  id: string;
  title: string;
  subtitle?: string;
  group: 'delivery' | 'quality' | 'team';
  defaultSpan: WidgetSpan;
  minSpan?: WidgetSpan;
  defaultPosition: number;
  component: WidgetDef['component'];
  visible: boolean;
  position: number;
  collapsed: boolean;
  span: number | null;
}
type WidgetDef = (typeof WIDGET_REGISTRY)[number];

export function effectiveSpan(w: ResolvedWidget): number {
  const base = w.span ?? w.defaultSpan;
  const min = w.minSpan ?? 1;
  return Math.max(min, Math.min(12, base));
}

export function resolveWidgets(configs: DashboardWidgetConfig[]): ResolvedWidget[] {
  const map = new Map(configs.map((c) => [c.widget_id, c]));
  return WIDGET_REGISTRY.map((def) => {
    const cfg = map.get(def.id);
    return {
      ...def,
      visible: cfg?.visible ?? true,
      position: cfg?.position ?? def.defaultPosition,
      collapsed: cfg?.collapsed ?? false,
      span: cfg?.span ?? null,
    } as ResolvedWidget;
  }).sort((a, b) => a.position - b.position);
}

// ────────────────────────────────────────────────────────────────────
// Edit-mode contexts — consumed by WidgetWrapper inside each widget.
// ────────────────────────────────────────────────────────────────────

interface WidgetIdContextValue {
  widgetId: string;
  currentSpan: number;
  minSpan: number;
}
export const WidgetIdContext = createContext<WidgetIdContextValue | null>(null);

interface GridEditContextValue {
  isEditing: boolean;
  onResize?: (widgetId: string, direction: 'wider' | 'narrower') => void;
  onReorder?: (sourceId: string, targetId: string, edge: 'before' | 'after') => void;
  onToggleCollapseDraft?: (widgetId: string) => void;
}
export const GridEditContext = createContext<GridEditContextValue>({
  isEditing: false,
});

export function useWidgetEditState() {
  const id = useContext(WidgetIdContext);
  const grid = useContext(GridEditContext);
  if (!id) return { isEditing: false } as const;
  return {
    isEditing: grid.isEditing,
    widgetId: id.widgetId,
    currentSpan: id.currentSpan as WidgetSpan,
    minSpan: id.minSpan,
    // Bound: "this widget" IS the subject of resize/collapse.
    onResize: grid.onResize ? (dir: 'wider' | 'narrower') => grid.onResize!(id.widgetId, dir) : undefined,
    onCollapseDraft: grid.onToggleCollapseDraft
      ? () => grid.onToggleCollapseDraft!(id.widgetId)
      : undefined,
    // Raw (page-level): pragmatic-DnD's dropTarget runs on the TARGET widget,
    // and the source is whichever widget was dragged. The WidgetWrapper needs
    // to call onReorder(sourceId, thisWidgetId, edge) — neither argument is
    // implicit. Expose the unbound version so it can pass both ids itself.
    reorderRaw: grid.onReorder,
  };
}

// ────────────────────────────────────────────────────────────────────
// Persistence hook — query, init, upsert, bulk upsert, reset.
// ────────────────────────────────────────────────────────────────────

export function useDashboardWidgetConfig(projectId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['dashboard-widget-config', projectId, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await typedQuery('dashboard_widget_config' as any)
        .select('widget_id, visible, position, collapsed, span')
        .eq('project_id', projectId)
        .eq('user_id', userId);
      if (error) return [];
      return ((data ?? []) as unknown) as DashboardWidgetConfig[];
    },
    enabled: !!projectId && !!userId,
    staleTime: 60000,
  });

  const initRef = useRef(false);
  const initMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const rows = WIDGET_REGISTRY.map((def) => ({
        project_id: projectId,
        user_id: userId,
        widget_id: def.id,
        visible: true,
        position: def.defaultPosition,
        collapsed: false,
        span: def.defaultSpan,
      }));
      const { error } = await typedQuery('dashboard_widget_config' as any).upsert(rows, {
        onConflict: 'project_id,user_id,widget_id',
      });
      if (error) {
        // Surface init failures so we don't fall through to a stateless
        // dashboard silently. Common causes: invalid project_id (UUID
        // mismatch), FK violation, RLS denial.
        // eslint-disable-next-line no-console
        console.error('[DashboardWidgetGrid] init upsert failed:', error, {
          projectId,
          userId,
          rowCount: rows.length,
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widget-config', projectId, userId] });
    },
    onError: (err: any) => {
      // eslint-disable-next-line no-console
      console.error('[DashboardWidgetGrid] init mutation error:', err?.message ?? err);
    },
  });

  useEffect(() => {
    // Don't fire init while projectId is the page's "none" sentinel —
    // that string fails Supabase's UUID type cast and produces a 400.
    const projectIdValid =
      typeof projectId === 'string' && projectId !== 'none' && projectId.length > 0;
    if (
      !isLoading &&
      configs &&
      configs.length === 0 &&
      userId &&
      projectIdValid &&
      !initRef.current
    ) {
      initRef.current = true;
      initMutation.mutate();
    }
  }, [isLoading, configs, userId, projectId]);

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<DashboardWidgetConfig> & { widget_id: string }) => {
      if (!userId) return;
      const { error } = await typedQuery('dashboard_widget_config' as any).upsert(
        {
          project_id: projectId,
          user_id: userId,
          widget_id: updates.widget_id,
          visible: updates.visible ?? true,
          position: updates.position ?? 0,
          collapsed: updates.collapsed ?? false,
          span: updates.span ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,user_id,widget_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widget-config', projectId, userId] });
    },
  });

  const bulkUpsertMutation = useMutation({
    mutationFn: async (items: (Partial<DashboardWidgetConfig> & { widget_id: string })[]) => {
      if (!userId) return;
      const rows = items.map((item) => ({
        project_id: projectId,
        user_id: userId,
        widget_id: item.widget_id,
        visible: item.visible ?? true,
        position: item.position ?? 0,
        collapsed: item.collapsed ?? false,
        span: item.span ?? null,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await typedQuery('dashboard_widget_config' as any).upsert(rows, {
        onConflict: 'project_id,user_id,widget_id',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widget-config', projectId, userId] });
    },
  });

  const widgets = useMemo(() => resolveWidgets(configs ?? []), [configs]);
  const visibleCount = widgets.filter((w) => w.visible).length;

  return {
    widgets,
    visibleCount,
    isLoading,
    toggleVisibility: (widgetId: string) => {
      const current = widgets.find((w) => w.id === widgetId);
      if (current) {
        upsertMutation.mutate({
          widget_id: widgetId,
          visible: !current.visible,
          position: current.position,
          collapsed: current.collapsed,
          span: current.span,
        });
      }
    },
    toggleCollapse: (widgetId: string) => {
      const current = widgets.find((w) => w.id === widgetId);
      if (current) {
        upsertMutation.mutate({
          widget_id: widgetId,
          visible: current.visible,
          position: current.position,
          collapsed: !current.collapsed,
          span: current.span,
        });
      }
    },
    resetToDefaults: () => {
      bulkUpsertMutation.mutate(
        WIDGET_REGISTRY.map((def) => ({
          widget_id: def.id,
          visible: true,
          position: def.defaultPosition,
          collapsed: false,
          span: def.defaultSpan,
        })),
      );
    },
    setWidgetVisibility: (widgetId: string, visible: boolean) => {
      const current = widgets.find((w) => w.id === widgetId);
      upsertMutation.mutate({
        widget_id: widgetId,
        visible,
        position: current?.position ?? 0,
        collapsed: current?.collapsed ?? false,
        span: current?.span ?? null,
      });
    },
    persistDraft: async (draft: ResolvedWidget[]) => {
      await bulkUpsertMutation.mutateAsync(
        draft.map((w) => ({
          widget_id: w.id,
          visible: w.visible,
          position: w.position,
          collapsed: w.collapsed,
          span: w.span ?? w.defaultSpan,
        })),
      );
    },
  };
}

// ────────────────────────────────────────────────────────────────────
// Render — single 12-col grid. Each cell holds the widget DIRECTLY
// (no outer WidgetWrapper). Edit-mode chrome surfaces via context
// inside each widget's own WidgetWrapper.
// ────────────────────────────────────────────────────────────────────

export default function DashboardWidgetGrid({
  projectId,
  projectKey,
  isEditing,
  draftWidgets,
  onReorder,
  onResize,
  onToggleCollapse,
}: DashboardWidgetGridProps) {
  const { widgets: persistedWidgets, toggleCollapse: persistedToggleCollapse } =
    useDashboardWidgetConfig(projectId);

  const widgetsToRender = isEditing && draftWidgets ? draftWidgets : persistedWidgets;
  const visibleWidgets = widgetsToRender.filter((w) => w.visible);

  const collapseHandler = isEditing ? onToggleCollapse : persistedToggleCollapse;

  const editCtxValue: GridEditContextValue = {
    isEditing: !!isEditing,
    onResize,
    onReorder,
    onToggleCollapseDraft: isEditing ? onToggleCollapse : undefined,
  };

  return (
    <GridEditContext.Provider value={editCtxValue}>
      {/* Inline responsive rules via @container queries. The container is
          the dashboard grid itself, so the breakpoints react to the grid's
          available width — not the viewport. This makes the dashboard
          responsive even when embedded inside a side-rail or panel that
          shrinks the available width without resizing the window.

          Breakpoints (mirroring Atlassian Jira dashboard responsive grid):
            ≥ 1280  → 12 columns (default)
            960–1279 → 8 columns
            640–959  → 4 columns
            < 640    → 1 column (every visible widget = full width).
                       Guarantees AT LEAST one widget visible at the
                       narrowest breakpoint per the responsive contract.
          The grid keeps `auto-flow: row dense` so smaller widgets backfill
          gaps left by larger spans collapsing. */}
      <style>{`
        .ph-dashboard-grid {
          container-type: inline-size;
          container-name: phgrid;
        }
        @container phgrid (max-width: 1279px) {
          .ph-dashboard-grid > .ph-dashboard-grid-inner {
            grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
          }
          .ph-dashboard-grid > .ph-dashboard-grid-inner > [data-span] {
            grid-column: span min(var(--ph-span), 8) !important;
          }
        }
        @container phgrid (max-width: 959px) {
          .ph-dashboard-grid > .ph-dashboard-grid-inner {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          .ph-dashboard-grid > .ph-dashboard-grid-inner > [data-span] {
            grid-column: span min(var(--ph-span), 4) !important;
          }
        }
        @container phgrid (max-width: 639px) {
          .ph-dashboard-grid > .ph-dashboard-grid-inner {
            grid-template-columns: 1fr !important;
          }
          .ph-dashboard-grid > .ph-dashboard-grid-inner > [data-span] {
            grid-column: 1 / -1 !important;
          }
        }
      `}</style>
      <div
        className="ph-dashboard-grid"
        style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}
      >
      <div
        className="ph-dashboard-grid-inner"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gap: token('space.300', '24px'),
          gridAutoFlow: 'row dense',
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        {visibleWidgets.map((w) => {
          const span = effectiveSpan(w);
          const WidgetComponent = w.component;
          return (
            <div
              key={w.id}
              data-span={span}
              style={{
                gridColumn: `span ${span}`,
                ['--ph-span' as any]: String(span),
                minWidth: 0,
                maxWidth: '100%',
                overflow: 'hidden',
              }}
            >
              <WidgetIdContext.Provider
                value={{
                  widgetId: w.id,
                  currentSpan: span,
                  minSpan: w.minSpan ?? 1,
                }}
              >
                <WidgetComponent
                  projectId={projectId}
                  projectKey={projectKey}
                  collapsed={w.collapsed}
                  onToggleCollapse={() => collapseHandler?.(w.id)}
                />
              </WidgetIdContext.Provider>
            </div>
          );
        })}
      </div>
      </div>
    </GridEditContext.Provider>
  );
}
