import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Zap,
  List,
  Map,
  GitBranch,
  Network,
  LayoutGrid,
  TrendingUp,
  Users as UsersIcon,
  MoreHorizontal,
  FileText,
  FolderTree,
  Layers,
  Diamond,
  Box,
  BookOpen,
  GitMerge,
  Link as LinkIcon,
  AlertTriangle,
  Target,
  Calendar,
  Truck,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ProgramRoomSidebarProps {
  programId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedPI: string | null;
  onPIChange: (pi: string | null) => void;
}

type MenuItem =
  | { id: string; label: string; icon: any; path: string; badge?: string; expandable?: never }
  | { id: string; label: string; icon: any; expandable: true; path?: never; badge?: never };

const menuItems: MenuItem[] = [
  { id: 'features', label: 'Features', icon: Zap, path: '/program/features' },
  { id: 'backlog', label: 'Backlog', icon: List, path: '/backlog/epics' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/enterprise/roadmaps' },
  { id: 'objective-tree', label: 'Objective tree', icon: GitBranch, path: '/enterprise/okr-tree' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/value-stream' },
  { id: 'program-board', label: 'Program board', icon: LayoutGrid, path: '/program-board' },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp, path: '/forecast' },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/capacity', badge: 'NEW' },
  { id: 'more-items', label: 'More items', icon: MoreHorizontal, expandable: true },
  { id: 'reports', label: 'Reports', icon: FileText, expandable: true },
  { id: 'more-pages', label: 'More pages', icon: FolderTree, expandable: true },
];

// More Items submenu
const moreItemsSubMenu = [
  { id: 'themes', label: 'Themes', icon: Layers, path: '/program/themes' },
  { id: 'epics', label: 'Epics', icon: Diamond, path: '/program/epics' },
  { id: 'capabilities', label: 'Capabilities', icon: Box, path: '/program/capabilities' },
  { id: 'stories', label: 'Stories', icon: BookOpen, path: '/program/stories' },
  { id: 'dependencies', label: 'Dependencies', icon: GitMerge, path: '/dependencies' },
  { id: 'work-item-links', label: 'Work Item Links', icon: LinkIcon, path: '/program/work-item-links' },
  { id: 'risks', label: 'Risks', icon: AlertTriangle, path: '/program/risks' },
  { id: 'program-objectives', label: 'Program Objectives', icon: Target, path: '/program/objectives' },
  { id: 'program-increments', label: 'Program Increments', icon: Calendar, path: '/program-increments' },
  { id: 'release-vehicles', label: 'Release Vehicles', icon: Truck, path: '/program/release-vehicles' },
];

export function ProgramRoomSidebar({
  programId,
  expanded,
  onToggle,
  selectedPI,
  onPIChange,
}: ProgramRoomSidebarProps) {
  const [moreItemsExpanded, setMoreItemsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path + (selectedPI ? `?pi=${selectedPI}` : ''));
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path);
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
        {/* Program Context Header */}
        <div className={cn("px-4 pt-4 pb-3 border-b", !expanded && "px-2")}>
          {expanded && (
            <>
              {/* Program Dropdown */}
              <Select value="mobile">
                <SelectTrigger className="h-auto py-2 px-3 mb-3 bg-background border-border hover:bg-accent/50">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      MB
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">Mobile</div>
                      <div className="text-xs text-muted-foreground">Program</div>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-[100]">
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                        MB
                      </div>
                      <div>
                        <div className="text-sm font-medium">Mobile</div>
                        <div className="text-xs text-muted-foreground">Program</div>
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
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive('path' in item ? item.path : undefined);
            const isMoreItems = item.id === 'more-items';

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (isMoreItems) {
                      setMoreItemsExpanded(!moreItemsExpanded);
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
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {item.badge}
                        </Badge>
                      )}
                      {'expandable' in item && item.expandable && (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            moreItemsExpanded && "rotate-180"
                          )}
                        />
                      )}
                    </>
                  )}
                </button>

                {/* More items submenu */}
                {isMoreItems && moreItemsExpanded && expanded && (
                  <div className="bg-muted/30 border-l-2 border-primary/20 ml-4">
                    <button
                      onClick={() => setMoreItemsExpanded(false)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span>Back to previous menu</span>
                    </button>
                    <div className="pt-2">
                      <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        MORE ITEMS
                      </div>
                      {moreItemsSubMenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => handleNavigation(subItem.path)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2 text-sm font-normal transition-colors",
                              "hover:bg-accent/50",
                              isActive(subItem.path) && "bg-accent text-primary font-medium"
                            )}
                          >
                            <SubIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate text-left">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
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
