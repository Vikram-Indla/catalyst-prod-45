import { useState } from 'react';
import { useLocation, useParams, Outlet } from 'react-router-dom';
import { CatalystHeader } from '@/components/ja/CatalystHeader';
import { UnifiedSidebar } from './UnifiedSidebar';
import { EnterpriseSidebar } from './EnterpriseSidebar';
import { ProductRoomSidebar } from './ProductRoomSidebar';
import { ReleaseRoomSidebar } from './ReleaseRoomSidebar';
import { CatalystContextProvider, useCatalystContext } from '@/contexts/CatalystContext';
import { AnnouncementBanner } from '@/components/notifications/AnnouncementBanner';
import { useTrackLastRoute } from '@/hooks/useSessionPersistence';
import { useEnabledModules } from '@/hooks/useModules';
import { useRecentPlaceTracker } from '@/hooks/useRecentPlaceTracker';

function CatalystShellContent() {
  // Track last visited route for session persistence
  useTrackLastRoute();
  
  // Track room visits for Recent Rooms functionality
  useRecentPlaceTracker();
  const location = useLocation();
  const params = useParams<{ programId?: string; portfolioId?: string; teamId?: string }>();
  const { workspaceType, programId: contextProgramId, projectId: contextProjectId, selectedQuarter, setSelectedQuarter } = useCatalystContext();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { isModuleEnabled } = useEnabledModules();
  
  // Extract IDs from URL params - these take precedence
  const urlProgramId = params.programId || null;
  
  // Determine which ID to use based on route pattern
  const isProgramRoute = location.pathname.startsWith('/program/');
  const isProjectRoute = location.pathname.startsWith('/programs/') || location.pathname.startsWith('/project/');

  // Current active IDs
  const activeProgramId = isProgramRoute ? urlProgramId : contextProgramId;
  const activeProjectId = isProjectRoute ? urlProgramId : contextProjectId;

  // Check if on product/industry route
  const isProductRoute = location.pathname.startsWith('/industry') || location.pathname.startsWith('/product');
  
  // Check if on release route
  const isReleaseRoute = location.pathname.startsWith('/release');

  // Determine sidebar based on workspaceType (single source of truth)
  const renderSidebar = () => {
    // No sidebar for Home or Admin routes
    if (location.pathname === '/home' || location.pathname.startsWith('/admin')) {
      return null;
    }

    // Release route sidebar
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
          <div className="w-14 h-full flex items-center justify-center p-2 text-center" style={{ borderRight: '1px solid var(--border)', backgroundColor: 'var(--surface-1)' }}>
            <div style={{ color: 'var(--text-3)' }} className="text-xs">
              <p className="font-medium">No Program</p>
            </div>
          </div>
        );

      case 'project':
        if (activeProjectId) {
          return (
            <UnifiedSidebar
              workspaceType="project"
              entityId={activeProjectId}
              expanded={sidebarExpanded}
              onToggle={() => setSidebarExpanded(!sidebarExpanded)}
              selectedQuarter={selectedQuarter}
              onQuarterChange={setSelectedQuarter}
            />
          );
        }
        // Show empty state if no project selected
        return (
          <div className="w-14 h-full flex items-center justify-center p-2 text-center" style={{ borderRight: '1px solid var(--border)', backgroundColor: 'var(--surface-1)' }}>
            <div style={{ color: 'var(--text-3)' }} className="text-xs">
              <p className="font-medium">No Project</p>
            </div>
          </div>
        );

      case 'enterprise':
        if (isModuleEnabled('ENTERPRISE')) {
          return (
            <EnterpriseSidebar
              expanded={sidebarExpanded}
              onToggle={() => setSidebarExpanded(!sidebarExpanded)}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Global Header - Catalyst Native */}
      <CatalystHeader />

      {/* Main Content with Context Panel - Conditional Sidebar Based on workspaceType */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="relative flex-shrink-0 mr-3">
          {renderSidebar()}
        </div>
        
        <main className="flex-1 overflow-auto">
          <AnnouncementBanner />
          <Outlet />
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
