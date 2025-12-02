/**
 * CATALYST TESTS - Folder Case Summary Card
 * Shows eligibility summary for folder cases
 */

import React from 'react';
import { Info } from 'lucide-react';
import type { FolderCaseSummary } from '@/types/folderActions.types';

interface FolderCaseSummaryCardProps {
  summary: FolderCaseSummary;
}

export const FolderCaseSummaryCard: React.FC<FolderCaseSummaryCardProps> = ({ summary }) => {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-5 w-5 text-brand-gold" />
        <h3 className="font-semibold text-foreground">Folder Summary</h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total cases:</span>
          <span className="font-medium text-foreground">{summary.total_cases}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Eligible for Set:</span>
          <span className="font-medium text-foreground">
            {summary.eligible_for_set} (Approved status)
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Eligible for Cycle:</span>
          <span className="font-medium text-foreground">
            {summary.eligible_for_cycle} (not Draft)
          </span>
        </div>

        {summary.has_consistent_release && summary.common_release && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-foreground">
              All cases have same Release: <strong>{summary.common_release}</strong>
            </span>
          </div>
        )}

        {summary.has_consistent_component && summary.common_component && (
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-foreground">
              All cases have same Component: <strong>{summary.common_component}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
