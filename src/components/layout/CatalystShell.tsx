import { useState, useEffect, useRef, lazy, Suspense, ComponentType, useSyncExternalStore } from 'react';
import { Menu } from 'lucide-react';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { useNavBreakpoint } from '@/hooks/useNavBreakpoint';
import { GlobalMobileDrawer } from './GlobalMobileDrawer';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

import { useLocation, useParams, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
const CatalystHeader = lazy(() => import('@/components/ja/CatalystHeader').then(m => ({ default: m.CatalystHeader })));
import { CatalystContextProvider, useCatalystContext } from '@/contexts/CatalystContext';
const AnnouncementBanner = lazy(() => import('@/components/notifications/AnnouncementBanner').then(m => ({ default: m.AnnouncementBanner })));
import { useTrackLastRoute } from '@/hooks/useSessionPersistence';
import { useEnabledModules } from '@/hooks/useModules';
import { useRecentPlaceTracker } from '@/hooks/useRecentPlaceTracker';
import { useCatalystTitle } from '@/hooks/useCatalystTitle';
import { derivePageFromPath } from '@/lib/tabIdentity';

// ─── Lazy-loaded sidebars (only the active one loads into memory) ────
const UnifiedSidebar = lazy(() => import('./UnifiedSidebar').then(m => ({ default: m.UnifiedSidebar })));
const EnterpriseSidebar = lazy(() => import('./EnterpriseSidebar').then(m => ({ default: m.EnterpriseSidebar })));
const ProductRoomSidebar = lazy(() => import('./ProductRoomSidebar').then(m => ({ default: m.ProductRoomSidebar })));
const ProjectSidebar = lazy(() => import('./ProjectSidebar').then(m => ({ default: m.ProjectSidebar })));
const ReleaseRoomSidebar = lazy(() => import('./OperationsSidebar').then(m => ({ default: m.ReleaseRoomSidebar })));
const TestManagementSidebar = lazy(() => import('./TestManagementSidebar').then(m => ({ default: m.TestManagementSidebar })));
const ReleasesManagementSidebar = lazy(() => import('./ReleasesManagementSidebar').then(m => ({ default: m.ReleasesManagementSidebar })));
const ReleaseHubSidebar = lazy(() => import('./ReleaseHubSidebar').then(m => ({ default: m.ReleaseHubSidebar })));
const IncidentHubSidebar = lazy(() => import('./IncidentHubSidebar').then(m => ({ default: m.IncidentHubSidebar })));
const PlanHubSidebar = lazy(() => import('./PlanHubSidebar').then(m => ({ default: m.PlanHubSidebar })));
const TaskHubSidebar = lazy(() => import('./TaskHubSidebar').then(m => ({ default: m.TaskHubSidebar })));
const TestHubSidebar = lazy(() => import('./TestHubSidebar').then(m => ({ default: m.TestHubSidebar })));

const ProjectHubSidebar = lazy(() => import('./ProjectHubSidebar').then(m => ({ default: m.ProjectHubSidebar })));
const WikiSidebar = lazy(() => import('./WikiSidebar').then(m => ({ default: m.WikiSidebar })));
// C1 · Personal command center on / (Home). Replaces the empty 240px rail
// users were seeing on Home with @atlaskit/side-navigation sections for
// Pinned, Recent and Jump to. Atlaskit-only — see HomeSidebar.tsx.
const HomeSidebar = lazy(() => import('./HomeSidebar'));

import { HubSurface } from './HubSurface';

/**
 * Decision A (Apr 2026) — Jira blue-canvas on hub routes.
 * Kept local to this file (no shared hook) so the whole trial can be reverted
 * by unwinding this file + HubSurface.tsx. Mirrors the dark-aware logic used
 * in HubSurface so both stay consistent when DARK MODE toggles.
 */
// V3 Canonical White Canvas (Apr 27, 2026 audit, L36).
// Was '#E9F2FE' (light Jira blue) — painted on <main> for every hub-surface
// route, producing a global blue tint that didn't match Jira's actual
// background (which is white #FFFFFF). Catalyst owner decision: all hub
// pages are white-canvas. Kept as a named constant in case we ever bring
// back a tinted page wash.
const JIRA_CANVAS_BG = '#FFFFFF';
function useIsDarkTheme(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') return () => undefined;
      const obs = new MutationObserver(onChange);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => obs.disconnect();
    },
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'dark',
    () => false,
  );
}

// Apr 28, 2026 (Vikram): SidebarEdgeReveal deprecated. The 8px-wide
// edge-reveal strip + |> hover-handle tooltip was a redundant third
// affordance for restoring the sidebar — the header chevron in the
// top-nav and the ⌘/Ctrl + [ keyboard shortcut already cover the same
// flow. The hover handle floated unanchored on certain layouts and the
// aria-label "Show sidebar (shortcut: ⌘ [)" surfaced as a stray tooltip
// on the table column edge. Removed. When sidebarHidden is true the
// shell now renders the same zero-width placeholder used for the
// intermediate state, so the layout stays stable.

function CatalystShellContent() {
  // Dev-only instrumentation: prove shell doesn't remount on program navigation
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[CatalystShell] render');
  }

  // Track last visited route for session persistence
  useTrackLastRoute();
  
  // Track room visits for Recent Rooms functionality
  useRecentPlaceTracker();
  const location = useLocation();
  const page = derivePageFromPath(location.pathname);
  const navigate = useNavigate();
  const params = useParams<{ programId?: string; portfolioId?: string; teamId?: string; projectId?: string }>();
  const { workspaceType, programId: contextProgramId, projectId: contextProjectId, selectedQuarter, setSelectedQuarter, sidebarExpanded, setSidebarExpanded, sidebarHidden, setSidebarHidden, sidebarPinned, setSidebarPinned, sidebarHoverOpen, cycleSidebarState } = useCatalystContext();

  // ─── Sidebar is CLICK-ONLY (April 2026, final) ────────────────────────
  // Per user direction: hover-peek is fully disabled across every route.
  // The sidebar opens / closes ONLY via:
  //   • Click on the header chevron → cycleSidebarState
  //   • Cmd/Ctrl + [ keyboard shortcut → cycleSidebarState
  // No mousemove listener, no hover triggers, no peek. The Apr 27 2026
  // SidebarEdgeReveal handle was deprecated Apr 28 2026 — see the
  // comment above the shell render block. sidebarHoverOpen stays in
  // context (other surfaces still read it) but nothing in this shell
  // ever sets it to true anymore.

  // Effective visibility (Jira parity):
  //   - Pinned + not hidden → solid sidebar panel (pushes content right)
  //   - Hover-peek → overlay panel, regardless of whether sidebarHidden is
  //     true (peeking from edge-reveal) or false (peeking from a half-state).
  //     We no longer require !sidebarHidden, because the chevron is now
  //     always in the top-nav and we don't mutate sidebarHidden on hover.
  // Overlay mode is any "visible but not pinned" render — i.e. a peek.
  const sidebarVisuallyOpen = (sidebarPinned && !sidebarHidden) || sidebarHoverOpen;
  const sidebarOverlayMode = !sidebarPinned && sidebarHoverOpen;

  // ⌘/Ctrl + [ toggles the sidebar (Jira parity, P2-1). Requires the platform
  // modifier so we don't swallow a literal `[` keystroke in any focusable
  // element — the previous bare-`[` binding collided with typing into
  // non-guarded roles (code editors, rich-text surfaces, etc.).
  // macOS → ⌘+[ ; other platforms → Ctrl+[. The preventDefault stops the
  // browser-back navigation the combo normally triggers on Chrome/Safari.
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '[') return;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (!modifier) return;
      if (e.altKey || e.shiftKey) return;
      e.preventDefault();
      cycleSidebarState();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cycleSidebarState]);
  const { isModuleEnabled } = useEnabledModules();
  
  // Extract IDs from URL params - these take precedence
  const urlProgramId = params.programId || null;
  const urlProjectId = params.projectId || null;
  
  // Determine which ID to use based on route pattern
  const isProgramRoute = location.pathname.startsWith('/program/');
  const isProjectRoute = location.pathname.startsWith('/projects/') || location.pathname.startsWith('/project/');

  // Current active IDs
  const activeProgramId = isProgramRoute ? urlProgramId : contextProgramId;
  const activeProjectId = isProjectRoute ? urlProjectId : contextProjectId;
  
  // Fetch project details for sidebar
  const { data: projectData } = useQuery({
    queryKey: ['project-sidebar', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, key')
        .eq('id', activeProjectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeProjectId && isProjectRoute,
  });

  // Check if on product/producthub route
  const isProductRoute = location.pathname.startsWith('/producthub') || location.pathname.startsWith('/product');
  
  // Check if on release route (Operations/Incidents)
  const isReleaseRoute = location.pathname.startsWith('/release');
  
  // Check if on releases route (Release & Test Management module - legacy)
  const isReleasesRoute = location.pathname.startsWith('/releases');
  
  // Check on releasehub route (new Release Management module)
  const isReleaseHubRoute = location.pathname.startsWith('/release-hub') || location.pathname.startsWith('/releasehub');
  
  // Check if on test management route
  const isTestsRoute = location.pathname.startsWith('/tests');
  
  // Check if on PlanHub route
  const isPlanHubRoute = location.pathname.startsWith('/planhub');
  
  // Check if on TaskHub route (includes /priorities which is part of TaskHub)
  const isTaskHubRoute = location.pathname.startsWith('/taskhub') || location.pathname.startsWith('/priorities');
  
  // Check if on TestHub route
  const isTestHubRoute = location.pathname.startsWith('/testhub');

  // Check if on ProjectHub V5 route (/project-hub/*)
  const isProjectHubRoute = location.pathname.startsWith('/project-hub');
  const isProjectHubAllWorkRoute = /\/project-hub\/[^/]+\/allwork(\/|$|\?)/.test(location.pathname);
  // Apr 27, 2026 (L67): backlog route also needs the fullpage flex chain
  // (flex-1 min-h-0 overflow-hidden) so the rail's internal scroll fires
  // instead of pushing the whole page taller than viewport. Without
  // min-h-0 on the wrapper, the rail's content height (1638px) leaks
  // up the chain and the table column extends with it. Adding backlog
  // to the same code path that allwork uses.
  const isProjectHubBacklogRoute = /\/project-hub\/[^/]+\/backlog/.test(location.pathname);

  // Check if on full-screen issue view (/issue/:issueKey)
  const isIssueFullPageRoute = location.pathname.startsWith('/issue/');

  // Parse issue key from /issue/:issueKey for tab-title binding
  const fullPageIssueKey = isIssueFullPageRoute
    ? (location.pathname.split('/')[2] || null)
    : null;

  // Detail-drawer item (modal opened via GlobalSearch / Notifications / ForYou)
  const pendingDetailItem = useGlobalSearchStore(s => s.pendingItem);

  // Fetch issue identity for tab title. Priority: detail drawer → full-page route.
  const issueLookupId = pendingDetailItem?.id ?? null;
  const issueLookupKey = fullPageIssueKey;
  const { data: tabIssueData } = useQuery({
    queryKey: ['tab-title-issue', issueLookupId, issueLookupKey],
    queryFn: async () => {
      if (issueLookupId) {
        const { data } = await supabase
          .from('catalyst_issues')
          .select('issue_key, title')
          .eq('id', issueLookupId)
          .maybeSingle();
        return data;
      }
      if (issueLookupKey) {
        const { data } = await supabase
          .from('catalyst_issues')
          .select('issue_key, title')
          .eq('issue_key', issueLookupKey)
          .maybeSingle();
        return data;
      }
      return null;
    },
    enabled: !!(issueLookupId || issueLookupKey),
    staleTime: 60_000,
  });

  // Compose tab title inputs (issue ▸ project ▸ page fallback ladder)
  const titleIssue = (issueLookupId || issueLookupKey)
    ? { key: tabIssueData?.issue_key ?? issueLookupKey ?? null, title: tabIssueData?.title ?? null }
    : null;
  const titleProject = projectData
    ? { key: projectData.key, name: projectData.name }
    : null;
  useCatalystTitle({ issue: titleIssue, project: titleProject, pageName: page });


  // Check if on Wiki route
  const isWikiRoute = location.pathname.startsWith('/wiki');

  // Check if on IncidentHub route
  const isIncidentHubRoute = location.pathname.startsWith('/incident-hub');

  // Decision A (Apr 2026): Jira blue canvas (#E9F2FE) + white panel on all
  // hub routes. /for-you, Home, Wiki, Admin are intentionally excluded.
  const isHubSurfaceRoute =
    location.pathname.startsWith('/strategyhub') ||
    location.pathname.startsWith('/producthub') ||
    location.pathname.startsWith('/product/') ||      // /product/ideas/*, /product/room, etc.
    location.pathname.startsWith('/project-hub') ||
    location.pathname.startsWith('/release-hub') ||
    location.pathname.startsWith('/releasehub') ||
    location.pathname.startsWith('/testhub') ||
    location.pathname.startsWith('/incident-hub') ||
    location.pathname.startsWith('/taskhub') ||
    location.pathname.startsWith('/priorities');

  // Pages that already paint their own Jira canvas + white card. Wrapping these
  // in <HubSurface> would double-stack canvas layers. They still sit on the
  // canvas <main> bg so there's visual consistency.
  //   /project-hub/:key/backlog   → BacklogPage.atlaskit.tsx:1083
  const isSelfFramedRoute =
    /^\/project-hub\/[^/]+\/backlog/.test(location.pathname) ||
    location.pathname.startsWith('/issue/');  // full-screen issue view

  // Hub routes that explicitly opt out of the Jira blue canvas — pure white
  // page surface (Confluence Spaces parity, not Jira hub parity). Owner
  // decision (Apr 2026): the All Projects landing should match Confluence's
  // Spaces page, not Jira's hub canvas.
  const isWhiteCanvasRoute =
    location.pathname === '/project-hub/projects' ||
    location.pathname === '/project/all-projects';

  const shouldWrapHubSurface = isHubSurfaceRoute && !isSelfFramedRoute && !isWhiteCanvasRoute;
  const isDarkTheme = useIsDarkTheme();
  const mainBg = isHubSurfaceRoute && !isDarkTheme && !isWhiteCanvasRoute
    ? JIRA_CANVAS_BG
    : 'var(--cp-bg)';

  // Prevent full document reloads caused by accidental <a href="/..."> navigation.
  // IMPORTANT: In Preview, the URL contains special query params (e.g. __lovable_token).
  // If we drop them during navigation, the iframe may force a hard reload.
  const handleInternalLinkClickCapture = (e: React.MouseEvent) => {
    // Only left click without modifiers
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const target = e.target as HTMLElement | null;
    const anchor = target?.closest?.('a') as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Ignore new-tab/external/download/hash links
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (href.startsWith('http://') || href.startsWith('https://')) return;

    // Only handle internal absolute paths
    if (!href.startsWith('/')) return;

    e.preventDefault();

    // Merge current query params into the link (link query takes precedence)
    const [pathOnly, hrefQuery = ''] = href.split('?');
    const merged = new URLSearchParams(location.search);
    const linkParams = new URLSearchParams(hrefQuery);
    for (const [k, v] of linkParams.entries()) merged.set(k, v);

    const search = merged.toString();
    performance.mark?.('internal_link_nav');
    navigate(`${pathOnly}${search ? `?${search}` : ''}`);
  };

  // Determine sidebar based on workspaceType (single source of truth)
  const renderSidebar = () => {
    // C1 · Home (/) gets the personal command center rail. The previous
    // implementation fell through the workspaceType switch to `default:
    // null`, which left the wrapper mounted at 240px wide but empty —
    // reading as a broken state rather than a deliberate "no nav".
    // HomeSidebar fills the rail with Pinned / Recent / Jump-to sections,
    // turning that real estate into the user's own navigation surface.
    if (location.pathname === '/') {
      // HomeSidebar now composes SidebarBase, so it shares the canonical
      // hub-rail props (expanded + onToggle) with every other panel —
      // identical density, active-state, and collapse behaviour.
      return (
        <HomeSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // No sidebar for legacy /for-you or Admin routes
    if (location.pathname === '/for-you' || location.pathname.startsWith('/admin')) {
      return null;
    }

    // Full-screen issue view: show ProjectHub sidebar forced-collapsed
    if (isIssueFullPageRoute) {
      return (
        <ProjectHubSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // Wiki sidebar
    if (isWikiRoute) {
      return (
        <WikiSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // ProjectHub V5 sidebar (/project-hub/*)
    if (isProjectHubRoute) {
      return (
        <ProjectHubSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }


    // ReleaseHub sidebar (new Release Management module)
    if (isReleaseHubRoute) {
      return (
        <ReleaseHubSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // IncidentHub sidebar
    if (isIncidentHubRoute) {
      return (
        <IncidentHubSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // Release & Test Management sidebar (legacy - being retired)
    if (isReleasesRoute) {
      return (
        <ReleasesManagementSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // Test Management sidebar (legacy)
    if (isTestsRoute) {
      return (
        <TestManagementSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // Release route sidebar (Operations/Incidents)
    if (isReleaseRoute) {
      return (
        <ReleaseRoomSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // Product route sidebar
    if (isProductRoute && isModuleEnabled('PRODUCT')) {
      return (
        <ProductRoomSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // PlanHub sidebar
    if (isPlanHubRoute) {
      return (
        <PlanHubSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // TaskHub sidebar
    if (isTaskHubRoute) {
      return (
        <TaskHubSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // TestHub sidebar
    if (isTestHubRoute) {
      return (
        <TestHubSidebar
          expanded={true}
          onToggle={cycleSidebarState}
        />
      );
    }

    // Use workspaceType to determine sidebar
    switch (workspaceType) {
      case 'program':
        if (activeProgramId) {
          return (
            <UnifiedSidebar
              workspaceType="program"
              entityId={activeProgramId}
              expanded={true}
              onToggle={cycleSidebarState}
              selectedQuarter={selectedQuarter}
              onQuarterChange={setSelectedQuarter}
            />
          );
        }
        // Show empty state if no program selected
        return (
          <div className="w-14 h-full flex items-center justify-center p-2 text-center border-r border-border-default bg-surface-2">
            <div className="text-xs text-text-tertiary">
              <p className="font-medium">No Program</p>
            </div>
          </div>
        );

      case 'project':
        if (activeProjectId) {
          return (
            <ProjectSidebar
              projectId={activeProjectId}
              projectName={projectData?.name}
              expanded={true}
              onToggle={cycleSidebarState}
            />
          );
        }
        // Show empty state if no project selected
        return (
          <div className="w-14 h-full flex items-center justify-center p-2 text-center border-r border-border-default bg-surface-2">
            <div className="text-xs text-text-tertiary">
              <p className="font-medium">No Project</p>
            </div>
          </div>
        );

      case 'enterprise':
        // Always show enterprise sidebar for enterprise routes
        return (
          <EnterpriseSidebar
            expanded={true}
            onToggle={cycleSidebarState}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col text-[var(--cp-t1)]" style={{ background: 'var(--cp-bg-canvas)' }} onClickCapture={handleInternalLinkClickCapture}>
      {/* Skip link — WCAG AA (CG-12): keyboard users tab here first, then jump to main */}
      <a
        href="#catalyst-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-3 focus:py-1.5 focus:rounded focus:bg-white focus:text-blue-700 focus:text-sm focus:font-medium focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Global Header */}
      <div data-catalyst-header>
        <Suspense fallback={<div className="h-[56px] border-b" style={{ background: 'var(--cp-bg)', borderColor: 'var(--cp-bd)' }} />}>
          <CatalystHeader />
        </Suspense>
      </div>

      {/* Main Content with Context Panel - Conditional Sidebar Based on workspaceType */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - GPU layer for stability.
            When sidebarHidden is true the actual sidebar is unmounted (0 DOM
            cost) and replaced with a thin edge-reveal handle that restores
            the sidebar on click. Keyboard: `[` cycles between states. */}
        <div
          id="catalyst-sidebar"
          data-catalyst-sidebar
          role="navigation"
          aria-label="Main navigation"
          aria-hidden={sidebarHidden}
          className="relative flex-shrink-0"
          // No onMouseLeave here — the document mousemove effect (lines
          // 124-156) already handles close with a 300ms grace that also
          // covers the gap between the chevron (in the header, above this
          // wrapper) and the sidebar body. A local onMouseLeave fired the
          // moment the cursor moved UP toward the chevron, collapsing the
          // peek before the chevron's own hover zone could take over, which
          // is why users saw two different widths when hovering vs clicking.
          style={{
            // Parity guarantee: hover-peek and pinned states MUST render at
            // the same 240px that SidebarBase expects when expanded=true.
            // Without this, the overlay wrapper had no explicit width and
            // was collapsing to intrinsic child width, which drifted under
            // certain routes (e.g. TeamRoomSidebar uses 220px, not 240).
            // When NOT visually open we let the child (zero-width placeholder or
            // zero-width placeholder) size itself — forcing a width here
            // would collapse the edge-reveal handle.
            ...(sidebarVisuallyOpen ? { width: 240 } : null),
            ...(sidebarOverlayMode ? {
              position: 'absolute' as const,
              top: 56,   // start BELOW the 56px top nav — never covers the header
              left: 0,
              bottom: 0,
              zIndex: 40,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            } : {}),
          }}
          >
            {sidebarVisuallyOpen ? (
              // Visible — either pinned (solid panel) or hover-peek (overlay).
              <Suspense fallback={null}>
                {renderSidebar()}
              </Suspense>
            ) : (
              // Apr 28, 2026: the SidebarEdgeReveal handle was deprecated;
              // when the sidebar is hidden / unpinned / not peeking we
              // render a zero-width placeholder so the flex row stays
              // stable. Restoring the sidebar happens via the top-nav
              // chevron or ⌘/Ctrl + [.
              <div style={{ width: 0, height: '100%' }} aria-hidden />
            )}
          </div>

        <main
          id="catalyst-main"
          data-catalyst-main
          className="flex-1 min-w-0 w-full max-w-full flex flex-col overflow-hidden"
          style={{ background: mainBg }}
        >
          <Suspense fallback={null}><AnnouncementBanner /></Suspense>
          <div className={`flex-1 min-h-0 w-full max-w-full flex flex-col ${(isProjectHubAllWorkRoute || isIssueFullPageRoute || isProjectHubBacklogRoute) ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
            <div className={`w-full max-w-full ${(isProjectHubAllWorkRoute || isIssueFullPageRoute || isProjectHubBacklogRoute) ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
              {shouldWrapHubSurface ? (
                <HubSurface panelPadding={0}>
                  <Outlet />
                </HubSurface>
              ) : (
                <Outlet />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function CatalystShell() {
  const pendingItem = useGlobalSearchStore(s => s.pendingItem);
  const clearDetail = useGlobalSearchStore(s => s.clearDetail);

  return (
    <CatalystContextProvider>
      <CatalystShellContent />
      {/* GlobalSearch is rendered inside CatalystHeader as the anchored search trigger */}
      {/* Global CatalystDetailRouter — opened from GlobalSearch, Notifications, ForYou, etc. */}
      {pendingItem && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={clearDetail}
            itemId={pendingItem.id}
            projectId={pendingItem.projectId || ''}
            projectKey={pendingItem.projectKey || ''}
            itemType={pendingItem.itemType}
          />
        </Suspense>
      )}
    </CatalystContextProvider>
  );
}

