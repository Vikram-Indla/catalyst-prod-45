import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FolderKanban, Diamond, Layers, Map, Target, GitBranch, Calendar, 
  BarChart3, ChevronRight, Settings, ChevronDown, Search
} from 'lucide-react';

const navItems = [
  { label: 'Portfolio Room', icon: FolderKanban, path: '/portfolio-room' },
  { label: 'Epics', icon: Diamond, path: '/jira/epics' },
  { label: 'Backlog', icon: Layers, path: '/jira/backlog' },
  { label: 'Roadmaps', icon: Map, path: '/jira/roadmaps' },
  { label: 'Objective tree', icon: Target, path: '/jira/objective-tree' },
  { label: 'Work tree', icon: GitBranch, path: '/jira/work-tree' },
  { label: 'Forecast', icon: Calendar, path: '/jira/forecast' },
  { label: 'Capacity', icon: BarChart3, path: '/jira/capacity' }
];

const piData = [
  { id: 'pi-5', name: 'PI-5', dates: '11/29/2024 - 2/20/2025', status: 'selected' },
  { id: 'pi-9', name: 'PI-9', dates: '3/11/2025 - 4/10/2025', status: 'planning' },
  { id: 'pi-6', name: 'PI-6', dates: '2/21/2025 - 5/15/2025', status: 'planning' },
  { id: 'pi-10', name: 'PI-10', dates: '4/11/2025 - 7/3/2025', status: 'planning' },
  { id: 'pi-8', name: 'PI-8', dates: '6/26/2025 - 7/1/2025', status: 'planning' },
  { id: 'pi-7', name: 'PI-7', dates: '5/16/2025 - 8/15/2025', status: 'planning' },
  { id: 'pi-1', name: 'PI-1', dates: '11/29/2023 - 1/26/2024', status: 'done' }
];

interface PortfolioRoomSidebarProps {
  portfolio: string;
}

export function PortfolioRoomSidebar({ portfolio }: PortfolioRoomSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [piSelectorOpen, setPiSelectorOpen] = useState(false);
  const [selectedPIs, setSelectedPIs] = useState<string[]>(['pi-5']);
  const [stagedPIs, setStagedPIs] = useState<string[]>(['pi-5']);
  const [piSearch, setPiSearch] = useState('');

  const handlePIToggle = (piId: string) => {
    setStagedPIs(prev =>
      prev.includes(piId) ? prev.filter(id => id !== piId) : [...prev, piId]
    );
  };

  const handleApply = () => {
    setSelectedPIs(stagedPIs);
    setPiSelectorOpen(false);
  };

  const handleCancel = () => {
    setStagedPIs(selectedPIs);
    setPiSelectorOpen(false);
  };

  const handleClearAll = () => {
    setStagedPIs([]);
  };

  const filteredPIs = piData.filter(pi =>
    pi.name.toLowerCase().includes(piSearch.toLowerCase()) ||
    pi.dates.includes(piSearch)
  );

  const groupedPIs = {
    selected: filteredPIs.filter(pi => stagedPIs.includes(pi.id)),
    inProgress: filteredPIs.filter(pi => pi.status === 'inprogress' && !stagedPIs.includes(pi.id)),
    planning: filteredPIs.filter(pi => pi.status === 'planning' && !stagedPIs.includes(pi.id)),
    done: filteredPIs.filter(pi => pi.status === 'done' && !stagedPIs.includes(pi.id))
  };

  return (
    <div className="w-64 border-r bg-card flex flex-col">
      {/* Portfolio Context */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
            <FolderKanban className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{portfolio}</h3>
            <p className="text-xs text-muted-foreground">Portfolio</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* PI Selector */}
      <div className="p-4 border-b">
        <p className="text-xs font-semibold text-muted-foreground mb-2">PROGRAM INCREMENT</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
          onClick={() => setPiSelectorOpen(!piSelectorOpen)}
        >
          <span className="text-sm">{selectedPIs.length > 0 ? selectedPIs.map(id => piData.find(p => p.id === id)?.name).join(', ') : 'Select PI'}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>

        {piSelectorOpen && (
          <div className="absolute left-64 top-[9rem] w-80 bg-popover border rounded-md shadow-lg z-50">
            <div className="p-3 border-b">
              <div className="relative">
                <Input
                  placeholder="Search Program Increment"
                  value={piSearch}
                  onChange={(e) => setPiSearch(e.target.value)}
                  className="pr-8"
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <ScrollArea className="max-h-96">
              <div className="p-2">
                {groupedPIs.selected.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground px-3 py-2">SELECTED</p>
                    {groupedPIs.selected.map((pi) => (
                      <div key={pi.id} className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          checked={stagedPIs.includes(pi.id)}
                          onCheckedChange={() => handlePIToggle(pi.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{pi.name}</p>
                          <p className="text-xs text-muted-foreground">{pi.dates}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {groupedPIs.planning.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground px-3 py-2 mt-2">PLANNING</p>
                    {groupedPIs.planning.map((pi) => (
                      <div key={pi.id} className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          checked={stagedPIs.includes(pi.id)}
                          onCheckedChange={() => handlePIToggle(pi.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{pi.name}</p>
                          <p className="text-xs text-muted-foreground">{pi.dates}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {groupedPIs.done.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground px-3 py-2 mt-2">DONE</p>
                    {groupedPIs.done.map((pi) => (
                      <div key={pi.id} className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          checked={stagedPIs.includes(pi.id)}
                          onCheckedChange={() => handlePIToggle(pi.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{pi.name}</p>
                          <p className="text-xs text-muted-foreground">{pi.dates}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t flex gap-2">
              <Button size="sm" onClick={handleApply} className="flex-1">Apply</Button>
              <Button size="sm" variant="outline" onClick={handleClearAll}>Clear all</Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}

          <button className="w-full flex items-center justify-between px-3 py-2 rounded text-sm hover:bg-accent mt-2">
            <div className="flex items-center gap-3">
              <Layers className="h-4 w-4" />
              <span>More items</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </button>

          <button className="w-full flex items-center justify-between px-3 py-2 rounded text-sm hover:bg-accent">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-4 w-4" />
              <span>Reports</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </ScrollArea>

      {/* Settings */}
      <div className="p-4 border-t">
        <button className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
          <span>Portfolios settings</span>
        </button>
      </div>
    </div>
  );
}
