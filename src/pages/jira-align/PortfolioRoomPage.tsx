import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PortfolioRoomSidebar } from '@/components/layout/PortfolioRoomSidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Star, Settings, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const themes = [
  { name: 'Operationalize AI', status: 'In Progress', progress: 87 },
  { name: 'User Experience', status: 'In Progress', progress: 87 },
  { name: 'Regulatory Compliance', status: 'In Progress', progress: 88 },
  { name: 'Platform Infrastructure', status: 'In Progress', progress: 76 },
  { name: 'Partnerships', status: 'In Progress', progress: 78 },
  { name: 'Collaboration Tools', status: 'In Progress', progress: 66 }
];

const epics = [
  { id: '4356', extId: '', title: '', progress: 0, points: 0, effort: '960 Pts', capitalized: '' },
  { id: '4281', extId: '', title: '', progress: 100, points: 9, effort: '24 Pts', capitalized: '' },
  { id: '3320', extId: '', title: '', progress: 0, points: 0, effort: '0 Pts', capitalized: '' },
  { id: '3319', extId: '', title: '', progress: 100, points: 4, effort: '0 Pts', capitalized: '' },
  { id: '3057', extId: '', title: '', progress: 0, points: 0, effort: '144 Pts', capitalized: '' },
  { id: '3041', extId: '', title: '', progress: 100, points: 6, effort: '0 Pts', capitalized: '' }
];

const loadData = [
  { category: 'Web', percentage: 77 },
  { category: 'Blockchain', percentage: 68 },
  { category: 'AI', percentage: 87 },
  { category: 'Mobile', percentage: 87 }
];

export default function PortfolioRoomPage() {
  const [searchParams] = useSearchParams();
  const portfolio = searchParams.get('portfolio') || 'Digital Services';
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedPI, setSelectedPI] = useState<string | null>(null);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <PortfolioRoomSidebar 
        portfolioId="1"
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        selectedPI={selectedPI}
        onPIChange={setSelectedPI}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Page Header */}
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-lg font-semibold">Portfolio Room</h1>
              <span className="text-sm text-muted-foreground">for</span>
              <Select value={portfolio}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={portfolio}>{portfolio}</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-4">Snapshot:</span>
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Select one</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              View Configuration
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">Financials</Button>
            <Button variant="ghost" size="sm">Resources</Button>
            <Button variant="ghost" size="sm">Execution</Button>
          </div>
        </div>

        {/* 3 Column Layout */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-auto">
          {/* Column 1: Theme Progress */}
          <div className="col-span-3">
            <Card className="p-4">
              <h2 className="font-semibold mb-4">Theme Program Increment Progress</h2>
              <div className="space-y-4">
                {themes.map((theme, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-medium">{theme.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                        {theme.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Progress value={theme.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{theme.progress}% Complete</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Column 2: Roadmap */}
          <div className="col-span-6">
            <Card className="p-4 mb-4">
              <h2 className="font-semibold mb-3">Program Increment Roadmap</h2>
              <div className="h-24 bg-muted/30 rounded flex items-center justify-between px-4 mb-4">
                <div className="text-xs text-muted-foreground">
                  <div>2024</div>
                  <div className="mt-1">Dec</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>2025</div>
                  <div className="mt-1">Jan</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>Feb</div>
                </div>
                <div className="h-16 w-1 bg-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">PI-5 Progress: 81%</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Input placeholder="Search by ID" className="pr-8" />
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All work items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All work items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-primary hover:underline cursor-pointer mb-4">
                Don't see the epic you are looking for?
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Id</th>
                      <th className="text-left py-2 font-medium">Ext Id</th>
                      <th className="text-left py-2 font-medium">Title</th>
                      <th className="text-left py-2 font-medium">Progress</th>
                      <th className="text-left py-2 font-medium">Story Points</th>
                      <th className="text-left py-2 font-medium">Estimated Program Increment Effort</th>
                      <th className="text-left py-2 font-medium">Capitalized</th>
                    </tr>
                  </thead>
                  <tbody>
                    {epics.map((epic, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-2">{epic.id}</td>
                        <td className="py-2">{epic.extId}</td>
                        <td className="py-2">{epic.title}</td>
                        <td className="py-2">
                          {epic.progress > 0 && (
                            <div className="w-20">
                              <Progress value={epic.progress} className="h-1" />
                            </div>
                          )}
                          {epic.progress === 0 && <span>{epic.progress}%</span>}
                        </td>
                        <td className="py-2">{epic.points}</td>
                        <td className="py-2">{epic.effort}</td>
                        <td className="py-2">{epic.capitalized}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Column 3: PI Load */}
          <div className="col-span-3">
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Program Increment Load</h2>
              <div className="bg-muted/30 rounded p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded">
                    PI-5
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                    In Progress
                  </span>
                </div>
                <p className="text-sm font-medium mb-2">Program Increment Progress</p>
                <div className="space-y-1">
                  <Progress value={83} className="h-2" />
                  <p className="text-xs text-muted-foreground">83% Complete</p>
                </div>
              </div>

              <div className="space-y-3">
                {loadData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <span className="text-sm">{item.category}</span>
                    <span className="text-sm font-medium">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
