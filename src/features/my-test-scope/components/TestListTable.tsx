/**
 * Test List Table Component
 * Displays test cases with status, priority, and actions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  SkipForward,
  Clock,
  Bug,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { TestScopeItem, TestStatus } from '../types';
import { getStatusConfig, getScoreClass, formatDueDate } from '../utils/helpers';

interface TestListTableProps {
  tests: TestScopeItem[];
  onExecute: (id: string) => void;
  onComplete: (id: string, status: TestStatus) => void;
  onSkip: (id: string) => void;
  isExecuting?: boolean;
  isCompleting?: boolean;
  activeTestId?: string;
  className?: string;
}

export function TestListTable({
  tests,
  onExecute,
  onComplete,
  onSkip,
  isExecuting,
  isCompleting,
  activeTestId,
  className,
}: TestListTableProps) {
  if (tests.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="font-semibold text-lg text-foreground mb-2">No tests match your filters</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or search criteria.</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Test</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground w-20">Score</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground w-24">Status</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground w-24">Due</th>
            <th className="text-center py-3 px-3 font-medium text-muted-foreground w-16">Links</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground w-40">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => {
            const statusConfig = getStatusConfig(test.status);
            const dueInfo = formatDueDate(test.due_date, test.status);
            const isActive = activeTestId === test.id;
            const isActionPending = isActive && (isExecuting || isCompleting);

            return (
              <tr 
                key={test.id} 
                className={cn(
                  "border-b border-border/50 hover:bg-muted/50 transition-colors",
                  test.is_overdue && "bg-red-50/50 dark:bg-red-950/10"
                )}
              >
                {/* Test Info */}
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {test.key}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {test.cycle_name}
                      </span>
                    </div>
                    <span className="font-medium text-foreground line-clamp-1">
                      {test.title}
                    </span>
                  </div>
                </td>

                {/* Score */}
                <td className="py-3 px-3 text-center">
                  <Badge className={cn("text-xs font-bold min-w-[2.5rem]", getScoreClass(test.score))}>
                    {test.score}
                  </Badge>
                </td>

                {/* Status */}
                <td className="py-3 px-3 text-center">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", statusConfig.bgColor, statusConfig.textColor)}
                  >
                    {statusConfig.label}
                  </Badge>
                </td>

                {/* Due Date */}
                <td className="py-3 px-3 text-center">
                  <div className={cn("flex items-center justify-center gap-1 text-xs", dueInfo.className)}>
                    {dueInfo.isUrgent && <Clock className="h-3 w-3" />}
                    <span>{dueInfo.text}</span>
                  </div>
                </td>

                {/* Links */}
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {test.has_defects && (
                      <div className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400" title={`${test.defect_count} linked defects`}>
                        <Bug className="h-3.5 w-3.5" />
                        <span className="text-xs">{test.defect_count}</span>
                      </div>
                    )}
                    {test.has_incidents && (
                      <div className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400" title={`${test.incident_count} linked incidents`}>
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span className="text-xs">{test.incident_count}</span>
                      </div>
                    )}
                    {!test.has_defects && !test.has_incidents && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  {test.status === 'not_run' && (
                    <Button
                      size="sm"
                      onClick={() => onExecute(test.id)}
                      disabled={isActionPending}
                      className="h-7 px-3 text-xs"
                    >
                      {isActionPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 mr-1" />
                          Execute
                        </>
                      )}
                    </Button>
                  )}
                  {test.status === 'in_progress' && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onComplete(test.id, 'passed')}
                        disabled={isActionPending}
                        className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onComplete(test.id, 'failed')}
                        disabled={isActionPending}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onComplete(test.id, 'blocked')}
                        disabled={isActionPending}
                        className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {['passed', 'failed', 'blocked', 'skipped'].includes(test.status) && (
                    <span className="text-xs text-muted-foreground">Completed</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
