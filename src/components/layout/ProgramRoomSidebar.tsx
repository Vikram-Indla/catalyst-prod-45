/**
 * Program Room Sidebar
 * Navigation sidebar for Program-level context.
 * "Epic Backlog" entry points to canonical EpicBacklogWithSidebar route.
 */
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
  FileText,
  FlaskConical,
  Lock,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  { id: 'room', label: 'Project Room', icon: LayoutDashboard, path: '/program/:programId/room' },
  { id: 'epic-backlog', label: 'Epic Backlog', icon: Square, path: '/program/:programId/epic-backlog' },
  { id: 'features', label: 'Features', icon: Layers3, path: '/program/:programId/features' },
  { id: 'backlog', label: 'Backlog', icon: Diamond, path: '/program/:programId/backlog' },
  { id: 'program-board', label: 'Project board', icon: GitBranch, path: '/program/:programId/program-board' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/program/:programId/roadmaps' },
  { id: 'objective-tree', label: 'Objective tree (OKR hub)', icon: Target, path: '/program/:programId/objective-tree' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/program/:programId/work-tree' },
  { id: 'dependencies', label: 'Dependencies', icon: Link2, path: '/program/:programId/dependencies' },
  { id: 'tests', label: 'Tests', icon: FlaskConical, path: '/program/:programId/tests' },
  { id: 'forecast', label: 'Forecast', icon: Grid3x3, path: '/program/:programId/forecast' },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/program/:programId/capacity', badge: 'NEW' },
  { id: 'increments', label: 'Project Increments', icon: Calendar, path: '/program/:programId/increments' },
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
    { id: 'kanban-boards', label: 'Kanban Boards', path: '/program/:programId/kanban-boards' },
    { id: 'epics', label: 'Epics', path: '/program/:programId/epics' },
    { id: 'stories', label: 'Stories', path: '/program/:programId/stories' },
    { id: 'defects', label: 'Defects', path: '/program/:programId/defects' },
    { id: 'tasks', label: 'Tasks', path: '/program/:programId/tasks' },
    { id: 'risks', label: 'Risks', path: '/program/:programId/risks' },
    { id: 'impediments', label: 'Impediments', path: '/program/:programId/impediments' },
    { id: 'sprints', label: 'Sprints', path: '/program/:programId/sprints' },
    { id: 'release-vehicles', label: 'Release Vehicles', path: '/program/:programId/release-vehicles' },
  ];

  const reportsSubMenu = [
    { id: 'feature-status', label: 'Feature status report', path: '/program/:programId/reports/feature-status' },
    { id: 'program-board-history', label: 'Project board history', path: '/program/:programId/reports/board-history' },
    { id: 'work-tree', label: 'Work tree', path: '/program/:programId/reports/work-tree' },
    { id: 'pi-objectives', label: 'PI objectives report', path: '/program/:programId/reports/pi-objectives' },
    { id: 'work-spend-grid', label: 'Work spend grid', path: '/work-spend-grid' },
  ];

  const morePagesSubMenu = [
    { id: 'knowledge-hub', label: 'Knowledge Hub', path: '/knowledge-hub' },
    { id: 'assessments', label: 'Assessments', path: '/program/:programId/pages/assessments' },
    { id: 'metrics', label: 'Metrics', path: '/program/:programId/pages/metrics' },
    { id: 'meetings', label: 'Meetings', path: '/program/:programId/pages/meetings' },
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
    onToggle(); // Always collapse sidebar on navigation
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
        expanded ? "w-[180px]" : "w-14",
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
        {/* Program Context Header - Compact inline */}
        <div className={cn("px-2 py-2 border-b", !expanded && "px-1")}>
          {expanded ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-brand-gold flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {program?.name?.substring(0, 2).toUpperCase() || 'PR'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">
                  {program?.name || 'Program'}
                </div>
                <div className="text-[10px] text-muted-foreground">Program</div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-md bg-brand-gold flex items-center justify-center text-white text-xs font-semibold">
                {program?.name?.substring(0, 2).toUpperCase() || 'PR'}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-1">
          <TooltipProvider delayDuration={0}>
            {menuItems.map((item) => {
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
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal transition-colors",
                    "hover:bg-accent/50",
                    active && "bg-accent text-primary font-medium",
                    !expanded && "justify-center px-2"
                  )}
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
          </TooltipProvider>
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="border-t">
            <button 
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors"
              onClick={() => toast.info('Project Settings coming soon', { icon: <Lock className="h-4 w-4" /> })}
            >
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">Project Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
