import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PortfolioRoomSidebar } from '@/components/layout/PortfolioRoomSidebar';
import { PortfolioRoomHeader } from '@/components/layout/PortfolioRoomHeader';

export default function PortfolioRoomPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedPI, setSelectedPI] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar Navigation */}
      <PortfolioRoomSidebar
        portfolioId={portfolioId || ''}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        selectedPI={selectedPI}
        onPIChange={setSelectedPI}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <PortfolioRoomHeader
          portfolioId={portfolioId || ''}
          selectedSnapshot={selectedSnapshot}
          onSnapshotChange={setSelectedSnapshot}
        />

        {/* Central Content */}
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-[1440px] mx-auto">
            {/* Analytics Row - 3 column grid */}
            <div className="grid grid-cols-12 gap-4 mb-4">
              {/* Theme Program Increment Progress */}
              <div className="col-span-5 bg-card rounded-lg shadow-sm border p-4">
                <h3 className="text-sm font-semibold mb-4">Theme Program Increment Progress</h3>
                <div className="space-y-3">
                  {/* Placeholder for theme progress items */}
                  <div className="text-sm text-muted-foreground">Loading themes...</div>
                </div>
              </div>

              {/* Program Increment Roadmap */}
              <div className="col-span-4 bg-card rounded-lg shadow-sm border p-4">
                <h3 className="text-sm font-semibold mb-4">Program Increment Roadmap</h3>
                <div className="text-sm text-muted-foreground">Loading roadmap...</div>
              </div>

              {/* Program Increment Load */}
              <div className="col-span-3 bg-card rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Program Increment Load</h3>
                  <div className="flex gap-1 text-xs">
                    <button className="px-2 py-1 rounded hover:bg-accent">Financials</button>
                    <button className="px-2 py-1 rounded hover:bg-accent">Resources</button>
                    <button className="px-2 py-1 rounded bg-accent">Execution</button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Loading load data...</div>
              </div>
            </div>

            {/* Bottom Epic Table */}
            <div className="bg-card rounded-lg shadow-sm border p-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search by ID"
                  className="px-3 py-1.5 text-sm border rounded-md w-48"
                />
                <select className="px-3 py-1.5 text-sm border rounded-md">
                  <option>All work items</option>
                </select>
                <a href="#" className="text-sm text-primary hover:underline ml-auto">
                  Don't see the epic you are looking for?
                </a>
              </div>
              
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs font-semibold uppercase border-b">
                    <tr>
                      <th className="text-left py-2 px-3">Id</th>
                      <th className="text-left py-2 px-3">Ext Id</th>
                      <th className="text-left py-2 px-3">Title</th>
                      <th className="text-left py-2 px-3">Progress</th>
                      <th className="text-right py-2 px-3">Story Points</th>
                      <th className="text-right py-2 px-3">Estimated Program Increment Effort</th>
                      <th className="text-center py-2 px-3">Capitalized</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No epics found for selected filters
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
