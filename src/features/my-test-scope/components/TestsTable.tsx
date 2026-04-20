/**
 * Tests Table Component
 * Sortable, filterable table of assigned test cases with quick actions + pagination
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Lozenge, Tooltip, type LozengeAppearance } from '@/components/ads';
import { cn } from '@/lib/utils';
import { Play, RotateCcw, ExternalLink, ArrowUpDown, Check, X, Ban, Unlock, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
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
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button 
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort('status')}
                >
                  Status
                  <ArrowUpDown className="h-3 w-3" />
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
                  <ArrowUpDown className="h-3 w-3" />
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
                      <Clock className="h-3 w-3" />
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
                            <Unlock className="h-3.5 w-3.5" />
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
                                <Check className="h-3.5 w-3.5" />
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
                                <X className="h-3.5 w-3.5" />
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
                              <Ban className="h-3.5 w-3.5" />
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
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onExecute(test.scopeId)}
                      >
                        {test.status === 'failed' ? (
                          <>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Re-run
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
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
              <ChevronLeft className="h-4 w-4" />
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
              <ChevronRight className="h-4 w-4" />
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
