/**
 * Capacity Header Component - 2 Rows Only
 * Consolidated header per Catalyst V5 spec
 */

import { Search, Download, Settings, Plus, ChevronDown, LayoutGrid, Table2, CalendarDays, FileStack, Users } from 'lucide-react';
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
  onViewModeChange: (mode: 'cards' | 'table' | 'timeline' | 'scenarios') => void;
  onGroupByChange: (groupBy: string) => void;
  onTimelinePeriodChange: (period: 'weekly' | 'monthly' | 'quarterly') => void;
  onSearchChange: (query: string) => void;
  onAddResource: () => void;
  onAssign: () => void;
  onExport: () => void;
  assignModeActive?: boolean;
}

export function CapacityHeader({
  summary,
  viewMode,
  groupBy,
  timelinePeriod,
  searchQuery,
  onViewModeChange,
  onGroupByChange,
  onTimelinePeriodChange,
  onSearchChange,
  onAddResource,
  onAssign,
  onExport,
  assignModeActive = false,
}: CapacityHeaderProps) {
  const utilizationColor = getUtilizationColor(summary.utilizationPercentage);

  return (
    <div className="bg-white border-b border-[#e5e5e5]">
      {/* ══════════════════════════════════════════════════════════
          ROW 1: Breadcrumb + Stats + Utilization + Actions
      ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-6 py-3 flex-wrap gap-3">
        <div className="flex items-center gap-6">
          {/* SINGLE BREADCRUMB — NO DUPLICATE */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#737373] font-medium">ENTERPRISE</span>
            <span className="text-[#d4d4d4]">/</span>
            <span className="font-semibold text-[#0a0a0a]">Capacity</span>
          </div>

          {/* COMPACT STATS — Unified chips */}
          <div className="flex items-center gap-2">
            <StatChip value={summary.total} color={CATALYST.grey[500]} label="Total" />
            <StatChip value={summary.available} color={CATALYST.teal.primary} label="Available" />
            <StatChip value={summary.atCapacity} color={CATALYST.blue.primary} label="At Capacity" />
            <StatChip value={summary.over} color={CATALYST.bronze.primary} label="Over" />
          </div>

          {/* UTILIZATION — Blue/Teal, NOT orange */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#fafafa] rounded-lg border border-[#e5e5e5]">
            <span className="text-[10px] font-semibold text-[#737373] uppercase tracking-wider">UTILIZATION</span>
            <div className="w-20 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.min(summary.utilizationPercentage, 100)}%`,
                  backgroundColor: utilizationColor
                }}
              />
            </div>
            <span 
              className="text-sm font-bold min-w-[36px]"
              style={{ color: utilizationColor }}
            >
              {summary.utilizationPercentage}%
            </span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2">
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
            className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] h-9 px-4 rounded-lg text-white text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Resource
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 2: Search + View Tabs + Period Toggle + Group + Assign
      ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-6 py-2.5 border-t border-[#f0f0f0] flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a3a3a3]" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search resources..."
              className="w-44 pl-9 h-9 border-[#e5e5e5] rounded-lg text-sm"
            />
          </div>

          {/* VIEW TABS — 4 tabs including Scenarios */}
          <div className="flex items-center gap-1 bg-[#f5f5f4] rounded-lg p-1">
            {(['cards', 'table', 'timeline', 'scenarios'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                  viewMode === mode 
                    ? 'bg-white text-[#0a0a0a] shadow-sm' 
                    : 'text-[#737373] hover:text-[#525252]'
                )}
              >
                <ViewIcon mode={mode} />
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* TIMELINE PERIOD — Only visible in Timeline view */}
          {viewMode === 'timeline' && (
            <div className="flex items-center gap-1 bg-[#f5f5f4] rounded-lg p-1">
              {(['weekly', 'monthly', 'quarterly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => onTimelinePeriodChange(period)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                    timelinePeriod === period 
                      ? 'bg-[#0a0a0a] text-white' 
                      : 'text-[#737373]'
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
              <Button variant="outline" className="gap-2 h-9 border-[#e5e5e5] text-sm">
                <FileStack className="h-4 w-4" />
                Group by {groupBy === 'none' ? 'None' : groupBy === 'assignment' ? 'Assignment' : 'Department'}
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
              'gap-2 h-9 border-[#e5e5e5] text-sm',
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

function StatChip({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-bold text-[#0a0a0a]">{value}</span>
      <span className="text-xs text-[#737373]">{label}</span>
    </div>
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
