/**
 * Sleek Capacity Header - CIO Executive Cockpit V2.1
 * Max height: 120px | Inline metrics | Live status | Primary/Secondary View Toggles
 */

import { useState, useEffect } from 'react';
import { Search, Download, Plus, Filter, ChevronDown, Clock, LayoutGrid, Table2, CalendarDays, FileStack, AlertTriangle, Users, Presentation, Briefcase, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  // V2.1 Primary/Secondary view architecture
  primaryView?: PrimaryView;
  resourceView?: ResourceViewMode;
  projectView?: ProjectViewMode;
  onPrimaryViewChange?: (view: PrimaryView) => void;
  onResourceViewChange?: (view: ResourceViewMode) => void;
  onProjectViewChange?: (view: ProjectViewMode) => void;
  // Legacy props for backward compatibility
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
  const utilizationColor = getUtilizationColor(summary.utilizationPercentage);
  const overPct = summary.total > 0 ? Math.round((summary.over / summary.total) * 100) : 0;
  
  // Track last refresh time for dynamic "X ago" display
  const [lastRefresh] = useState(() => new Date());
  const [timeAgo, setTimeAgo] = useState('just now');
  
  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo(formatDistanceToNow(lastRefresh, { addSuffix: false }));
    };
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [lastRefresh]);

  return (
    <div className="bg-card border-b border-border">
      {/* ROW 1: Breadcrumb + Live Status + Actions — Height: 40px */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          {/* Breadcrumb - Match Strategic Backlog typography */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Enterprise</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-sm font-semibold text-foreground">Capacity</span>
          </div>
          
          {/* Separator */}
          <div className="w-px h-4 bg-border" />
          
          {/* Live Status */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="relative flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span className="absolute w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
            </div>
            <span className="font-medium">Live</span>
            <span className="text-muted-foreground/50">•</span>
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
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
          <Button 
            onClick={onPresentationMode}
            variant="ghost" 
            size="sm"
            className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Presentation Mode"
          >
            <Presentation className="h-3.5 w-3.5 mr-1" />
            Present
          </Button>
          <Button
            onClick={onAddResource}
            size="sm"
            className="h-7 px-3 text-xs bg-[#0d9488] hover:bg-[#0f766e] text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Book Resource
          </Button>
        </div>
      </div>

      {/* ROW 2: Inline Metrics + Utilization — Height: 44px */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-6">
          {/* Inline Metrics - Descriptive labels */}
          <InlineMetric value={summary.total} label="Total" color="slate" />
          <div className="w-px h-6 bg-border" />
          <InlineMetric value={summary.available} label="Available" color="teal" />
          <InlineMetric value={summary.atCapacity} label="At Capacity" color="blue" />
          <InlineMetric 
            value={summary.over} 
            label="Over-Allocated" 
            color="red" 
            pct={overPct} 
            alert={summary.over > 0} 
          />
        </div>

        {/* Utilization Gauge */}
        <UtilizationGauge value={summary.utilizationPercentage} />
      </div>

      {/* ROW 3: Search + Views + Filters — Height: 36px */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-44 h-7 pl-8 pr-3 text-xs bg-background border-border rounded-md focus:ring-1 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* V2.1: Primary View Toggle - Resources vs Projects */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => onPrimaryViewChange?.('resources')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
                primaryView === 'resources'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Resources
            </button>
            <button
              onClick={() => onPrimaryViewChange?.('projects')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
                primaryView === 'projects'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Projects
            </button>
          </div>

          {/* V2.1: Secondary View Toggle - Changes based on primary view */}
          {primaryView === 'resources' ? (
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              {(['cards', 'table', 'timeline', 'heatmap'] as ResourceViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    onResourceViewChange?.(mode);
                    // Also update legacy viewMode for backward compatibility
                    if (mode !== 'heatmap') {
                      onViewModeChange?.(mode as 'cards' | 'table' | 'timeline');
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1',
                    resourceView === mode
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  )}
                >
                  <ViewIcon mode={mode} />
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              {(['cards', 'timeline'] as ProjectViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onProjectViewChange?.(mode)}
                  className={cn(
                    'px-2.5 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1',
                    projectView === mode
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  )}
                >
                  <ViewIcon mode={mode} />
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Timeline Period - Only in timeline view */}
          {(resourceView === 'timeline' || (primaryView === 'projects' && projectView === 'timeline')) && (
            <div className="flex items-center bg-muted rounded-md p-0.5">
              {(['weekly', 'monthly', 'quarterly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => onTimelinePeriodChange(p)}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded transition-all',
                    timelinePeriod === p
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Critical Alert Pill */}
          {summary.over > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-full border border-amber-200">
              <AlertTriangle className="w-3 h-3" />
              Critical {summary.over}
            </span>
          )}
        </div>

        {/* Right Controls - FIX #3: Filters button fully visible */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Department Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-3 text-xs text-foreground bg-card border-border whitespace-nowrap">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                {departmentFilter === 'all' ? 'All Depts' : 
                 departmentFilter === 'delivery' ? 'Delivery Only' :
                 departmentFilter === 'product' ? 'Product Only' : 'Support Only'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onDepartmentFilterChange?.('delivery')}>Delivery Only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDepartmentFilterChange?.('product')}>Product Only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDepartmentFilterChange?.('support')}>Support Only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDepartmentFilterChange?.('all')}>All Departments</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                Group: {groupBy === 'none' ? 'None' : groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onGroupByChange('assignment')}>Assignment</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGroupByChange('department')}>Department</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGroupByChange('none')}>None</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// FIX #1: Stats with visual weight - bold numbers, colored dots (DARK MODE)
function InlineMetric({ value, label, color, pct, alert }: { 
  value: number; 
  label: string; 
  color: 'slate' | 'teal' | 'blue' | 'red'; 
  pct?: number; 
  alert?: boolean 
}) {
  const colors = {
    slate: { text: 'text-foreground', dot: 'bg-muted-foreground' },
    teal: { text: 'text-teal-600 dark:text-teal-400', dot: 'bg-teal-500' },      // #0d9488 - Available
    blue: { text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-600' },      // #2563eb - At Capacity
    red: { text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },          // #ef4444 - Over-Allocated
  };
  const c = colors[color];
  
  // Grey out the number when value is 0 for "Over"
  const numberColor = (color === 'red' && value === 0) ? 'text-muted-foreground' : c.text;
  
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full', c.dot, alert && 'animate-pulse')} />
      <span className={cn('text-lg font-bold tabular-nums', numberColor)}>{value}</span>
      {pct !== undefined && pct > 0 && (
        <span className="text-xs text-red-500 dark:text-red-400 font-medium">({pct}%)</span>
      )}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// FIX #11: Utilization properly aligned with number prominent (DARK MODE)
function UtilizationGauge({ value }: { value: number }) {
  const color = value > 100 ? CATALYST.bronze.primary : value > 90 ? CATALYST.blue.primary : CATALYST.teal.primary;
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end">
        <span 
          className="text-2xl font-bold tabular-nums leading-tight"
          style={{ color }}
        >
          {value}%
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Utilization</span>
      </div>
      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ViewIcon({ mode }: { mode: string }) {
  const cls = 'w-3 h-3';
  if (mode === 'cards') return <LayoutGrid className={cls} />;
  if (mode === 'table') return <Table2 className={cls} />;
  if (mode === 'timeline') return <CalendarDays className={cls} />;
  if (mode === 'heatmap') return <Grid3X3 className={cls} />;
  if (mode === 'scenarios') return <FileStack className={cls} />;
  return null;
}
