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
        <div className={cn("p-4 border-b space-y-4", !expanded && "px-2")}>
          {expanded ? (
            <>
              {/* Portfolio Selector - Simple */}
              {tier === 'portfolio' && (
                <div>
                  <Select value={portfolioId || undefined} onValueChange={setPortfolioId}>
                    <SelectTrigger className="h-12 justify-start text-left">
                      <SelectValue placeholder="Select Portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map(portfolio => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Program Selector - Simple */}
              {tier === 'program' && (
                <div>
                  <Select value={programId || undefined} onValueChange={setProgramId}>
                    <SelectTrigger className="h-12 justify-start text-left">
                      <SelectValue placeholder="Select Program" />
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

              {/* Snapshot Selector - Simple */}
              {tier === 'enterprise' && (
                <div>
                  <Select value={snapshotId || undefined} onValueChange={setSnapshotId}>
                    <SelectTrigger className="h-12 justify-start text-left">
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

              {/* Program Increment Section */}
              {(tier === 'portfolio' || tier === 'program') && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Program Increment
                  </label>
                  <Select value={piIds[0] || undefined} onValueChange={(value) => setPiIds([value])}>
                    <SelectTrigger className="h-12 justify-start text-left">
                      <SelectValue placeholder="Select PIs" />
                    </SelectTrigger>
                    <SelectContent>
                      {pis.map(pi => (
                        <SelectItem key={pi.id} value={pi.id}>
                          {pi.code} ({pi.dates})
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
        <nav className="flex-1 overflow-y-auto border-b">
          <div className="py-4 space-y-1">
            {getFilteredMenuItems().map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-base transition-colors",
                    "hover:bg-accent/50",
                    active && "bg-accent text-accent-foreground",
                    !expanded && "justify-center px-2"
                  )}
                  title={!expanded ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {expanded && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="p-4">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-base hover:bg-accent/50 transition-colors">
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
