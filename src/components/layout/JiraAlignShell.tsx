import { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { JiraAlignHeader } from '@/components/ja/JiraAlignHeader';
import { PortfolioRoomSidebar } from './PortfolioRoomSidebar';
import { ProgramRoomSidebar } from './ProgramRoomSidebar';
import { LeftContextPanel } from './LeftContextPanel';
import { JiraAlignContextProvider, useJiraAlignContext } from '@/contexts/JiraAlignContext';

function JiraAlignShellContent() {
  const location = useLocation();
  const { tier, setTier } = useJiraAlignContext();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedPI, setSelectedPI] = useState<string | null>('pi-5');

  // Automatically set tier based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/enterprise')) {
      if (tier !== 'enterprise') setTier('enterprise');
    } else if (path.startsWith('/portfolio')) {
      if (tier !== 'portfolio') setTier('portfolio');
    } else if (path.startsWith('/program') || path === '/dependencies' || path.startsWith('/programs/program-board')) {
      // Dependencies and Program Board are Program-level features
      if (tier !== 'program') setTier('program');
    } else if (path.startsWith('/team')) {
      if (tier !== 'team') setTier('team');
    }
  }, [location.pathname, tier, setTier]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Global Header - New Jira Align Style */}
      <JiraAlignHeader />

      {/* Main Content with Context Panel - Conditional Sidebar Based on Tier and Route */}
        <div className="flex flex-1 overflow-hidden">
          {/* No sidebar for Home route */}
          {location.pathname !== '/home' && (
            <>
              {tier === 'enterprise' ? (
                <LeftContextPanel />
              ) : tier === 'program' ? (
                <ProgramRoomSidebar
                  programId="default-program"
                  expanded={sidebarExpanded}
                  onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                  selectedPI={selectedPI}
                  onPIChange={setSelectedPI}
                />
              ) : (
                <PortfolioRoomSidebar
                  portfolioId="default-portfolio"
                  expanded={sidebarExpanded}
                  onToggle={() => setSidebarExpanded(!sidebarExpanded)}
                  selectedPI={selectedPI}
                  onPIChange={setSelectedPI}
                />
              )}
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
