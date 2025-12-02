/**
 * CATALYST TESTS - Bulk Case Selector
 * Reusable component for selecting test cases with bulk actions
 */

import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CaseSelectionItem } from '@/types/folderActions.types';

interface BulkCaseSelectorProps {
  cases: CaseSelectionItem[];
  selectedCaseIds: string[];
  onSelectionChange: (caseIds: string[]) => void;
}

export const BulkCaseSelector: React.FC<BulkCaseSelectorProps> = ({
  cases,
  selectedCaseIds,
  onSelectionChange,
}) => {
  const eligibleCases = cases.filter(c => c.is_eligible);
  const allEligibleSelected = eligibleCases.length > 0 && 
    eligibleCases.every(c => selectedCaseIds.includes(c.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange([...new Set([...selectedCaseIds, ...eligibleCases.map(c => c.id)])]);
    } else {
      onSelectionChange(selectedCaseIds.filter(id => !eligibleCases.find(c => c.id === id)));
    }
  };

  const handleSelectCase = (caseId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedCaseIds, caseId]);
    } else {
      onSelectionChange(selectedCaseIds.filter(id => id !== caseId));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-500/10 text-green-600';
      case 'draft': return 'bg-gray-500/10 text-gray-600';
      default: return 'bg-blue-500/10 text-blue-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-500/10 text-red-600';
      case 'high': return 'bg-orange-500/10 text-orange-600';
      case 'medium': return 'bg-blue-500/10 text-blue-600';
      case 'low': return 'bg-gray-500/10 text-gray-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Checkbox
          checked={allEligibleSelected}
          onCheckedChange={handleSelectAll}
          disabled={eligibleCases.length === 0}
        />
        <span className="text-sm font-medium text-foreground">
          Select All Cases ({selectedCaseIds.length} selected)
        </span>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {cases.map(testCase => (
            <div
              key={testCase.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                testCase.is_eligible
                  ? 'border-border hover:bg-accent cursor-pointer'
                  : 'border-border/50 bg-muted/50 opacity-60'
              }`}
              onClick={() => testCase.is_eligible && handleSelectCase(testCase.id, !selectedCaseIds.includes(testCase.id))}
            >
              <Checkbox
                checked={selectedCaseIds.includes(testCase.id)}
                onCheckedChange={(checked) => handleSelectCase(testCase.id, checked as boolean)}
                disabled={!testCase.is_eligible}
                onClick={(e) => e.stopPropagation()}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{testCase.case_key}</span>
                  <Badge variant="secondary" className={getStatusColor(testCase.status)}>
                    {testCase.status}
                  </Badge>
                  <Badge variant="secondary" className={getPriorityColor(testCase.priority)}>
                    {testCase.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{testCase.title}</p>
                {!testCase.is_eligible && testCase.ineligibility_reason && (
                  <p className="text-xs text-destructive mt-1">{testCase.ineligibility_reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
