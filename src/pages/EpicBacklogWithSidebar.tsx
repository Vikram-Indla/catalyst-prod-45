import { useState } from 'react';
import { PortfolioRoomSidebar } from '@/components/layout/PortfolioRoomSidebar';
import { EpicBacklogHeader } from '@/components/portfolio/EpicBacklogHeader';
import { ThemeProgressCard } from '@/components/portfolio/ThemeProgressCard';
import { EpicRoadmapCard } from '@/components/portfolio/EpicRoadmapCard';
import { PILoadCard } from '@/components/portfolio/PILoadCard';
import EpicBacklog from './EpicBacklog';

export default function EpicBacklogWithSidebar() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedPI, setSelectedPI] = useState<string | null>('pi-5');
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>('snapshot-2024');
  const [activeView, setActiveView] = useState<'financials' | 'resources' | 'execution'>('execution');
  
  const portfolioId = 'default-portfolio';

  const mockThemes = [
    { id: '1', name: 'Digital Transformation', state: 'In Progress', percentComplete: 65 },
    { id: '2', name: 'Customer Experience', state: 'Planning', percentComplete: 30 },
    { id: '3', name: 'Platform Modernization', state: 'In Progress', percentComplete: 80 },
    { id: '4', name: 'Data Analytics', state: 'Done', percentComplete: 100 },
    { id: '5', name: 'Mobile First', state: 'In Progress', percentComplete: 45 },
  ];

  const mockPIProgress = {
    percentage: 67,
    startDate: 'Jan 2024',
    endDate: 'Mar 2024',
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <PortfolioRoomSidebar
        portfolioId={portfolioId}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        selectedPI={selectedPI}
        onPIChange={setSelectedPI}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <EpicBacklogHeader
          portfolioId={portfolioId}
          selectedPI={selectedPI}
          selectedSnapshot={selectedSnapshot}
          onPIChange={setSelectedPI}
          onSnapshotChange={setSelectedSnapshot}
          activeView={activeView}
          onViewChange={setActiveView}
        />
        
        <div className="flex-1 flex gap-4 p-6 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <EpicBacklog />
          </div>
          
          <div className="w-80 space-y-4 overflow-y-auto">
            <ThemeProgressCard themes={mockThemes} />
            <EpicRoadmapCard selectedPI={selectedPI} piProgress={mockPIProgress} />
            <PILoadCard selectedPI={selectedPI} />
          </div>
        </div>
      </div>
    </div>
  );
}
