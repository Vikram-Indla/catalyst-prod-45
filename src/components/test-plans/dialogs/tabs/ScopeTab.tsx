/**
 * ScopeTab - Tab 2: Requirements Selector (Placeholder)
 */
import React from 'react';
import { TestPlanFormState, CoverageStats } from '../CreateEditTestPlanDialog.types';
import { CoverageRing } from '../components/CoverageRing';
import { Target, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ScopeTabProps {
  formState: TestPlanFormState;
  setField: <K extends keyof TestPlanFormState>(field: K, value: TestPlanFormState[K]) => void;
  coverageStats: CoverageStats;
}

export function ScopeTab({ formState, coverageStats }: ScopeTabProps) {
  if (!formState.release_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="p-4 rounded-full bg-warning/10 mb-4">
          <AlertCircle className="w-8 h-8 text-warning" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Select a Release First</h3>
        <p className="text-muted-foreground max-w-md">
          Please select a release in the Basic Info tab to see available requirements for scoping.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Available Panel */}
      <div className="flex-1 border-r flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold mb-2">Available Requirements</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search requirements..." className="pl-9" />
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <p className="text-sm text-muted-foreground text-center py-8">
            Requirements for the selected release will appear here.
          </p>
        </div>
      </div>

      {/* In Scope Panel */}
      <div className="w-80 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">In Scope ({formState.in_scope_ids.length})</h3>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          {formState.in_scope_ids.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Add requirements from the left panel
            </p>
          ) : null}
        </div>
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium">{coverageStats.existingTestsCount} tests exist</p>
              <p className="text-xs text-muted-foreground">{coverageStats.gapCount} gaps to fill</p>
            </div>
            <CoverageRing percent={coverageStats.coveragePercent} size={60} strokeWidth={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
