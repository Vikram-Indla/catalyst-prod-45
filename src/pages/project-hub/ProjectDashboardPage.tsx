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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { flag } from '@/components/shared/JiraTable/flags';
import { MoreHorizontal, Edit as EditIcon, Maximize2, Minimize2 } from '@/lib/atlaskit-icons';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { token } from '@atlaskit/tokens';
import { IconButton as AkIconButton } from '@atlaskit/button/new';

import { supabase } from '@/integrations/supabase/client';
import { AtlaskitPageShell, Button, Flag, FlagGroup, SectionMessage } from '@/components/ads';
import DashboardWidgetGrid, {
  useDashboardWidgetConfig,
  type ResolvedWidget,
} from '@/components/project-hub/dashboard/DashboardWidgetGrid';
import WidgetGalleryModal from '@/components/project-hub/dashboard/WidgetGalleryModal';
import { nextSpan, type WidgetSpan } from '@/components/project-hub/dashboard/widget-registry';
import { DashboardFilterProvider } from '@/contexts/DashboardFilterContext';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import ProjectDashboardTimeline from '@/components/projecthub/ProjectDashboardTimeline';
import ProductDashboardTimeline from '@/components/producthub/ProductDashboardTimeline';


// Self-rolled dropdown for edit mode actions — avoids @atlaskit/popup (0,0) bug
// in AtlaskitPageShell flex headers.
function EditKebabMenu({
  onCancel,
  onReset,
  onManageGadgets,
}: {
  onCancel: () => void;
  onReset: () => void;
  onManageGadgets: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const itemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 14px',
    border: 0,
    background: 'transparent',
    textAlign: 'left',
    fontSize: 14,
    color: token('color.text', '#292A2E'),
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
  const item = (label: string, fn: () => void) => (
    <button
      type="button"
      onClick={() => { fn(); setOpen(false); }}
      onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4'); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      style={itemStyle}
    >
      {label}
    </button>
  );
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <AkIconButton
        label="More edit actions"
        icon={() => <MoreHorizontal size={16} />}
        appearance="subtle"
        spacing="compact"
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 400,
          background: token('elevation.surface.overlay', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: 4,
          boxShadow: token('elevation.shadow.overlay', '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)'),
          minWidth: 200,
          padding: '4px 0',
        }}>
          {item('Add / remove gadgets', onManageGadgets)}
          {item('Reset to defaults', onReset)}
          {item('Cancel editing', onCancel)}
        </div>
      )}
    </div>
  );
}

/* 2026-06-15: mode prop lets the same dashboard shell serve both
   /project-hub/:key/dashboard (default) and /product-hub/:key/dashboard. In
   product mode: resolves products by code (not ph_projects/projects by key),
   header chip flips to product, the 4 BR-incompatible widgets are filtered
   out of the gallery + never seeded. Per CLAUDE.md "ADOPT CANONICAL
   COMPONENTS — DO NOT REIMPLEMENT". */
type DashboardMode = 'project' | 'product' | 'incident' | 'test';

interface ProjectDashboardPageProps {
  mode?: DashboardMode;
}

export default function ProjectDashboardPage({ mode = 'project' }: ProjectDashboardPageProps = {}) {
  return (
    <DashboardFilterProvider>
      <ProjectDashboardPageInner mode={mode} />
    </DashboardFilterProvider>
  );
}

function ProjectDashboardPageInner({ mode }: { mode: DashboardMode }) {
  const isProduct = mode === 'product';
  const isIncident = mode === 'incident';
  const isTest = mode === 'test';
  const params = useParams<{ key: string }>();
  /* 2026-06-17: incident hub has no :key in the URL — use the same
     'INCIDENTS' sentinel that the filters + timeline pages use.
     2026-06-21: testhub follows the same pattern with 'TESTHUB'. */
  const key = isIncident ? 'INCIDENTS' : isTest ? 'TESTHUB' : params.key;
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [draft, setDraft] = useState<ResolvedWidget[] | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);
  const [showReplay, setShowReplay] = useState(false);

  // 2026-06-09 Vikram RCA — @atlaskit/flag has NO autoDismiss prop.
  // Without an explicit timer, "Layout saved" persists forever until
  // the user clicks ×. Auto-clear after 4s.
  useEffect(() => {
    if (!savedFlag) return;
    const t = window.setTimeout(() => setSavedFlag(false), 4000);
    return () => window.clearTimeout(t);
  }, [savedFlag]);

useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isFullScreen) { setIsFullScreen(false); return; }
      if (isEditing) { setDraft(null); setIsEditing(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing, isFullScreen]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-dashboard-v5', key, mode],
    queryFn: async () => {
      if (!key) return null;
      const upper = key.toUpperCase();
      /* 2026-06-15: in product mode, resolve products.code → row. The
         dashboard_widget_config.project_id FK targets projects(id), but
         dashboard_widget_config has no FK to products(id); the per-user
         config is keyed by whatever uuid we pass, so products.id works
         too. (RLS on dashboard_widget_config is user-scoped, not project-
         scoped.) */
      if (isProduct) {
        const { data: prod } = await (supabase as any)
          .from('products')
          .select('id, code, name')
          .eq('code', upper)
          .eq('is_active', true)
          .maybeSingle();
        if (prod) return { ...(prod as any), key: prod.code };
        return null;
      }
      /* 2026-06-17: incident mode synthesizes a row — dashboard_widget_config
         only needs a stable user-scoped uuid for layout persistence. Use a
         deterministic namespace UUID for 'INCIDENTS' so every user's layout
         is keyed consistently. */
      if (isIncident) {
        return {
          id: '00000000-0000-0000-0000-000000000001',
          key: 'INCIDENTS',
          name: 'Incidents',
        } as any;
      }
      if (isTest) {
        return {
          id: '00000000-0000-0000-0000-000000000002',
          key: 'TESTHUB',
          name: 'Test Hub',
        } as any;
      }
      // Resolve to canonical `public.projects` row first — the
      // dashboard_widget_config.project_id FK targets projects(id), so
      // returning a ph_projects.id (different uuid) would silently fail
      // the FK on upsert. Prefer projects, fall back to ph_projects.
      const { data: canonical } = await supabase
        .from('projects')
        .select('*')
        .eq('key', upper)
        .maybeSingle();
      if (canonical) return canonical;
      const { data: canonicalCi } = await supabase
        .from('projects')
        .select('*')
        .ilike('key', upper)
        .maybeSingle();
      if (canonicalCi) return canonicalCi;
      const { data: ph } = await supabase
        .from('ph_projects')
        .select('*')
        .eq('key', upper)
        .maybeSingle();
      return ph ?? null;
    },
    enabled: !!key,
  });

  const projectId = (project as any)?.id ?? null;
  const pKey = (project as any)?.key || key?.toUpperCase() || '';

  // Realtime invalidation — collapses the 15-min staleTime window to ~zero
  // for ph_issues / tm_defects / catalyst_status_history changes scoped to
  // this project. One channel total, mounted at the page level.
  // 2026-06-15: disabled in product mode for now — the realtime hook
  // subscribes to ph_issues tables, which aren't relevant for business_requests.
  // Phase B will rewire realtime to business_requests for product mode.
  useDashboardRealtime({ projectId, projectKey: pKey, enabled: !!pKey && !isProduct && !isIncident && !isTest });

  const {
    widgets: persistedWidgets,
    toggleVisibility: persistedToggleVisibility,
    resetToDefaults,
    persistDraft,
  } = useDashboardWidgetConfig(projectId ?? 'none', mode);

  // ---- Edit-mode helpers ----
  const enterEditMode = () => {
    setDraft(persistedWidgets.map((w) => ({ ...w })));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setIsEditing(false);
    setGalleryOpen(false);
  };

  const saveEdit = async () => {
    if (draft) {
      await persistDraft(draft);
    }
    setDraft(null);
    setIsEditing(false);
    setGalleryOpen(false);
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

  // Non-edit-mode reorder: compute new order from persistedWidgets and immediately persist.
  const reorderAndSave = (sourceId: string, targetId: string, edge: 'before' | 'after') => {
    const visible = persistedWidgets.filter((w) => w.visible).sort((a, b) => a.position - b.position);
    const without = visible.filter((w) => w.id !== sourceId);
    const targetIdx = without.findIndex((w) => w.id === targetId);
    if (targetIdx === -1) return;
    const insertAt = edge === 'before' ? targetIdx : targetIdx + 1;
    const source = visible.find((w) => w.id === sourceId);
    if (!source) return;
    const reordered = [...without.slice(0, insertAt), source, ...without.slice(insertAt)];
    const posById = new Map(reordered.map((w, i) => [w.id, i]));
    const newLayout = persistedWidgets.map((w) =>
      w.visible ? { ...w, position: posById.get(w.id) ?? w.position } : w,
    );
    persistDraft(newLayout);
  };

  // Elevated button style — matches ADS elevation.shadow.raised token.
  // Used for the Edit and Full Screen CTAs so they have visual lift above
  // the flat shell background (appearance="subtle" is dead-flat).
  const elevatedBtnStyle: React.CSSProperties = {
    background: token('elevation.surface.raised', '#FFFFFF'),
    boxShadow: token(
      'elevation.shadow.raised',
      '0 1px 1px rgba(9,30,66,0.13), 0 0 1px rgba(9,30,66,0.21)',
    ),
    border: `1px solid ${token('color.border', '#DFE1E6')}`,
    borderRadius: 3,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '0 8px',
    height: 32,
    fontSize: 14,
    fontWeight: 500,
    color: token('color.text', '#172B4D'),
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'inherit',
  };

  const actions = isEditing ? (
    <>
      <Button
        appearance="primary"
        spacing="compact"
        onClick={saveEdit}
        testId="dashboard-edit-done"
      >
        Done
      </Button>
      <EditKebabMenu
        onCancel={cancelEdit}
        onReset={resetLayout}
        onManageGadgets={() => setGalleryOpen(true)}
      />
    </>
  ) : (
    <>
      <Button
        appearance="primary"
        spacing="compact"
        onClick={() => setShowReplay(true)}
        testId="dashboard-replay-demo"
      >
        Replay Demo
      </Button>
      <button
        type="button"
        style={elevatedBtnStyle}
        onClick={() => setIsFullScreen(true)}
        data-testid="dashboard-fullscreen"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4'); }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('elevation.surface.raised', '#FFFFFF'); }}
      >
        <Maximize2 size={13} />
        Full screen
      </button>
      <button
        type="button"
        style={elevatedBtnStyle}
        onClick={enterEditMode}
        data-testid="dashboard-edit-layout"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4'); }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('elevation.surface.raised', '#FFFFFF'); }}
      >
        <EditIcon size={13} />
        Edit
      </button>
    </>
  );

  // Full screen overlay — position: fixed covers all chrome (left nav,
  // project header, sidebars). ESC or Cancel button exits.
  if (isFullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: token('elevation.surface', '#FFFFFF'),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        data-testid="dashboard-fullscreen-overlay"
      >
        {/* Full screen top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
            flexShrink: 0,
            background: token('elevation.surface', '#FFFFFF'),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ProjectIcon
              size="small"
              projectKey={pKey}
              avatarUrl={(project as any)?.avatar_url ?? null}
              iconName={(project as any)?.icon ?? 'mountain'}
              color={(project as any)?.color ?? '#2563EB'}
              name={(project as any)?.name ?? pKey}
            />
            <span style={{ fontSize: 16, fontWeight: 500, color: token('color.text', '#172B4D'), fontFamily: "'Atlassian Sans', -apple-system, sans-serif" }}>
              {(project as any)?.name ?? pKey} — Dashboard
            </span>
          </div>
          <button
            type="button"
            style={{
              ...elevatedBtnStyle,
              color: token('color.text', '#172B4D'),
            }}
            onClick={() => setIsFullScreen(false)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4'); }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('elevation.surface.raised', '#FFFFFF'); }}
          >
            <Minimize2 size={13} />
            Exit full screen
          </button>
        </div>

        {/* Dashboard content in full screen */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {!isProduct && !isIncident && !isTest && pKey && (
            <div style={{ marginBottom: 24 }}>
              <ProjectDashboardTimeline projectKey={pKey} />
            </div>
          )}
          {isProduct && pKey && (
            <div style={{ marginBottom: 24 }}>
              <ProductDashboardTimeline productId={pKey} />
            </div>
          )}
          <DashboardWidgetGrid
            projectId={projectId || pKey}
            projectKey={pKey}
            isEditing={false}
            onToggleCollapse={toggleCollapse}
            onRemoveWidget={toggleVisibility}
            mode={mode}
          />
        </div>
      </div>
    );
  }

  return (
    <>
    <AtlaskitPageShell
      flush
      chromeBand={pKey ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ProjectPageHeader projectKey={pKey} hubType={isProduct ? 'product' : isIncident ? 'incident' : isTest ? 'test' : undefined} />
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingInline: 20, paddingBottom: 8 }}>
              {actions}
            </div>
          )}
        </div>
      ) : null}
      testId="project-dashboard-shell"
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Main dashboard content */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    height: 48,
                    borderRadius: token('border.radius', '8px'),
                    background: token('color.background.neutral.subtle', '#F1F2F4'),
                  }}
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
                      style={{
                        gridColumn: 'span 4',
                        height: 160,
                        borderRadius: token('border.radius', '8px'),
                        background: token('color.background.neutral.subtle', '#F1F2F4'),
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              {isEditing && (
                <div style={{ marginBottom: 16 }}>
                  <SectionMessage appearance="information">
                    You are currently editing your dashboard. Changes will be saved when you click Done.
                  </SectionMessage>
                </div>
              )}
              {!isProduct && !isIncident && !isTest && pKey && (
                <div style={{ marginBottom: 24 }}>
                  <ProjectDashboardTimeline projectKey={pKey} />
                </div>
              )}
              {isProduct && pKey && (
                <div style={{ marginBottom: 24 }}>
                  <ProductDashboardTimeline productId={pKey} />
                </div>
              )}
              <DashboardWidgetGrid
                projectId={projectId || pKey}
                projectKey={pKey}
                isEditing={isEditing}
                draftWidgets={draft ?? undefined}
                onReorder={reorder}
                onReorderDirect={reorderAndSave}
                onResize={resize}
                onToggleCollapse={toggleCollapse}
                onRemoveWidget={toggleVisibility}
                mode={mode}
              />
            </div>
          )}
        </div>

        {/* Right-side gallery panel (Jira "Add a Gadget" parity) */}
        <WidgetGalleryModal
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          widgets={widgetsForModal}
          onToggleVisibility={toggleVisibility}
          onReset={resetLayout}
          mode={mode}
        />
      </div>

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
    {showReplay && <CatalystReplayDemo />}
    </>
  );
}
