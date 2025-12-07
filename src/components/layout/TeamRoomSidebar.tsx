import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  LayoutDashboard,
  FileText,
  Layers3,
  Target,
  Calendar,
  Grid3x3,
  TrendingUp,
  Menu,
  AlertTriangle,
  Bug,
  Network,
  Map
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TeamRoomSidebarProps {
  teamId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedSprint: string | null;
  onSprintChange: (sprint: string | null) => void;
}

type MenuItem = 
  | { id: string; label: string; icon: any; path: string; expandable?: never; badge?: string }
  | { id: string; label: string; icon: any; expandable: true; path?: never; badge?: never };

const menuItems: MenuItem[] = [
  { id: 'room', label: 'Team Room', icon: LayoutDashboard, path: '/teams/:teamId/room' },
  { id: 'stories', label: 'Stories', icon: FileText, path: '/teams/:teamId/backlog?type=story' },
  { id: 'backlog', label: 'Backlog', icon: Layers3, path: '/teams/:teamId/backlog' },
  { id: 'board', label: 'Team Board', icon: Grid3x3, path: '/teams/:teamId/board' },
  { id: 'objective-tree', label: 'Objective tree (OKR hub)', icon: Target, path: '/teams/:teamId/objective-tree' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/teams/:teamId/roadmaps' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/teams/:teamId/work-tree' },
  { id: 'sprints', label: 'Sprints', icon: Calendar, path: '/teams/:teamId/sprints' },
  { id: 'velocity', label: 'Velocity', icon: TrendingUp, path: '/teams/:teamId/velocity' },
  { id: 'meetings', label: 'Team meetings', icon: Calendar, path: '/teams/:teamId/meetings' },
  { id: 'defects', label: 'Defects', icon: Bug, path: '/teams/:teamId/backlog?type=defect' },
  { id: 'impediments', label: 'Impediments', icon: AlertTriangle, path: '/teams/:teamId/impediments' },
  { id: 'more-items', label: 'More items', icon: Menu, expandable: true },
  { id: 'reports', label: 'Reports', icon: FileText, expandable: true },
  { id: 'more-pages', label: 'More pages', icon: Menu, expandable: true },
];

export function TeamRoomSidebar({ 
  teamId, 
  expanded, 
  onToggle,
  selectedSprint,
  onSprintChange
}: TeamRoomSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreItemsExpanded, setMoreItemsExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [morePagesExpanded, setMorePagesExpanded] = useState(false);

  const moreItemsSubMenu = [
    { id: 'features', label: 'Features', path: '/teams/:teamId/features' },
    { id: 'tasks', label: 'Tasks', path: '/teams/:teamId/tasks' },
    { id: 'dependencies', label: 'Dependencies', path: '/teams/:teamId/dependencies' },
    { id: 'risks', label: 'Risks', path: '/teams/:teamId/risks' },
    { id: 'program-increments', label: 'Program Increments', path: '/teams/:teamId/program-increments' },
    { id: 'release-vehicles', label: 'Release Vehicles', path: '/teams/:teamId/release-vehicles' },
  ];

  const reportsSubMenu = [
    { id: 'stories-by-state', label: 'Stories by state', path: '/teams/:teamId/reports/stories-by-state' },
    { id: 'story-point-progress', label: 'Story point progress', path: '/teams/:teamId/reports/story-point-progress' },
    { id: 'team-velocity-trend', label: 'Team velocity trend', path: '/teams/:teamId/reports/team-velocity-trend' },
    { id: 'work-tree', label: 'Work tree', path: '/teams/:teamId/reports/work-tree' },
  ];

  const morePagesSubMenu = [
    { id: 'assessments', label: 'Assessments', path: '/teams/:teamId/pages/assessments' },
    { id: 'metrics', label: 'Metrics', path: '/teams/:teamId/pages/metrics' },
  ];

  // Fetch team details
  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', teamId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const handleNavigation = (path: string) => {
    const resolvedPath = path.includes(':teamId') 
      ? path.replace(':teamId', teamId)
      : path;
    navigate(resolvedPath + (selectedSprint ? `?sprint=${selectedSprint}` : ''));
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    const resolvedPath = path.includes(':teamId')
      ? path.replace(':teamId', teamId)
      : path;
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
  };

  return (
    <aside 
      className={cn(
        "h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative",
        expanded ? "w-[280px]" : "w-16"
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
        {/* Team Context Header */}
        <div className={cn("px-4 pt-4 pb-3 border-b", !expanded && "px-2")}>
          {expanded && (
            <>
              {/* Team Display */}
              <div className="py-2 px-3 mb-3 bg-accent/30 border border-border/50 rounded-lg">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded bg-success flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">
                    {team?.name?.substring(0, 2).toUpperCase() || 'TM'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {team?.name || 'Team'}
                    </div>
                    <div className="text-xs text-muted-foreground">Team</div>
                  </div>
                </div>
              </div>

              {/* Sprint Filter */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 block tracking-wider">
                  SPRINT
                </label>
                <Select value={selectedSprint || undefined} onValueChange={onSprintChange}>
                  <SelectTrigger className="h-9 text-sm w-full bg-background border-border">
                    <SelectValue placeholder="Select Sprint" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[100]">
                    <SelectItem value="sprint-1">Sprint 1</SelectItem>
                    <SelectItem value="sprint-2">Sprint 2</SelectItem>
                    <SelectItem value="sprint-3">Sprint 3</SelectItem>
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
            <button 
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors"
              onClick={() => {
                onToggle(); // Collapse sidebar when navigating to settings
                navigate('/admin/team-settings');
              }}
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">Team Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
