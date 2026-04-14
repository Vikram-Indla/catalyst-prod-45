import { useState, lazy, Suspense, ComponentType } from 'react';
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
import { deriveHubFromPath, derivePageFromPath } from '@/lib/tabIdentity';

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
  const hub = deriveHubFromPath(location.pathname);
  const page = derivePageFromPath(location.pathname);
  useCatalystTitle(page, hub);
  const navigate = useNavigate();
  const params = useParams<{ programId?: string; portfolioId?: string; teamId?: string; projectId?: string }>();
  const { workspaceType, programId: contextProgramId, projectId: contextProjectId, selectedQuarter, setSelectedQuarter, sidebarExpanded, setSidebarExpanded } = useCatalystContext();
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


  // Check if on Wiki route
  const isWikiRoute = location.pathname.startsWith('/wiki');

  // Check if on IncidentHub route
  const isIncidentHubRoute = location.pathname.startsWith('/incident-hub');

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
    <div className="h-screen flex flex-col text-[var(--cp-t1)]" style={{ background: 'var(--cp-bg)' }} onClickCapture={handleInternalLinkClickCapture}>
      {/* Global Header - Catalyst Native */}
      <div data-catalyst-header>
        <Suspense fallback={<div className="h-[52px] border-b" style={{ background: 'var(--cp-bg)', borderColor: 'var(--cp-bd)' }} />}>
          <CatalystHeader />
        </Suspense>
      </div>

      {/* Main Content with Context Panel - Conditional Sidebar Based on workspaceType */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - GPU layer for stability */}
        <div data-catalyst-sidebar className="relative flex-shrink-0" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
            <Suspense fallback={null}>
              {renderSidebar()}
            </Suspense>
          </div>

        {/* Route content scroll container (single scroll parent) - workspace frame */}
        <main data-catalyst-main className="flex-1 min-w-0 w-full max-w-full flex flex-col overflow-hidden" style={{ background: 'var(--cp-bg)' }}>
          <Suspense fallback={null}><AnnouncementBanner /></Suspense>
          <div className={`flex-1 min-h-0 w-full max-w-full flex flex-col ${isProjectHubAllWorkRoute ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
            <div className={`w-full max-w-full ${isProjectHubAllWorkRoute ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
              <Outlet />
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

