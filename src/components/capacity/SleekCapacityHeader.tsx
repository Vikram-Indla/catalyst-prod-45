/**
 * Sleek Capacity Header - Award-Winning Design V3.0
 * Consolidated 2-row layout with hero tabs, clickable stat filters, unified filter bar
 */

import { useState, useEffect } from 'react';
import { 
  Search, Download, Plus, Filter, ChevronDown, Clock, 
  LayoutGrid, Table2, CalendarDays, Grid3X3, 
  Presentation, Briefcase, Users, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CATALYST, getUtilizationColor } from '@/lib/catalyst-colors';
import { formatDistanceToNow } from 'date-fns';

export type PrimaryView = 'resources' | 'projects';
export type ResourceViewMode = 'cards' | 'table' | 'timeline' | 'heatmap';
export type ProjectViewMode = 'cards' | 'timeline';

interface SleekCapacityHeaderProps {
  summary: { 
    total: number; 
    available: number; 
    atCapacity: number; 
    over: number; 
    utilizationPercentage: number;
  };
  primaryView?: PrimaryView;
  resourceView?: ResourceViewMode;
  projectView?: ProjectViewMode;
  onPrimaryViewChange?: (view: PrimaryView) => void;
  onResourceViewChange?: (view: ResourceViewMode) => void;
  onProjectViewChange?: (view: ProjectViewMode) => void;
  viewMode?: 'cards' | 'table' | 'timeline';
  groupBy: string;
  timelinePeriod: 'weekly' | 'monthly' | 'quarterly';
  searchQuery: string;
  activeFilter?: 'all' | 'available' | 'atCapacity' | 'over';
  departmentFilter?: 'all' | 'delivery' | 'product' | 'support';
  onViewModeChange?: (mode: 'cards' | 'table' | 'timeline') => void;
  onGroupByChange: (groupBy: string) => void;
  onTimelinePeriodChange: (period: 'weekly' | 'monthly' | 'quarterly') => void;
  onSearchChange: (query: string) => void;
  onAddResource: () => void;
  onExport: () => void;
  onPresentationMode?: () => void;
  onFilterChange?: (filter: 'all' | 'available' | 'atCapacity' | 'over') => void;
  onDepartmentFilterChange?: (filter: 'all' | 'delivery' | 'product' | 'support') => void;
}

export function SleekCapacityHeader({
  summary,
  primaryView = 'resources',
  resourceView = 'cards',
  projectView = 'cards',
  onPrimaryViewChange,
  onResourceViewChange,
  onProjectViewChange,
  viewMode,
  groupBy,
  timelinePeriod,
  searchQuery,
  activeFilter = 'all',
  departmentFilter = 'delivery',
  onViewModeChange,
  onGroupByChange,
  onTimelinePeriodChange,
  onSearchChange,
  onAddResource,
  onExport,
  onPresentationMode,
  onFilterChange,
  onDepartmentFilterChange,
}: SleekCapacityHeaderProps) {
  const [lastRefresh] = useState(() => new Date());
  const [timeAgo, setTimeAgo] = useState('just now');
  
  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo(formatDistanceToNow(lastRefresh, { addSuffix: false }));
    };
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  // View tabs configuration
  const viewTabs = [
    { 
      id: 'resources', 
      label: 'Resources', 
      icon: Table2,
      isActive: primaryView === 'resources' && resourceView === 'table',
      onClick: () => {
        onPrimaryViewChange?.('resources');
        onResourceViewChange?.('table');
        onViewModeChange?.('table');
      }
    },
    { 
      id: 'projects', 
      label: 'Projects', 
      icon: Briefcase,
      isActive: primaryView === 'projects',
      onClick: () => {
        if (resourceView !== 'cards') {
          onResourceViewChange?.('cards');
          onViewModeChange?.('cards');
        }
        onPrimaryViewChange?.('projects');
      }
    },
    { 
      id: 'allocations', 
      label: 'Allocations', 
      icon: LayoutGrid,
      isActive: primaryView === 'resources' && resourceView === 'cards',
      onClick: () => {
        onPrimaryViewChange?.('resources');
        onResourceViewChange?.('cards');
        onViewModeChange?.('cards');
      }
    },
    { 
      id: 'gantt', 
      label: 'Gantt', 
      icon: CalendarDays,
      isActive: primaryView === 'resources' && resourceView === 'timeline',
      onClick: () => {
        onPrimaryViewChange?.('resources');
        onResourceViewChange?.('timeline');
        onViewModeChange?.('timeline');
      }
    },
    { 
      id: 'heatmap', 
      label: 'Heatmap', 
      icon: Grid3X3,
      isActive: primaryView === 'resources' && resourceView === 'heatmap',
      onClick: () => {
        onPrimaryViewChange?.('resources');
        onResourceViewChange?.('heatmap');
      }
    },
  ];

  const activeTabIndex = viewTabs.findIndex(t => t.isActive);

  return (
    <div className="bg-card border-b border-border">
      {/* ROW 1: Breadcrumb + Live Status + Actions */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-border/40">
        <div className="flex items-center gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Enterprise</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-semibold text-foreground">Capacity</span>
          </div>
          
          <div className="w-px h-4 bg-border" />
          
          {/* Live Status */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="relative flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Live</span>
            <span className="text-muted-foreground/40">•</span>
            <Clock className="w-3 h-3" />
            <span>{timeAgo} ago</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onExport}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button 
            onClick={onPresentationMode}
            variant="ghost" 
            size="sm"
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <Presentation className="h-3.5 w-3.5 mr-1.5" />
            Present
          </Button>
          <Button
            onClick={onAddResource}
            size="sm"
            className="h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Book Resource
          </Button>
        </div>
      </div>

      {/* ROW 2: Hero Tabs + Stats + Filters */}
      <div className="flex items-center justify-between px-5 py-2.5 gap-4">
        {/* Left: Search + Hero Tabs */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search resources..."
              className="w-52 h-9 pl-9 pr-3 text-sm bg-muted/50 border-transparent rounded-lg focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          {/* Hero Tab Strip - Award-winning segment control */}
          <div className="relative flex items-center bg-muted/60 rounded-xl p-1 gap-0.5">
            {/* Animated active indicator */}
            <div 
              className="absolute h-[calc(100%-8px)] bg-card rounded-lg shadow-sm border border-border/50 transition-all duration-300 ease-out"
              style={{
                width: `calc(${100 / viewTabs.length}% - 4px)`,
                left: `calc(${(activeTabIndex * 100) / viewTabs.length}% + 4px)`,
                top: '4px',
              }}
            />
            
            {viewTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={cn(
                    'relative z-10 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                    tab.isActive 
                      ? 'text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Interactive Stat Chips + Filters */}
        <div className="flex items-center gap-3">
          {/* Clickable Stat Chips - Act as filters */}
          <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg p-1">
            <StatChip 
              value={summary.total} 
              label="Total" 
              color="default"
              isActive={activeFilter === 'all'}
              onClick={() => onFilterChange?.('all')}
            />
            <StatChip 
              value={summary.available} 
              label="Avail" 
              color="emerald"
              isActive={activeFilter === 'available'}
              onClick={() => onFilterChange?.('available')}
            />
            <StatChip 
              value={summary.atCapacity} 
              label="Full" 
              color="blue"
              isActive={activeFilter === 'atCapacity'}
              onClick={() => onFilterChange?.('atCapacity')}
            />
            <StatChip 
              value={summary.over} 
              label="Over" 
              color="rose"
              isActive={activeFilter === 'over'}
              onClick={() => onFilterChange?.('over')}
              pulse={summary.over > 0}
            />
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-border/60" />

          {/* Unified Compact Filter Bar */}
          <div className="flex items-center gap-1.5">
            {/* Track Filter (replaces department) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "h-8 px-3 text-xs gap-1.5 border-border/60 bg-card hover:bg-muted transition-colors",
                    departmentFilter !== 'all' && "border-primary/40 bg-primary/5"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {departmentFilter === 'all' ? 'All Tracks' : 
                     departmentFilter === 'delivery' ? 'Delivery' :
                     departmentFilter === 'product' ? 'Product' : 'Support'}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-card border-border shadow-lg">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Filter by Track</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDepartmentFilterChange?.('all')}
                  className={cn(departmentFilter === 'all' && "bg-primary/10")}
                >
                  <Users className="w-3.5 h-3.5 mr-2" />
                  All Tracks
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDepartmentFilterChange?.('delivery')}
                  className={cn(departmentFilter === 'delivery' && "bg-primary/10")}
                >
                  <Briefcase className="w-3.5 h-3.5 mr-2" />
                  Delivery
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDepartmentFilterChange?.('product')}
                  className={cn(departmentFilter === 'product' && "bg-primary/10")}
                >
                  <LayoutGrid className="w-3.5 h-3.5 mr-2" />
                  Product
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDepartmentFilterChange?.('support')}
                  className={cn(departmentFilter === 'support' && "bg-primary/10")}
                >
                  <Users className="w-3.5 h-3.5 mr-2" />
                  Support
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Group By */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "h-8 px-3 text-xs gap-1.5 border-border/60 bg-card hover:bg-muted transition-colors",
                    groupBy !== 'none' && "border-primary/40 bg-primary/5"
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {groupBy === 'none' ? 'No Grouping' : 
                     groupBy === 'assignment' ? 'By Assignment' : 
                     groupBy === 'department' ? 'By Department' : groupBy}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-card border-border shadow-lg">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Group Resources</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onGroupByChange('none')}
                  className={cn(groupBy === 'none' && "bg-primary/10")}
                >
                  No Grouping
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onGroupByChange('assignment')}
                  className={cn(groupBy === 'assignment' && "bg-primary/10")}
                >
                  By Assignment
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onGroupByChange('department')}
                  className={cn(groupBy === 'department' && "bg-primary/10")}
                >
                  By Department
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Utilization Badge */}
          <UtilizationBadge value={summary.utilizationPercentage} />
        </div>
      </div>
    </div>
  );
}

// Clickable Stat Chip Component
interface StatChipProps {
  value: number;
  label: string;
  color: 'default' | 'emerald' | 'blue' | 'rose';
  isActive?: boolean;
  onClick?: () => void;
  pulse?: boolean;
}

function StatChip({ value, label, color, isActive, onClick, pulse }: StatChipProps) {
  const colorStyles = {
    default: {
      dot: 'bg-muted-foreground',
      activeBg: 'bg-muted',
      activeText: 'text-foreground',
    },
    emerald: {
      dot: 'bg-emerald-500',
      activeBg: 'bg-emerald-500/10',
      activeText: 'text-emerald-700 dark:text-emerald-400',
    },
    blue: {
      dot: 'bg-blue-500',
      activeBg: 'bg-blue-500/10',
      activeText: 'text-blue-700 dark:text-blue-400',
    },
    rose: {
      dot: 'bg-rose-500',
      activeBg: 'bg-rose-500/10',
      activeText: 'text-rose-700 dark:text-rose-400',
    },
  };
  
  const styles = colorStyles[color];
  const isZero = value === 0 && color === 'rose';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
        "hover:scale-105 active:scale-95",
        isActive 
          ? cn(styles.activeBg, styles.activeText, "shadow-sm ring-1 ring-inset ring-current/20")
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full flex-shrink-0',
        styles.dot,
        pulse && 'animate-pulse'
      )} />
      <span className={cn(
        "font-bold tabular-nums",
        isZero && "opacity-40"
      )}>
        {value}
      </span>
      <span className="opacity-70">{label}</span>
    </button>
  );
}

// Compact Utilization Badge
function UtilizationBadge({ value }: { value: number }) {
  const color = value > 100 
    ? 'text-rose-600 dark:text-rose-400' 
    : value > 90 
      ? 'text-amber-600 dark:text-amber-400' 
      : 'text-emerald-600 dark:text-emerald-400';
  
  const bgColor = value > 100 
    ? 'bg-rose-500' 
    : value > 90 
      ? 'bg-amber-500' 
      : 'bg-emerald-500';
  
  return (
    <div className="flex items-center gap-2 pl-3 pr-1 py-1 bg-muted/40 rounded-lg">
      <div className="flex flex-col items-end">
        <span className={cn("text-lg font-bold tabular-nums leading-none", color)}>
          {value}%
        </span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
          Util
        </span>
      </div>
      <div className="w-1.5 h-8 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("w-full rounded-full transition-all duration-500", bgColor)}
          style={{ height: `${Math.min(value, 100)}%`, marginTop: `${100 - Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
