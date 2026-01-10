/**
 * TestCaseEmptyState — Empty state when no test cases match filters
 */

import { FileSearch, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestCaseEmptyStateProps {
  onClearFilters: () => void;
}

export function TestCaseEmptyState({ onClearFilters }: TestCaseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <FileSearch className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No test cases found</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        No test cases match your current filters. Try adjusting your search criteria or create a new test case.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Test Case
        </Button>
      </div>
    </div>
  );
}
