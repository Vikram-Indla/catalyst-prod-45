import { useState, useEffect } from 'react';
import { useLocation, useParams, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JiraAlignHeader } from '@/components/ja/JiraAlignHeader';
import { PortfolioRoomSidebar } from './PortfolioRoomSidebar';
import { ProgramRoomSidebar } from '@/components/program/ProgramRoomSidebar';
import { LeftContextPanel } from './LeftContextPanel';
import { JiraAlignContextProvider, useJiraAlignContext } from '@/contexts/JiraAlignContext';

function JiraAlignShellContent() {
  const location = useLocation();
  const params = useParams<{ programId?: string; portfolioId?: string }>();
  const { tier, setTier } = useJiraAlignContext();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
  // Extract IDs from URL params
  const currentProgramId = params.programId || null;
  const currentPortfolioId = params.portfolioId || null;
  
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Global Header - New Jira Align Style */}
      <JiraAlignHeader />

      {/* Main Content with Context Panel - Conditional Sidebar Based on Tier and Route */}
      <div className="flex flex-1 overflow-hidden">
          {/* No sidebar for Home route */}
          {location.pathname !== '/home' && (
            <>
              {tier === 'enterprise' ? (
                <LeftContextPanel />
              ) : tier === 'program' && currentProgramId ? (
                <ProgramRoomSidebar
                  programId={currentProgramId}
                />
              ) : tier === 'portfolio' ? (
                <PortfolioRoomSidebar
                  portfolioId={currentPortfolioId || 'default'}
                  expanded={sidebarExpanded}
                  onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                  selectedPI={selectedPI || undefined}
                  onPIChange={(pi) => setSelectedPI(pi)}
                />
              ) : null}
            </>
          )}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function JiraAlignShell() {
  return (
    <JiraAlignContextProvider>
      <JiraAlignShellContent />
    </JiraAlignContextProvider>
  );
}
