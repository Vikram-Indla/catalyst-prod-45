import { useState, useEffect, lazy, Suspense, ComponentType, useSyncExternalStore } from 'react';
// PanelLeftOpen / SidebarEdgeReveal removed 2026-04-21 — replaced by hover-peek
// overlay driven by the top-nav chevron (see CatalystHeader + sidebarPeek state).
import { GlobalSearch } from '@/components/global-search';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

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

import { HubSurface } from './HubSurface';

/**
 * Decision A (Apr 2026) — Jira blue-canvas on hub routes.
 * Kept local to this file (no shared hook) so the whole trial can be reverted
 * by unwinding this file + HubSurface.tsx. Mirrors the dark-aware logic used
 * in HubSurface so both stay consistent when NOCTURNE toggles.
 */
const JIRA_CANVAS_BG = '#E9F2FE';
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

// SidebarEdgeReveal removed 2026-04-21 (Vikram): replaced by chevron-driven
// hover-peek overlay that mounts the full sidebar above main content.


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
  const { workspaceType, programId: contextProgramId, projectId: contextProjectId, selectedQuarter, setSelectedQuarter, sidebarExpanded, setSidebarExpanded, sidebarHidden, setSidebarHidden, cycleSidebarState, sidebarPeek, setSidebarPeek } = useCatalystContext();

  // `[` cycles sidebar: expanded → collapsed → hidden → expanded. Added
  // 2026-04-19 to match Jira/Linear/Notion convention and let users reclaim
  // viewport on content-dense views without mousing to the toggle.
  // Guarded against firing while typing (inputs, textareas, contentEditable,
  // role="textbox") and against intercepting browser shortcuts (⌘[, ⌃[).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '[') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.isContentEditable ||
        t.closest('[role="textbox"]')
      )) return;
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
  const isProjectHubAllWorkRoute = location.pathname.includes('/hierarchy/allwork');

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

  const shouldWrapHubSurface = isHubSurfaceRoute && !isSelfFramedRoute;
  const isDarkTheme = useIsDarkTheme();
  const mainBg = isHubSurfaceRoute && !isDarkTheme ? JIRA_CANVAS_BG : 'var(--cp-bg)';

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
    // No sidebar for Home or Admin routes
    if (location.pathname === '/for-you' || location.pathname.startsWith('/admin')) {
      return null;
    }

    // Full-screen issue view: show ProjectHub sidebar forced-collapsed
    if (isIssueFullPageRoute) {
      return (
        <ProjectHubSidebar
          expanded={false}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // Wiki sidebar
    if (isWikiRoute) {
      return (
        <WikiSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // ProjectHub V5 sidebar (/project-hub/*)
    if (isProjectHubRoute) {
      return (
        <ProjectHubSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }


    // ReleaseHub sidebar (new Release Management module)
    if (isReleaseHubRoute) {
      return (
        <ReleaseHubSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // IncidentHub sidebar
    if (isIncidentHubRoute) {
      return (
        <IncidentHubSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // Release & Test Management sidebar (legacy - being retired)
    if (isReleasesRoute) {
      return (
        <ReleasesManagementSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // Test Management sidebar (legacy)
    if (isTestsRoute) {
      return (
        <TestManagementSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // Release route sidebar (Operations/Incidents)
    if (isReleaseRoute) {
      return (
        <ReleaseRoomSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // Product route sidebar
    if (isProductRoute && isModuleEnabled('PRODUCT')) {
      return (
        <ProductRoomSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // PlanHub sidebar
    if (isPlanHubRoute) {
      return (
        <PlanHubSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // TaskHub sidebar
    if (isTaskHubRoute) {
      return (
        <TaskHubSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      );
    }

    // TestHub sidebar
    if (isTestHubRoute) {
      return (
        <TestHubSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
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
              expanded={sidebarExpanded}
              onToggle={() => setSidebarExpanded(!sidebarExpanded)}
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
              expanded={sidebarExpanded}
              onToggle={() => setSidebarExpanded(!sidebarExpanded)}
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
            expanded={sidebarExpanded}
            onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col text-[var(--cp-t1)]" style={{ background: 'var(--cp-bg-canvas)' }} onClickCapture={handleInternalLinkClickCapture}>
      {/* Global Header - Catalyst Native */}
      <div data-catalyst-header>
        <Suspense fallback={<div className="h-[56px] border-b" style={{ background: 'var(--cp-bg)', borderColor: 'var(--cp-bd)' }} />}>
          <CatalystHeader />
        </Suspense>
      </div>

      {/* Main Content with Context Panel - Conditional Sidebar Based on workspaceType */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar — two-state architecture (2026-04-21 Vikram):
              expanded: full 240px sidebar in normal flow.
              hidden:   sidebar fully unmounted; main content owns the full
                        viewport. NO edge-rail, NO icon strip — the only way
                        to bring it back is the top-nav chevron, which also
                        supports HOVER-PEEK (see below).
            Hover-peek: when hidden && sidebarPeek (set by chevron hover in
              CatalystHeader), the sidebar is rendered as an absolutely
              positioned OVERLAY — it floats above main without shifting any
              layout. Mouse leave → setSidebarPeek(false) → overlay
              disappears. Click chevron → persistent expand. */}
        {!sidebarHidden && (
          <div
            data-catalyst-sidebar
            className="relative flex-shrink-0"
            style={{
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              contain: 'layout style',
            }}
          >
            <Suspense fallback={null}>
              {renderSidebar()}
            </Suspense>
          </div>
        )}
        {sidebarHidden && sidebarPeek && (
          <div
            data-catalyst-sidebar-peek
            onMouseEnter={() => setSidebarPeek(true)}
            onMouseLeave={() => setSidebarPeek(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: 50,
              boxShadow: '0 8px 24px rgba(9, 30, 66, 0.18)',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              contain: 'layout style',
            }}
          >
            <Suspense fallback={null}>
              {renderSidebar()}
            </Suspense>
          </div>
        )}

        {/* Route content scroll container (single scroll parent) - workspace frame */}
        {/* 2026-04-19 Tier 2: Paint isolation on <main>. As the sidebar's width
            animates over 180ms the flex layout recomputes main's width each
            frame. Without `contain: paint` every descendant paints on every
            frame; with it, the browser clips invalidation to main's bounding
            box and schedules a single compositor-level repaint. The
            translateZ(0) + backface-visibility pair promote main to its own
            GPU layer so the per-frame reflow runs independently of the
            sidebar's layer. Net: kills the mid-animation tearing we were
            seeing at the hub-chrome / sidebar seam. */}
        <main
          data-catalyst-main
          className="flex-1 min-w-0 w-full max-w-full flex flex-col overflow-hidden"
          style={{
            background: mainBg,
            contain: 'paint',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          <Suspense fallback={null}><AnnouncementBanner /></Suspense>
          <div className={`flex-1 min-h-0 w-full max-w-full flex flex-col ${(isProjectHubAllWorkRoute || isIssueFullPageRoute) ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
            <div className={`w-full max-w-full ${(isProjectHubAllWorkRoute || isIssueFullPageRoute) ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
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
      <GlobalSearch />
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

