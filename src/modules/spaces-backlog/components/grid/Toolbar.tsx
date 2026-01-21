/**
 * Toolbar — Search, Filters, Column chooser, Saved views
 * Enforces CATALYST HIERARCHY CONTRACT by only showing allowed types per scope
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Search, 
  ChevronDown, 
  Columns,
  Check,
} from 'lucide-react';
import { WorkItemType, WorkItemStatus, TYPE_CONFIG, STATUS_CONFIG } from '../../types';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: WorkItemType | 'all';
  onTypeFilterChange: (type: WorkItemType | 'all') => void;
  statusFilter: WorkItemStatus | 'all';
  onStatusFilterChange: (status: WorkItemStatus | 'all') => void;
  activeView: string;
  onViewChange: (view: string) => void;
  onColumnsClick: () => void;
  allowedTypes?: WorkItemType[]; // Types allowed for current scope
}

const SAVED_VIEWS = [
  { id: 'all', label: 'All Items' },
  { id: 'my', label: 'My Items' },
  { id: 'blocked', label: 'Blocked' },
];

// Status values that exist in STATUS_CONFIG
const VALID_STATUSES: WorkItemStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done', 'blocked'];

export function Toolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  activeView,
  onViewChange,
  onColumnsClick,
  allowedTypes = ['epic', 'feature', 'story', 'subtask'], // Default fallback
}: ToolbarProps) {
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-60 pl-8 pr-3 py-[7px] text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Type Filter - ONLY shows allowed types for current scope */}
      <div className="relative">
        <button
          onClick={() => {
            setTypeDropdownOpen(!typeDropdownOpen);
            setStatusDropdownOpen(false);
          }}
          className="flex items-center gap-2 px-3 py-[7px] text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500"
        >
          <span>{typeFilter === 'all' ? 'All Types' : TYPE_CONFIG[typeFilter]?.label || typeFilter}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {typeDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg z-20">
            <button
              onClick={() => { onTypeFilterChange('all'); setTypeDropdownOpen(false); }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700",
                typeFilter === 'all' && "text-blue-600 dark:text-blue-400"
              )}
            >
              All Types
              {typeFilter === 'all' && <Check className="w-3 h-3" />}
            </button>
            {/* HIERARCHY CONTRACT: Only show types allowed for current scope */}
            {allowedTypes.map(type => (
              <button
                key={type}
                onClick={() => { onTypeFilterChange(type); setTypeDropdownOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700",
                  typeFilter === type && "text-blue-600 dark:text-blue-400"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 rounded flex items-center justify-center text-[10px]", TYPE_CONFIG[type].bgColor)}>
                    <span className={TYPE_CONFIG[type].textColor}>●</span>
                  </div>
                  {TYPE_CONFIG[type].label}
                </div>
                {typeFilter === type && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="relative">
        <button
          onClick={() => {
            setStatusDropdownOpen(!statusDropdownOpen);
            setTypeDropdownOpen(false);
          }}
          className="flex items-center gap-2 px-3 py-[7px] text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500"
        >
          <span>{statusFilter === 'all' ? 'All Status' : STATUS_CONFIG[statusFilter]?.label || statusFilter}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {statusDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg z-20">
            <button
              onClick={() => { onStatusFilterChange('all'); setStatusDropdownOpen(false); }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700",
                statusFilter === 'all' && "text-blue-600 dark:text-blue-400"
              )}
            >
              All Status
              {statusFilter === 'all' && <Check className="w-3 h-3" />}
            </button>
            {VALID_STATUSES.map(status => (
              <button
                key={status}
                onClick={() => { onStatusFilterChange(status); setStatusDropdownOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700",
                  statusFilter === status && "text-blue-600 dark:text-blue-400"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[status].dotColor)} />
                  {STATUS_CONFIG[status].label}
                </div>
                {statusFilter === status && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Columns Button */}
      <button
        onClick={onColumnsClick}
        className="flex items-center gap-1.5 px-3 py-[7px] text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500"
      >
        <Columns className="w-3.5 h-3.5" />
        <span>Columns</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Saved Views */}
      <div className="flex items-center gap-1">
        {SAVED_VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full transition-colors",
              activeView === view.id
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
}
