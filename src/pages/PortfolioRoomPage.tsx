import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PortfolioRoomHeader } from '@/components/layout/PortfolioRoomHeader';
import { ThemeProgressCard } from '@/components/portfolio/ThemeProgressCard';
import { ProgramIncrementRoadmapCard } from '@/components/portfolio/ProgramIncrementRoadmapCard';
import { ProgramIncrementLoadCard } from '@/components/portfolio/ProgramIncrementLoadCard';
import { PortfolioEpicGrid } from '@/components/portfolio/PortfolioEpicGrid';

// Mock data
const mockThemes = [
  { id: '1', name: 'Operationalize AI', state: 'In Progress', percentComplete: 75 },
  { id: '2', name: 'Digital Transformation', state: 'In Progress', percentComplete: 82 },
  { id: '3', name: 'Customer Experience', state: 'Done', percentComplete: 100 },
  { id: '4', name: 'Platform Modernization', state: 'In Progress', percentComplete: 45 },
  { id: '5', name: 'Security & Compliance', state: 'In Progress', percentComplete: 68 },
  { id: '6', name: 'Data Analytics', state: 'Planning', percentComplete: 15 },
];

const mockLoadRows = [
  { id: '1', capability: 'Web', percentLoad: 85 },
  { id: '2', capability: 'Blockchain', percentLoad: 62 },
  { id: '3', capability: 'AI', percentLoad: 78 },
  { id: '4', capability: 'Mobile', percentLoad: 91 },
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
    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
      {/* Header Bar */}
      <PortfolioRoomHeader
        portfolioId={portfolioId || ''}
        selectedSnapshot={selectedSnapshot}
        onSnapshotChange={setSelectedSnapshot}
      />

      {/* Central Content */}
      <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-[1440px] mx-auto space-y-4">
            {/* Analytics Row - 3 column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Theme Program Increment Progress */}
              <div className="lg:col-span-5">
                <ThemeProgressCard themes={mockThemes} />
              </div>

              {/* Program Increment Roadmap */}
              <div className="lg:col-span-4">
                <ProgramIncrementRoadmapCard
                  piName="PI-5"
                  progressPercent={81}
                  startDate="2024-12-01"
                  endDate="2025-02-28"
                />
              </div>

              {/* Program Increment Load */}
              <div className="lg:col-span-3">
                <ProgramIncrementLoadCard
                  piName="PI-5"
                  overallProgress={83}
                  loadRows={mockLoadRows}
                  selectedView={selectedView}
                  onViewChange={setSelectedView}
                />
              </div>
            </div>

            {/* Bottom Epic Table */}
            <PortfolioEpicGrid
              epics={mockEpics}
              onEpicClick={(epicId) => console.log('Epic clicked:', epicId)}
            />
          </div>
        </main>
      </div>
  );
}
