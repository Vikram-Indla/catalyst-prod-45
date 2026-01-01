/**
 * Capacity Header Component - Enterprise Grade
 * Large clickable stat cards, prominent utilization, visible tabs with strong active state
 */

import { Search, Download, Settings, Plus, ChevronDown, LayoutGrid, Table2, CalendarDays, FileStack, Users, ChevronUp, ChevronDownIcon, Check, BarChart3, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CATALYST, getUtilizationColor } from '@/lib/catalyst-colors';

interface CapacityHeaderProps {
  summary: { 
    total: number; 
    available: number; 
    atCapacity: number; 
    over: number; 
    utilizationPercentage: number;
  };
  viewMode: 'cards' | 'table' | 'timeline' | 'scenarios';
  groupBy: string;
  timelinePeriod: 'weekly' | 'monthly' | 'quarterly';
  searchQuery: string;
  activeFilter?: 'all' | 'available' | 'atCapacity' | 'over';
  isCollapsed?: boolean;
  onViewModeChange: (mode: 'cards' | 'table' | 'timeline' | 'scenarios') => void;
  onGroupByChange: (groupBy: string) => void;
  onTimelinePeriodChange: (period: 'weekly' | 'monthly' | 'quarterly') => void;
  onSearchChange: (query: string) => void;
  onAddResource: () => void;
  onAssign: () => void;
  onExport: () => void;
  onFilterChange?: (filter: 'all' | 'available' | 'atCapacity' | 'over') => void;
  onToggleCollapse?: () => void;
  assignModeActive?: boolean;
}

export function CapacityHeader({
  summary,
  viewMode,
  groupBy,
  timelinePeriod,
  searchQuery,
  activeFilter = 'all',
  isCollapsed = false,
  onViewModeChange,
  onGroupByChange,
  onTimelinePeriodChange,
  onSearchChange,
  onAddResource,
  onAssign,
  onExport,
  onFilterChange,
  onToggleCollapse,
  assignModeActive = false,
}: CapacityHeaderProps) {
  const utilizationColor = getUtilizationColor(summary.utilizationPercentage);

  return (
    <div className="bg-white border-b border-[#e5e5e5]">
      {/* ══════════════════════════════════════════════════════════
          ROW 1: Breadcrumb + Stats Cards (Large, Clickable) + Actions
      ══════════════════════════════════════════════════════════ */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          {/* BREADCRUMB */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#737373] font-medium">ENTERPRISE</span>
            <span className="text-[#d4d4d4]">/</span>
            <span className="font-semibold text-[#0a0a0a]">Capacity</span>
          </div>
          
          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            {onToggleCollapse && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onToggleCollapse}
                className="gap-1.5 h-9 border-[#e5e5e5] text-[#525252] text-xs"
              >
                {isCollapsed ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                {isCollapsed ? 'Expand All' : 'Collapse All'}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onExport}
              className="h-9 w-9 text-[#525252] hover:bg-[#f5f5f4]"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9 text-[#525252] hover:bg-[#f5f5f4]"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              onClick={onAddResource}
              className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] h-9 px-4 rounded-lg text-white text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Resource
            </Button>
          </div>
        </div>

        {/* LARGE STAT CARDS + UTILIZATION */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Stat Cards */}
          <StatCard 
            icon={<Users className="w-5 h-5" />}
            value={summary.total}
            label="Total"
            color={CATALYST.grey[700]}
            bgColor={CATALYST.grey[100]}
            isActive={activeFilter === 'all'}
            onClick={() => onFilterChange?.('all')}
          />
          <StatCard 
            icon={<Check className="w-5 h-5" />}
            value={summary.available}
            label="Available"
            color={CATALYST.teal.primary}
            bgColor={CATALYST.teal.bg}
            isActive={activeFilter === 'available'}
            onClick={() => onFilterChange?.('available')}
          />
          <StatCard 
            icon={<BarChart3 className="w-5 h-5" />}
            value={summary.atCapacity}
            label="At Capacity"
            color={CATALYST.blue.primary}
            bgColor={CATALYST.blue.bg}
            isActive={activeFilter === 'atCapacity'}
            onClick={() => onFilterChange?.('atCapacity')}
          />
          <StatCard 
            icon={<AlertTriangle className="w-5 h-5" />}
            value={summary.over}
            label="Over"
            color={CATALYST.bronze.primary}
            bgColor={CATALYST.bronze.bg}
            isActive={activeFilter === 'over'}
            onClick={() => onFilterChange?.('over')}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* PROMINENT UTILIZATION BAR */}
          <div className="flex items-center gap-4 px-5 py-3 bg-[#fafafa] rounded-xl border border-[#e5e5e5]">
            <span className="text-xs font-bold text-[#525252] uppercase tracking-wider">Utilization</span>
            <div className="w-32 h-3 bg-[#e5e5e5] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.min(summary.utilizationPercentage, 100)}%`,
                  backgroundColor: utilizationColor
                }}
              />
            </div>
            <span 
              className="text-xl font-bold min-w-[56px]"
              style={{ color: utilizationColor }}
            >
              {summary.utilizationPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 2: Search + View Tabs (STRONG ACTIVE STATE) + Controls
      ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-[#f0f0f0] flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a3a3a3]" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search resources..."
              className="w-64 pl-10 h-11 border-[#e5e5e5] rounded-xl text-sm"
            />
          </div>

          {/* VIEW TABS — STRONG ACTIVE STATE with filled background + bottom indicator */}
          <div className="flex items-center bg-[#f5f5f4] rounded-xl p-1">
            {(['cards', 'table', 'timeline', 'scenarios'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-lg',
                  viewMode === mode 
                    ? 'bg-[#2563eb] text-white shadow-sm' 
                    : 'text-[#525252] hover:bg-white/60'
                )}
              >
                <ViewIcon mode={mode} />
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                {/* Bottom border indicator for active */}
                {viewMode === mode && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#1d4ed8] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* TIMELINE PERIOD — Only visible in Timeline view */}
          {viewMode === 'timeline' && (
            <div className="flex items-center bg-[#f5f5f4] rounded-lg p-1">
              {(['weekly', 'monthly', 'quarterly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => onTimelinePeriodChange(period)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-all rounded-md',
                    timelinePeriod === period 
                      ? 'bg-[#0a0a0a] text-white' 
                      : 'text-[#525252] hover:bg-white/60'
                  )}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-10 border-[#e5e5e5] text-sm font-medium">
                <FileStack className="h-4 w-4" />
                Group: {groupBy === 'none' ? 'None' : groupBy === 'assignment' ? 'Assignment' : 'Department'}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-[#e5e5e5] shadow-lg">
              <DropdownMenuItem onClick={() => onGroupByChange('assignment')}>Assignment</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGroupByChange('department')}>Department</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGroupByChange('none')}>None</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            onClick={onAssign}
            className={cn(
              'gap-2 h-10 border-[#e5e5e5] text-sm font-medium',
              assignModeActive && 'bg-[#2563eb] border-[#2563eb] text-white hover:bg-[#1d4ed8]'
            )}
          >
            <Users className="h-4 w-4" />
            Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

/* LARGE CLICKABLE STAT CARD */
function StatCard({ 
  icon,
  value, 
  label, 
  color, 
  bgColor, 
  isActive, 
  onClick 
}: { 
  icon: React.ReactNode;
  value: number; 
  label: string; 
  color: string; 
  bgColor: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all border-2 min-w-[120px]',
        isActive 
          ? 'shadow-md scale-[1.02]' 
          : 'border-transparent hover:border-[#e5e5e5] hover:shadow-sm'
      )}
      style={{ 
        backgroundColor: bgColor,
        borderColor: isActive ? color : 'transparent',
      }}
    >
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <div className="text-left">
        <p 
          className="text-2xl font-bold leading-none"
          style={{ color }}
        >
          {value}
        </p>
        <p className="text-xs font-medium text-[#525252] mt-0.5">{label}</p>
      </div>
    </button>
  );
}

function ViewIcon({ mode }: { mode: string }) {
  const cls = 'w-4 h-4';
  if (mode === 'cards') return <LayoutGrid className={cls} />;
  if (mode === 'table') return <Table2 className={cls} />;
  if (mode === 'timeline') return <CalendarDays className={cls} />;
  if (mode === 'scenarios') return <FileStack className={cls} />;
  return null;
}