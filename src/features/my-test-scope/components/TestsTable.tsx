/**
 * Tests Table Component
 * Sortable, filterable table of assigned test cases with quick actions + pagination
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Lozenge, Tooltip, type LozengeAppearance } from '@/components/ads';
import { cn } from '@/lib/utils';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CloseIcon from '@atlaskit/icon/core/close';
import ClockIcon from '@atlaskit/icon/core/clock';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
// No @atlaskit/icon equivalent — inline SVG
const PlayIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const RotateCcwIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const ExternalLinkIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);
const ArrowUpDownIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" />
  </svg>
);
const BanIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
  </svg>
);
const UnlockIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);
import { PriorityScoreBadge } from './PriorityScoreBadge';
import { formatDueDate } from '../utils/priorityScore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { TestAssignment, TestScopeFilters } from '../types';

const PAGE_SIZE = 25;

interface TestsTableProps {
  tests: TestAssignment[];
  filters: TestScopeFilters;
  onFiltersChange: (filters: TestScopeFilters) => void;
  onExecute: (scopeId: string) => void;
  onViewDetails: (testId: string) => void;
  onQuickPass?: (scopeId: string) => void;
  onQuickFail?: (scopeId: string, reason: string) => void;
  onQuickBlock?: (scopeId: string, reason: string) => void;
  onUnblock?: (scopeId: string) => void;
}

// §L38 Atlaskit Lozenge appearances replace bespoke className overrides.
const STATUS_CONFIG: Record<string, { label: string; appearance: LozengeAppearance }> = {
  not_run: { label: 'Not Run', appearance: 'default' },  // grey
  passed:  { label: 'Passed',  appearance: 'success' },  // green
  failed:  { label: 'Failed',  appearance: 'removed' },  // red
  blocked: { label: 'Blocked', appearance: 'moved' },    // yellow
};

const URGENCY_CONFIG = {
  overdue: { className: 'text-danger font-medium' },
  due_today: { className: 'text-warning font-medium' },
  due_soon: { className: 'text-foreground' },
  on_track: { className: 'text-muted-foreground' },
};

export function TestsTable({ tests, filters, onFiltersChange, onExecute, onViewDetails, onQuickPass, onQuickFail, onQuickBlock, onUnblock }: TestsTableProps) {
  const [reasonModal, setReasonModal] = useState<{ scopeId: string; type: 'fail' | 'block' } | null>(null);
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(0);

  const handleSort = (field: TestScopeFilters['sortBy']) => {
    onFiltersChange({
      ...filters,
      sortBy: field,
      sortOrder: filters.sortBy === field && filters.sortOrder === 'desc' ? 'asc' : 'desc',
    });
    setPage(0);
  };

  const handleReasonSubmit = () => {
    if (!reasonModal || !reason.trim()) return;
    if (reasonModal.type === 'fail') {
      onQuickFail?.(reasonModal.scopeId, reason.trim());
    } else {
      onQuickBlock?.(reasonModal.scopeId, reason.trim());
    }
    setReasonModal(null);
    setReason('');
  };

  // Apply sorting
  const sortedTests = useMemo(() => [...tests].sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1;
    switch (filters.sortBy) {
      case 'score':
        return (b.priorityScore - a.priorityScore) * order;
      case 'dueDate':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * order;
      case 'status':
        return a.status.localeCompare(b.status) * order;
      case 'priority': {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] - priorityOrder[b.priority]) * order;
      }
      default:
        return 0;
    }
  }), [tests, filters.sortBy, filters.sortOrder]);

  // Apply filters
  const filteredTests = useMemo(() => sortedTests.filter(test => {
    if (filters.status.length > 0 && !filters.status.includes(test.status)) return false;
    if (filters.priority.length > 0 && !filters.priority.includes(test.priority)) return false;
    if (filters.urgency.length > 0 && !filters.urgency.includes(test.urgency)) return false;
    if (filters.cycleId && filters.cycleId !== 'all' && test.cycleId !== filters.cycleId) return false;
    if (filters.releaseId && filters.releaseId !== 'all' && test.releaseId !== filters.releaseId) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return test.title.toLowerCase().includes(search) || 
             test.key.toLowerCase().includes(search);
    }
    return true;
  }), [sortedTests, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredTests.length / PAGE_SIZE);
  const paginatedTests = filteredTests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (filteredTests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No tests match your filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4">
                <button 
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort('score')}
                >
                  Score
                  <ArrowUpDownIcon size={12} />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button 
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort('status')}
                >
                  Status
                  <ArrowUpDownIcon size={12} />
                </button>
              </th>
              <th className="text-left py-3 px-4 min-w-[300px]">
                <span className="text-xs font-medium text-muted-foreground">Test Case</span>
              </th>
              <th className="text-left py-3 px-4">
                <span className="text-xs font-medium text-muted-foreground">Cycle</span>
              </th>
              <th className="text-left py-3 px-4">
                <button 
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort('dueDate')}
                >
                  Due
                  <ArrowUpDownIcon size={12} />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <span className="text-xs font-medium text-muted-foreground">Est.</span>
              </th>
              <th className="text-center py-3 px-4">
                <span className="text-xs font-medium text-muted-foreground">Quick</span>
              </th>
              <th className="text-right py-3 px-4">
                <span className="text-xs font-medium text-muted-foreground">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTests.map((test) => {
              const statusConfig = STATUS_CONFIG[test.status];
              const urgencyConfig = URGENCY_CONFIG[test.urgency];
              
              return (
                <tr 
                  key={test.scopeId} 
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <PriorityScoreBadge score={test.priorityScore} />
                  </td>
                  <td className="py-3 px-4">
                    <Lozenge appearance={statusConfig.appearance}>
                      {statusConfig.label}
                    </Lozenge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{test.key}</span>
                      <span className="text-sm text-muted-foreground line-clamp-1">{test.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">{test.cycleName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn('text-sm', urgencyConfig.className)}>
                      {formatDueDate(test.dueDate)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ClockIcon label="" size="small" primaryColor="currentColor" />
                      <span className="text-xs">{test.estimatedMinutes}m</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-0.5">
                      {test.status === 'blocked' ? (
                        <Tooltip content="Unblock">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onUnblock?.(test.scopeId)}
                          >
                            <UnlockIcon size={14} />
                          </Button>
                        </Tooltip>
                      ) : (
                        <>
                          {test.status !== 'passed' && (
                            <Tooltip content="Quick Pass">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                                onClick={() => onQuickPass?.(test.scopeId)}
                              >
                                <CheckMarkIcon label="" size="small" primaryColor="currentColor" />
                              </Button>
                            </Tooltip>
                          )}
                          {test.status !== 'failed' && (
                            <Tooltip content="Quick Fail">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setReasonModal({ scopeId: test.scopeId, type: 'fail' })}
                              >
                                <CloseIcon label="" size="small" primaryColor="currentColor" />
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip content="Block">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-warning hover:text-warning hover:bg-warning/10"
                              onClick={() => setReasonModal({ scopeId: test.scopeId, type: 'block' })}
                            >
                              <BanIcon size={14} />
                            </Button>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(test.id)}
                      >
                        <ExternalLinkIcon size={16} />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onExecute(test.scopeId)}
                      >
                        {test.status === 'failed' ? (
                          <>
                            <RotateCcwIcon size={16} />
                            Re-run
                          </>
                        ) : (
                          <>
                            <PlayIcon size={16} />
                            Execute
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredTests.length)} of {filteredTests.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeftIcon label="" size="small" primaryColor="currentColor" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRightIcon label="" size="small" primaryColor="currentColor" />
            </Button>
          </div>
        </div>
      )}

      {/* Reason Modal for Fail/Block */}
      <Dialog open={!!reasonModal} onOpenChange={() => { setReasonModal(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonModal?.type === 'fail' ? 'Fail Reason' : 'Block Reason'}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={reasonModal?.type === 'fail' ? 'Describe why this test failed...' : 'Describe what is blocking this test...'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReasonModal(null); setReason(''); }}>
              Cancel
            </Button>
            <Button
              variant={reasonModal?.type === 'fail' ? 'destructive' : 'default'}
              onClick={handleReasonSubmit}
              disabled={!reason.trim()}
            >
              {reasonModal?.type === 'fail' ? 'Mark as Failed' : 'Mark as Blocked'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
