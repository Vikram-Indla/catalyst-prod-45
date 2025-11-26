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

const getMenuItems = (portfolioId?: string, programId?: string, tier?: string): MenuItem[] => [
  { id: 'room', label: 'Portfolio Room', icon: LayoutDashboard, path: portfolioId ? `/portfolio/${portfolioId}/room` : '/portfolio-room', tiers: ['portfolio', 'program', 'team'] },
  { id: 'strategy-room', label: 'Strategy Room', icon: Target, path: '/enterprise/strategy-room', tiers: ['enterprise'] },
  { id: 'initiatives', label: 'Initiatives', icon: Target, path: '/initiatives', tiers: ['portfolio', 'program'] },
  { id: 'backlog', label: 'Backlog', icon: List, path: '/backlog/epics', tiers: ['portfolio', 'program'] },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/roadmaps', tiers: ['enterprise', 'portfolio', 'program'] },
  { id: 'objective-tree', label: 'Objective tree', icon: GitBranch, path: '/enterprise/okr-tree', tiers: ['enterprise', 'portfolio'] },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/value-stream', tiers: ['portfolio', 'program'] },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp, path: portfolioId ? `/portfolio/${portfolioId}/forecast` : '/portfolio/1/forecast', tiers: ['portfolio', 'program'] },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/capacity', tiers: ['program', 'team'] },
  { id: 'program-board', label: 'Program Board', icon: Boxes, path: '/program-board', tiers: ['program'] },
  { id: 'more-items', label: 'More items', icon: Boxes, path: '#', tiers: ['portfolio', 'program'], expandable: true },
  { id: 'reports', label: 'Reports', icon: TrendingUp, path: '/reports-discovery', tiers: ['portfolio', 'program'] },
  { id: 'more-pages', label: 'More pages', icon: Boxes, path: '#', tiers: ['portfolio', 'program'], expandable: true },
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
    if (path === '#') return; // Don't navigate for expandable items
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path === '#') return false;
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const getFilteredMenuItems = () => {
    const menuItems = getMenuItems(portfolioId, programId, tier);
    return menuItems.filter(item => !item.tiers || item.tiers.includes(tier));
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
              {/* Portfolio/Program/Enterprise Name */}
              {tier === 'portfolio' && currentPortfolio && (
                <div className="mb-3">
                  <h2 className="text-sm font-semibold">{currentPortfolio.name}</h2>
                </div>
              )}
              {tier === 'program' && currentProgram && (
                <div className="mb-3">
                  <h2 className="text-sm font-semibold">{currentProgram.name}</h2>
                </div>
              )}
              {tier === 'enterprise' && (
                <div className="mb-3">
                  <h2 className="text-sm font-semibold">Enterprise</h2>
                </div>
              )}

              {/* Filter dropdowns for Portfolio/Program */}
              {(tier === 'portfolio' || tier === 'program') && (
                <div className="space-y-2 mb-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">
                      PROGRAM INCREMENT
                    </label>
                    <Select value={piIds[0] || undefined} onValueChange={(value) => setPiIds([value])}>
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Select PI" />
                      </SelectTrigger>
                      <SelectContent>
                        {pis.map(pi => (
                          <SelectItem key={pi.id} value={pi.id}>
                            {pi.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">
                      Team
                    </label>
                    <Select>
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="PI-5 List" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pi-5-list">PI-5 List</SelectItem>
                        <SelectItem value="all">All Teams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">
                      Epic
                    </label>
                    <Select>
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Select Epic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Epics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Snapshot selector for Enterprise */}
              {tier === 'enterprise' && (
                <div className="mb-2">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">
                    Snapshot
                  </label>
                  <Select value={snapshotId || undefined} onValueChange={setSnapshotId}>
                    <SelectTrigger className="h-8 text-xs">
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
            </>
          ) : null}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto">
          <div className="py-2">
            {getFilteredMenuItems().map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                    "hover:bg-accent",
                    active && "bg-primary/10 text-primary font-medium border-l-2 border-primary",
                    !expanded && "justify-center px-2"
                  )}
                  title={!expanded ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {expanded && <span className="truncate text-left">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="p-2 border-t">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
