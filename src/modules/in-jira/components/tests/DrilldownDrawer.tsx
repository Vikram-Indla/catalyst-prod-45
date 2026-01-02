/**
 * Drilldown Drawer Component
 * Shows filtered test cases, executions, or defects in a slide-over drawer
 */

import React from 'react';
import { X, FileText, PlayCircle, Bug, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TraceabilityTestCase, TraceabilityExecution, TraceabilityDefect } from '../../hooks/useTraceability';

interface DrilldownDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'coverage' | 'execution' | 'defect';
  storyId: string | null;
  storyTitle?: string;
  testCases?: TraceabilityTestCase[];
  executions?: TraceabilityExecution[];
  defects?: TraceabilityDefect[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'passed': return <CheckCircle className="h-4 w-4 text-status-success" />;
    case 'failed': return <XCircle className="h-4 w-4 text-status-error" />;
    case 'blocked': return <AlertTriangle className="h-4 w-4 text-status-warning" />;
    case 'skipped': return <Clock className="h-4 w-4 text-text-quaternary" />;
    default: return <Clock className="h-4 w-4 text-text-tertiary" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'critical':
    case 'high': return 'text-status-error border-status-error/30';
    case 'medium': return 'text-status-warning border-status-warning/30';
    default: return 'text-text-secondary border-border-default';
  }
};

export function DrilldownDrawer({
  open,
  onOpenChange,
  type,
  storyId,
  storyTitle,
  testCases = [],
  executions = [],
  defects = [],
}: DrilldownDrawerProps) {
  const getTitle = () => {
    switch (type) {
      case 'coverage': return 'Test Cases';
      case 'execution': return 'Executions';
      case 'defect': return 'Defects';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'coverage': return <FileText className="h-5 w-5 text-accent-primary" />;
      case 'execution': return <PlayCircle className="h-5 w-5 text-status-info" />;
      case 'defect': return <Bug className="h-5 w-5 text-status-error" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
            <Badge variant="secondary" className="ml-2">
              {type === 'coverage' ? testCases.length : type === 'execution' ? executions.length : defects.length}
            </Badge>
          </SheetTitle>
          {storyTitle && (
            <p className="text-sm text-text-secondary">
              Linked to: <span className="font-medium">{storyTitle}</span>
            </p>
          )}
        </SheetHeader>

        <Separator className="my-4" />

        <ScrollArea className="h-[calc(100vh-180px)]">
          {type === 'coverage' && (
            <div className="space-y-2">
              {testCases.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-text-quaternary" />
                  <p className="text-sm text-text-secondary">No test cases linked to this story</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Use "Generate Tests" to create test cases automatically
                  </p>
                </div>
              ) : (
                testCases.map(tc => (
                  <div
                    key={tc.id}
                    className="p-3 rounded-lg border border-border-default bg-surface-2 hover:bg-surface-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-text-primary">{tc.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn('text-xs', getPriorityColor(tc.priority))}>
                            {tc.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {tc.status}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-text-tertiary">{tc.id.slice(0, 8)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {type === 'execution' && (
            <div className="space-y-2">
              {executions.length === 0 ? (
                <div className="text-center py-8">
                  <PlayCircle className="h-8 w-8 mx-auto mb-2 text-text-quaternary" />
                  <p className="text-sm text-text-secondary">No executions for this story</p>
                </div>
              ) : (
                executions.map(exec => (
                  <div
                    key={exec.id}
                    className="p-3 rounded-lg border border-border-default bg-surface-2 hover:bg-surface-3 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(exec.status)}
                        <span className="text-sm text-text-primary capitalize">{exec.status}</span>
                      </div>
                      <div className="text-right">
                        {exec.cycle && (
                          <p className="text-xs text-text-secondary">{exec.cycle.name}</p>
                        )}
                        {exec.executed_at && (
                          <p className="text-xs text-text-tertiary">
                            {format(new Date(exec.executed_at), 'MMM d, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {type === 'defect' && (
            <div className="space-y-2">
              {defects.length === 0 ? (
                <div className="text-center py-8">
                  <Bug className="h-8 w-8 mx-auto mb-2 text-text-quaternary" />
                  <p className="text-sm text-text-secondary">No defects linked to this story</p>
                </div>
              ) : (
                defects.map(def => (
                  <div
                    key={def.id}
                    className="p-3 rounded-lg border border-status-error/30 bg-status-error/5 hover:bg-status-error/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-status-error" />
                      <span className="text-sm font-mono text-text-primary">{def.defect_work_item_id}</span>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      Linked to execution {def.execution_id.slice(0, 8)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
