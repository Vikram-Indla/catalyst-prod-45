import { Search, ChevronDown, List, LayoutGrid, X } from 'lucide-react';
import type { ProjectFilters, ViewMode } from '@/types/projecthub';
import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  filters: ProjectFilters;
  onFilterChange: (f: ProjectFilters) => void;
  stats: {
    total: number;
    statusActive: number;
    statusOnHold: number;
    statusPlanning: number;
    statusCompleted: number;
    statusStarred: number;
    statusMyProjects?: number;
  };
}

const TABS = ['All', 'My Projects', 'Starred'] as const;
const STATUS_OPTIONS = ['Any', 'Active', 'Planning', 'On Hold', 'Completed'] as const;

export function AllProjectsToolbar({ view, onViewChange, filters, onFilterChange, stats }: ToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [statusOpen, setStatusOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => onFilterChange({ ...filters, search: localSearch }), 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  const activeTab = filters.statusChip;
  const statusFilter = filters.statuses[0]
    ? STATUS_OPTIONS.find(s => s.toLowerCase().replace(/\s/g, '_') === filters.statuses[0]) || 'Any'
    : 'Any';

  function getCount(tab: string): number {
    if (tab === 'All') return stats.total;
    if (tab === 'Starred') return stats.statusStarred;
    if (tab === 'My Projects') return stats.statusMyProjects ?? 0;
    return 0;
  }

  function handleTabClick(tab: string) {
    onFilterChange({ ...filters, statusChip: tab, statuses: [] });
  }

  function handleStatusChange(s: string) {
    const mapped = s === 'Any' ? [] : [s.toLowerCase().replace(/\s/g, '_')];
    onFilterChange({ ...filters, statuses: mapped });
    setStatusOpen(false);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Primary tabs — pill style */}
      <div className="flex gap-1">
       {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 13,
                transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
                cursor: 'pointer',
                border: isActive ? 'none' : '1px solid var(--cp-bd, #E2E8F0)',
                background: isActive ? 'var(--cp-blue, #2563EB)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--cp-t2, #475569)',
                fontWeight: isActive ? 600 : 500,
                outline: 'none',
              }}
            >
              {tab === 'Starred' && '★ '}{tab}
              {!(tab === 'Starred' && getCount(tab) === 0) && (
                <span
                  style={{
                    minWidth: 22,
                    height: 18,
                    padding: '0 6px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive ? 'rgba(255,255,255,0.9)' : 'var(--cp-hover, #F1F5F9)',
                    color: isActive ? 'var(--cp-blue-text, #1D4ED8)' : 'var(--cp-t3, #94A3B8)',
                  }}
                >
                  {getCount(tab)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status dropdown */}
      <Popover open={statusOpen} onOpenChange={setStatusOpen}>
        <PopoverTrigger asChild>
          <button className="h-8 px-3 border border-slate-200 dark:border-[#2E2E2E] rounded-md text-xs font-medium text-slate-600 dark:text-[#A1A1A1] hover:border-blue-600 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 flex items-center gap-1.5 bg-transparent transition-colors">
            Status: {statusFilter} <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1 bg-white dark:bg-[#1A1A1A]" align="start">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-50 dark:hover:bg-[#2E2E2E] text-slate-700 dark:text-[#A1A1A1]"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              {s}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Right side: search + view toggle */}
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-[#878787]" />
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search projects..."
            className="h-9 w-[220px] pl-9 pr-8 border border-slate-200 dark:border-[#2E2E2E] rounded text-[13px] bg-transparent text-slate-900 dark:text-[#EDEDED] placeholder:text-slate-400 dark:placeholder:text-[#878787] outline-none focus:border-blue-500"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <X size={12} className="text-slate-400 dark:text-[#878787]" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex border border-slate-200 dark:border-[#2E2E2E] rounded-md overflow-hidden">
          <button
            onClick={() => onViewChange('list')}
            className={cn(
              "w-8 h-8 flex items-center justify-center border-r border-slate-200 dark:border-[#2E2E2E] transition-colors",
              view === 'list'
                ? "bg-blue-50 text-blue-600 dark:bg-[rgba(37,99,235,0.12)] dark:text-blue-400"
                : "bg-transparent text-slate-400 dark:text-[#878787] hover:text-slate-600"
            )}
          >
            <List size={14} />
          </button>
          <button
            onClick={() => onViewChange('cards')}
            className={cn(
              "w-8 h-8 flex items-center justify-center transition-colors",
              view === 'cards' || view === 'card'
                ? "bg-blue-50 text-blue-600 dark:bg-[rgba(37,99,235,0.12)] dark:text-blue-400"
                : "bg-transparent text-slate-400 dark:text-[#878787] hover:text-slate-600"
            )}
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
