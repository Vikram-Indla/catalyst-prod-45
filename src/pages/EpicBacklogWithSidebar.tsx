import { useState } from 'react';
import { PortfolioRoomSidebar } from '@/components/layout/PortfolioRoomSidebar';
import EpicBacklog from './EpicBacklog';

export default function EpicBacklogWithSidebar() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedPI, setSelectedPI] = useState<string | null>('pi-5');
  
  const portfolioId = 'default-portfolio';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PortfolioRoomSidebar
        portfolioId={portfolioId}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        selectedPI={selectedPI}
        onPIChange={setSelectedPI}
      />
      <div className="flex-1 overflow-auto">
        <EpicBacklog />
      </div>
    </div>
  );
}
