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
 */
import React, { lazy, Suspense, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import { WorkListPanel } from './components/WorkListPanel';
import { useProjectAllWorkItems } from '@/hooks/useProjectListItems';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
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
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

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

  const activeItem = useMemo(() =>
    activeItemId ? items.find(i => i.id === activeItemId) ?? null : (items[0] ?? null),
    [activeItemId, items]
  );

  const handleNavigate = useCallback((id: string) => {
    setActiveItemId(id);
  }, []);

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

      {/* Split region — claims remaining vertical space. `minHeight: 0` is
          the magic that makes the inner panels' overflow:auto actually
          scroll instead of blowing out the page. ResizeObserver on this
          element drives the responsive collapse. */}
      <div ref={splitRef} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 8, padding: '6px 8px 8px' }}>
          {/* Left: WorkListPanel — Jira parity container
              (measured 2026-04-18): 260px wide / #F8F8F8 / 4px radius / no border.
              Inner cards are white so they elevate against the gray backdrop.
              On narrow viewports the list flexes to fill the row (detail
              panel hidden). */}
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
              onSelect={id => setActiveItemId(id)}
            />
          </div>

          {/* Center + Right: CatalystDetailRouter (canonical Atlaskit detail).
              Hidden when the split region is narrower than SPLIT_BREAKPOINT_PX
              so the list isn't visually overlapped by the detail panel. */}
          {!isNarrow && (activeItem ? (
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
                  // CatalystDetailRouter queries ph_issues by UUID PK —
                  // WorkItem.id is the issue_key (e.g. "BAU-5500"), NOT a UUID.
                  // Use dbId (ph_issues.id). CLAUDE.md §L39 warns that
                  // passing the issue_key here yields a silent 400 and an
                  // empty issue object → title falls back to "—".
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
          ))}
      </div>
    </div>
  );
}
