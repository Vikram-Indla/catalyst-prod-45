// @ts-nocheck
/**
 * ProjectDashboard V5 — 11-widget, 12-column dashboard with edit mode.
 *
 * Apr 25, 2026 — Edit-mode rebuild.
 *   - 12-column position-driven grid (was 3-col hand-rolled GRID_LAYOUT).
 *   - Edit mode owns a `draftConfig`; mutations during editing don't hit
 *     Supabase. Done = single bulk upsert. Cancel = revert to baseline.
 *   - Drag-to-reorder via @atlaskit/pragmatic-drag-and-drop, "insert
 *     before target" rule.
 *   - Resize cycle (Narrower / Wider) via SPAN_LADDER, clamped by minSpan.
 *   - Add Widget toggles visibility in DRAFT (no immediate Supabase write).
 *   - Hidden widget made visible gets appended to the bottom with its
 *     defaultSpan.
 *   - Success Flag via @atlaskit/flag.
 */
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, LayoutGrid, RotateCcw } from 'lucide-react';
import { token } from '@atlaskit/tokens';

import { supabase } from '@/integrations/supabase/client';
import { AtlaskitPageShell, Button, Flag, FlagGroup } from '@/components/ads';
import DashboardWidgetGrid, {
  useDashboardWidgetConfig,
  type ResolvedWidget,
} from '@/components/project-hub/dashboard/DashboardWidgetGrid';
import WidgetGalleryModal from '@/components/project-hub/dashboard/WidgetGalleryModal';
import { nextSpan, type WidgetSpan } from '@/components/project-hub/dashboard/widget-registry';
import { DashboardFilterProvider } from '@/contexts/DashboardFilterContext';

export default function ProjectDashboardPage() {
  return (
    <DashboardFilterProvider>
      <ProjectDashboardPageInner />
    </DashboardFilterProvider>
  );
}

function ProjectDashboardPageInner() {
  const { key } = useParams<{ key: string }>();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ResolvedWidget[] | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-dashboard-v4', key],
    queryFn: async () => {
      if (!key) return null;
      const upper = key.toUpperCase();
      const { data: d1 } = await supabase
        .from('ph_projects')
        .select('*')
        .eq('key', upper)
        .maybeSingle();
      if (d1) return d1;
      const { data: d2 } = await supabase
        .from('projects')
        .select('*')
        .eq('key', upper)
        .maybeSingle();
      if (d2) return d2;
      const { data: d3 } = await supabase
        .from('projects')
        .select('*')
        .ilike('key', upper)
        .maybeSingle();
      return d3 ?? null;
    },
    enabled: !!key,
  });

  const projectId = (project as any)?.id ?? null;
  const pKey = (project as any)?.key || key?.toUpperCase() || '';

  const {
    widgets: persistedWidgets,
    toggleVisibility: persistedToggleVisibility,
    resetToDefaults,
    persistDraft,
  } = useDashboardWidgetConfig(projectId ?? 'none');

  // ---- Edit-mode helpers ----
  const enterEditMode = () => {
    // Snapshot the current persisted layout into the draft so subsequent
    // edits don't mutate the query cache.
    setDraft(persistedWidgets.map((w) => ({ ...w })));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (draft) {
      await persistDraft(draft);
    }
    setDraft(null);
    setIsEditing(false);
    setSavedFlag(true);
  };

  // Toggle visibility — works in both edit (draft) and non-edit (persisted) mode.
  const toggleVisibility = (widgetId: string) => {
    if (isEditing) {
      setDraft((current) => {
        if (!current) return current;
        const w = current.find((x) => x.id === widgetId);
        if (!w) return current;
        const nextVisible = !w.visible;
        // When showing a hidden widget, append it to the END so it appears
        // at the bottom of the visible list (per the documented rule).
        if (nextVisible) {
          const visibleCount = current.filter((x) => x.visible).length;
          return current.map((x) =>
            x.id === widgetId
              ? { ...x, visible: true, position: visibleCount, span: x.span ?? x.defaultSpan }
              : x,
          );
        }
        return current.map((x) =>
          x.id === widgetId ? { ...x, visible: false } : x,
        );
      });
    } else {
      persistedToggleVisibility(widgetId);
    }
  };

  // Resize — only meaningful in edit mode.
  const resize = (widgetId: string, direction: 'wider' | 'narrower') => {
    setDraft((current) => {
      if (!current) return current;
      return current.map((w) => {
        if (w.id !== widgetId) return w;
        const cur = (w.span ?? w.defaultSpan) as number;
        const next = nextSpan(cur, direction, (w.minSpan ?? 3) as WidgetSpan);
        return { ...w, span: next };
      });
    });
  };

  // Reorder — pragmatic-DnD on-drop callback.
  // Rule: insert source BEFORE target. After mutation, normalize positions
  // so visible widgets occupy 0..N-1 contiguously (hidden widgets keep
  // larger positions; sort key still works).
  const reorder = (sourceId: string, targetId: string, edge: 'before' | 'after') => {
    setDraft((current) => {
      if (!current) return current;
      const source = current.find((w) => w.id === sourceId);
      const target = current.find((w) => w.id === targetId);
      if (!source || !target || source.id === target.id) return current;

      // Build the new ordering: take all visible widgets, remove source,
      // insert it before target.
      const visible = current.filter((w) => w.visible).sort((a, b) => a.position - b.position);
      const without = visible.filter((w) => w.id !== sourceId);
      const targetIdx = without.findIndex((w) => w.id === targetId);
      const insertAt = edge === 'before' ? targetIdx : targetIdx + 1;
      const reordered = [
        ...without.slice(0, insertAt),
        source,
        ...without.slice(insertAt),
      ];

      // Map widget_id → new position
      const positionByid = new Map(reordered.map((w, i) => [w.id, i]));
      const hiddenStart = reordered.length;
      let nextHidden = hiddenStart;

      return current.map((w) => {
        if (w.visible) {
          return { ...w, position: positionByid.get(w.id) ?? w.position };
        }
        // Hidden widgets: stable order, but pushed past the visible block.
        return { ...w, position: nextHidden++ };
      });
    });
  };

  // Toggle collapse — in edit mode, mutate draft only; otherwise persist.
  const toggleCollapse = (widgetId: string) => {
    if (isEditing) {
      setDraft((current) =>
        current?.map((w) =>
          w.id === widgetId ? { ...w, collapsed: !w.collapsed } : w,
        ) ?? null,
      );
    }
    // Non-edit mode is handled inside DashboardWidgetGrid via persistedToggleCollapse.
  };

  // Reset — confirmation expected, but for now follow the existing
  // resetToDefaults contract. In edit mode, reset the DRAFT only.
  const resetLayout = () => {
    if (isEditing) {
      // Reset draft to defaults (visible, defaultPosition, defaultSpan).
      setDraft((current) => {
        if (!current) return current;
        return current
          .map((w) => ({
            ...w,
            visible: true,
            position: w.defaultPosition,
            collapsed: false,
            span: w.defaultSpan,
          }))
          .sort((a, b) => a.position - b.position);
      });
    } else {
      resetToDefaults();
    }
  };

  // Widgets to feed to the modal (for visibility toggles)
  const widgetsForModal = useMemo(
    () => (isEditing && draft ? draft : persistedWidgets).map((w) => ({ id: w.id, visible: w.visible })),
    [isEditing, draft, persistedWidgets],
  );

  const actions = isEditing ? (
    <>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<Plus size={13} />}
        onClick={() => setGalleryOpen(true)}
        testId="dashboard-add-widget"
      >
        Add widget
      </Button>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<RotateCcw size={13} />}
        onClick={resetLayout}
        testId="dashboard-reset-layout"
      >
        Reset
      </Button>
      <Button
        appearance="subtle"
        spacing="compact"
        onClick={cancelEdit}
        testId="dashboard-edit-cancel"
      >
        Cancel
      </Button>
      <Button
        appearance="primary"
        spacing="compact"
        onClick={saveEdit}
        testId="dashboard-edit-done"
      >
        Done
      </Button>
    </>
  ) : (
    <>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<Plus size={13} />}
        onClick={() => setGalleryOpen(true)}
        testId="dashboard-add-widget"
      >
        Add Widget
      </Button>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<LayoutGrid size={13} />}
        onClick={enterEditMode}
        testId="dashboard-edit-layout"
      >
        Edit Layout
      </Button>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<RotateCcw size={13} />}
        onClick={resetLayout}
        testId="dashboard-reset-layout"
      >
        Reset
      </Button>
    </>
  );

  return (
    <AtlaskitPageShell
      title="Dashboard"
      actions={actions}
      testId="project-dashboard-shell"
    >
      {isLoading ? (
        <div style={{ padding: '12px 16px 16px' }}>
          <div className="space-y-4 animate-pulse">
            <div
              className="h-12 rounded-lg"
              style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                gap: 24,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-lg"
                  style={{
                    gridColumn: 'span 4',
                    background: token('color.background.neutral.subtle', '#F1F5F9'),
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px 16px' }}>
          <DashboardWidgetGrid
            projectId={projectId || pKey}
            projectKey={pKey}
            isEditing={isEditing}
            draftWidgets={draft ?? undefined}
            onReorder={reorder}
            onResize={resize}
            onToggleCollapse={toggleCollapse}
          />
        </div>
      )}

      <WidgetGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        widgets={widgetsForModal}
        onToggleVisibility={toggleVisibility}
        onReset={resetLayout}
      />

      <FlagGroup onDismissed={() => setSavedFlag(false)}>
        {savedFlag && (
          <Flag
            id="dashboard-layout-saved"
            title="Layout saved"
            appearance="success"
            description="Your dashboard layout has been updated."
          />
        )}
      </FlagGroup>
    </AtlaskitPageShell>
  );
}
