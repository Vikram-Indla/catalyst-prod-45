import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PortfolioRoomHeader } from '@/components/layout/PortfolioRoomHeader';
import { ThemeProgressCard } from '@/components/portfolio/ThemeProgressCard';
import { ProgramIncrementRoadmapCard } from '@/components/portfolio/ProgramIncrementRoadmapCard';
import { PIProgressCard } from '@/components/portfolio/PIProgressCard';
import { PortfolioEpicGrid } from '@/components/portfolio/PortfolioEpicGrid';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock data
const mockThemes = [
  { id: '1', name: 'Operationalize AI', state: 'In Progress', percentComplete: 75 },
  { id: '2', name: 'Digital Transformation', state: 'In Progress', percentComplete: 82 },
  { id: '3', name: 'Customer Experience', state: 'Done', percentComplete: 100 },
  { id: '4', name: 'Platform Modernization', state: 'In Progress', percentComplete: 45 },
  { id: '5', name: 'Security & Compliance', state: 'In Progress', percentComplete: 68 },
  { id: '6', name: 'Data Analytics', state: 'Planning', percentComplete: 15 },
];

const mockCapabilities = [
  { name: 'Web', percentage: 77 },
  { name: 'Blockchain', percentage: 68 },
  { name: 'AI', percentage: 87 },
  { name: 'Mobile', percentage: 87 },
];

const mockEpics = [
  { id: 'E-1234', externalId: 'JIRA-456', title: 'User Authentication & Authorization System', progressPercent: 75, storyPoints: 89, estimatedPIEffortPts: 960, isCapitalized: true },
  { id: 'E-1235', externalId: 'JIRA-457', title: 'Payment Gateway Integration', progressPercent: 45, storyPoints: 55, estimatedPIEffortPts: 640, isCapitalized: true },
  { id: 'E-1236', externalId: null, title: 'Real-time Analytics Dashboard', progressPercent: 92, storyPoints: 72, estimatedPIEffortPts: 880, isCapitalized: false },
  { id: 'E-1237', externalId: 'JIRA-458', title: 'Mobile App Redesign', progressPercent: 30, storyPoints: 120, estimatedPIEffortPts: 1200, isCapitalized: true },
  { id: 'E-1238', externalId: 'JIRA-459', title: 'API Gateway Modernization', progressPercent: 88, storyPoints: 95, estimatedPIEffortPts: 1040, isCapitalized: false },
  { id: 'E-1239', externalId: null, title: 'Customer Notification System', progressPercent: 60, storyPoints: 48, estimatedPIEffortPts: 520, isCapitalized: true },
  { id: 'E-1240', externalId: 'JIRA-460', title: 'AI-Powered Search', progressPercent: 25, storyPoints: 110, estimatedPIEffortPts: 1120, isCapitalized: false },
  { id: 'E-1241', externalId: 'JIRA-461', title: 'Data Migration Platform', progressPercent: 100, storyPoints: 85, estimatedPIEffortPts: 920, isCapitalized: true },
];

export default function PortfolioRoomPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'financials' | 'resources' | 'execution'>('execution');

  return (
    <div className="flex flex-col">
      {/* Header Bar */}
      <div className="border-b">
        <PortfolioRoomHeader
          portfolioId={portfolioId || ''}
          selectedSnapshot={selectedSnapshot}
          onSnapshotChange={setSelectedSnapshot}
        />
      </div>

      {/* View Tabs */}
      <div className="border-b px-3 sm:px-6 py-2">
        <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
          <TabsList className="h-9 w-full sm:w-auto">
            <TabsTrigger value="financials" className="text-xs sm:text-sm flex-1 sm:flex-none">
              Financials
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-xs sm:text-sm flex-1 sm:flex-none">
              Resources
            </TabsTrigger>
            <TabsTrigger value="execution" className="text-xs sm:text-sm flex-1 sm:flex-none">
              Execution
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <main className="p-3 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Three Column Layout - Stack on mobile, 3 columns on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left: Theme Program Increment Progress */}
            <div className="min-w-0">
              <ThemeProgressCard themes={mockThemes} />
            </div>

            {/* Center: Program Increment Roadmap */}
            <div className="min-w-0">
              <ProgramIncrementRoadmapCard
                piName="PI-5"
                progressPercent={83}
                startDate="2024-04-01"
                endDate="2024-06-30"
              />
            </div>

            {/* Right: PI Progress with Capabilities */}
            <div className="min-w-0 md:col-span-2 lg:col-span-1">
              <PIProgressCard
                piName="PI-5"
                status="In Progress"
                progressPercent={83}
                capabilities={mockCapabilities}
              />
            </div>
          </div>

          {/* Bottom Epic Table - Full width with horizontal scroll on mobile */}
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[800px] px-3 sm:px-0">
              <PortfolioEpicGrid
                epics={mockEpics}
                onEpicClick={(epicId) => console.log('Epic clicked:', epicId)}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
