/**
 * My Work Dashboard Page
 * Shows assigned test cases grouped by cycle with urgency indicators
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useMyWork } from '../hooks/useMyWork';
import { useUIStore } from '../stores/uiStore';
import { MyWorkSummaryCards } from './my-work/MyWorkSummaryCards';
import { MyWorkFilterBar } from './my-work/MyWorkFilterBar';
import { MyWorkCycleGroup } from './my-work/MyWorkCycleGroup';
import { ExecutionModal } from './execution/ExecutionModal';
import { Loader2, RefreshCw, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MyWorkFilters {
  status: string[];
  cycleId: string | null;
  urgency: string | null;
}

export function MyWorkDashboard() {
  const { data, isLoading, refetch, dataUpdatedAt } = useMyWork();
  const [filters, setFilters] = useState<MyWorkFilters>({
    status: [],
    cycleId: null,
    urgency: null,
  });
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Execution modal state
  const { executionModal, openExecutionModal, closeExecutionModal } = useUIStore();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  // Group work items by cycle
  const groupedByCycle = useMemo(() => {
    if (!data?.assignedCases) return new Map();

    const groups = new Map<string, {
      cycleId: string;
      cycleTitle: string;
      items: typeof data.assignedCases;
      urgency: 'overdue' | 'due_today' | 'on_track';
      dueDate?: string;
    }>();

    data.assignedCases.forEach((item) => {
      const cycleKey = item.cycle_title || 'Unassigned';
      
      if (!groups.has(cycleKey)) {
        // Calculate urgency based on due date
        let urgency: 'overdue' | 'due_today' | 'on_track' = 'on_track';
        if (item.due_date) {
          const dueDate = new Date(item.due_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate < today) {
            urgency = 'overdue';
          } else if (dueDate.getTime() === today.getTime()) {
            urgency = 'due_today';
          }
        }

        groups.set(cycleKey, {
          cycleId: cycleKey,
          cycleTitle: cycleKey,
          items: [],
          urgency,
          dueDate: item.due_date,
        });
      }
      
      groups.get(cycleKey)!.items.push(item);
    });

    return groups;
  }, [data?.assignedCases]);

  // Apply filters
  const filteredGroups = useMemo(() => {
    const groups = new Map(groupedByCycle);

    // Filter by cycle
    if (filters.cycleId) {
      for (const [key] of groups) {
        if (key !== filters.cycleId) {
          groups.delete(key);
        }
      }
    }

    // Filter by urgency
    if (filters.urgency) {
      for (const [key, group] of groups) {
        if (group.urgency !== filters.urgency) {
          groups.delete(key);
        }
      }
    }

    // Filter by status within groups
    if (filters.status.length > 0) {
      for (const [key, group] of groups) {
        group.items = group.items.filter((item) =>
          filters.status.includes(item.status)
        );
        if (group.items.length === 0) {
          groups.delete(key);
        }
      }
    }

    return groups;
  }, [groupedByCycle, filters]);

  // Get unique cycles for filter dropdown
  const availableCycles = useMemo(() => {
    return Array.from(groupedByCycle.keys());
  }, [groupedByCycle]);

  const handleToggleCycle = (cycleId: string) => {
    setExpandedCycles((prev) => {
      const next = new Set(prev);
      if (next.has(cycleId)) {
        next.delete(cycleId);
      } else {
        next.add(cycleId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedCycles(new Set(filteredGroups.keys()));
  };

  const handleCollapseAll = () => {
    setExpandedCycles(new Set());
  };

  const handleStatusFilter = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleStartTesting = (scopeId: string) => {
    openExecutionModal(scopeId);
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalAssigned: 0,
    pendingExecution: 0,
    passedToday: 0,
    failedToday: 0,
  };

  // Calculate in-progress count
  const inProgressCount = data?.assignedCases?.filter(
    (c) => c.status === 'in_progress'
  ).length || 0;

  return (
    <div className="flex flex-col h-full -mx-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Test cases assigned to you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <MyWorkSummaryCards
        total={stats.totalAssigned}
        notRun={stats.pendingExecution}
        inProgress={inProgressCount}
        passed={stats.passedToday}
        failed={stats.failedToday}
        onStatusClick={handleStatusFilter}
        activeStatuses={filters.status}
      />

      {/* Filter Bar */}
      <MyWorkFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        availableCycles={availableCycles}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
      />

      {/* Cycle Groups */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filteredGroups.size === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No assigned work</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filters.status.length > 0 || filters.cycleId || filters.urgency
                ? 'Try adjusting your filters'
                : 'You have no test cases assigned to you'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(filteredGroups.entries()).map(([cycleId, group]) => (
              <MyWorkCycleGroup
                key={cycleId}
                cycleId={cycleId}
                cycleTitle={group.cycleTitle}
                items={group.items}
                urgency={group.urgency}
                dueDate={group.dueDate}
                isExpanded={expandedCycles.has(cycleId)}
                onToggle={() => handleToggleCycle(cycleId)}
                onStartTesting={handleStartTesting}
              />
            ))}
          </div>
        )}
      </div>

      {/* Execution Modal */}
      {executionModal.isOpen && executionModal.scopeId && (
        <ExecutionModal
          scopeId={executionModal.scopeId}
          runId={executionModal.runId}
          onClose={closeExecutionModal}
        />
      )}
    </div>
  );
}

export default MyWorkDashboard;
