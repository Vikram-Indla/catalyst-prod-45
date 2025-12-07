import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  LayoutDashboard,
  ListTree,
  Map,
  Workflow,
  Share2,
  TrendingUp,
  Users as UsersIcon,
  Focus,
  CircleDot,
  Component,
  Link,
  Blocks,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEnabledModules } from '@/hooks/useModules';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCatalystContext, TierType } from '@/contexts/CatalystContext';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  tiers?: TierType[];
  expandable?: boolean;
}

// Enterprise menu items (when tier === 'enterprise')
const getEnterpriseMenuItems = (): MenuItem[] => [
  { id: 'strategy-room', label: 'Strategy Room', icon: Focus, path: '/enterprise/strategy-room', tiers: ['enterprise'] },
  { id: 'strategic-snapshots', label: 'Strategic Snapshots', icon: CircleDot, path: '/enterprise/snapshots', tiers: ['enterprise'] },
  { id: 'objective-tree', label: 'Objective tree', icon: Workflow, path: '/enterprise/okr-hub', tiers: ['enterprise'] },
  { id: 'work-tree', label: 'Work tree', icon: Share2, path: '/work-tree', tiers: ['enterprise'] },
  { id: 'backlog', label: 'Backlog', icon: ListTree, path: '/enterprise/backlog', tiers: ['enterprise'] },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/enterprise/roadmaps', tiers: ['enterprise'] },
  { id: 'more-items', label: 'More items', icon: Blocks, path: '#', tiers: ['enterprise'], expandable: true },
  { id: 'reports', label: 'Reports', icon: TrendingUp, path: '/reports-discovery', tiers: ['enterprise'] },
  { id: 'more-pages', label: 'More pages', icon: Component, path: '#', tiers: ['enterprise'], expandable: true },
];

// Portfolio/Program/Team menu items
const getMenuItems = (portfolioId?: string, programId?: string, tier?: string): MenuItem[] => [
  { id: 'room', label: 'Portfolio Room', icon: LayoutDashboard, path: portfolioId ? `/portfolio/${portfolioId}/room` : '/portfolio-room', tiers: ['portfolio', 'program', 'team'] },
  { id: 'initiatives', label: 'Initiatives', icon: Focus, path: '/initiatives', tiers: ['portfolio', 'program'] },
  { id: 'backlog', label: 'Backlog', icon: ListTree, path: '/items/epics', tiers: ['portfolio', 'program'] },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/roadmaps', tiers: ['portfolio', 'program'] },
  { id: 'objective-tree', label: 'Objective tree', icon: Workflow, path: tier === 'portfolio' ? '/portfolio/okr-hub' : tier === 'program' ? '/program/okr-hub' : '/team/okr-hub', tiers: ['portfolio', 'program', 'team'] },
  { id: 'work-tree', label: 'Work tree', icon: Share2, path: '/work-tree', tiers: ['portfolio', 'program'] },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp, path: portfolioId ? `/portfolio/${portfolioId}/forecast` : '/portfolio/1/forecast', tiers: ['portfolio', 'program'] },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/capacity', tiers: ['program', 'team'] },
  { id: 'program-board', label: 'Program Board', icon: Blocks, path: '/programs/program-board', tiers: ['program'] },
  { id: 'dependencies', label: 'Dependencies', icon: Link, path: '/dependencies', tiers: ['program'] },
  { id: 'more-items', label: 'More items', icon: Blocks, path: '#', tiers: ['portfolio', 'program'], expandable: true },
  { id: 'reports', label: 'Reports', icon: TrendingUp, path: '/reports-discovery', tiers: ['portfolio', 'program'] },
  { id: 'more-pages', label: 'More pages', icon: Component, path: '#', tiers: ['portfolio', 'program'], expandable: true },
];

interface LeftContextPanelProps {
  className?: string;
}

export function LeftContextPanel({ className }: LeftContextPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Start collapsed when on admin routes
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [expanded, setExpanded] = useState(!isAdminRoute);
  const [moreItemsExpanded, setMoreItemsExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [morePagesExpanded, setMorePagesExpanded] = useState(false);
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
  } = useCatalystContext();

  const { isModuleEnabled } = useEnabledModules();

  // Auto-collapse when navigating to admin routes
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setExpanded(false);
    }
  }, [location.pathname]);

  // More items sub-menu for Enterprise with module codes
  const allMoreItemsSubMenu = [
    { id: 'ideation', label: 'Ideation', path: '/enterprise/ideation', moduleCode: 'ENTERPRISE' },
    { id: 'brainstorming', label: 'Brainstorming', path: '/enterprise/brainstorming', moduleCode: 'ENTERPRISE' },
    { id: 'innovation', label: 'Innovation', path: '/enterprise/innovation', moduleCode: 'ENTERPRISE' },
    { id: 'canvas', label: 'Canvas (labs)', path: '/enterprise/canvas', moduleCode: 'ENTERPRISE' },
    { id: 'mind-maps', label: 'Mind maps', path: '/enterprise/mind-maps', moduleCode: 'ENTERPRISE' },
    { id: 'competitors', label: 'Competitors', path: '/enterprise/competitors', moduleCode: 'ENTERPRISE' },
    { id: 'goals', label: 'Goals', path: '/enterprise/goals', moduleCode: 'ENTERPRISE' },
    { id: 'vision', label: 'Vision', path: '/enterprise/vision', moduleCode: 'ENTERPRISE' },
    { id: 'personas', label: 'Personas', path: '/enterprise/personas', moduleCode: 'ENTERPRISE' },
    { id: 'skills-inventory', label: 'Skills inventory', path: '/enterprise/skills-inventory', moduleCode: 'ENTERPRISE' },
    { id: 'risks', label: 'Risks', path: '/risks', moduleCode: 'PORTFOLIO' },
    { id: 'impediments', label: 'Impediments', path: '/enterprise/impediments', moduleCode: 'TEAM' },
    { id: 'kanban-boards', label: 'Kanban Boards', path: '/enterprise/kanban-boards', moduleCode: 'ENTERPRISE' },
    { id: 'epics', label: 'Epics', path: '/enterprise/epics', moduleCode: 'PORTFOLIO' },
    { id: 'features', label: 'Features', path: '/enterprise/features', moduleCode: 'PROGRAM' },
    { id: 'stories', label: 'Stories', path: '/enterprise/stories', moduleCode: 'TEAM' },
    { id: 'defects', label: 'Defects', path: '/enterprise/defects', moduleCode: 'TEAM' },
    { id: 'tasks', label: 'Tasks', path: '/enterprise/tasks', moduleCode: 'TEAM' },
    { id: 'objectives', label: 'Objectives', path: '/enterprise/objectives', moduleCode: 'ENTERPRISE' },
    { id: 'dependencies', label: 'Dependencies', path: '/enterprise/dependencies', moduleCode: 'PROGRAM' },
    { id: 'sprints', label: 'Sprints', path: '/enterprise/sprints', moduleCode: 'TEAM' },
    { id: 'program-increments', label: 'Program Increments', path: '/enterprise/program-increments', moduleCode: 'PROGRAM' },
    { id: 'release-vehicles', label: 'Release Vehicles', path: '/enterprise/release-vehicles', moduleCode: 'PROGRAM' },
    { id: 'success-criteria', label: 'Success Criteria', path: '/enterprise/success-criteria', moduleCode: 'ENTERPRISE' },
  ];

  // Filter items based on enabled modules
  const moreItemsSubMenu = useMemo(() => 
    allMoreItemsSubMenu.filter(item => isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  // Reports sub-menu for Enterprise
  const reportsSubMenu = [
    { id: 'assessment-report', label: 'Assessment report', path: '/enterprise/reports/assessment' },
    { id: 'assessment-results', label: 'Assessment results', path: '/enterprise/reports/assessment-results' },
    { id: 'cumulative-effort', label: 'Cumulative effort', path: '/enterprise/reports/cumulative-effort' },
    { id: 'strategic-balancing', label: 'Strategic balancing', path: '/enterprise/reports/strategic-balancing' },
    { id: 'folios', label: 'Folios', path: '/enterprise/reports/folios' },
    { id: 'external-reports', label: 'External reports', path: '/enterprise/reports/external' },
    { id: 'organizational-hierarchy', label: 'Organizational hierarchy', path: '/enterprise/reports/organizational-hierarchy' },
    { id: 'work-tree-report', label: 'Work tree', path: '/enterprise/reports/work-tree' },
    { id: 'risk-roam-report', label: 'Risk ROAM Report', path: '/risk-roam-report' },
  ];

  // More pages sub-menu for Enterprise
  const morePagesSubMenu = [
    { id: 'knowledge-hub', label: 'Knowledge Hub', path: '/knowledge-hub' },
    { id: 'assessments', label: 'Assessments', path: '/enterprise/pages/assessments' },
    { id: 'definition-of-done', label: 'Definition of done', path: '/enterprise/pages/definition-of-done' },
    { id: 'framework-maps', label: 'Framework maps', path: '/enterprise/pages/framework-maps' },
    { id: 'lean-process', label: 'Lean process', path: '/enterprise/pages/lean-process' },
    { id: 'metrics', label: 'Metrics', path: '/enterprise/pages/metrics' },
    { id: 'meetings', label: 'Meetings', path: '/enterprise/pages/meetings' },
    { id: 'story-point-progress', label: 'Story point progress by team', path: '/enterprise/pages/story-point-progress' },
  ];

  // Mock data - in production these would come from API
  const portfolios = [
    { id: '1', name: 'Digital Services', abbr: 'DS', color: 'bg-primary' },
    { id: '2', name: 'Innovation', abbr: 'IN', color: 'bg-workitem-theme' },
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
    
    // For program board, add program and pi query params from context
    if (path.includes('program-board')) {
      const params = new URLSearchParams();
      if (programId) params.set('program', programId);
      if (piIds[0]) params.set('pi', piIds[0]);
      navigate(`${path}?${params.toString()}`);
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    if (path === '#') return false;
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const getFilteredMenuItems = () => {
    // Use Enterprise menu items when tier is 'enterprise'
    if (tier === 'enterprise') {
      return getEnterpriseMenuItems();
    }
    // Otherwise use regular menu items
    const menuItems = getMenuItems(portfolioId, programId, tier);
    return menuItems.filter(item => !item.tiers || item.tiers.includes(tier));
  };

  const handleExpandableClick = (itemId: string) => {
    if (itemId === 'more-items') {
      setMoreItemsExpanded(!moreItemsExpanded);
    } else if (itemId === 'reports') {
      setReportsExpanded(!reportsExpanded);
    } else if (itemId === 'more-pages') {
      setMorePagesExpanded(!morePagesExpanded);
    }
  };

  return (
    <aside
      className={cn(
        "h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col",
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
        {/* Context Header - fixed height 72px to align with page header */}
        <div className={cn("h-[72px] border-b border-border flex items-center", expanded ? "px-4" : "justify-center")}>
          {!expanded && (
            <div className="w-8 h-8 rounded bg-brand-gold flex items-center justify-center text-white text-xs font-semibold">
              EN
            </div>
          )}
          {expanded && tier === 'enterprise' && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-brand-gold flex items-center justify-center text-white text-xs font-semibold">
                EN
              </div>
              <div>
                <div className="text-sm font-medium">Enterprise</div>
                <div className="text-xs text-muted-foreground">Strategy</div>
              </div>
            </div>
          )}
          {expanded && (tier === 'portfolio' || tier === 'program') && currentPortfolio && (
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0", currentPortfolio.color)}>
                {currentPortfolio.abbr}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{currentPortfolio.name}</div>
                <div className="text-xs text-muted-foreground">Portfolio</div>
              </div>
            </div>
          )}
        </div>

        {/* Filters section - only when expanded */}
        {expanded && (
          <div className="px-4 py-4 border-b border-border">
              {/* Program Increment Filter */}
              {(tier === 'portfolio' || tier === 'program') && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 block tracking-wider">
                    PROGRAM INCREMENT
                  </label>
                  <Select value={piIds[0] || undefined} onValueChange={(value) => setPiIds([value])}>
                    <SelectTrigger className="h-9 text-sm w-full bg-background border-border">
                      <SelectValue placeholder="Select PI" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-[100]">
                      {pis.map(pi => (
                        <SelectItem key={pi.id} value={pi.id}>
                          {pi.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Snapshot selector for Enterprise */}
              {tier === 'enterprise' && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 block tracking-wider">
                    SNAPSHOT
                  </label>
                  <Select value={snapshotId || undefined} onValueChange={setSnapshotId}>
                    <SelectTrigger className="h-9 text-sm w-full bg-background border-border">
                      <SelectValue placeholder="Select Snapshot" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-[100]">
                      {snapshots.map(snap => (
                        <SelectItem key={snap.id} value={snap.id}>
                          {snap.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-1">
          <TooltipProvider delayDuration={0}>
            {getFilteredMenuItems().map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const isExpandable = item.expandable;
              const isMoreItems = item.id === 'more-items';
              const isReports = item.id === 'reports';
              const isMorePages = item.id === 'more-pages';

              const menuButton = (
                <button
                  onClick={() => {
                    if (isExpandable) {
                      handleExpandableClick(item.id);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 text-sm font-normal transition-colors",
                    "hover:bg-accent/50",
                    active && "bg-accent text-primary font-medium",
                    expanded ? "px-4 py-2.5" : "justify-center px-0 py-3"
                  )}
                >
                  <Icon className={cn(
                    "flex-shrink-0",
                    expanded ? "h-5 w-5 text-muted-foreground" : "h-5 w-5 text-muted-foreground mx-auto"
                  )} />
                  {expanded && <span className="truncate text-left flex-1">{item.label}</span>}
                  {expanded && item.expandable && (
                    <ChevronRight 
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        ((isMoreItems && moreItemsExpanded) || 
                         (isReports && reportsExpanded) || 
                         (isMorePages && morePagesExpanded)) && "rotate-90"
                      )} 
                    />
                  )}
                </button>
              );

              return (
                <div key={item.id}>
                  {!expanded ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {menuButton}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="z-[100]">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    menuButton
                  )}

                  {/* More items submenu - only for Enterprise tier */}
                {isMoreItems && moreItemsExpanded && expanded && tier === 'enterprise' && (
                  <div className="bg-accent/20">
                    {moreItemsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm font-normal transition-colors",
                          "hover:bg-accent/50",
                          isActive(subItem.path) && "bg-accent text-primary font-medium"
                        )}
                      >
                        <span className="truncate text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Reports submenu - only for Enterprise tier */}
                {isReports && reportsExpanded && expanded && tier === 'enterprise' && (
                  <div className="bg-accent/20">
                    {reportsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm font-normal transition-colors",
                          "hover:bg-accent/50",
                          isActive(subItem.path) && "bg-accent text-primary font-medium"
                        )}
                      >
                        <span className="truncate text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* More pages submenu - only for Enterprise tier */}
                {isMorePages && morePagesExpanded && expanded && tier === 'enterprise' && (
                  <div className="bg-accent/20">
                    {morePagesSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm font-normal transition-colors",
                          "hover:bg-accent/50",
                          isActive(subItem.path) && "bg-accent text-primary font-medium"
                        )}
                      >
                        <span className="truncate text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </TooltipProvider>
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="border-t">
            <button 
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors"
              onClick={() => toast.info('Enterprise Settings coming soon', { icon: <Lock className="h-4 w-4" /> })}
            >
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">Enterprise Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
