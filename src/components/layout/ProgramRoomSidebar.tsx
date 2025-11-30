import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  LayoutDashboard,
  Diamond,
  Layers3,
  Map,
  Target,
  Network,
  Grid3x3,
  Users as UsersIcon,
  Menu,
  GitBranch,
  Link2,
  Calendar,
  FileText
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ProgramRoomSidebarProps {
  programId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedPI: string | null;
  onPIChange: (pi: string | null) => void;
  className?: string;
}

type MenuItem = 
  | { id: string; label: string; icon: any; path: string; expandable?: never; badge?: string }
  | { id: string; label: string; icon: any; expandable: true; path?: never; badge?: never };

const menuItems: MenuItem[] = [
  { id: 'room', label: 'Program Room', icon: LayoutDashboard, path: '/programs/:programId/room' },
  { id: 'features', label: 'Features', icon: Layers3, path: '/programs/:programId/backlog?type=feature' },
  { id: 'backlog', label: 'Backlog', icon: Diamond, path: '/programs/:programId/backlog' },
  { id: 'program-board', label: 'Program board', icon: GitBranch, path: '/programs/:programId/program-board' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/programs/:programId/roadmaps' },
  { id: 'objective-tree', label: 'Objective tree (OKR hub)', icon: Target, path: '/programs/:programId/objective-tree' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/programs/:programId/work-tree' },
  { id: 'dependencies', label: 'Dependencies', icon: Link2, path: '/programs/:programId/dependencies' },
  { id: 'forecast', label: 'Forecast', icon: Grid3x3, path: '/programs/:programId/forecast' },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/programs/:programId/capacity', badge: 'NEW' },
  { id: 'increments', label: 'Program Increments', icon: Calendar, path: '/programs/:programId/increments' },
  { id: 'more-items', label: 'More items', icon: Menu, expandable: true },
  { id: 'reports', label: 'Reports', icon: FileText, expandable: true },
  { id: 'more-pages', label: 'More pages', icon: Menu, expandable: true },
];

export function ProgramRoomSidebar({ 
  programId, 
  expanded, 
  onToggle,
  selectedPI,
  onPIChange,
  className
}: ProgramRoomSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreItemsExpanded, setMoreItemsExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [morePagesExpanded, setMorePagesExpanded] = useState(false);

  const moreItemsSubMenu = [
    { id: 'epics', label: 'Epics', path: '/programs/:programId/epics' },
    { id: 'stories', label: 'Stories', path: '/programs/:programId/stories' },
    { id: 'defects', label: 'Defects', path: '/programs/:programId/defects' },
    { id: 'tasks', label: 'Tasks', path: '/programs/:programId/tasks' },
    { id: 'risks', label: 'Risks', path: '/programs/:programId/risks' },
    { id: 'impediments', label: 'Impediments', path: '/programs/:programId/impediments' },
    { id: 'sprints', label: 'Sprints', path: '/programs/:programId/sprints' },
    { id: 'release-vehicles', label: 'Release Vehicles', path: '/programs/:programId/release-vehicles' },
  ];

  const reportsSubMenu = [
    { id: 'feature-status', label: 'Feature status report', path: '/programs/:programId/reports/feature-status' },
    { id: 'program-board-history', label: 'Program board history', path: '/programs/:programId/reports/board-history' },
    { id: 'work-tree', label: 'Work tree', path: '/programs/:programId/reports/work-tree' },
    { id: 'pi-objectives', label: 'PI objectives report', path: '/programs/:programId/reports/pi-objectives' },
  ];

  const morePagesSubMenu = [
    { id: 'assessments', label: 'Assessments', path: '/programs/:programId/pages/assessments' },
    { id: 'metrics', label: 'Metrics', path: '/programs/:programId/pages/metrics' },
    { id: 'meetings', label: 'Meetings', path: '/programs/:programId/pages/meetings' },
  ];

  // Fetch program details
  const { data: program } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('id', programId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  const handleNavigation = (path: string) => {
    const resolvedPath = path.includes(':programId') 
      ? path.replace(':programId', programId)
      : path;
    navigate(resolvedPath + (selectedPI ? `?pi=${selectedPI}` : ''));
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    const resolvedPath = path.includes(':programId')
      ? path.replace(':programId', programId)
      : path;
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
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
        onClick={onToggle}
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
        {/* Program Context Header */}
        <div className={cn("px-4 pt-4 pb-3 border-b", !expanded && "px-2")}>
          {expanded && (
            <>
              {/* Program Display */}
              <div className="py-2 px-3 mb-3 bg-accent/30 border border-border/50 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded bg-brand-gold flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {program?.name?.substring(0, 2).toUpperCase() || 'PR'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {program?.name || 'Program'}
                    </div>
                    <div className="text-xs text-muted-foreground">Program</div>
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
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive('path' in item ? item.path : undefined);
            const isMoreItems = item.id === 'more-items';
            const isReports = item.id === 'reports';
            const isMorePages = item.id === 'more-pages';

            return (
              <div key={item.id}>
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
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal transition-colors",
                    "hover:bg-accent/50",
                    active && "bg-accent text-primary font-medium",
                    !expanded && "justify-center px-2"
                  )}
                  title={!expanded ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  {expanded && (
                    <>
                      <span className="truncate text-left flex-1">{item.label}</span>
                      {'badge' in item && item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-gold text-white rounded uppercase">
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

                {/* Submenu rendering */}
                {isMoreItems && moreItemsExpanded && expanded && (
                  <div className="bg-accent/20">
                    {moreItemsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className="w-full flex items-center gap-3 px-8 py-2 text-sm font-normal hover:bg-accent/30 transition-colors"
                      >
                        <span className="truncate text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {isReports && reportsExpanded && expanded && (
                  <div className="bg-accent/20">
                    {reportsSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className="w-full flex items-center gap-3 px-8 py-2 text-sm font-normal hover:bg-accent/30 transition-colors"
                      >
                        <span className="truncate text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {isMorePages && morePagesExpanded && expanded && (
                  <div className="bg-accent/20">
                    {morePagesSubMenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.path)}
                        className="w-full flex items-center gap-3 px-8 py-2 text-sm font-normal hover:bg-accent/30 transition-colors"
                      >
                        <span className="truncate text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="border-t">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">Program settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
