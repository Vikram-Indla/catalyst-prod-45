/**
 * Case Details Panel Component
 * Right panel showing case details with tabs
 */

import React, { useState } from 'react';
import {
  X,
  Edit,
  Copy,
  PlayCircle,
  Clock,
  User,
  Calendar,
  Tag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TestCase, TestStep, CaseStatus, ExecutionStatus } from '../../api/types';
import { formatDistanceToNow, format } from 'date-fns';

interface CaseDetailsPanelProps {
  testCase: TestCase | null;
  steps: TestStep[];
  isLoading?: boolean;
  onClose: () => void;
  onEdit: (testCase: TestCase) => void;
  onDuplicate: (testCase: TestCase) => void;
  onAddToCycle: (testCase: TestCase) => void;
}

const STATUS_CONFIG: Record<CaseStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ready: { label: 'Ready', className: 'bg-info/10 text-info border-info/20' },
  approved: { label: 'Approved', className: 'bg-success/10 text-success border-success/20' },
  needs_update: { label: 'Needs Update', className: 'bg-warning/10 text-warning border-warning/20' },
  deprecated: { label: 'Deprecated', className: 'bg-danger/10 text-danger border-danger/20' },
};

const EXECUTION_STATUS_ICON: Record<ExecutionStatus, React.ElementType> = {
  not_run: Minus,
  in_progress: Clock,
  passed: CheckCircle2,
  failed: XCircle,
  blocked: AlertCircle,
  skipped: Minus,
};

export function CaseDetailsPanel({
  testCase,
  steps,
  isLoading,
  onClose,
  onEdit,
  onDuplicate,
  onAddToCycle,
}: CaseDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('details');

  if (!testCase && !isLoading) {
    return null;
  }

  if (isLoading || !testCase) {
    return (
      <div className="w-[400px] border-l border-border-default bg-surface-0 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[testCase.status];
  const LastRunIcon = testCase._lastRunStatus
    ? EXECUTION_STATUS_ICON[testCase._lastRunStatus]
    : null;

  return (
    <div className="w-[400px] border-l border-border-default bg-surface-0 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border-subtle">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-primary font-medium">
              {testCase.case_key}
            </span>
            <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold truncate">{testCase.title}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 p-3 border-b border-border-subtle">
        <Button size="sm" onClick={() => onEdit(testCase)} className="gap-1">
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDuplicate(testCase)} className="gap-1">
          <Copy className="h-4 w-4" />
          Clone
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAddToCycle(testCase)} className="gap-1">
          <PlayCircle className="h-4 w-4" />
          Add to Cycle
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-4 border-b border-border-subtle rounded-none bg-transparent h-auto py-0">
          <TabsTrigger
            value="details"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="steps"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            Steps ({steps.length})
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            History
          </TabsTrigger>
          <TabsTrigger
            value="links"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            Links
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="details" className="p-4 m-0 space-y-4">
            {/* Description */}
            {testCase.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{testCase.description}</p>
              </div>
            )}

            {/* Preconditions */}
            {testCase.preconditions && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Preconditions</h4>
                <p className="text-sm">{testCase.preconditions}</p>
              </div>
            )}

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              {/* Priority */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Priority</h4>
                {testCase.priority ? (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 rounded-full bg-muted-foreground"
                      style={testCase.priority.color ? { backgroundColor: testCase.priority.color } : undefined}
                    />
                    <span className="text-sm">{testCase.priority.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not set</span>
                )}
              </div>

              {/* Type */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Type</h4>
                <span className="text-sm">
                  {testCase.case_type?.name || <span className="text-muted-foreground">Not set</span>}
                </span>
              </div>

              {/* Owner */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Owner</h4>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">
                    {testCase.owner_name || <span className="text-muted-foreground">Unassigned</span>}
                  </span>
                </div>
              </div>

              {/* Estimated Time */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Est. Time</h4>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">
                    {testCase.estimated_time_minutes
                      ? `${testCase.estimated_time_minutes} min`
                      : <span className="text-muted-foreground">—</span>}
                  </span>
                </div>
              </div>

              {/* Folder */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Folder</h4>
                <span className="text-sm">
                  {testCase.folder?.name || <span className="text-muted-foreground">Root</span>}
                </span>
              </div>

              {/* Last Run */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Last Run</h4>
                {testCase._lastRunStatus && LastRunIcon ? (
                  <div className="flex items-center gap-1.5">
                    <LastRunIcon className={cn(
                      'h-3.5 w-3.5',
                      testCase._lastRunStatus === 'passed' && 'text-success',
                      testCase._lastRunStatus === 'failed' && 'text-danger',
                      testCase._lastRunStatus === 'blocked' && 'text-warning'
                    )} />
                    <span className="text-sm capitalize">{testCase._lastRunStatus.replace('_', ' ')}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Never run</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Labels */}
            {testCase.labels && testCase.labels.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Labels</h4>
                <div className="flex flex-wrap gap-1">
                  {testCase.labels.map((label) => (
                    <Badge
                      key={label.id}
                      style={{ backgroundColor: label.color }}
                      className="text-white text-xs"
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created {format(new Date(testCase.created_at), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {formatDistanceToNow(new Date(testCase.updated_at), { addSuffix: true })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="steps" className="p-4 m-0">
            {steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No steps defined</p>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="p-3 rounded-lg border border-border-subtle bg-surface-2"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        Step {step.step_number}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Action:</span>
                        <p>{step.action}</p>
                      </div>
                      {step.test_data && (
                        <div>
                          <span className="text-muted-foreground text-xs">Test Data:</span>
                          <p className="font-mono text-xs bg-muted p-1 rounded">
                            {step.test_data}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground text-xs">Expected Result:</span>
                        <p>{step.expected_result}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="p-4 m-0">
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Execution history coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="links" className="p-4 m-0">
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Linked items coming soon</p>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default CaseDetailsPanel;
