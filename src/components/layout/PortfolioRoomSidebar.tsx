import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
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
  Target,
  Zap,
  Presentation,
  Package,
  Lightbulb,
  ArrowLeft,
  Square,
  Diamond,
  Bookmark,
  Link as LinkIcon,
  AlertTriangle,
  Calendar,
  Truck
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

interface PortfolioRoomSidebarProps {
  portfolioId: string;
  expanded: boolean;
  onToggle: () => void;
  selectedPI: string | null;
  onPIChange: (pi: string | null) => void;
}

type MenuItem = 
  | { id: string; label: string; icon: any; path: string; badge?: string }
  | { id: string; label: string; icon: any; expandable: true; items?: MenuItem[] };

// Program menu items (screenshot 3)
const programMenuItems: MenuItem[] = [
  { id: 'program-room', label: 'Program Room', icon: LayoutDashboard, path: '/program-room' },
  { id: 'features', label: 'Features', icon: Zap, path: '/features' },
  { id: 'backlog', label: 'Backlog', icon: List, path: '/backlog/epics' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/enterprise/roadmaps' },
  { id: 'objective-tree', label: 'Objective tree', icon: Target, path: '/enterprise/okr-tree' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/work-tree' },
  { id: 'program-board', label: 'Program board', icon: Presentation, path: '/program-board' },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp, path: '/forecast' },
  { id: 'capacity', label: 'Capacity', icon: UsersIcon, path: '/capacity', badge: 'NEW' },
  { 
    id: 'more-items', 
    label: 'More items', 
    icon: MoreHorizontal, 
    expandable: true,
    items: [
      { id: 'themes', label: 'Themes', icon: Square, path: '/themes' },
      { id: 'epics', label: 'Epics', icon: Diamond, path: '/epics' },
      { id: 'capabilities', label: 'Capabilities', icon: Package, path: '/capabilities' },
      { id: 'stories', label: 'Stories', icon: Bookmark, path: '/stories' },
      { id: 'dependencies', label: 'Dependencies', icon: LinkIcon, path: '/dependencies' },
      { id: 'work-item-links', label: 'Work Item Links', icon: LinkIcon, path: '/work-item-links' },
      { id: 'risks', label: 'Risks', icon: AlertTriangle, path: '/risks' },
      { id: 'program-objectives', label: 'Program Objectives', icon: Target, path: '/program-objectives' },
      { id: 'program-increments', label: 'Program Increments', icon: Calendar, path: '/program-increments' },
      { id: 'release-vehicles', label: 'Release Vehicles', icon: Truck, path: '/release-vehicles' },
    ]
  },
  { id: 'reports', label: 'Reports', icon: FileText, expandable: true },
  { id: 'more-pages', label: 'More pages', icon: FolderTree, expandable: true },
];

// Product menu items (screenshot 2)
const productMenuItems: MenuItem[] = [
  { id: 'product-room', label: 'Product Room (Labs)', icon: LayoutDashboard, path: '/product-room' },
  { id: 'features', label: 'Features', icon: Zap, path: '/features' },
  { id: 'backlog', label: 'Backlog', icon: List, path: '/backlog/epics' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, path: '/enterprise/roadmaps' },
  { id: 'work-tree', label: 'Work tree', icon: Network, path: '/work-tree' },
  { id: 'products', label: 'Products', icon: Package, path: '/products' },
  { id: 'strategy', label: 'Strategy', icon: Target, expandable: true },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, expandable: true },
  { id: 'reports', label: 'Reports', icon: FileText, expandable: true },
  { id: 'child-products', label: 'Child Products', icon: GitBranch, expandable: true },
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
  const { currentRoom } = useNavigation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Get menu items based on current room
  const getMenuItems = () => {
    if (currentRoom === 'program') return programMenuItems;
    if (currentRoom === 'product') return productMenuItems;
    return programMenuItems; // default
  };

  const menuItems = getMenuItems();

  const handleNavigation = (path: string) => {
    navigate(path + (selectedPI ? `?pi=${selectedPI}` : ''));
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const handleExpandableClick = (itemId: string, items?: MenuItem[]) => {
    if (items && items.length > 0) {
      // Open sub-menu for More items
      setExpandedSection(itemId);
    } else {
      // Toggle other expandable sections
      setExpandedSection(expandedSection === itemId ? null : itemId);
    }
  };

  const renderMenuItem = (item: MenuItem, isSubItem = false) => {
    if ('expandable' in item && item.expandable) {
      const Icon = item.icon;

      return (
        <button
          key={item.id}
          onClick={() => handleExpandableClick(item.id, 'items' in item ? item.items : undefined)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal transition-colors hover:bg-accent/50",
            !expanded && "justify-center px-2"
          )}
          title={!expanded ? item.label : undefined}
        >
          <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          {expanded && <span className="truncate text-left flex-1">{item.label}</span>}
          {expanded && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
      );
    }

    // Type narrowing: at this point, item must have a path property
    if (!('path' in item)) return null;
    
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.path)}
        className={cn(
          "w-full flex items-center gap-3 py-2.5 text-sm font-normal transition-colors hover:bg-accent/50",
          active && "bg-accent text-primary font-medium",
          !expanded && "justify-center px-2",
          expanded && (isSubItem ? "px-6" : "px-4")
        )}
        title={!expanded ? item.label : undefined}
      >
        <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        {expanded && (
          <>
            <span className="truncate text-left flex-1">{item.label}</span>
            {'badge' in item && item.badge && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-blue-500 text-white">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </button>
    );
  };

  // Show sub-menu when More items is expanded
  if (expandedSection === 'more-items' && expanded) {
    const moreItemsSection = menuItems.find(item => item.id === 'more-items');
    const subItems = 'items' in moreItemsSection! ? moreItemsSection.items || [] : [];

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
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="h-full flex flex-col overflow-hidden">
          {/* Back button */}
          <button
            onClick={() => setExpandedSection(null)}
            className="w-full flex items-center gap-3 px-4 py-4 text-sm font-normal hover:bg-accent/50 border-b"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Back to previous menu</span>
          </button>

          {/* More Items Header */}
          <div className="px-4 py-3">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              MORE ITEMS
            </div>
          </div>

          {/* Sub-menu items */}
          <nav className="flex-1 overflow-y-auto">
            {subItems.map(item => renderMenuItem(item, true))}
          </nav>

          {/* Footer */}
          <div className="border-t">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">
                {currentRoom === 'program' ? 'Programs settings' : 'Products settings'}
              </span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Main menu
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
        {/* Context Header */}
        <div className={cn("px-4 pt-4 pb-3 border-b", !expanded && "px-2")}>
          {expanded && (
            <>
              {/* Portfolio/Program/Product Dropdown */}
              <Select value={currentRoom === 'program' ? 'mobile' : 'check-scanning-app'}>
                <SelectTrigger className="h-auto py-2 px-3 mb-3 bg-background border-border hover:bg-accent/50">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {currentRoom === 'program' ? 'M' : 'CS'}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {currentRoom === 'program' ? 'Mobile' : 'Check Scanning App'}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">{currentRoom}</div>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[100]">
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center text-white text-xs font-semibold">
                        M
                      </div>
                      <div>
                        <div className="text-sm font-medium">Mobile</div>
                        <div className="text-xs text-muted-foreground">Program</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="check-scanning-app">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                        CS
                      </div>
                      <div>
                        <div className="text-sm font-medium">Check Scanning App</div>
                        <div className="text-xs text-muted-foreground">Product</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Program Increment Filter (only for Program context) */}
              {currentRoom === 'program' && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 block tracking-wider">
                    PROGRAM INCREMENT
                  </label>
                  <Select value={selectedPI || undefined} onValueChange={onPIChange}>
                    <SelectTrigger className="h-9 text-sm w-full bg-background border-border">
                      <SelectValue placeholder="Select PI" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-[100]">
                      <SelectItem value="pi-5">PI-5</SelectItem>
                      <SelectItem value="pi-6">PI-6</SelectItem>
                      <SelectItem value="pi-7">PI-7</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Time selector (only for Product context) */}
              {currentRoom === 'product' && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 block tracking-wider">
                    PROGRAM INCREMENT
                  </label>
                  <Select value="all-time">
                    <SelectTrigger className="h-9 text-sm w-full bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-[100]">
                      <SelectItem value="all-time">All time</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="last-pi">Last PI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-1">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="border-t">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-normal hover:bg-accent/50 transition-colors">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-left">
                {currentRoom === 'program' ? 'Programs settings' : 'Products settings'}
              </span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
