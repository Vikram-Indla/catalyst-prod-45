/**
 * AddTestCasesToPlanDialog - Multi-select picker for adding test cases to a plan
 * Catalyst V5 design tokens
 */

import React, { useState, useMemo } from 'react';
import { Search, Check, TestTube } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTestCases } from '@/hooks/test-management';
import { usePlanTestCases, useAddTestCasesToPlan } from '../../hooks/useTestPlans';
import { Skeleton } from '@/components/ui/skeleton';

interface AddTestCasesToPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planKey?: string;
  projectId: string;
}

export function AddTestCasesToPlanDialog({
  open,
  onOpenChange,
  planId,
  planKey,
  projectId,
}: AddTestCasesToPlanDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch all test cases for the project
  const { data: testCasesData, isLoading: casesLoading } = useTestCases(projectId);
  const allTestCases = testCasesData?.cases ?? [];

  // Fetch already linked test cases
  const { data: linkedCases = [] } = usePlanTestCases(planId);

  const addMutation = useAddTestCasesToPlan();

  // Filter out already linked cases
  const linkedCaseIds = useMemo(
    () => new Set(linkedCases.map((lc) => lc.test_case_id)),
    [linkedCases]
  );

  const availableTestCases = useMemo(
    () => allTestCases.filter((tc) => !linkedCaseIds.has(tc.id)),
    [allTestCases, linkedCaseIds]
  );

  // Filter by search
  const filteredTestCases = useMemo(() => {
    if (!searchQuery.trim()) return availableTestCases;
    const q = searchQuery.toLowerCase();
    return availableTestCases.filter(
      (tc) =>
        tc.key?.toLowerCase().includes(q) ||
        tc.title.toLowerCase().includes(q)
    );
  }, [availableTestCases, searchQuery]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTestCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTestCases.map((tc) => tc.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    try {
      await addMutation.mutateAsync({
        plan_id: planId,
        test_case_ids: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      setSearchQuery('');
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-primary" />
            Add Test Cases to {planKey || 'Plan'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search test cases by key or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select All */}
          {filteredTestCases.length > 0 && (
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-primary hover:underline"
              >
                {selectedIds.size === filteredTestCases.length
                  ? 'Deselect All'
                  : `Select All (${filteredTestCases.length})`}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
          )}

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {casesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ))
            ) : filteredTestCases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {availableTestCases.length === 0
                  ? 'All test cases are already added to this plan'
                  : 'No test cases found matching your search'}
              </div>
            ) : (
              filteredTestCases.map((tc) => {
                const isSelected = selectedIds.has(tc.id);
                return (
                  <div
                    key={tc.id}
                    onClick={() => handleToggleSelect(tc.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      TC
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-muted-foreground font-mono">
                        {tc.key}
                      </div>
                      <div className="text-sm text-foreground truncate">{tc.title}</div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                        tc.status === 'APPROVED'
                          ? 'bg-success/10 text-success'
                          : tc.status === 'DRAFT'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-warning/10 text-warning'
                      )}
                    >
                      {tc.status?.toLowerCase()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selectedIds.size === 0 || addMutation.isPending}>
            {addMutation.isPending
              ? 'Adding...'
              : `Add ${selectedIds.size > 0 ? selectedIds.size : ''} Test Case${
                  selectedIds.size !== 1 ? 's' : ''
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddTestCasesToPlanDialog;
