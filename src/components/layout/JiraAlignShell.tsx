import { useState, useEffect } from 'react';
import { useLocation, useParams, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CatalystHeaderAtlaskit } from '@/components/atlaskit/CatalystHeaderAtlaskit';
import { PortfolioRoomSidebar } from './PortfolioRoomSidebar';
import { ProgramRoomSidebar } from './ProgramRoomSidebar';
import { TeamRoomSidebar } from '@/components/teams/TeamRoomSidebar';
import { LeftContextPanel } from './LeftContextPanel';
import { ProductRoomSidebar } from './ProductRoomSidebar';
import { CatalystContextProvider, useCatalystContext } from '@/contexts/CatalystContext';
import { AnnouncementBanner } from '@/components/notifications/AnnouncementBanner';
import { MobileMenuButton } from './MobileMenuButton';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';

function CatalystShellContent() {
  const location = useLocation();
  const params = useParams<{ programId?: string; portfolioId?: string; teamId?: string }>();
  const { tier, setTier } = useCatalystContext();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
    } else if (path.startsWith('/program') || path === '/dependencies' || path.startsWith('/programs/program-board')) {
      // Dependencies and Program Board are Program-level features
      if (tier !== 'program') setTier('program');
    } else if (path.startsWith('/team')) {
      if (tier !== 'team') setTier('team');
    }
  }, [location.pathname, tier, setTier]);

  // Render the appropriate sidebar content for mobile drawer
  const renderMobileSidebar = () => {
    if (location.pathname === '/home') return null;
    
    if (isProductRoute) {
      return (
        <ProductRoomSidebar
          expanded={true}
          onToggle={() => {}}
          className="flex"
        />
      );
    } else if (tier === 'enterprise') {
      return <LeftContextPanel className="flex" />;
    } else if (tier === 'program' && currentProgramId) {
      return (
        <ProgramRoomSidebar
          programId={currentProgramId}
          expanded={true}
          onToggle={() => {}}
          selectedPI={selectedPI || undefined}
          onPIChange={(pi) => setSelectedPI(pi)}
          className="flex"
        />
      );
    } else if (tier === 'portfolio') {
      return (
        <PortfolioRoomSidebar
          portfolioId={currentPortfolioId || 'default'}
          expanded={true}
          onToggle={() => {}}
          selectedPI={selectedPI || undefined}
          onPIChange={(pi) => setSelectedPI(pi)}
          className="flex"
        />
      );
    } else if (tier === 'team' && currentTeamId) {
      return (
        <TeamRoomSidebar
          teamId={currentTeamId}
          expanded={true}
          onToggle={() => {}}
          className="flex"
        />
      );
    }
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Global Header - Atlaskit Style */}
      <div className="flex items-center">
        {location.pathname !== '/home' && (
          <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
        )}
        <div className="flex-1">
          <CatalystHeaderAtlaskit />
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebarDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        {renderMobileSidebar()}
      </MobileSidebarDrawer>

      {/* Main Content with Context Panel - Conditional Sidebar Based on Tier and Route */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Hidden on Mobile */}
        {location.pathname !== '/home' && (
          <>
            {isProductRoute ? (
              <ProductRoomSidebar
                expanded={sidebarExpanded}
                onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                className="hidden lg:flex"
              />
            ) : tier === 'enterprise' ? (
              <LeftContextPanel className="hidden lg:flex" />
            ) : tier === 'program' && currentProgramId ? (
              <ProgramRoomSidebar
                programId={currentProgramId}
                expanded={sidebarExpanded}
                onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                selectedPI={selectedPI || undefined}
                onPIChange={(pi) => setSelectedPI(pi)}
                className="hidden lg:flex"
              />
            ) : tier === 'portfolio' ? (
              <PortfolioRoomSidebar
                portfolioId={currentPortfolioId || 'default'}
                expanded={sidebarExpanded}
                onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                selectedPI={selectedPI || undefined}
                onPIChange={(pi) => setSelectedPI(pi)}
                className="hidden lg:flex"
              />
            ) : tier === 'team' && currentTeamId ? (
              <TeamRoomSidebar
                teamId={currentTeamId}
                expanded={sidebarExpanded}
                onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                className="hidden lg:flex"
              />
            ) : null}
          </>
        )}
        <main className="flex-1 overflow-auto w-full min-w-0">
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
