/**
 * Sleek Capacity Header - Award-Winning Design V3.0
 * Consolidated 2-row layout with hero tabs, clickable stat filters, unified filter bar
 */

import { useState, useEffect } from 'react';
import { 
  Search, Download, Plus, Filter, ChevronDown, Clock, 
  LayoutGrid, Table2, CalendarDays, Grid3X3, 
  Presentation, Briefcase, Users, Layers, FileText, Calendar,
  ChevronLeft, ChevronRight, BarChart3, RefreshCw, Wallet
} from 'lucide-react';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
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
import { useCapacityDepartments } from '@/modules/capacity-planner/hooks/useCapacityDepartments';

export type PrimaryView = 'resources' | 'projects' | 'contracts';
export type ResourceViewMode = 'cards' | 'table' | 'timeline' | 'heatmap';
export type ProjectViewMode = 'cards' | 'timeline';

type PeriodType = 'weekly' | 'monthly';
interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

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
  departmentFilter?: string;
  onViewModeChange?: (mode: 'cards' | 'table' | 'timeline') => void;
  onGroupByChange: (groupBy: string) => void;
  onTimelinePeriodChange: (period: 'weekly' | 'monthly' | 'quarterly') => void;
  onSearchChange: (query: string) => void;
  onAddResource: () => void;
  onExport: () => void;
  onPresentationMode?: () => void;
  onFilterChange?: (filter: 'all' | 'available' | 'atCapacity' | 'over') => void;
  onDepartmentFilterChange?: (filter: string) => void;
  // Project period navigation
  projectPeriodType?: PeriodType;
  projectPeriodRange?: PeriodRange;
  onProjectPeriodTypeChange?: (type: PeriodType) => void;
  onProjectPeriodNavigate?: (direction: 1 | -1) => void;
  // Hard refresh
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // Budget Executive Summary
  onExecutiveSummary?: () => void;
  // Book Assignment CTA
  onBookAssignment?: () => void;
}

// Dynamic Track Filter Component
function TrackFilterDropdown({ 
  departmentFilter, 
  onDepartmentFilterChange 
}: { 
  departmentFilter?: string; 
  onDepartmentFilterChange?: (filter: string) => void;
}) {
  const { departments, isLoading } = useCapacityDepartments();
  
  const currentDeptName = departmentFilter === 'all' 
    ? 'All Departments' 
    : departments.find(d => d.name.toLowerCase() === departmentFilter?.toLowerCase())?.name || departmentFilter;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-9 px-4 text-sm gap-2 rounded-lg transition-colors",
            "bg-card dark:bg-[var(--surface-3)] border-border dark:border-[var(--border-default)] text-foreground dark:text-[var(--text-primary)]",
            "hover:bg-muted dark:hover:bg-[var(--surface-elevated)]",
            departmentFilter !== 'all' && "border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="font-medium">
            {currentDeptName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground dark:text-[var(--text-secondary)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card border-border shadow-lg">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Filter by Track</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onDepartmentFilterChange?.('all')}
          className={cn(departmentFilter === 'all' && "bg-primary/10")}
        >
          <Users className="w-4 h-4 mr-2" />
          All Departments
        </DropdownMenuItem>
        {!isLoading && departments.map((dept) => (
          <DropdownMenuItem 
            key={dept.id}
            onClick={() => onDepartmentFilterChange?.(dept.name.toLowerCase())}
            className={cn(departmentFilter?.toLowerCase() === dept.name.toLowerCase() && "bg-primary/10")}
          >
            <Briefcase className="w-4 h-4 mr-2" />
            {dept.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  projectPeriodType = 'weekly',
  projectPeriodRange,
  onProjectPeriodTypeChange,
  onProjectPeriodNavigate,
  onRefresh,
  isRefreshing = false,
  onExecutiveSummary,
  onBookAssignment,
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
      id: 'utilization', 
      label: 'Utilization', 
      icon: BarChart3,
      isActive: primaryView === 'resources' && resourceView === 'heatmap',
      onClick: () => {
        onPrimaryViewChange?.('resources');
        onResourceViewChange?.('heatmap');
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
      id: 'contracts', 
      label: 'Contracts', 
      icon: FileText,
      isActive: primaryView === 'contracts',
      onClick: () => {
        onPrimaryViewChange?.('contracts');
      }
    },
  ];

  const activeTabIndex = viewTabs.findIndex(t => t.isActive);

  // Get current tab name for breadcrumb
  const getActiveTabName = () => {
    if (primaryView === 'contracts') return 'Contracts';
    if (primaryView === 'projects') return 'Projects';
    if (resourceView === 'heatmap') return 'Utilization';
    if (resourceView === 'timeline') return 'Gantt';
    return 'Resources';
  };

  return (
    <div>
      {/* Header — matches Risk Register pattern */}
      <CommandCenterHeader
        title="Capacity Planner"
        subtitle={`Resource allocation & utilization — ${summary.total} resources, ${summary.utilizationPercentage}% utilized`}
      />

      {/* Floating strip: Tabs + Search */}
      <div className="px-6 pt-3 pb-1" style={{ backgroundColor: 'hsl(var(--muted))' }}>
        <div className="flex items-center justify-between px-5 py-3 bg-card border border-border rounded-xl shadow-sm">
          {/* Hero Tab Strip */}
          <nav className="flex items-center gap-1 bg-muted rounded-xl p-1.5 border border-border">
            {viewTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap',
                    tab.isActive 
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={primaryView === 'projects' ? "Search projects..." : "Search resources..."}
              className="w-56 h-10 pl-10 pr-3 text-sm rounded-xl bg-muted border-border focus:bg-card transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Projects: Period Navigator */}
      {primaryView === 'projects' && projectPeriodRange && (
      <div className="flex items-center px-6 py-2.5" style={{ backgroundColor: 'hsl(var(--muted))' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button
              onClick={() => onProjectPeriodTypeChange?.('weekly')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                projectPeriodType === 'weekly'
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Weekly
            </button>
            <button
              onClick={() => onProjectPeriodTypeChange?.('monthly')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                projectPeriodType === 'monthly'
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              Monthly
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
              onClick={() => onProjectPeriodNavigate?.(-1)}
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[160px] text-center">
              <span className="text-sm font-medium text-foreground">
                {projectPeriodRange.label}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
              onClick={() => onProjectPeriodNavigate?.(1)}
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// Clickable Stat Chip Component - Catalyst V1 Style Guide
interface StatChipProps {
  value: number;
  label: string;
  color: 'default' | 'emerald' | 'blue' | 'rose';
  isActive?: boolean;
  onClick?: () => void;
  pulse?: boolean;
}

function StatChip({ value, label, color, isActive, onClick, pulse }: StatChipProps) {
  // Catalyst V1 Style Guide colors
  const colorStyles = {
    default: {
      dot: 'bg-[var(--ds-text-subtle,var(--ds-text-subtle, #334155))]',
      activeBg: 'bg-white dark:bg-[var(--surface-3)]',
      activeText: 'text-[var(--ds-text,var(--ds-text, #0f172a))] dark:text-[var(--text-primary)]',
      inactiveText: 'text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] dark:text-[var(--text-secondary)]',
    },
    emerald: {
      dot: 'bg-[#059669]',
      activeBg: 'bg-[#ecfdf5] dark:bg-emerald-900/50',
      activeText: 'text-[#059669] dark:text-emerald-300',
      inactiveText: 'text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] dark:text-[var(--text-secondary)]',
    },
    blue: {
      dot: 'bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]',
      activeBg: 'bg-[var(--ds-background-selected,var(--ds-background-selected, #eff6ff))] dark:bg-blue-900/50',
      activeText: 'text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] dark:text-blue-300',
      inactiveText: 'text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] dark:text-[var(--text-secondary)]',
    },
    rose: {
      dot: 'bg-[var(--ds-text-danger,var(--ds-text-danger, #dc2626))]',
      activeBg: 'bg-[var(--ds-background-danger,var(--ds-background-danger, #fef2f2))] dark:bg-rose-900/50',
      activeText: 'text-[var(--ds-text-danger,var(--ds-text-danger, #dc2626))] dark:text-rose-300',
      inactiveText: 'text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] dark:text-[var(--text-secondary)]',
    },
  };
  
  const styles = colorStyles[color];
  const isZero = value === 0 && color === 'rose';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        isActive 
          ? cn(styles.activeBg, styles.activeText, "shadow-sm border border-current/20")
          : cn(styles.inactiveText, "hover:bg-white/50 dark:hover:bg-[var(--surface-3)]")
      )}
    >
      <span className={cn(
        'w-2.5 h-2.5 rounded-full flex-shrink-0',
        styles.dot,
        pulse && 'animate-pulse'
      )} />
      <span className={cn(
        "font-bold tabular-nums text-base",
        isZero && "text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] dark:text-[var(--text-secondary)]"
      )}>
        {value}
      </span>
      <span className="font-normal">{label}</span>
    </button>
  );
}

// Compact Utilization Badge - Catalyst V1 Style Guide
function UtilizationBadge({ value }: { value: number }) {
  const bgColor = value > 100 
    ? 'bg-[var(--ds-text-danger,var(--ds-text-danger, #dc2626))]' 
    : value > 90 
      ? 'bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]' 
      : 'bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]';
  
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border" style={{
      background: 'rgba(37, 99, 235, 0.12)',
      borderColor: 'rgba(37, 99, 235, 0.3)',
    }}>
      <div className="flex flex-col items-end">
        <span className="text-xl font-extrabold tabular-nums leading-none" style={{ color: '#1e40af' }}>
          {value}%
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--fg-2)' }}>
          Utilization
        </span>
      </div>
      <div className="w-1 h-7 rounded-sm overflow-hidden" style={{ background: 'rgba(37,99,235,0.25)' }}>
        <div 
          className={cn("w-full rounded-sm transition-all duration-500", bgColor)}
          style={{ height: `${Math.min(value, 100)}%`, marginTop: `${100 - Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
