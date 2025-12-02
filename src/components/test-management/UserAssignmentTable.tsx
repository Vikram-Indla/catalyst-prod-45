/**
 * CATALYST TESTS - User Assignment Table
 * Table for assigning users to test cases in cycle creation
 */

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CaseSelectionItem } from '@/types/folderActions.types';

interface UserAssignmentTableProps {
  cases: CaseSelectionItem[];
  assignments: Record<string, string>;
  onAssignmentsChange: (assignments: Record<string, string>) => void;
  assignToCaseOwners: boolean;
  onAssignToCaseOwnersChange: (value: boolean) => void;
}

export const UserAssignmentTable: React.FC<UserAssignmentTableProps> = ({
  cases,
  assignments,
  onAssignmentsChange,
  assignToCaseOwners,
  onAssignToCaseOwnersChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Checkbox
          checked={assignToCaseOwners}
          onCheckedChange={(checked) => onAssignToCaseOwnersChange(checked as boolean)}
        />
        <span className="text-sm font-medium text-foreground">
          Assign to Case Owner
        </span>
        <span className="text-sm text-muted-foreground">
          (Auto-assigns cases to their respective owners)
        </span>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {cases.map(testCase => (
            <div
              key={testCase.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{testCase.case_key}</span>
                </div>
                <p className="text-sm text-muted-foreground">{testCase.title}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {assignToCaseOwners ? 'Case Owner' : 'Unassigned'}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
