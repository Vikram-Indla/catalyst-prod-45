/**
 * Tests Table Component
 * Sortable, filterable table of assigned test cases
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, RotateCcw, ExternalLink, ArrowUpDown } from 'lucide-react';
import { PriorityScoreBadge } from './PriorityScoreBadge';
import { formatDueDate } from '../utils/priorityScore';
import type { TestAssignment, TestScopeFilters } from '../types';

interface TestsTableProps {
  tests: TestAssignment[];
  filters: TestScopeFilters;
  onFiltersChange: (filters: TestScopeFilters) => void;
  onExecute: (scopeId: string) => void;
  onViewDetails: (testId: string) => void;
}

const STATUS_CONFIG = {
  not_run: { label: 'Not Run', className: 'bg-muted text-muted-foreground' },
  passed: { label: 'Passed', className: 'bg-success/20 text-success-foreground' },
  failed: { label: 'Failed', className: 'bg-danger/20 text-danger-foreground' },
  blocked: { label: 'Blocked', className: 'bg-warning/20 text-warning-foreground' },
};

const URGENCY_CONFIG = {
  overdue: { className: 'text-danger font-medium' },
  due_today: { className: 'text-warning font-medium' },
  due_soon: { className: 'text-foreground' },
  on_track: { className: 'text-muted-foreground' },
};

export function TestsTable({ tests, filters, onFiltersChange, onExecute, onViewDetails }: TestsTableProps) {
  const handleSort = (field: TestScopeFilters['sortBy']) => {
    onFiltersChange({
      ...filters,
      sortBy: field,
      sortOrder: filters.sortBy === field && filters.sortOrder === 'desc' ? 'asc' : 'desc',
    });
  };

  // Apply sorting
  const sortedTests = [...tests].sort((a, b) => {
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
      case 'priority':
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] - priorityOrder[b.priority]) * order;
      default:
        return 0;
    }
  });

  // Apply filters
  const filteredTests = sortedTests.filter(test => {
    if (filters.status.length > 0 && !filters.status.includes(test.status)) return false;
    if (filters.priority.length > 0 && !filters.priority.includes(test.priority)) return false;
    if (filters.urgency.length > 0 && !filters.urgency.includes(test.urgency)) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return test.title.toLowerCase().includes(search) || 
             test.key.toLowerCase().includes(search);
    }
    return true;
  });

  if (filteredTests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No tests match your filters</p>
      </div>
    );
  }

  return (
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
            <th className="text-right py-3 px-4">
              <span className="text-xs font-medium text-muted-foreground">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredTests.map((test) => {
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
                  <Badge variant="secondary" className={cn('text-xs', statusConfig.className)}>
                    {statusConfig.label}
                  </Badge>
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
  );
}
