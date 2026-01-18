/**
 * TestCaseEmptyState — Empty state variants for test cases
 * Variants:
 * - no-data: No test cases exist yet
 * - no-results: No test cases match current filters
 */

import { ClipboardList, SearchX, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TestCaseEmptyStateProps {
  variant?: 'no-data' | 'no-results';
  onClearFilters?: () => void;
  onCreateClick?: () => void;
}

export function TestCaseEmptyState({ 
  variant = 'no-results',
  onClearFilters,
  onCreateClick,
}: TestCaseEmptyStateProps) {
  if (variant === 'no-data') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
          <ClipboardList className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No test cases yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create your first test case to start building your test coverage and ensure quality.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={onCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            Create Test Case
          </Button>
          <span className="text-sm text-muted-foreground">or</span>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import from CSV
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
        <SearchX className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No test cases match your filters</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Try adjusting your search terms or filters to find what you're looking for.
      </p>
      <div className="flex items-center gap-3">
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
        {onCreateClick && (
          <Button onClick={onCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            New Test Case
          </Button>
        )}
      </div>
    </div>
  );
}
