/**
 * Execution Summary Component
 * Displays test execution results with evidence thumbnails
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EvidenceStats } from './EvidenceStats';
import { cn } from '@/lib/utils';

interface StepResult {
  id: string;
  order: number;
  action: string;
  expected_result?: string;
  actual_result?: string;
  status: 'passed' | 'failed' | 'blocked' | 'skipped' | 'pending';
  attachments?: Array<{
    id: string;
    thumbnailUrl?: string;
    fileName: string;
    aiHasIssues?: boolean;
  }>;
}

interface ExecutionResult {
  id: string;
  test_case_name?: string;
  status: string;
  executed_by?: string;
  executed_at?: string;
  step_results: StepResult[];
}

interface ExecutionSummaryProps {
  executionResult: ExecutionResult;
  onOpenViewer?: (attachmentId: string) => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variants: Record<string, string> = {
    passed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    blocked: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    skipped: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <Badge className={cn('capitalize', variants[status] || variants.pending)}>
      {status}
    </Badge>
  );
};

export const ExecutionSummary: React.FC<ExecutionSummaryProps> = ({
  executionResult,
  onOpenViewer,
}) => {
  const [filter, setFilter] = useState<'all' | 'with-evidence' | 'ai-issues'>('all');

  const steps = executionResult.step_results || [];

  const filteredSteps = steps.filter((step) => {
    if (filter === 'all') return true;
    if (filter === 'with-evidence') return (step.attachments?.length || 0) > 0;
    if (filter === 'ai-issues') return step.attachments?.some((a) => a.aiHasIssues);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Execution Summary</h2>
        <StatusBadge status={executionResult.status} />
      </div>

      {/* Evidence Stats */}
      <EvidenceStats executionId={executionResult.id} />

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1 rounded-full text-sm transition-colors',
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          All Steps
        </button>
        <button
          onClick={() => setFilter('with-evidence')}
          className={cn(
            'px-3 py-1 rounded-full text-sm transition-colors',
            filter === 'with-evidence'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          With Evidence
        </button>
        <button
          onClick={() => setFilter('ai-issues')}
          className={cn(
            'px-3 py-1 rounded-full text-sm transition-colors',
            filter === 'ai-issues'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          AI Issues
        </button>
      </div>

      {/* Steps with Evidence */}
      <div className="space-y-4">
        {filteredSteps.map((step) => (
          <Card key={step.id} className="step-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Step {step.order}: {step.action}
                </CardTitle>
                <StatusBadge status={step.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {step.actual_result && (
                <p className="text-sm text-muted-foreground">{step.actual_result}</p>
              )}

              {/* Evidence Thumbnails */}
              {step.attachments && step.attachments.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Evidence:</span>
                  {step.attachments.slice(0, 5).map((att) => (
                    <div key={att.id} className="relative">
                      <img
                        src={att.thumbnailUrl || '/placeholder.svg'}
                        alt={att.fileName}
                        className={cn(
                          'w-12 h-9 object-cover rounded cursor-pointer',
                          'hover:ring-2 ring-primary transition-all evidence-thumbnail',
                          att.aiHasIssues && 'ring-2 ring-destructive'
                        )}
                        onClick={() => onOpenViewer?.(att.id)}
                      />
                      {att.aiHasIssues && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
                      )}
                    </div>
                  ))}
                  {step.attachments.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{step.attachments.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredSteps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No steps match the current filter.
          </div>
        )}
      </div>
    </div>
  );
};
