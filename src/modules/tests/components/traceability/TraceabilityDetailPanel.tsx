/**
 * Traceability Detail Panel
 * Shows full forward and backward trace chain for a requirement
 */

import React from 'react';
import {
  X,
  FileText,
  Link2,
  PlayCircle,
  Bug,
  ChevronRight,
  ArrowDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { TraceabilityChain } from '../../hooks/useTraceabilityMatrix';

interface TraceabilityDetailPanelProps {
  chain: TraceabilityChain;
  onClose: () => void;
}

const RISK_COLORS = {
  critical: 'text-status-error bg-status-error/10 border-status-error',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200',
  medium: 'text-status-warning bg-status-warning/10 border-status-warning',
  low: 'text-status-success bg-status-success/10 border-status-success',
};

function StatusBadge({ status }: { status: string }) {
  const config = {
    passed: { icon: CheckCircle2, color: 'text-status-success bg-status-success/10' },
    failed: { icon: XCircle, color: 'text-status-error bg-status-error/10' },
    blocked: { icon: MinusCircle, color: 'text-status-warning bg-status-warning/10' },
    in_progress: { icon: Clock, color: 'text-accent-primary bg-accent-subtle' },
    not_run: { icon: Clock, color: 'text-text-tertiary bg-surface-3' },
  }[status] || { icon: Clock, color: 'text-text-tertiary bg-surface-3' };

  const Icon = config.icon;

  return (
    <Badge className={cn('text-xs', config.color)}>
      <Icon className="h-3 w-3 mr-1" />
      {status.replace('_', ' ')}
    </Badge>
  );
}

function ChainConnector() {
  return (
    <div className="flex justify-center py-2">
      <div className="flex flex-col items-center">
        <div className="w-px h-4 bg-border-default" />
        <ArrowDown className="h-4 w-4 text-text-quaternary" />
        <div className="w-px h-4 bg-border-default" />
      </div>
    </div>
  );
}

export function TraceabilityDetailPanel({ chain, onClose }: TraceabilityDetailPanelProps) {
  const { requirement, testCases, executions, defects, coverage, riskLevel, riskFactors } = chain;

  // Group executions by test case
  const executionsByCase = new Map<string, typeof executions>();
  executions.forEach(e => {
    const existing = executionsByCase.get(e.caseId) || [];
    existing.push(e);
    executionsByCase.set(e.caseId, existing);
  });

  // Group defects by execution
  const defectsByExecution = new Map<string, typeof defects>();
  defects.forEach(d => {
    if (d.linkedExecutionId) {
      const existing = defectsByExecution.get(d.linkedExecutionId) || [];
      existing.push(d);
      defectsByExecution.set(d.linkedExecutionId, existing);
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-[550px] bg-surface-1 border-l border-border-default flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-default flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Traceability Chain</h2>
            <p className="text-sm text-text-tertiary">Forward trace: Requirement → Tests → Executions → Defects</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Risk Summary */}
            <Card className={cn('border-2', RISK_COLORS[riskLevel])}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium uppercase tracking-wide">Risk Level</span>
                  <Badge className={cn('text-sm font-bold', RISK_COLORS[riskLevel])}>
                    {riskLevel.toUpperCase()}
                  </Badge>
                </div>
                {riskFactors.length > 0 && (
                  <div className="space-y-1">
                    {riskFactors.map((factor, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                        <AlertTriangle className="h-3 w-3 text-status-warning shrink-0" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Level 1: Requirement */}
            <Card className="bg-surface-2 border-border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent-primary" />
                  <span className="text-text-tertiary">Requirement</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-accent-primary font-medium">
                        {requirement.key}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {requirement.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-primary">{requirement.title}</p>
                    {requirement.parentKey && (
                      <p className="text-xs text-text-tertiary mt-1">
                        Parent: {requirement.parentKey}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {requirement.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <ChainConnector />

            {/* Level 2: Test Cases */}
            <Card className="bg-surface-2 border-border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-accent-primary" />
                  <span className="text-text-tertiary">Test Cases</span>
                  <Badge variant="secondary">{testCases.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testCases.length === 0 ? (
                  <div className="text-center py-4 text-text-tertiary text-sm">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No test cases linked to this requirement
                  </div>
                ) : (
                  <div className="space-y-2">
                    {testCases.map(tc => {
                      const tcExecs = executionsByCase.get(tc.id) || [];
                      const passedCount = tcExecs.filter(e => e.status === 'passed').length;
                      const failedCount = tcExecs.filter(e => e.status === 'failed').length;

                      return (
                        <div
                          key={tc.id}
                          className="p-2 bg-surface-1 rounded-md border border-border-default"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-accent-primary">
                                {tc.caseKey}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {tc.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              {passedCount > 0 && (
                                <span className="text-status-success">{passedCount}✓</span>
                              )}
                              {failedCount > 0 && (
                                <span className="text-status-error">{failedCount}✗</span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-text-primary line-clamp-1">{tc.title}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <ChainConnector />

            {/* Level 3: Executions */}
            <Card className="bg-surface-2 border-border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-accent-primary" />
                  <span className="text-text-tertiary">Executions</span>
                  <Badge variant="secondary">{executions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {executions.length === 0 ? (
                  <div className="text-center py-4 text-text-tertiary text-sm">
                    {testCases.length > 0 ? (
                      <>
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Tests have not been executed yet
                      </>
                    ) : (
                      'No test cases to execute'
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {executions
                      .sort((a, b) => new Date(b.executedAt || 0).getTime() - new Date(a.executedAt || 0).getTime())
                      .slice(0, 10)
                      .map(exec => {
                        const execDefects = defectsByExecution.get(exec.id) || [];
                        const tc = testCases.find(t => t.id === exec.caseId);

                        return (
                          <div
                            key={exec.id}
                            className="p-2 bg-surface-1 rounded-md border border-border-default"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <StatusBadge status={exec.status} />
                                {tc && (
                                  <span className="text-xs text-text-tertiary font-mono">
                                    {tc.caseKey}
                                  </span>
                                )}
                              </div>
                              {execDefects.length > 0 && (
                                <div className="flex items-center gap-1 text-status-error">
                                  <Bug className="h-3 w-3" />
                                  <span className="text-xs">{execDefects.length}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-tertiary">
                              <span>{exec.cycleName}</span>
                              {exec.executedAt && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {new Date(exec.executedAt).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {executions.length > 10 && (
                      <p className="text-xs text-text-tertiary text-center py-1">
                        + {executions.length - 10} more executions
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <ChainConnector />

            {/* Level 4: Defects */}
            <Card className="bg-surface-2 border-border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bug className="h-4 w-4 text-status-error" />
                  <span className="text-text-tertiary">Defects</span>
                  <Badge variant="secondary">{defects.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {defects.length === 0 ? (
                  <div className="text-center py-4 text-text-tertiary text-sm">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50 text-status-success" />
                    No defects linked to this requirement
                  </div>
                ) : (
                  <div className="space-y-2">
                    {defects.map(defect => (
                      <div
                        key={defect.id}
                        className="p-2 bg-surface-1 rounded-md border border-border-default"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-status-error font-medium">
                              {defect.defectKey}
                            </span>
                            <Badge 
                              className={cn(
                                'text-[10px]',
                                defect.severity === 'critical' && 'text-status-error bg-status-error/10',
                                defect.severity === 'high' && 'text-orange-600 bg-orange-50',
                                defect.severity === 'medium' && 'text-status-warning bg-status-warning/10',
                                defect.severity === 'low' && 'text-text-tertiary bg-surface-3',
                              )}
                            >
                              {defect.severity}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {defect.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-primary line-clamp-1">{defect.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coverage Summary */}
            <Separator className="my-4" />
            
            <Card className="bg-surface-2 border-border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Coverage Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-surface-1 rounded">
                    <div className="text-xs text-text-tertiary">Test Cases</div>
                    <div className="font-bold text-text-primary">{coverage.testCount}</div>
                  </div>
                  <div className="p-2 bg-surface-1 rounded">
                    <div className="text-xs text-text-tertiary">Executions</div>
                    <div className="font-bold text-text-primary">{coverage.executionCount}</div>
                  </div>
                  <div className="p-2 bg-surface-1 rounded">
                    <div className="text-xs text-text-tertiary">Pass Rate</div>
                    <div className={cn(
                      'font-bold',
                      coverage.passRate >= 80 ? 'text-status-success' :
                      coverage.passRate >= 50 ? 'text-status-warning' :
                      'text-status-error'
                    )}>
                      {Math.round(coverage.passRate)}%
                    </div>
                  </div>
                  <div className="p-2 bg-surface-1 rounded">
                    <div className="text-xs text-text-tertiary">Open Defects</div>
                    <div className={cn(
                      'font-bold',
                      coverage.openDefectCount > 0 ? 'text-status-error' : 'text-status-success'
                    )}>
                      {coverage.openDefectCount}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default TraceabilityDetailPanel;
