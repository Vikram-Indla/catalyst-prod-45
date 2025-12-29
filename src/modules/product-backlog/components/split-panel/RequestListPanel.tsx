/**
 * RequestListPanel - Left panel for split panel layout
 * Compact list of requests with search and quick filters
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Search, Plus, Circle, Paperclip } from 'lucide-react';
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
  hasAttachments?: boolean;
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

// Status dot colors - QA spec colors matching Catalyst V5
const STATUS_DOT_COLORS: Record<string, string> = {
  new_demand: 'bg-[#2563eb]',      // Blue
  new_request: 'bg-[#2563eb]',     // Blue
  draft: 'bg-[#737373]',           // Gray
  in_review: 'bg-[#2563eb]',       // Blue
  ea_review: 'bg-[#2563eb]',       // Blue
  analyse: 'bg-[#2563eb]',         // Blue
  approved: 'bg-[#0d9488]',        // Teal
  ready_to_implement: 'bg-[#0d9488]', // Teal
  implement: 'bg-[#2563eb]',       // Blue
  closed: 'bg-[#0d9488]',          // Teal
  completed: 'bg-[#0d9488]',       // Teal
  rejected: 'bg-[#ef4444]',        // Red
  on_hold: 'bg-[#d97706]',         // Orange
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
                    ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] focus-visible:ring-[#2563eb]'
                    : 'bg-[#f5f5f5] text-[#525252] hover:bg-[#e5e5e5] focus-visible:ring-ring'
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#2563eb' }} />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm" style={{ color: 'var(--text-3)' }}>
            <p>No requests match the current filter</p>
            {activeFilter !== 'all' && (
              <button 
                onClick={() => onFilterChange('all')}
                className="mt-2 text-xs underline"
                style={{ color: '#2563eb' }}
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
                  'px-4 py-3 border-b cursor-pointer transition-colors border-l-[3px]',
                  isSelected
                    ? 'bg-[#fafafa] border-l-[#2563eb]'
                    : 'border-l-transparent hover:bg-[#fafafa]'
                )}
                style={{
                  borderBottomColor: 'var(--divider)',
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Status Dot */}
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', dotColor)} />

                  <div className="flex-1 min-w-0">
                    {/* Top Row: ID + Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--brand-primary))' }}>
                        {request.id}
                      </span>

                      {/* Attachment indicator */}
                      {request.hasAttachments && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Paperclip className="w-3 h-3" style={{ color: 'var(--text-3)' }} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p>Has attachments</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {(request.autoPriority === 'High' || request.autoPriority === 'high') && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[rgba(239,68,68,0.08)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]">
                          HIGH
                        </span>
                      )}
                      {(request.autoPriority === 'Critical' || request.autoPriority === 'critical') && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[rgba(239,68,68,0.08)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]">
                          CRITICAL
                        </span>
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
