/**
 * Unified Sidebar Component
 * Single sidebar component for Program and Project workspaces
 * Replaces ProgramSidebar and ProjectSidebar with shared structure
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard,
  Network,
  GitBranch,
  Map,
  Grid3x3,
  Users as UsersIcon,
  Calendar,
  FileText,
  Settings,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkspaceType = 'program' | 'project';

interface UnifiedSidebarProps {
  workspaceType: WorkspaceType;
  entityId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedQuarter?: string | null;
  onQuarterChange?: (quarter: string | null) => void;
  className?: string;
}

// Menu items configuration per workspace type
const menuConfigs: Record<WorkspaceType, Array<{ id: string; label: string; icon: any; pathTemplate: string; badge?: string }>> = {
  program: [
    { id: 'room', label: 'Program Room', icon: LayoutDashboard, pathTemplate: '/program/:id/room' },
    { id: 'epic-backlog', label: 'Epic Backlog', icon: Square, pathTemplate: '/program/:id/epic-backlog' },
    { id: 'work-tree', label: 'Work tree', icon: Network, pathTemplate: '/program/:id/work-tree' },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch, pathTemplate: '/program/:id/dependencies' },
    { id: 'roadmaps', label: 'Roadmaps', icon: Map, pathTemplate: '/program/:id/roadmaps' },
    { id: 'epic-balancing', label: 'Epic Balancing', icon: Grid3x3, pathTemplate: '/program/:id/epic-balancing' },
    { id: 'reports', label: 'Reports', icon: FileText, pathTemplate: '/program/:id/reports' },
  ],
  project: [
    { id: 'room', label: 'Project Room', icon: LayoutDashboard, pathTemplate: '/programs/:id/room' },
    { id: 'work-tree', label: 'Work tree', icon: Network, pathTemplate: '/programs/:id/work-tree' },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch, pathTemplate: '/programs/:id/dependencies' },
    { id: 'forecast', label: 'Forecast', icon: Grid3x3, pathTemplate: '/programs/:id/forecast' },
    { id: 'capacity', label: 'Capacity', icon: UsersIcon, pathTemplate: '/programs/:id/capacity', badge: 'NEW' },
    { id: 'quarters', label: 'Quarters', icon: Calendar, pathTemplate: '/programs/:id/quarters' },
    { id: 'reports', label: 'Reports', icon: FileText, pathTemplate: '/programs/:id/reports' },
  ],
};

function getCurrentQuarter(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

export function UnifiedSidebar({ 
  workspaceType,
  entityId, 
  expanded, 
  onToggle,
  selectedQuarter,
  onQuarterChange,
  className
}: UnifiedSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems = menuConfigs[workspaceType];
  const entityLabel = workspaceType === 'program' ? 'Program' : 'Project';
  const tableName = workspaceType === 'program' ? 'programs' : 'programs';

  // Fetch entity details
  const { data: entity } = useQuery({
    queryKey: [`${workspaceType}-sidebar`, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('id, name')
        .eq('id', entityId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });

  const currentQuarter = getCurrentQuarter();
  const effectiveQuarter = selectedQuarter || currentQuarter;

  const handleNavigation = (pathTemplate: string) => {
    const resolvedPath = pathTemplate.replace(':id', entityId);
    navigate(resolvedPath + (effectiveQuarter ? `?quarter=${effectiveQuarter}` : ''));
    if (expanded) {
      onToggle();
    }
  };

  const isActive = (pathTemplate: string) => {
    const resolvedPath = pathTemplate.replace(':id', entityId);
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath);
  };

  const settingsPath = workspaceType === 'program' ? '/admin/portfolios' : '/admin/programs';

  return (
    <aside 
      className={cn(
        "h-full border-r bg-card transition-all duration-300 flex-shrink-0 relative flex flex-col",
        expanded ? "w-44" : "w-14",
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
        {/* Entity Context Header - h-12 to align with main header */}
        <div className={cn("h-12 px-2 flex items-center border-b", !expanded && "px-1 justify-center")}>
          {expanded ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-brand-gold flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {entity?.name?.substring(0, 2).toUpperCase() || entityLabel.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">
                  {entity?.name || entityLabel}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-md bg-brand-gold flex items-center justify-center text-white text-xs font-semibold">
              {entity?.name?.substring(0, 2).toUpperCase() || entityLabel.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.pathTemplate);

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.pathTemplate)}
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
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-gold text-white rounded uppercase">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="border-t">
            <button 
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors"
              onClick={() => {
                navigate(settingsPath);
                onToggle();
              }}
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">{entityLabel} Settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
