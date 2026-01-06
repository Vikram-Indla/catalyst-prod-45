// Link Test Cases Dialog
import React, { useState, useMemo } from 'react';
import { Search, Link, Check, X } from 'lucide-react';
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

interface TestCase {
  id: string;
  test_key: string;
  title: string;
  priority: string;
  status: string;
}

interface LinkTestCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementKey: string;
  testCases: TestCase[];
  linkedTestCaseIds: string[];
  onLink: (testCaseIds: string[]) => void;
  isLoading?: boolean;
}

export function LinkTestCasesDialog({
  open,
  onOpenChange,
  requirementKey,
  testCases,
  linkedTestCaseIds,
  onLink,
  isLoading,
}: LinkTestCasesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter out already linked test cases
  const availableTestCases = useMemo(() => {
    const linkedSet = new Set(linkedTestCaseIds);
    return testCases.filter(tc => !linkedSet.has(tc.id));
  }, [testCases, linkedTestCaseIds]);

  // Filter by search
  const filteredTestCases = useMemo(() => {
    if (!searchQuery.trim()) return availableTestCases;
    const query = searchQuery.toLowerCase();
    return availableTestCases.filter(tc =>
      tc.title.toLowerCase().includes(query) ||
      tc.test_key.toLowerCase().includes(query)
    );
  }, [availableTestCases, searchQuery]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    onLink(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Link Test Cases to {requirementKey}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search test cases by ID or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredTestCases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {availableTestCases.length === 0
                  ? 'All test cases are already linked'
                  : 'No test cases found'}
              </div>
            ) : (
              filteredTestCases.map(tc => {
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
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                        isSelected ? 'border-primary bg-primary text-white' : 'border-muted-foreground/30'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      TC
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-muted-foreground font-mono">
                        {tc.test_key}
                      </div>
                      <div className="text-sm text-foreground truncate">{tc.title}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={selectedIds.size === 0 || isLoading}>
            <Link className="w-4 h-4 mr-1" />
            Link {selectedIds.size > 0 ? `${selectedIds.size} Test Case${selectedIds.size > 1 ? 's' : ''}` : 'Test Cases'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
