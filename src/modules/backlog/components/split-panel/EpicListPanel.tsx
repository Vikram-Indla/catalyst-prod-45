/**
 * EpicListPanel - Left panel for split panel layout
 * Compact list of epics with search and quick filters
 * Matches RequestListPanel UX exactly
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Search, Circle } from 'lucide-react';
import { Lozenge } from '@/components/ads';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface EpicListItem {
  id: string;
  epicKey: string;
  name: string;
  status: string;
  themeName: string | null;
  quarters: string[];
  assigneeName: string | null;
  assigneeId: string | null;
  mvp: boolean;
  createdAt: string | null;
}

interface EpicListPanelProps {
  epics: EpicListItem[];
  selectedEpicId: string | null;
  onSelectEpic: (epic: EpicListItem) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: 'all' | 'my' | 'theme' | 'unassigned';
  onFilterChange: (filter: 'all' | 'my' | 'theme' | 'unassigned') => void;
  onCreateEpic: () => void;
  isLoading?: boolean;
}

// Status dot colors matching epic_statuses table colors
const STATUS_DOT_COLORS: Record<string, string> = {
  proposed: 'bg-blue-500',
  analyzing: 'bg-blue-500',
  approved: 'bg-amber-500',
  in_progress: 'bg-amber-500',
  done: 'bg-teal-500',
  cancelled: 'bg-gray-400',
};

// Format status for display
const formatStatus = (status?: string) => {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function EpicListPanel({
  epics,
  selectedEpicId,
  onSelectEpic,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onCreateEpic,
  isLoading = false,
}: EpicListPanelProps) {
  return (
    <div className="h-full flex flex-col border-r" style={{ borderColor: 'var(--divider)', backgroundColor: 'var(--surface-1)' }}>
      {/* List Header */}
      <div className="shrink-0 p-4 space-y-3" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Epics</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-2)' }}>
            {epics.length} items
          </span>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'my', 'theme', 'unassigned'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary'
                    : 'bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-ring'
                )}
              >
                {filter === 'all' && 'All'}
                {filter === 'my' && 'My Epics'}
                {filter === 'theme' && 'Theme'}
                {filter === 'unassigned' && 'Unassigned'}
              </button>
            );
          })}
        </div>
      </div>

      {/* List Items */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'hsl(var(--secondary-olive))' }} />
          </div>
        ) : epics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm" style={{ color: 'var(--text-3)' }}>
            <p>No epics match the current filter</p>
            {activeFilter !== 'all' && (
              <button 
                onClick={() => onFilterChange('all')}
                className="mt-2 text-xs underline"
                style={{ color: 'hsl(var(--secondary-olive))' }}
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          epics.map((epic) => {
            const isSelected = selectedEpicId === epic.id;
            const statusKey = epic.status?.toLowerCase().replace(/\s+/g, '_') || 'proposed';
            const dotColor = STATUS_DOT_COLORS[statusKey] || STATUS_DOT_COLORS['proposed'];

            return (
              <div
                key={epic.id}
                onClick={() => onSelectEpic(epic)}
                className={cn(
                  'px-4 py-3 border-b cursor-pointer transition-colors border-l-2',
                  isSelected
                    ? 'border-l-[hsl(var(--secondary-olive))]'
                    : 'border-l-transparent hover:bg-muted/50'
                )}
                style={{
                  borderBottomColor: 'var(--divider)',
                  backgroundColor: isSelected ? 'hsl(var(--secondary-olive) / 0.05)' : undefined,
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Status Dot */}
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', dotColor)} />

                  <div className="flex-1 min-w-0">
                    {/* Top Row: Key + Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--secondary-bronze))' }}>
                        {epic.epicKey}
                      </span>

                      {epic.mvp && (
                        <Lozenge appearance="default">MVP</Lozenge>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-medium mt-1 line-clamp-2" style={{ color: 'var(--text-1)' }}>
                      {epic.name}
                    </p>

                    {/* Meta: Status, Theme, Quarter */}
                    <p className="text-xs mt-1 flex items-center flex-wrap gap-0" style={{ color: 'var(--text-3)' }}>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help hover:underline decoration-dotted">{formatStatus(epic.status)}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p>Status</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {epic.themeName && (
                        <>
                          <span className="mx-1">•</span>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help hover:underline decoration-dotted truncate max-w-[100px]">{epic.themeName}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p>Theme: {epic.themeName}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                      {epic.quarters && epic.quarters.length > 0 && (
                        <>
                          <span className="mx-1">•</span>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help hover:underline decoration-dotted">{epic.quarters[0]}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p>Target Quarter</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
