/**
 * Module 4C-3: Run Defects Summary Card
 * Shows defect statistics for a test run
 */

import React from 'react';
import { Bug, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { RunDefectSummary } from '../../hooks/useRunDefects';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '../../types/defect-linking';

interface RunDefectsSummaryCardProps {
  summary: RunDefectSummary;
  isLoading?: boolean;
  className?: string;
}

export function RunDefectsSummaryCard({
  summary,
  isLoading,
  className,
}: RunDefectsSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="pt-6">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const openCount = summary.by_status.open + summary.by_status.reopened + summary.by_status.in_progress;
  const closedCount = summary.by_status.resolved + summary.by_status.closed;
  const resolvedPercentage = summary.total > 0 
    ? Math.round((closedCount / summary.total) * 100) 
    : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bug className="h-4 w-4" />
          Defects
          {summary.total > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {summary.total}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.total === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            No defects logged
          </div>
        ) : (
          <>
            {/* Critical alert */}
            {summary.open_critical > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  {summary.open_critical} critical defect{summary.open_critical !== 1 ? 's' : ''} open
                </span>
              </div>
            )}

            {/* Resolution progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Resolution Progress</span>
                <span className="font-medium">{resolvedPercentage}%</span>
              </div>
              <Progress value={resolvedPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{openCount} open</span>
                <span>{closedCount} resolved</span>
              </div>
            </div>

            {/* Severity breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                By Severity
              </span>
              <div className="flex flex-wrap gap-2">
                {(['critical', 'major', 'minor', 'trivial'] as const).map((severity) => {
                  const count = summary.by_severity[severity];
                  if (count === 0) return null;
                  const config = SEVERITY_CONFIG[severity];
                  return (
                    <Badge
                      key={severity}
                      className={cn('text-xs', config.bgClass, config.textClass)}
                    >
                      {count} {config.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
