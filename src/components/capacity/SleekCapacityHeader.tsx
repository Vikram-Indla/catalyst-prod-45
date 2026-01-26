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
    <div className="bg-card border-b border-border">
      {/* ROW 1: Title + Live Badge (inline) | Primary CTA only */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-border/40">
        {/* Left: Title + Live Badge Inline */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            {/* Breadcrumb - Shows active tab */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Enterprise / Capacity</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500">{getActiveTabName()}</span>
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[var(--text-primary)] tracking-tight">
              Capacity Planner
            </h1>
          </div>
          
          {/* Live Badge - Inline with title */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
            <span className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </span>
            <span className="text-xs font-semibold text-emerald-700">Live</span>
          </div>
        </div>

        {/* Right: Reserved for future actions */}
        <div className="flex items-center gap-3">
        </div>
      </div>

      {/* ROW 2: Search + Hero Tabs (No Q1/H1/Full toggle) */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={primaryView === 'projects' ? "Search projects..." : "Search resources..."}
            className="w-56 h-10 pl-10 pr-3 text-sm bg-slate-100 border-slate-200 rounded-xl focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Hero Tab Strip - Right Aligned */}
        <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1.5 border border-slate-200">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={tab.onClick}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150',
                  tab.isActive 
                    ? 'bg-[#2563eb] text-white shadow-md'
                    : 'text-slate-700 hover:bg-white hover:shadow-sm hover:text-slate-900'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ROW 3: Stats + Filters - REMOVED per user request */}

      {/* ROW 3 for Projects: Period Navigator */}
      {primaryView === 'projects' && projectPeriodRange && (
      <div className="flex items-center px-5 py-2.5 bg-muted/50 dark:bg-[var(--surface-2)] border-b border-border/30 dark:border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          {/* Period Type Toggle */}
          <div className="flex items-center bg-muted/80 dark:bg-[var(--surface-3)] rounded-lg p-0.5 border border-border dark:border-[var(--border-default)]">
            <button
              onClick={() => onProjectPeriodTypeChange?.('weekly')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                projectPeriodType === 'weekly'
                  ? "bg-card dark:bg-[var(--surface-elevated)] text-foreground dark:text-[var(--text-primary)] shadow-sm"
                  : "text-muted-foreground dark:text-[var(--text-secondary)] hover:text-foreground dark:hover:text-[var(--text-primary)]"
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
                  ? "bg-card dark:bg-[var(--surface-elevated)] text-foreground dark:text-[var(--text-primary)] shadow-sm"
                  : "text-muted-foreground dark:text-[var(--text-secondary)] hover:text-foreground dark:hover:text-[var(--text-primary)]"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              Monthly
            </button>
          </div>

          {/* Period Navigation */}
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
              <span className="text-sm font-medium text-foreground dark:text-[var(--text-primary)]">
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
      dot: 'bg-[#334155]',
      activeBg: 'bg-white dark:bg-[var(--surface-3)]',
      activeText: 'text-[#0f172a] dark:text-[var(--text-primary)]',
      inactiveText: 'text-[#475569] dark:text-[var(--text-secondary)]',
    },
    emerald: {
      dot: 'bg-[#059669]',
      activeBg: 'bg-[#ecfdf5] dark:bg-emerald-900/50',
      activeText: 'text-[#059669] dark:text-emerald-300',
      inactiveText: 'text-[#475569] dark:text-[var(--text-secondary)]',
    },
    blue: {
      dot: 'bg-[#2563eb]',
      activeBg: 'bg-[#eff6ff] dark:bg-blue-900/50',
      activeText: 'text-[#2563eb] dark:text-blue-300',
      inactiveText: 'text-[#475569] dark:text-[var(--text-secondary)]',
    },
    rose: {
      dot: 'bg-[#dc2626]',
      activeBg: 'bg-[#fef2f2] dark:bg-rose-900/50',
      activeText: 'text-[#dc2626] dark:text-rose-300',
      inactiveText: 'text-[#475569] dark:text-[var(--text-secondary)]',
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
        isZero && "text-[#475569] dark:text-[var(--text-secondary)]"
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
    ? 'bg-[#dc2626]' 
    : value > 90 
      ? 'bg-[#2563eb]' 
      : 'bg-[#2563eb]';
  
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border" style={{
      background: 'rgba(37, 99, 235, 0.12)',
      borderColor: 'rgba(37, 99, 235, 0.3)',
    }}>
      <div className="flex flex-col items-end">
        <span className="text-xl font-extrabold tabular-nums leading-none" style={{ color: '#1e40af' }}>
          {value}%
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#334155' }}>
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
