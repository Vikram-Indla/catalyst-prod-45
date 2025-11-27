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
  { id: 'programs', label: 'Programs', icon: UsersIcon, expandable: true },
];

export function PortfolioRoomSidebar({ 
  portfolioId, 
  expanded, 
  onToggle,
  selectedPI,
  onPIChange
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
        <div className={cn("px-4 pt-4 pb-3 border-b", !expanded && "px-2")}>
          {expanded && (
            <>
              {/* Portfolio Dropdown */}
              <Select value="digital-services">
                <SelectTrigger className="h-auto py-2 px-3 mb-3 bg-background border-border hover:bg-accent/50">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      DS
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">Digital Services</div>
                      <div className="text-xs text-muted-foreground">Portfolio</div>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-[100]">
                  <SelectItem value="digital-services">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center text-white text-xs font-semibold">
                        DS
                      </div>
                      <div>
                        <div className="text-sm font-medium">Digital Services</div>
                        <div className="text-xs text-muted-foreground">Portfolio</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

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
          {menuItems.map((item, index) => {
            if (!('id' in item)) return null;

            const Icon = item.icon;
            const active = isActive('path' in item ? item.path : undefined);

            return (
              <button
                key={item.id}
                onClick={() => 'path' in item && item.path && handleNavigation(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal transition-colors",
                  "hover:bg-accent/50",
                  active && "bg-accent text-primary font-medium",
                  !expanded && "justify-center px-2"
                )}
                title={!expanded ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                {expanded && <span className="truncate text-left flex-1">{item.label}</span>}
                {expanded && 'expandable' in item && item.expandable && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="border-t">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">Portfolios settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
