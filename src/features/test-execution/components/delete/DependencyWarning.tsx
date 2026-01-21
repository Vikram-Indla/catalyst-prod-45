/**
 * Module 3C-4: Dependency Warning Display
 */

import { AlertTriangle, FileText, PlayCircle, Bug } from 'lucide-react';
import type { DependencyInfo } from '../../types/batch-delete';

interface DependencyWarningProps {
  dependencies: DependencyInfo;
  testCaseCount: number;
}

export function DependencyWarning({ dependencies, testCaseCount }: DependencyWarningProps) {
  const hasAffectedItems = dependencies.total_affected > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-destructive">Warning: This action affects related data</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            You are about to delete {testCaseCount} test case{testCaseCount > 1 ? 's' : ''}.
            {hasAffectedItems && ' The following related items will also be affected:'}
          </p>
        </div>
      </div>

      {hasAffectedItems && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-lg font-semibold">{dependencies.test_steps}</div>
              <div className="text-xs text-muted-foreground">Test Steps</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-lg font-semibold">{dependencies.test_runs}</div>
              <div className="text-xs text-muted-foreground">Test Runs</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Bug className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-lg font-semibold">{dependencies.linked_defects}</div>
              <div className="text-xs text-muted-foreground">Linked Defects</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
