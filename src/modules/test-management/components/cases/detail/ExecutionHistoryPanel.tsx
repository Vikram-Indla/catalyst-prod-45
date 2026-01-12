/**
 * Execution History Panel - Section 3
 * Displays test execution history with results
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Play,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
  Clock,
  User,
  ExternalLink,
  Bug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutionResult, ExecutionStatusEnum, StepResult } from '../../../types/test-case-detail';

// =============================================
// STATUS ICON
// =============================================

function StatusIcon({ status, className }: { status: ExecutionStatusEnum | string; className?: string }) {
  const icons: Record<string, { icon: React.ElementType; color: string }> = {
    passed: { icon: CheckCircle2, color: 'text-emerald-500' },
    failed: { icon: XCircle, color: 'text-red-500' },
    blocked: { icon: AlertCircle, color: 'text-amber-500' },
    skipped: { icon: MinusCircle, color: 'text-slate-400' },
    not_run: { icon: Clock, color: 'text-slate-400' },
  };

  const config = icons[status] || icons.not_run;
  const Icon = config.icon;

  return <Icon className={cn('w-4 h-4', config.color, className)} />;
}

// =============================================
// STEP RESULT ITEM
// =============================================

interface StepResultItemProps {
  result: StepResult;
  stepNumber: number;
}

function StepResultItem({ result, stepNumber }: StepResultItemProps) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-xs font-medium text-slate-600">
          {stepNumber}
        </span>
        <StatusIcon status={result.status} />
      </div>

      <div className="flex-1 min-w-0">
        {result.actualResult && (
          <p className="text-xs text-slate-600 line-clamp-2">{result.actualResult}</p>
        )}
        {result.defectKey && (
          <div className="flex items-center gap-1 mt-1">
            <Bug className="w-3 h-3 text-red-500" />
            <Badge variant="outline" className="text-xs font-mono">
              {result.defectKey}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// EXECUTION ITEM
// =============================================

interface ExecutionItemProps {
  execution: ExecutionResult;
  isOpen: boolean;
  onToggle: () => void;
}

function ExecutionItem({ execution, isOpen, onToggle }: ExecutionItemProps) {
  const statusColors: Record<ExecutionStatusEnum, string> = {
    passed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    blocked: 'bg-amber-100 text-amber-700',
    skipped: 'bg-slate-100 text-slate-600',
    not_run: 'bg-slate-100 text-slate-500',
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors">
            {/* Expand Icon */}
            <div className="shrink-0">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </div>

            {/* Status */}
            <StatusIcon status={execution.status} />

            {/* Details */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('text-xs capitalize', statusColors[execution.status])}>
                  {execution.status.replace('_', ' ')}
                </Badge>
                {execution.cycleName && (
                  <span className="text-xs text-slate-500">{execution.cycleName}</span>
                )}
                {execution.environment && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {execution.environment}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {execution.executedByName}
                </span>
                <span>{new Date(execution.executedAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(execution.duration)}
                </span>
              </div>
            </div>

            {/* View Link */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to execution detail
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 border-t border-slate-100">
            {/* Notes */}
            {execution.notes && (
              <div className="py-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-700">{execution.notes}</p>
              </div>
            )}

            {/* Step Results */}
            {execution.stepResults.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-slate-500 mb-2">Step Results</p>
                <div className="space-y-0">
                  {execution.stepResults.map((result, index) => (
                    <StepResultItem
                      key={result.id}
                      result={result}
                      stepNumber={index + 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// =============================================
// MAIN PANEL
// =============================================

interface ExecutionHistoryPanelProps {
  executions: ExecutionResult[];
  onViewExecution?: (executionId: string) => void;
}

export function ExecutionHistoryPanel({
  executions,
  onViewExecution,
}: ExecutionHistoryPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate summary
  const summary = executions.reduce(
    (acc, exec) => {
      acc[exec.status] = (acc[exec.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-700">Execution History</h3>
          <Badge variant="secondary" className="text-xs">
            {executions.length}
          </Badge>
        </div>

        {/* Quick Stats */}
        {executions.length > 0 && (
          <div className="flex items-center gap-2">
            {summary.passed && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                {summary.passed}
              </span>
            )}
            {summary.failed && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <XCircle className="w-3 h-3" />
                {summary.failed}
              </span>
            )}
            {summary.blocked && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3" />
                {summary.blocked}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Executions List */}
      {executions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Play className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No executions yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Execute this test case to see history
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {executions.map((execution) => (
            <ExecutionItem
              key={execution.id}
              execution={execution}
              isOpen={expandedIds.has(execution.id)}
              onToggle={() => toggleExpanded(execution.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
