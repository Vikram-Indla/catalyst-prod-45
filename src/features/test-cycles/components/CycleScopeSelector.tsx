// ============================================================================
// CycleScopeSelector - Add test cases to cycle scope
// ============================================================================

import { memo, useState, useMemo } from 'react';
import { Plus, Search, CheckCircle2, Loader2, FileCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lozenge } from '@/components/ads';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTestCases, useProjects } from '@/hooks/test-management';
import { useCycleScopeMutations } from '../hooks/useCycleScope';
import { useCycleScope } from '@/hooks/test-management/useTestCycles';

interface CycleScopeSelectorProps {
  cycleId: string;
  className?: string;
}

export const CycleScopeSelector = memo(function CycleScopeSelector({
  cycleId,
  className,
}: CycleScopeSelectorProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get project ID
  const { data: projects } = useProjects();
  const projectId = projects?.[0]?.id;

  // Fetch all test cases
  const { data: testCasesData, isLoading: isLoadingCases } = useTestCases(projectId);
  const allTestCases = testCasesData?.cases || [];

  // Fetch current scope
  const { data: scopeItems, isLoading: isLoadingScope } = useCycleScope(cycleId);
  const scopedCaseIds = useMemo(
    () => new Set(scopeItems?.map((s) => s.case_id) || []),
    [scopeItems]
  );

  // Mutations
  const { addCases, removeCase, isLoading: isMutating } = useCycleScopeMutations(cycleId);

  // Filter available test cases (not already in scope)
  const availableCases = useMemo(() => {
    return allTestCases
      .filter((tc) => !scopedCaseIds.has(tc.id))
      .filter(
        (tc) =>
          !searchQuery ||
          tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tc.key.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [allTestCases, scopedCaseIds, searchQuery]);

  const handleToggle = (caseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === availableCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableCases.map((tc) => tc.id)));
    }
  };

  const handleAdd = () => {
    if (selectedIds.size === 0) return;
    addCases.mutate(
      { testCaseIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          setShowDialog(false);
          setSelectedIds(new Set());
          setSearchQuery('');
        },
      }
    );
  };

  const handleRemove = (testCaseId: string) => {
    removeCase.mutate(testCaseId);
  };

  return (
    <div className={cn('bg-card rounded-xl border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          Test Cases ({scopeItems?.length || 0})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Cases
        </Button>
      </div>

      {isLoadingScope ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : scopeItems?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No test cases in scope</p>
          <p className="text-xs">Add test cases to execute in this cycle</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {scopeItems?.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">
                      <Lozenge appearance="default">
                        {item.test_case?.key || 'TC-???'}
                      </Lozenge>
                    </span>
                    <span className="text-sm truncate">
                      {item.test_case?.title || 'Unknown Test Case'}
                    </span>
                  </div>
                </div>
                <Lozenge
                  appearance={
                    item.status === 'PASSED'
                      ? 'success'
                      : item.status === 'FAILED'
                      ? 'removed'
                      : item.status === 'BLOCKED'
                      ? 'moved'
                      : 'default'
                  }
                >
                  {item.status.replace('_', ' ')}
                </Lozenge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(item.case_id)}
                  disabled={isMutating}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Add Cases Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Test Cases to Cycle</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Select all */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    availableCases.length > 0 && selectedIds.size === availableCases.length
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
            </div>

            {/* Case list */}
            <ScrollArea className="h-[400px] border rounded-lg">
              {isLoadingCases ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableCases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">
                    {searchQuery
                      ? 'No matching test cases found'
                      : 'All test cases are already in scope'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {availableCases.map((testCase) => (
                    <div
                      key={testCase.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        selectedIds.has(testCase.id)
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => handleToggle(testCase.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(testCase.id)}
                        onCheckedChange={() => handleToggle(testCase.id)}
                      />
                      <span className="text-xs font-mono">
                        <Lozenge appearance="default">
                          {testCase.key}
                        </Lozenge>
                      </span>
                      <span className="text-sm flex-1 truncate">{testCase.title}</span>
                      {testCase.priority && (
                        <Lozenge appearance="default">
                          {testCase.priority.name}
                        </Lozenge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || addCases.isPending}
            >
              {addCases.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {selectedIds.size} Case(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
