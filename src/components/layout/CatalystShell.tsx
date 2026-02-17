import { useState } from 'react';
import { useLocation, useParams, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CatalystHeader } from '@/components/ja/CatalystHeader';
import { UnifiedSidebar } from './UnifiedSidebar';
import { EnterpriseSidebar } from './EnterpriseSidebar';
import { ProductRoomSidebar } from './ProductRoomSidebar';
import { ProjectSidebar } from './ProjectSidebar';
import { ReleaseRoomSidebar } from './OperationsSidebar';
import { TestManagementSidebar } from './TestManagementSidebar';
import { ReleasesManagementSidebar } from './ReleasesManagementSidebar';
import { ReleaseHubSidebar } from './ReleaseHubSidebar';
import { PlanHubSidebar } from './PlanHubSidebar';
import { TaskHubSidebar } from './TaskHubSidebar';
import { TestHubSidebar } from './TestHubSidebar';
import { CatalystContextProvider, useCatalystContext } from '@/contexts/CatalystContext';
import { AnnouncementBanner } from '@/components/notifications/AnnouncementBanner';
import { useTrackLastRoute } from '@/hooks/useSessionPersistence';
import { useEnabledModules } from '@/hooks/useModules';
import { useRecentPlaceTracker } from '@/hooks/useRecentPlaceTracker';

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

  // Check if on product/industry route
  const isProductRoute = location.pathname.startsWith('/industry') || location.pathname.startsWith('/product');
  
  // Check if on release route (Operations/Incidents)
  const isReleaseRoute = location.pathname.startsWith('/release');
  
  // Check if on releases route (Release & Test Management module - legacy)
  const isReleasesRoute = location.pathname.startsWith('/releases');
  
  // Check on releasehub route (new Release Management module)
  const isReleaseHubRoute = location.pathname.startsWith('/releasehub');
  
  // Check if on test management route
  const isTestsRoute = location.pathname.startsWith('/tests');
  
  // Check if on PlanHub route
  const isPlanHubRoute = location.pathname.startsWith('/planhub');
  
  // Check if on TaskHub route (includes /priorities which is part of TaskHub)
  const isTaskHubRoute = location.pathname.startsWith('/taskhub') || location.pathname.startsWith('/priorities');
  
  // Check if on TestHub route
  const isTestHubRoute = location.pathname.startsWith('/testhub');

  // Check if on WorkHub/ProjectHub route (v4.5)
  const isWorkHubRoute = location.pathname.startsWith('/workhub') || location.pathname.startsWith('/projecthub');

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
    // No sidebar for Home, Admin, or WorkHub routes (WorkHub has built-in sidebar)
    if (location.pathname === '/for-you' || location.pathname.startsWith('/admin') || isWorkHubRoute) {
      return null;
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
    <div className="h-screen flex flex-col bg-surface-1 text-text-primary" onClickCapture={handleInternalLinkClickCapture}>
      {/* Global Header - Catalyst Native */}
      <CatalystHeader />

      {/* Main Content with Context Panel - Conditional Sidebar Based on workspaceType */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - GPU layer for stability */}
        <div className="relative flex-shrink-0" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
          {renderSidebar()}
        </div>

        {/* Route content scroll container (single scroll parent) - workspace frame */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-surface-1">
          <AnnouncementBanner />
          <div className="flex-1 min-h-0 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function CatalystShell() {
  return (
    <CatalystContextProvider>
      <CatalystShellContent />
    </CatalystContextProvider>
  );
}

