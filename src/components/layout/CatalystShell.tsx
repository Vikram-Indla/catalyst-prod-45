import { useState, useEffect } from 'react';
import { useLocation, useParams, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CatalystHeader } from '@/components/ja/CatalystHeader';
import { PortfolioRoomSidebar } from './PortfolioRoomSidebar';
import { ProgramRoomSidebar } from './ProgramRoomSidebar';
import { TeamRoomSidebar } from '@/components/teams/TeamRoomSidebar';
import { LeftContextPanel } from './LeftContextPanel';
import { ProductRoomSidebar } from './ProductRoomSidebar';
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
  const { tier, setTier } = useCatalystContext();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { isModuleEnabled } = useEnabledModules();
  
  // Extract IDs from URL params
  const currentProgramId = params.programId || null;
  const currentPortfolioId = params.portfolioId || null;
  const currentTeamId = params.teamId || null;
  
  const { data: programIncrements } = useQuery({
    queryKey: ['pis-for-shell'],
    queryFn: async () => {
      // Get PI-5 which has features properly distributed across teams and sprints
      const { data } = await supabase
        .from('program_increments')
        .select('id, name')
        .eq('id', '3e5ae5ed-8aa9-4211-9add-2031b0f6541b')
        .limit(1);
      return data;
    },
  });
  
  const defaultPIId = programIncrements?.[0]?.id || null;
  const [selectedPI, setSelectedPI] = useState<string | null>(defaultPIId);
  
  // Update selectedPI when data loads
  useEffect(() => {
    if (defaultPIId && !selectedPI) {
      setSelectedPI(defaultPIId);
    }
  }, [defaultPIId, selectedPI]);

  // Check if on product/industry route
  const isProductRoute = location.pathname.startsWith('/industry');

  // Automatically set tier based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/enterprise')) {
      if (tier !== 'enterprise') setTier('enterprise');
    } else if (path.startsWith('/portfolio') || path.startsWith('/items/')) {
      if (tier !== 'portfolio') setTier('portfolio');
    } else if (
      path.startsWith('/program') || 
      path === '/dependencies' || 
      path.startsWith('/programs/program-board') ||
      path === '/risks' ||
      path === '/risk-roam-report' ||
      path.startsWith('/insights/') ||
      path === '/stories' ||
      path === '/work-items/stories' ||
      path.startsWith('/tests/')
    ) {
      // Program-level features: Dependencies, Program Board, Risks, Stories, Insights, Tests
      if (tier !== 'program') setTier('program');
    } else if (path.startsWith('/team')) {
      if (tier !== 'team') setTier('team');
    }
  }, [location.pathname, tier, setTier]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Global Header - Catalyst Style */}
      <CatalystHeader />

      {/* Main Content with Context Panel - Conditional Sidebar Based on Tier and Route */}
      <div className="flex flex-1 overflow-hidden">
          {/* No sidebar for Home route - sidebars only show for enabled modules */}
          {location.pathname !== '/home' && (
            <>
              {isProductRoute && isModuleEnabled('PRODUCT') ? (
                <ProductRoomSidebar
                  expanded={sidebarExpanded}
                  onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                />
              ) : tier === 'enterprise' && isModuleEnabled('ENTERPRISE') ? (
                <LeftContextPanel />
              ) : tier === 'program' && currentProgramId && isModuleEnabled('PROGRAM') ? (
                <ProgramRoomSidebar
                  programId={currentProgramId}
                  expanded={sidebarExpanded}
                  onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                  selectedPI={selectedPI || undefined}
                  onPIChange={(pi) => setSelectedPI(pi)}
                />
              ) : tier === 'portfolio' && currentPortfolioId && isModuleEnabled('PORTFOLIO') ? (
                <PortfolioRoomSidebar
                  portfolioId={currentPortfolioId}
                  expanded={sidebarExpanded}
                  onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                  selectedPI={selectedPI || undefined}
                  onPIChange={(pi) => setSelectedPI(pi)}
                />
              ) : tier === 'team' && currentTeamId && isModuleEnabled('TEAMS') ? (
                <TeamRoomSidebar
                  teamId={currentTeamId}
                  expanded={sidebarExpanded}
                  onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                />
              ) : null}
            </>
          )}
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
