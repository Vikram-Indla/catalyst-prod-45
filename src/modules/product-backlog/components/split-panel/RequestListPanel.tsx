/**
 * RequestListPanel - Left panel for split panel layout
 * Compact list of requests with search and quick filters
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Search, Plus, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RequestItem {
  id: string;
  _dbId: string;
  summary: string;
  processStep: string;
  score: number | null;
  autoPriority: string;
  rank: number | null;
  reporter?: string | null;
  reporterId?: string | null;
  assignee?: string | null;
  assigneeId?: string | null;
  department: string | null;
  departmentId?: string | null;
  businessOwner?: string | null;
  businessOwnerId?: string | null;
  businessAsk?: string | null;
  kickoff?: string | null;
  targetComplete?: string | null;
  deliveryTrack?: string | null;
  platform?: string | null;
  quarter: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface RequestListPanelProps {
  requests: RequestItem[];
  selectedRequestId: string | null;
  onSelectRequest: (request: RequestItem) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: 'all' | 'high' | 'unscored' | 'my';
  onFilterChange: (filter: 'all' | 'high' | 'unscored' | 'my') => void;
  onCreateRequest: () => void;
  isLoading?: boolean;
}

// Status dot colors
const STATUS_DOT_COLORS: Record<string, string> = {
  'new_demand': 'bg-blue-500',
  'new_request': 'bg-amber-500',
  'analyse': 'bg-purple-500',
  'in_review': 'bg-purple-500',
  'approved': 'bg-green-500',
  'implement': 'bg-cyan-500',
  'closed': 'bg-gray-400',
  'rejected': 'bg-red-500',
  'on_hold': 'bg-gray-400',
};

// Format status for display
const formatStatus = (status?: string) => {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function RequestListPanel({
  requests,
  selectedRequestId,
  onSelectRequest,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onCreateRequest,
  isLoading = false,
}: RequestListPanelProps) {
  return (
    <div className="h-full flex flex-col border-r" style={{ borderColor: 'var(--divider)', backgroundColor: 'var(--surface-1)' }}>
      {/* List Header */}
      <div className="shrink-0 p-4 space-y-3" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Requests</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-2)' }}>
            {requests.length} items
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search requests..."
            className="w-full pl-10 pr-4 py-2 text-[13px] bg-background border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            style={{ borderColor: 'var(--divider)' }}
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2">
          {(['all', 'high', 'unscored', 'my'] as const).map((filter) => {
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
                {filter === 'high' && 'High Priority'}
                {filter === 'unscored' && 'Unscored'}
                {filter === 'my' && 'My Items'}
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
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm" style={{ color: 'var(--text-3)' }}>
            <p>No requests match the current filter</p>
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
          requests.map((request) => {
            const isSelected = selectedRequestId === request._dbId;
            const statusKey = request.processStep?.toLowerCase().replace(/\s+/g, '_') || 'new_request';
            const dotColor = STATUS_DOT_COLORS[statusKey] || STATUS_DOT_COLORS['new_request'];

            return (
              <div
                key={request._dbId}
                onClick={() => onSelectRequest(request)}
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
                    {/* Top Row: ID + Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--secondary-bronze))' }}>
                        {request.id}
                      </span>

                      {(request.autoPriority === 'High' || request.autoPriority === 'high') && (
                        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-[10px] px-1.5 py-0">
                          HIGH
                        </Badge>
                      )}
                      {(request.autoPriority === 'Critical' || request.autoPriority === 'critical') && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px] px-1.5 py-0">
                          CRITICAL
                        </Badge>
                      )}

                      {request.rank && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-2)' }}>
                          #{request.rank}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-medium mt-1 line-clamp-2" style={{ color: 'var(--text-1)' }}>
                      {request.summary}
                    </p>

                    {/* Meta: Status, Target Date, Quarter */}
                    <p className="text-xs mt-1 flex items-center flex-wrap gap-0" style={{ color: 'var(--text-3)' }}>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help hover:underline decoration-dotted">{formatStatus(request.processStep)}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p>Process Step</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {request.targetComplete && (
                        <>
                          <span className="mx-1">•</span>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help hover:underline decoration-dotted">{request.targetComplete}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p>Target Completion Date</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                      {request.quarter && (
                        <>
                          <span className="mx-1">•</span>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help hover:underline decoration-dotted">{request.quarter}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p>Planned Quarter</p>
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
