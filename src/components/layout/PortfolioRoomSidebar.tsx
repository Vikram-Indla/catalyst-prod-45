import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  LayoutDashboard,
  Diamond,
  List,
  Map,
  GitBranch,
  Network,
  TrendingUp,
  Users as UsersIcon,
  MoreHorizontal,
  FileText,
  FolderTree
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
  { id: 'epics', label: 'Epics', icon: Diamond, path: '/backlog/epics' },
  { id: 'backlog', label: 'Backlog', icon: List, path: '/backlog/epics' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/enterprise/roadmaps' },
  { id: 'objective-tree', label: 'Objective tree', icon: GitBranch, path: '/enterprise/okr-tree' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/portfolio/:portfolioId/work-tree' },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp, path: '/portfolio/:portfolioId/forecast' },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/capacity' },
  { type: 'divider' },
  { id: 'more-items', label: 'More items', icon: MoreHorizontal, expandable: true },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/reports-discovery' },
  { id: 'more-pages', label: 'More pages', icon: FolderTree, expandable: true },
  { type: 'divider' },
  { id: 'programs', label: 'Programs', icon: UsersIcon, path: '/portfolio/:portfolioId/programs' },
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

              {/* Program Increment Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Program Increment
                </label>
                <Select value={selectedPI || undefined} onValueChange={onPIChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select PI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">Selected</SelectLabel>
                      <SelectItem value="pi-5">PI-5 (Dec 2024 – Feb 2025)</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">In Progress</SelectLabel>
                      <SelectItem value="pi-6">PI-6 (Mar 2025 – May 2025)</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">Planning</SelectLabel>
                      <SelectItem value="pi-7">PI-7 (Jun 2025 – Aug 2025)</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">Done</SelectLabel>
                      <SelectItem value="pi-4">PI-4 (Sep 2024 – Nov 2024)</SelectItem>
                      <SelectItem value="pi-3">PI-3 (Jun 2024 – Aug 2024)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center text-white text-xs font-semibold">
                DS
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="space-y-0.5 px-2">
            {menuItems.map((item, index) => {
              if ('type' in item && item.type === 'divider') {
                return <div key={`divider-${index}`} className="my-2 border-t" />;
              }

              if (!('id' in item)) return null;

              const Icon = item.icon;
              const active = isActive('path' in item ? item.path : undefined);

              return (
                <button
                  key={item.id}
                  onClick={() => 'path' in item && item.path && handleNavigation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-accent",
                    active && "bg-accent/50 border-l-2 border-primary font-medium",
                    !expanded && "justify-center px-2"
                  )}
                  title={!expanded ? item.label : undefined}
                >
                  {Icon && <Icon className="h-[18px] w-[18px] flex-shrink-0" />}
                  {expanded && <span className="truncate">{item.label}</span>}
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
          <div className="p-3 border-t">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent">
              <Settings className="h-[18px] w-[18px]" />
              <span>Portfolio settings</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
