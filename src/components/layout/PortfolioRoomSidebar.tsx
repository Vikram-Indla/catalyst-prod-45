import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  LayoutDashboard,
  Diamond,
  ListTree,
  Map,
  Focus,
  Share2,
  Grid3x3,
  Users as UsersIcon,
  Blocks,
  FileText,
  Workflow
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useEnabledModules } from '@/hooks/useModules';

interface PortfolioRoomSidebarProps {
  portfolioId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedPI: string | null;
  onPIChange: (pi: string | null) => void;
  className?: string;
}

type MenuItem = 
  | { id: string; label: string; icon: any; path: string; expandable?: never; badge?: string }
  | { id: string; label: string; icon: any; expandable: true; path?: never; badge?: never }
  | { type: 'divider' };

const menuItems: MenuItem[] = [
  { id: 'room', label: 'Portfolio Room', icon: LayoutDashboard, path: '/portfolio/:portfolioId/room' },
  { id: 'themes', label: 'Themes', icon: Workflow, path: '/themes' },
  { id: 'epics', label: 'Epics', icon: Diamond, path: '/epics' },
  { id: 'objective-tree', label: 'Objective tree (OKR hub)', icon: Focus, path: '/portfolio/:portfolioId/objective-tree' },
  { id: 'work-tree', label: 'Work tree', icon: Share2, path: '/portfolio/:portfolioId/work-tree' },
  { id: 'backlog', label: 'Backlog', icon: ListTree, path: '/portfolio/:portfolioId/backlog' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/portfolio/:portfolioId/roadmaps' },
  { id: 'forecast', label: 'Forecast', icon: Grid3x3, path: '/portfolio/:portfolioId/forecast' },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/portfolio/:portfolioId/capacity', badge: 'NEW' },
  { id: 'more-items', label: 'More items', icon: Blocks, expandable: true },
  { id: 'reports', label: 'Reports', icon: FileText, expandable: true },
  { id: 'more-pages', label: 'More pages', icon: Blocks, expandable: true },
];

export function PortfolioRoomSidebar({ 
  portfolioId, 
  expanded, 
  onToggle,
  selectedPI,
  onPIChange,
  className
}: PortfolioRoomSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreItemsExpanded, setMoreItemsExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [morePagesExpanded, setMorePagesExpanded] = useState(false);

  const { isModuleEnabled } = useEnabledModules();

  // Define items with their required module codes
  const allMoreItemsSubMenu = [
    { id: 'initiatives', label: 'Initiatives', path: '/portfolio/:portfolioId/initiatives', moduleCode: 'PORTFOLIO' },
    { id: 'features', label: 'Features', path: '/portfolio/:portfolioId/features', moduleCode: 'PROGRAM' },
    { id: 'stories', label: 'Stories', path: '/portfolio/:portfolioId/stories', moduleCode: 'TEAM' },
    { id: 'defects', label: 'Defects', path: '/portfolio/:portfolioId/defects', moduleCode: 'TEAM' },
    { id: 'tasks', label: 'Tasks', path: '/portfolio/:portfolioId/tasks', moduleCode: 'TEAM' },
    { id: 'dependencies', label: 'Dependencies', path: '/portfolio/:portfolioId/dependencies', moduleCode: 'PROGRAM' },
    { id: 'risks', label: 'Risks', path: '/portfolio/:portfolioId/risks', moduleCode: 'PORTFOLIO' },
    { id: 'impediments', label: 'Impediments', path: '/portfolio/:portfolioId/impediments', moduleCode: 'TEAM' },
    { id: 'sprints', label: 'Sprints', path: '/portfolio/:portfolioId/sprints', moduleCode: 'TEAM' },
    { id: 'program-increments', label: 'Program Increments', path: '/portfolio/:portfolioId/program-increments', moduleCode: 'PROGRAM' },
    { id: 'release-vehicles', label: 'Release Vehicles', path: '/portfolio/:portfolioId/release-vehicles', moduleCode: 'PROGRAM' },
  ];

  // Filter items based on enabled modules
  const moreItemsSubMenu = useMemo(() => 
    allMoreItemsSubMenu.filter(item => isModuleEnabled(item.moduleCode)),
    [isModuleEnabled]
  );

  const reportsSubMenu = [
    { id: 'epic-status', label: 'Epic status report', path: '/portfolio/:portfolioId/reports/epic-status' },
    { id: 'epic-trace', label: 'Epic trace report', path: '/portfolio/:portfolioId/reports/epic-trace' },
    { id: 'feature-status', label: 'Feature status report', path: '/portfolio/:portfolioId/reports/feature-status' },
    { id: 'portfolio-health', label: 'Portfolio health', path: '/portfolio/:portfolioId/reports/health' },
    { id: 'work-tree', label: 'Work tree', path: '/portfolio/:portfolioId/reports/work-tree' },
    { id: 'work-spend-grid', label: 'Work spend grid', path: '/work-spend-grid' },
  ];

  const morePagesSubMenu = [
    { id: 'knowledge-hub', label: 'Knowledge Hub', path: '/knowledge-hub' },
    { id: 'assessments', label: 'Assessments', path: '/portfolio/:portfolioId/pages/assessments' },
    { id: 'metrics', label: 'Metrics', path: '/portfolio/:portfolioId/pages/metrics' },
    { id: 'meetings', label: 'Meetings', path: '/portfolio/:portfolioId/pages/meetings' },
  ];

  // Fetch portfolio details
  const { data: portfolio } = useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('id', portfolioId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!portfolioId,
  });

  const handleNavigation = (path: string) => {
    // Don't resolve portfolioId for global routes
    const resolvedPath = path.includes(':portfolioId') 
      ? path.replace(':portfolioId', portfolioId)
      : path;
    
    // Handle query params properly - check if path already has query params
    let finalPath = resolvedPath;
    if (selectedPI) {
      const separator = resolvedPath.includes('?') ? '&' : '?';
      finalPath = resolvedPath + separator + `pi=${selectedPI}`;
    }
    
    navigate(finalPath);
    onToggle(); // Always collapse sidebar on navigation
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    // Check both resolved portfolio path and global path
    const resolvedPath = path.includes(':portfolioId')
      ? path.replace(':portfolioId', portfolioId)
      : path;
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
  };

  return (
    <aside 
      style={{
        width: expanded ? '220px' : '60px',
        height: '100%',
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--divider)',
        transition: 'all 0.3s ease',
        flexShrink: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      className={className}
    >
      {/* Toggle Handle */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '24px',
          zIndex: 50,
          width: '24px',
          height: '24px',
          borderRadius: '9999px',
          background: 'var(--surface-1)',
          border: '1px solid var(--divider)',
          boxShadow: 'var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--icon-default)',
        }}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <ChevronLeft style={{ width: '16px', height: '16px' }} />
        ) : (
          <ChevronRight style={{ width: '16px', height: '16px' }} />
        )}
      </button>

      <div className="h-full flex flex-col overflow-hidden">
        {/* Portfolio Context Header */}
        <div className={cn(expanded && "border-b", !expanded && "px-[var(--s2)]")} style={{ padding: expanded ? 'var(--s4)' : undefined, paddingTop: 'var(--s4)', paddingBottom: 'var(--s3)' }}>
          {expanded && (
            <>
              {/* Portfolio Display (read-only, controlled by header) */}
              <div className="bg-accent/30 border border-border/50 rounded-lg" style={{ padding: 'var(--s2) var(--s3)', marginBottom: 'var(--s3)' }}>
                <div className="flex items-center w-full" style={{ gap: 'var(--s3)' }}>
                  <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">
                    {portfolio?.name?.substring(0, 2).toUpperCase() || 'PF'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {portfolio?.name || 'Portfolio'}
                    </div>
                    <div className="text-xs text-muted-foreground">Portfolio</div>
                  </div>
                </div>
              </div>

              {/* Program Increment Filter */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 block tracking-wider">
                  PROGRAM INCREMENT
                </label>
                <Select value={selectedPI || undefined} onValueChange={onPIChange}>
                  <SelectTrigger className="h-9 text-sm w-full bg-background border-border">
                    <SelectValue placeholder="Select PI" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[100]">
                    <SelectItem value="pi-5">PI-5</SelectItem>
                    <SelectItem value="pi-6">PI-6</SelectItem>
                    <SelectItem value="pi-7">PI-7</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-1">
          <TooltipProvider delayDuration={0}>
            {menuItems.map((item, index) => {
              if (!('id' in item)) return null;

              const Icon = item.icon;
              const active = isActive('path' in item ? item.path : undefined);
              const isMoreItems = item.id === 'more-items';
              const isReports = item.id === 'reports';
              const isMorePages = item.id === 'more-pages';

              const menuButton = (
                <button
                  onClick={() => {
                    if ('expandable' in item && item.expandable) {
                      if (isMoreItems) setMoreItemsExpanded(!moreItemsExpanded);
                      if (isReports) setReportsExpanded(!reportsExpanded);
                      if (isMorePages) setMorePagesExpanded(!morePagesExpanded);
                    } else if ('path' in item && item.path) {
                      handleNavigation(item.path);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: expanded ? '0 12px' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    marginBottom: '2px',
                    position: 'relative',
                    justifyContent: expanded ? 'flex-start' : 'center',
                    background: active ? 'var(--nav-active-bg)' : 'transparent',
                    color: active ? 'var(--text-1)' : 'var(--text-2)',
                    fontWeight: active ? 600 : 500,
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => { 
                    if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = active ? 'var(--nav-active-bg)' : 'transparent'; 
                  }}
                >
                  {active && (
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      top: '8px',
                      bottom: '8px',
                      width: '2px',
                      background: 'var(--brand-active)',
                      borderRadius: '0 1px 1px 0',
                    }} />
                  )}
                  <Icon style={{ width: '20px', height: '20px', flexShrink: 0, color: active ? 'var(--text-1)' : 'var(--icon-default)' }} />
                  {expanded && (
                    <>
                      <span className="truncate text-left flex-1">{item.label}</span>
                      {'badge' in item && item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#5c7c5c] text-white rounded uppercase">
                          {item.badge}
                        </span>
                      )}
                      {'expandable' in item && item.expandable && (
                        <ChevronRight 
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            ((isMoreItems && moreItemsExpanded) || 
                             (isReports && reportsExpanded) || 
                             (isMorePages && morePagesExpanded)) && "rotate-90"
                          )} 
                        />
                      )}
                    </>
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

                {/* Submenu rendering */}
                {isMoreItems && moreItemsExpanded && expanded && (
                  <div style={{ background: 'var(--surface-3)' }}>
                    {moreItemsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 32px',
                          fontSize: '14px',
                          fontWeight: 400,
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-2)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {isReports && reportsExpanded && expanded && (
                  <div style={{ background: 'var(--surface-3)' }}>
                    {reportsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 32px',
                          fontSize: '14px',
                          fontWeight: 400,
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-2)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {isMorePages && morePagesExpanded && expanded && (
                  <div style={{ background: 'var(--surface-3)' }}>
                    {morePagesSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 32px',
                          fontSize: '14px',
                          fontWeight: 400,
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-2)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{subItem.label}</span>
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
          <div style={{ borderTop: '1px solid var(--divider)', padding: '8px' }}>
            <button 
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-2)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => {
                onToggle();
                navigate('/admin/portfolio-settings');
              }}
            >
              <Settings style={{ width: '20px', height: '20px', color: 'var(--icon-default)' }} />
              <span style={{ textAlign: 'left' }}>Portfolio Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
