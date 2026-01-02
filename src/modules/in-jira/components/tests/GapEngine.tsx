/**
 * Gap Engine Component
 * Displays live gap analysis with actionable items
 */

import React from 'react';
import { AlertTriangle, FileX, PlayCircle, XCircle, Clock, Wand2, Bug, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { TraceabilityGap } from '../../hooks/useTraceability';

interface GapEngineProps {
  gaps: TraceabilityGap[];
  onGenerateTests: (entityId: string, entityTitle: string) => void;
  onCreateFinding: (gap: TraceabilityGap) => void;
  onCreateDefect: (gap: TraceabilityGap) => void;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return <AlertTriangle className="h-4 w-4 text-status-error" />;
    case 'high': return <XCircle className="h-4 w-4 text-status-error" />;
    case 'medium': return <AlertTriangle className="h-4 w-4 text-status-warning" />;
    default: return <Clock className="h-4 w-4 text-status-info" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'border-status-error/50 bg-status-error/5';
    case 'high': return 'border-status-error/30 bg-status-error/5';
    case 'medium': return 'border-status-warning/30 bg-status-warning/5';
    default: return 'border-status-info/30 bg-status-info/5';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'missing_tests': return <FileX className="h-4 w-4" />;
    case 'no_execution': return <PlayCircle className="h-4 w-4" />;
    case 'repeated_failure': return <XCircle className="h-4 w-4" />;
    case 'blocked_stale': return <Clock className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'missing_tests': return 'Missing Tests';
    case 'no_execution': return 'No Execution';
    case 'repeated_failure': return 'Repeated Failure';
    case 'blocked_stale': return 'Stale Blocked';
    default: return 'Coverage Gap';
  }
};

function GapCard({
  gap,
  onGenerateTests,
  onCreateFinding,
  onCreateDefect,
}: {
  gap: TraceabilityGap;
  onGenerateTests: (entityId: string, entityTitle: string) => void;
  onCreateFinding: (gap: TraceabilityGap) => void;
  onCreateDefect: (gap: TraceabilityGap) => void;
}) {
  return (
    <Card className={cn('border', getSeverityColor(gap.severity))}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{getSeverityIcon(gap.severity)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs gap-1">
                  {getTypeIcon(gap.type)}
                  {getTypeLabel(gap.type)}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs capitalize',
                    gap.severity === 'critical' && 'text-status-error border-status-error',
                    gap.severity === 'high' && 'text-status-error border-status-error/50',
                    gap.severity === 'medium' && 'text-status-warning border-status-warning',
                    gap.severity === 'low' && 'text-status-info border-status-info'
                  )}
                >
                  {gap.severity}
                </Badge>
              </div>
              <h4 className="text-sm font-medium text-text-primary">{gap.title}</h4>
              <p className="text-xs text-text-secondary mt-1">{gap.description}</p>
              <p className="text-xs text-text-tertiary mt-1">
                Entity: <span className="font-mono">{gap.entityTitle}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {gap.type === 'missing_tests' && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => onGenerateTests(gap.entityId, gap.entityTitle)}
              >
                <Wand2 className="h-3 w-3" />
                Generate Tests
              </Button>
            )}
            {gap.type === 'repeated_failure' && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1 text-status-error border-status-error/50 hover:bg-status-error/10"
                onClick={() => onCreateDefect(gap)}
              >
                <Bug className="h-3 w-3" />
                Create Defect
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => onCreateFinding(gap)}
            >
              <Plus className="h-3 w-3" />
              Create Finding
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GapEngine({
  gaps,
  onGenerateTests,
  onCreateFinding,
  onCreateDefect,
}: GapEngineProps) {
  // Group gaps by type
  const gapsByType = gaps.reduce((acc, gap) => {
    if (!acc[gap.type]) acc[gap.type] = [];
    acc[gap.type].push(gap);
    return acc;
  }, {} as Record<string, TraceabilityGap[]>);

  const criticalCount = gaps.filter(g => g.severity === 'critical').length;
  const highCount = gaps.filter(g => g.severity === 'high').length;

  if (gaps.length === 0) {
    return (
      <Card className="border-status-success/30 bg-status-success/5">
        <CardContent className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-status-success/20 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No Gaps Detected</h3>
          <p className="text-sm text-text-secondary">
            All stories have test coverage and executions are up to date.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <Card className="bg-surface-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-status-warning" />
                <span className="text-sm font-medium text-text-primary">
                  {gaps.length} Gap{gaps.length !== 1 ? 's' : ''} Detected
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} Critical
                </Badge>
              )}
              {highCount > 0 && (
                <Badge className="text-xs bg-status-error/20 text-status-error border-status-error/30">
                  {highCount} High
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span>{gapsByType['missing_tests']?.length || 0} missing tests</span>
              <span>{gapsByType['repeated_failure']?.length || 0} repeated failures</span>
              <span>{gapsByType['blocked_stale']?.length || 0} stale blocked</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gap List */}
      <div className="space-y-3">
        {gaps.map(gap => (
          <GapCard
            key={gap.id}
            gap={gap}
            onGenerateTests={onGenerateTests}
            onCreateFinding={onCreateFinding}
            onCreateDefect={onCreateDefect}
          />
        ))}
      </div>
    </div>
  );
}
