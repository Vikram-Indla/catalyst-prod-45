/**
 * ProjectAllWorkView — All Work split panel (2-column, Jira-parity)
 *
 * 2026-04-18 history:
 *  - WS7: detail rendering delegated to CatalystDetailRouter (the canonical
 *    Atlaskit detail surface also used by /backlog). Replaces 460 lines of
 *    bespoke WorkItemDetailPanel and inherits Jira-correct typography,
 *    tokens, inline-edit fields, and description editor for free.
 *  - Table/Split toggle removed per directive; Ask AI removed from left
 *    toolbar (not used on this surface).
 *  - dbId wiring added to avoid CLAUDE.md §L39 UUID/issue_key silent 400.
 *
 * 2026-04-20 history:
 *  - A4 chokepoint extraction: selection state + URL sync moved to
 *    `useItemSelection` (src/hooks/useItemSelection.ts). This file is
 *    now the canonical caller; any new list-to-detail surface should
 *    reach for the hook rather than re-implementing the pattern.
 *    Behaviour unchanged — the hook encodes the exact prior semantics.
 */
import React, { lazy, Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import { WorkListPanel } from './components/WorkListPanel';
import { useProjectAllWorkItems } from '@/hooks/useProjectListItems';
import { useItemSelection } from '@/hooks/useItemSelection';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);
const StoryDetailModal = lazy(
  () => import('@/modules/project-work-hub/components/dialogs/StoryDetailModal'),
);

interface Props {
  projectKey: string;
  /** Optional — enables inline-edit mutations that need the project UUID. */
  projectId?: string;
}

/**
 * Below this width the split region cannot host both the 260px list and a
 * legible Jira-parity detail shell. The real lower bound is higher than the
 * raw article width because CatalystDetailRouter itself contains a left body,
 * a splitter, and a right sidebar. Hide the entire detail panel sooner so it
 * never visually crowds or overlaps the list in responsive preview mode.
 * The breakpoint is the split panel's own width, not the window width.
 */
const SPLIT_BREAKPOINT_PX = 1120;

export default function ProjectAllWorkView({ projectKey, projectId }: Props) {
  const { data: items = [] } = useProjectAllWorkItems(projectKey);
<<<<<<< Updated upstream
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  /** In narrow mode the middle panel is hidden — clicking a card opens
   *  StoryDetailModal as a full overlay instead (Jira parity). */
  const [overlayItemId, setOverlayItemId] = useState<string | null>(null);

  const splitRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const el = splitRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(w > 0 && w < SPLIT_BREAKPOINT_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
=======
>>>>>>> Stashed changes

  /* A4 chokepoint: dual-shape lookup (id/dbId), URL param hydration
     (`?issue=BAU-5047`), URL param sync, and split-view auto-select-
     first are all inside the hook. See useItemSelection.ts for the
     pattern rationale and CLAUDE.md §L39 for the silent-400 guard. */
  const { activeItem, selectItem } = useItemSelection(items, {
    urlParam: 'issue',
    autoSelectFirst: true,
  });

  const handleNavigate = useCallback((id: string) => {
    selectItem(id);
  }, [selectItem]);

  return (
    // Outer column — height 100% of the route slot, no scroll here. Both
    // the header and the split region live inside; the SPLIT REGION is
    // the only descendent that flexes to take remaining space, and each
    // inner panel (left list, center/right router) owns its own scroll.
    // Matches Jira's 3-region scroll model (measured 2026-04-18): left
    // panel 256×717 scrolls cards; center body scrolls article; right
    // details scrolls sidebar. Independent, not page-level.
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: token('elevation.surface', '#FFFFFF') }}>
      {/* ── Header card — mirrors /backlog's h1 block. No rule/line above;
            tight vertical rhythm; page title same size Jira uses (20/600).
      */}
      <div style={{ padding: '16px 16px 4px', flexShrink: 0 }}>
        <h1 style={{
          margin: 0, fontSize: 20, fontWeight: 600,
          color: token('color.text', '#292A2E'),
          letterSpacing: '-0.003em',
          fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>
          All work
        </h1>
      </div>

      {/* Split region — 3-panel responsive model (corrected 2026-04-20):
          • Wide   (≥1120px): [Navigator 260px] [Middle flex] [Right sidebar inside detail]
          • Narrow (<1120px): right sidebar hides (via @container in CatalystViewBase),
                              middle detail panel hides here, navigator takes full width.
          • The navigator (left list) is the LAST panel to collapse, matching
            Jira Cloud's tablet behavior — users still need to browse work items
            even when there's no room for the detail surface. */}
      <div ref={splitRef} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 8, padding: '6px 8px 8px' }}>
          {/* Navigator (left) — always visible; expands to full width when narrow. */}
          <div style={{
            width: isNarrow ? '100%' : 260,
            flexShrink: 0, background: '#F8F8F8',
            border: 'none', borderRadius: 4,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            padding: '0 2px',
          }}>
            <WorkListPanel
              items={items}
              selectedKey={activeItem?.id ?? null}
<<<<<<< Updated upstream
              onSelect={id => {
                setActiveItemId(id);
                // Narrow mode → no middle panel visible; open overlay modal.
                if (isNarrow) setOverlayItemId(id);
              }}
              projectId={projectId}
            />
          </div>

          {/* Middle + Right detail surface — hidden in narrow mode. Right
              sidebar inside CatalystViewBase auto-hides via @container query
              before this entire panel collapses. */}
          {!isNarrow && (
            activeItem ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
                background: token('elevation.surface', '#FFFFFF'),
                borderRadius: '0 10px 10px 0', overflow: 'hidden',
              }}>
                <Suspense fallback={
                  <div style={{ padding: 24, color: token('color.text.subtlest', '#6B778C'), fontSize: 14 }}>
                    Loading…
                  </div>
                }>
                  <CatalystDetailRouter
                    isOpen={true}
                    onClose={() => setActiveItemId(null)}
                    // CLAUDE.md §L39 — must pass UUID dbId, not issue_key.
                    itemId={activeItem.dbId || activeItem.id}
                    itemType={activeItem.type}
                    projectId={projectId}
                    projectKey={projectKey}
                    onOpenItem={(id) => setActiveItemId(id)}
                    panelMode={true}
                    navigationItems={items.map(i => ({ id: i.id, summary: i.summary, issue_key: i.jiraKey }))}
                    onNavigate={handleNavigate}
                  />
                </Suspense>
              </div>
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: token('color.text.subtlest', '#6B778C'), fontSize: 14,
                fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
              }}>
                Select an item to view details
              </div>
            )
=======
              onSelect={id => selectItem(id)}
            />
          </div>

          {/* Center + Right: CatalystDetailRouter (canonical Atlaskit detail) */}
          {activeItem ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
              background: token('elevation.surface', '#FFFFFF'),
              borderRadius: '0 10px 10px 0', overflow: 'hidden',
            }}>
              <Suspense fallback={
                <div style={{ padding: 24, color: token('color.text.subtlest', '#6B778C'), fontSize: 14 }}>
                  Loading…
                </div>
              }>
                <CatalystDetailRouter
                  isOpen={true}
                  onClose={() => selectItem(null)}
                  // CatalystDetailRouter queries ph_issues by UUID PK —
                  // WorkItem.id is the issue_key (e.g. "BAU-5500"), NOT a UUID.
                  // Use dbId (ph_issues.id). CLAUDE.md §L39 warns that
                  // passing the issue_key here yields a silent 400 and an
                  // empty issue object → title falls back to "—".
                  itemId={activeItem.dbId || activeItem.id}
                  itemType={activeItem.type}
                  projectId={projectId}
                  projectKey={projectKey}
                  // Subtask clicks come in with the child row's UUID.
                  // selectItem normalises that back to issue_key so the
                  // URL-sync effect writes `?issue=BAU-XXXX` instead of a
                  // UUID (P1-5 + P1-8 fix from 2026-04-20 critique).
                  onOpenItem={(id) => selectItem(id)}
                  panelMode={true}
                  navigationItems={items.map(i => ({ id: i.id, summary: i.summary, issue_key: i.jiraKey }))}
                  onNavigate={handleNavigate}
                />
              </Suspense>
            </div>
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: token('color.text.subtlest', '#6B778C'), fontSize: 14,
              fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            }}>
              Select an item to view details
            </div>
>>>>>>> Stashed changes
          )}
      </div>

      {/* ── Narrow-mode overlay — opens StoryDetailModal (V15) for the
            selected card. Stories use V15 directly; other types still get
            the V15 shell, which routes via itemId/projectKey. */}
      {overlayItemId && (() => {
        const overlayItem = items.find(i => i.id === overlayItemId);
        if (!overlayItem) return null;
        return (
          <Suspense fallback={null}>
            <StoryDetailModal
              isOpen={true}
              onClose={() => setOverlayItemId(null)}
              itemId={overlayItem.dbId || overlayItem.id}
              projectId={projectId ?? ''}
              projectKey={projectKey}
              onOpenItem={(id) => setOverlayItemId(id)}
              navigationItems={items.map(i => ({ id: i.id, summary: i.summary, issue_key: i.jiraKey }))}
              onNavigate={(id) => setOverlayItemId(id)}
            />
          </Suspense>
        );
      })()}
    </div>
  );
}
