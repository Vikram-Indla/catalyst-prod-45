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
  Target
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

interface PortfolioRoomSidebarProps {
  portfolioId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedPI: string | null;
  onPIChange: (pi: string | null) => void;
  showTeamFilter?: boolean;
  showEpicFilter?: boolean;
}

type MenuItem = 
  | { id: string; label: string; icon: any; path: string; expandable?: never }
  | { id: string; label: string; icon: any; expandable: true; path?: never }
  | { type: 'divider' };

const menuItems: MenuItem[] = [
  { id: 'room', label: 'Portfolio Room', icon: LayoutDashboard, path: '/portfolio/:portfolioId/room' },
  { id: 'initiatives', label: 'Initiatives', icon: Target, path: '/initiatives' },
  { id: 'backlog', label: 'Backlog', icon: List, path: '/backlog/epics' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/enterprise/roadmaps' },
  { id: 'objective-tree', label: 'Objective tree', icon: GitBranch, path: '/enterprise/okr-tree' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/portfolio/:portfolioId/work-tree' },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp, path: '/portfolio/:portfolioId/forecast' },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/capacity' },
  { id: 'more-items', label: 'More items', icon: MoreHorizontal, expandable: true },
  { id: 'reports', label: 'Reports', icon: FileText, expandable: true },
  { id: 'more-pages', label: 'More pages', icon: FolderTree, expandable: true },
  { type: 'divider' },
  { id: 'programs', label: 'Programs', icon: UsersIcon, expandable: true },
];

export function PortfolioRoomSidebar({ 
  portfolioId, 
  expanded, 
  onToggle,
  selectedPI,
  onPIChange,
  showTeamFilter = false,
  showEpicFilter = false
}: PortfolioRoomSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    // Don't resolve portfolioId for global routes
    const resolvedPath = path.includes(':portfolioId') 
      ? path.replace(':portfolioId', portfolioId)
      : path;
    navigate(resolvedPath + (selectedPI ? `?pi=${selectedPI}` : ''));
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
        {/* Portfolio Context Header */}
        <div className={cn("p-3 border-b", !expanded && "px-2")}>
          {expanded ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center text-white text-xs font-semibold">
                  DS
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">Digital Services</div>
                  <div className="text-xs text-muted-foreground">Portfolio</div>
                </div>
              </div>

              {/* Filter Dropdowns */}
              <div className="space-y-2">
                {/* Program Increment Selector */}
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase mb-1 block">
                    PROGRAM INCREMENT
                  </label>
                  <Select value={selectedPI || undefined} onValueChange={onPIChange}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Select PI" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">Selected</SelectLabel>
                        <SelectItem value="pi-5">PI-5</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">In Progress</SelectLabel>
                        <SelectItem value="pi-6">PI-6</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">Planning</SelectLabel>
                        <SelectItem value="pi-7">PI-7</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">Done</SelectLabel>
                        <SelectItem value="pi-4">PI-4</SelectItem>
                        <SelectItem value="pi-3">PI-3</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Team Selector - conditional */}
                {showTeamFilter && (
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
                )}
                
                {/* Epic Selector - conditional */}
                {showEpicFilter && (
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
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto">
          <div className="py-2">
            {menuItems.map((item, index) => {
              if ('type' in item && item.type === 'divider') {
                return <div key={`divider-${index}`} className="my-1 mx-3 border-t" />;
              }

              if (!('id' in item)) return null;

              const Icon = item.icon;
              const active = isActive('path' in item ? item.path : undefined);

              return (
                <button
                  key={item.id}
                  onClick={() => 'path' in item && item.path && handleNavigation(item.path)}
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
                  {expanded && 'expandable' in item && item.expandable && (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
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
              <span>Portfolios settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
