import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  LayoutDashboard,
  List,
  Map,
  GitBranch,
  Network,
  TrendingUp,
  Users as UsersIcon,
  MoreHorizontal,
  FileText,
  FolderTree,
  Target,
  Boxes,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useJiraAlignContext, TierType } from '@/contexts/JiraAlignContext';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  tiers?: TierType[];
  expandable?: boolean;
}

const menuItems: MenuItem[] = [
  { id: 'room', label: 'Room', icon: LayoutDashboard, path: '/:tier/:id/room', tiers: ['portfolio', 'program', 'team'] },
  { id: 'strategy-room', label: 'Strategy Room', icon: Target, path: '/enterprise/strategy-room', tiers: ['enterprise'] },
  { id: 'backlog', label: 'Backlog', icon: List, path: '/backlog/epics', tiers: ['portfolio', 'program'] },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/enterprise/roadmaps', tiers: ['enterprise', 'portfolio', 'program'] },
  { id: 'objective-tree', label: 'Objective tree', icon: GitBranch, path: '/enterprise/okr-tree', tiers: ['enterprise', 'portfolio'] },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/:tier/:id/work-tree', tiers: ['portfolio', 'program'] },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp, path: '/:tier/:id/forecast', tiers: ['portfolio', 'program'] },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/capacity', tiers: ['program', 'team'] },
  { id: 'program-board', label: 'Program Board', icon: Boxes, path: '/program-board', tiers: ['program'] },
];

interface LeftContextPanelProps {
  className?: string;
}

export function LeftContextPanel({ className }: LeftContextPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    tier,
    portfolioId,
    setPortfolioId,
    programId,
    setProgramId,
    piIds,
    setPiIds,
    snapshotId,
    setSnapshotId,
  } = useJiraAlignContext();
  
  const [piSelectionOpen, setPiSelectionOpen] = useState(false);
  const [tempPiIds, setTempPiIds] = useState<string[]>(piIds);

  // Mock data - in production these would come from API
  const portfolios = [
    { id: '1', name: 'Digital Services', abbr: 'DS', color: 'bg-teal-500' },
    { id: '2', name: 'Innovation', abbr: 'IN', color: 'bg-purple-500' },
  ];

  const programs = [
    { id: 'prog-1', name: 'Platform Engineering', portfolioId: '1' },
    { id: 'prog-2', name: 'Customer Experience', portfolioId: '1' },
  ];

  const pis = [
    { id: 'pi-5', code: 'PI-5', dates: 'Dec 2024 – Feb 2025', status: 'selected' },
    { id: 'pi-6', code: 'PI-6', dates: 'Mar 2025 – May 2025', status: 'in-progress' },
    { id: 'pi-7', code: 'PI-7', dates: 'Jun 2025 – Aug 2025', status: 'planning' },
    { id: 'pi-4', code: 'PI-4', dates: 'Sep 2024 – Nov 2024', status: 'done' },
  ];

  const snapshots = [
    { id: 'snap-1', name: 'Corporate Strategy 2024' },
    { id: 'snap-2', name: 'Corporate Strategy 2025' },
  ];

  const currentPortfolio = portfolios.find(p => p.id === portfolioId);
  const currentProgram = programs.find(p => p.id === programId);

  const handleNavigation = (path: string) => {
    let resolvedPath = path
      .replace(':tier', tier)
      .replace(':id', portfolioId || programId || '');
    
    navigate(resolvedPath);
  };

  const isActive = (path: string) => {
    const resolvedPath = path
      .replace(':tier', tier)
      .replace(':id', portfolioId || programId || '');
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
  };

  const getFilteredMenuItems = () => {
    return menuItems.filter(item => !item.tiers || item.tiers.includes(tier));
  };

  const handleApplyPiSelection = () => {
    setPiIds(tempPiIds);
    setPiSelectionOpen(false);
  };

  const handleClearPiSelection = () => {
    setTempPiIds([]);
  };

  const pisByStatus = {
    selected: pis.filter(pi => pi.status === 'selected'),
    'in-progress': pis.filter(pi => pi.status === 'in-progress'),
    planning: pis.filter(pi => pi.status === 'planning'),
    done: pis.filter(pi => pi.status === 'done'),
  };

  return (
    <aside
      className={cn(
        "h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative",
        expanded ? "w-[280px]" : "w-16",
        className
      )}
    >
      {/* Toggle Handle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-card border shadow-sm flex items-center justify-center hover:bg-accent transition-transform"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className="h-full flex flex-col overflow-hidden">
        {/* Context Header */}
        <div className={cn("p-3 border-b", !expanded && "px-2")}>
          {expanded ? (
            <>
              {/* Entity Selector */}
              {tier === 'portfolio' && (
                <div className="mb-3">
                  <Select value={portfolioId || undefined} onValueChange={setPortfolioId}>
                    <SelectTrigger className="h-auto p-2">
                      {currentPortfolio ? (
                        <div className="flex items-center gap-2 w-full">
                          <div className={`w-8 h-8 rounded ${currentPortfolio.color} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                            {currentPortfolio.abbr}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-sm font-medium truncate">{currentPortfolio.name}</div>
                            <div className="text-xs text-muted-foreground">Portfolio</div>
                          </div>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select Portfolio" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map(portfolio => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${portfolio.color} flex items-center justify-center text-white text-xs font-semibold`}>
                              {portfolio.abbr}
                            </div>
                            <span>{portfolio.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {tier === 'program' && (
                <div className="mb-3">
                  <Select value={programId || undefined} onValueChange={setProgramId}>
                    <SelectTrigger className="h-auto p-2">
                      <div className="text-left">
                        <div className="text-sm font-medium">{currentProgram?.name || 'Select Program'}</div>
                        <div className="text-xs text-muted-foreground">Program</div>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map(program => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {tier === 'enterprise' && snapshotId && (
                <div className="mb-3">
                  <Select value={snapshotId} onValueChange={setSnapshotId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select Snapshot" />
                    </SelectTrigger>
                    <SelectContent>
                      {snapshots.map(snap => (
                        <SelectItem key={snap.id} value={snap.id}>
                          {snap.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Program Increment Multi-Selector */}
              {(tier === 'portfolio' || tier === 'program') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Program Increment
                  </label>
                  
                  {!piSelectionOpen ? (
                    <Button
                      variant="outline"
                      className="w-full h-9 justify-start text-sm font-normal"
                      onClick={() => {
                        setTempPiIds(piIds);
                        setPiSelectionOpen(true);
                      }}
                    >
                      {piIds.length === 0 ? (
                        <span className="text-muted-foreground">Select PIs</span>
                      ) : piIds.length === 1 ? (
                        pis.find(pi => pi.id === piIds[0])?.code
                      ) : (
                        `${piIds.length} PIs selected`
                      )}
                    </Button>
                  ) : (
                    <div className="border rounded-md bg-background">
                      <ScrollArea className="h-[280px]">
                        <div className="p-2 space-y-3">
                          {Object.entries(pisByStatus).map(([status, items]) => (
                            items.length > 0 && (
                              <div key={status}>
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                                  {status.replace('-', ' ')}
                                </div>
                                {items.map(pi => (
                                  <label
                                    key={pi.id}
                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={tempPiIds.includes(pi.id)}
                                      onCheckedChange={(checked) => {
                                        setTempPiIds(prev =>
                                          checked
                                            ? [...prev, pi.id]
                                            : prev.filter(id => id !== pi.id)
                                        );
                                      }}
                                    />
                                    <div className="flex-1 text-sm">
                                      <div className="font-medium">{pi.code}</div>
                                      <div className="text-xs text-muted-foreground">{pi.dates}</div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="border-t p-2 flex gap-2">
                        <Button size="sm" className="flex-1" onClick={handleApplyPiSelection}>
                          Apply
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleClearPiSelection}>
                          Clear
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPiSelectionOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-center">
              {currentPortfolio && (
                <div className={`w-8 h-8 rounded ${currentPortfolio.color} flex items-center justify-center text-white text-xs font-semibold`}>
                  {currentPortfolio.abbr}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="space-y-0.5 px-2">
            {getFilteredMenuItems().map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-accent",
                    active && "bg-accent/50 border-l-2 border-primary font-medium",
                    !expanded && "justify-center px-2"
                  )}
                  title={!expanded ? item.label : undefined}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  {expanded && <span className="truncate">{item.label}</span>}
                  {expanded && item.expandable && (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="p-3 border-t">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent">
              <Settings className="h-[18px] w-[18px]" />
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
