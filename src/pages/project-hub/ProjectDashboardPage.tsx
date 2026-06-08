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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, LayoutGrid, RotateCcw, Tv, TvMinimal, Star, StarOff, RefreshCw, MoreHorizontal, Link2 } from '@/lib/atlaskit-icons';
import { token } from '@atlaskit/tokens';
import AkButton, { IconButton as AkIconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';

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

const LAYOUT_OPTIONS: { key: '1col' | '2col-equal' | '2col-left-wide' | '3col-equal'; label: string }[] = [
  { key: '1col', label: '1 column' },
  { key: '2col-equal', label: '2 columns equal' },
  { key: '2col-left-wide', label: '2 columns left-wide' },
  { key: '3col-equal', label: '3 columns equal' },
];

function LayoutDropdown({ onSelect }: { onSelect: (preset: '1col' | '2col-equal' | '2col-left-wide' | '3col-equal') => void }) {
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

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <Button appearance="subtle" spacing="compact" onClick={() => setOpen((o) => !o)}>
        Change layout
      </Button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 400,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)'),
            minWidth: 180,
            padding: '4px 0',
          }}
        >
          <div style={{ padding: '4px 12px', fontSize: 11, fontWeight: 653, color: token('color.text.subtlest', '#6B778C') }}>
            Preset layouts
          </div>
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { onSelect(opt.key); setOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                border: 0,
                background: 'transparent',
                textAlign: 'left',
                fontSize: 14,
                color: token('color.text', '#292A2E'),
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4'); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectDashboardPage() {
  return (
    <DashboardFilterProvider>
      <ProjectDashboardPageInner />
    </DashboardFilterProvider>
  );
}

function ProjectDashboardPageInner() {
  const { key } = useParams<{ key: string }>();
  const queryClient = useQueryClient();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ResolvedWidget[] | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Presentation / TV mode — toggles a data attr on <html>.
  // CSS in index.css scales typography 1.45× when active so the dashboard
  // reads cleanly on big screens (wall-mounted TVs, projectors).
  // Persisted to localStorage so kiosks survive reloads.
  const [presentation, setPresentation] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('catalyst-presentation') === 'true';
  });
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (presentation) {
      document.documentElement.setAttribute('data-presentation', 'true');
      window.localStorage.setItem('catalyst-presentation', 'true');
    } else {
      document.documentElement.removeAttribute('data-presentation');
      window.localStorage.removeItem('catalyst-presentation');
    }
  }, [presentation]);

  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDraft(null); setIsEditing(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-dashboard-v5', key],
    queryFn: async () => {
      if (!key) return null;
      const upper = key.toUpperCase();
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
  useDashboardRealtime({ projectId, projectKey: pKey, enabled: !!pKey });

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
    setGalleryOpen(true); // D16 — auto-open gallery when entering edit mode
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

  // Apply a preset layout — updates all visible widgets' spans in the draft.
  const applyLayout = (preset: '1col' | '2col-equal' | '2col-left-wide' | '3col-equal') => {
    setDraft((current) => {
      if (!current) return current;
      const visible = current.filter((w) => w.visible).sort((a, b) => a.position - b.position);
      const spanMap = new Map<string, WidgetSpan>();
      visible.forEach((w, i) => {
        switch (preset) {
          case '1col':
            spanMap.set(w.id, 12);
            break;
          case '2col-equal':
            spanMap.set(w.id, 6);
            break;
          case '2col-left-wide':
            spanMap.set(w.id, i === 0 ? 8 : 4);
            break;
          case '3col-equal':
            spanMap.set(w.id, 4);
            break;
        }
      });
      return current.map((w) => {
        const newSpan = spanMap.get(w.id);
        return newSpan != null ? { ...w, span: newSpan } : w;
      });
    });
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

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['ph-project-dashboard-v5'] });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const actions = isEditing ? (
    <>
      <Tooltip content={isFavorite ? 'Remove from favorites' : 'Add to favorites'} position="bottom">
        {(tp) => (
          <span {...tp} style={{ display: 'inline-flex' }}>
            <AkIconButton
              label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              icon={() => isFavorite ? <Star size={16} style={{ color: '#FFAB00' }} /> : <StarOff size={16} />}
              appearance="subtle"
              spacing="compact"
              onClick={() => setIsFavorite((f) => !f)}
            />
          </span>
        )}
      </Tooltip>
      <Button
        appearance="subtle"
        spacing="compact"
        onClick={() => setGalleryOpen(true)}
        testId="dashboard-add-widget"
      >
        Add gadget
      </Button>
      <LayoutDropdown onSelect={applyLayout} />
      <Button
        appearance="primary"
        spacing="compact"
        onClick={saveEdit}
        testId="dashboard-edit-done"
      >
        Done
      </Button>
      <DropdownMenu
        trigger={({ triggerRef, ...triggerProps }) => (
          <AkIconButton
            ref={triggerRef}
            {...triggerProps}
            label="More actions"
            icon={() => <MoreHorizontal size={16} />}
            appearance="subtle"
            spacing="compact"
          />
        )}
      >
        <DropdownItemGroup>
          <DropdownItem onClick={cancelEdit}>Cancel editing</DropdownItem>
          <DropdownItem onClick={resetLayout}>Reset to defaults</DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>
    </>
  ) : (
    <>
      <Tooltip content={isFavorite ? 'Remove from favorites' : 'Add to favorites'} position="bottom">
        {(tp) => (
          <span {...tp} style={{ display: 'inline-flex' }}>
            <AkIconButton
              label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              icon={() => isFavorite ? <Star size={16} style={{ color: '#FFAB00' }} /> : <StarOff size={16} />}
              appearance="subtle"
              spacing="compact"
              onClick={() => setIsFavorite((f) => !f)}
            />
          </span>
        )}
      </Tooltip>
      <Tooltip content="Copy dashboard link" position="bottom">
        {(tp) => (
          <span {...tp} style={{ display: 'inline-flex' }}>
            <AkIconButton
              label="Copy dashboard link"
              icon={() => <Link2 size={16} />}
              appearance="subtle"
              spacing="compact"
              onClick={handleCopyLink}
            />
          </span>
        )}
      </Tooltip>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<RefreshCw size={13} />}
        onClick={handleRefreshAll}
        testId="dashboard-refresh"
      >
        Refresh
      </Button>
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={<LayoutGrid size={13} />}
        onClick={enterEditMode}
        testId="dashboard-edit-layout"
      >
        Edit
      </Button>
      <DropdownMenu
        trigger={({ triggerRef, ...triggerProps }) => (
          <AkIconButton
            ref={triggerRef}
            {...triggerProps}
            label="More dashboard actions"
            icon={() => <MoreHorizontal size={16} />}
            appearance="subtle"
            spacing="compact"
          />
        )}
      >
        <DropdownItemGroup>
          <DropdownItem onClick={() => setPresentation((p) => !p)}>
            {presentation ? 'Exit TV mode' : 'TV mode'}
          </DropdownItem>
          <DropdownItem onClick={() => setGalleryOpen(true)}>Add gadget</DropdownItem>
          <DropdownItem onClick={resetLayout}>Reset to defaults</DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>
    </>
  );

  return (
    <AtlaskitPageShell
      title={
        <span style={{ fontSize: 24, fontWeight: 653, letterSpacing: '-0.003em', color: token('color.text', '#292A2E') }}>
          {(project as any)?.name || pKey || 'Dashboard'}
        </span>
      }
      actions={actions}
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
        </div>

        {/* Right-side gallery panel (Jira "Add a Gadget" parity) */}
        <WidgetGalleryModal
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          widgets={widgetsForModal}
          onToggleVisibility={toggleVisibility}
          onReset={resetLayout}
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
  );
}
