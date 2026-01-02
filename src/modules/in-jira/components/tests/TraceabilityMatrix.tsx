/**
 * Traceability Matrix Component
 * Matrix view with stories grouped by feature, showing coverage/execution/defects
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Bug, FileText, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FeatureGroup, StoryCoverage, TraceabilityTestCase, TraceabilityExecution, TraceabilityDefect } from '../../hooks/useTraceability';

interface TraceabilityMatrixProps {
  featureGroups: FeatureGroup[];
  noFeatureStories: StoryCoverage[];
  onCoverageClick: (storyId: string, testCases: TraceabilityTestCase[]) => void;
  onExecutionClick: (storyId: string, executions: TraceabilityExecution[]) => void;
  onDefectClick: (storyId: string, defects: TraceabilityDefect[]) => void;
  onGenerateTests?: (storyId: string, storyTitle: string) => void;
}

const getRiskColor = (score: number) => {
  if (score >= 70) return 'text-status-error bg-status-error/10';
  if (score >= 40) return 'text-status-warning bg-status-warning/10';
  if (score >= 20) return 'text-status-info bg-status-info/10';
  return 'text-status-success bg-status-success/10';
};

const getRiskLabel = (score: number) => {
  if (score >= 70) return 'Critical';
  if (score >= 40) return 'High';
  if (score >= 20) return 'Medium';
  return 'Low';
};

function StoryRow({
  coverage,
  onCoverageClick,
  onExecutionClick,
  onDefectClick,
  onGenerateTests,
}: {
  coverage: StoryCoverage;
  onCoverageClick: (storyId: string, testCases: TraceabilityTestCase[]) => void;
  onExecutionClick: (storyId: string, executions: TraceabilityExecution[]) => void;
  onDefectClick: (storyId: string, defects: TraceabilityDefect[]) => void;
  onGenerateTests?: (storyId: string, storyTitle: string) => void;
}) {
  const { story, testCases, testCaseCount, executionStats, defects, defectCount, riskScore } = coverage;

  const passRate = executionStats.total > 0 
    ? Math.round((executionStats.passed / executionStats.total) * 100) 
    : 0;

  return (
    <tr className="border-b border-border-default hover:bg-surface-2/50 transition-colors">
      {/* Story */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-tertiary">{story.story_key}</span>
          <span className="text-sm text-text-primary truncate max-w-[200px]" title={story.title || story.name}>
            {story.title || story.name}
          </span>
          {story.priority && (
            <Badge variant="outline" className={cn(
              'text-xs',
              story.priority === 'high' || story.priority === 'critical' ? 'border-status-error text-status-error' : ''
            )}>
              {story.priority}
            </Badge>
          )}
        </div>
      </td>

      {/* Test Coverage */}
      <td className="px-4 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onCoverageClick(story.id, testCases)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors',
                  testCaseCount > 0 
                    ? 'text-status-success hover:bg-status-success/10' 
                    : 'text-status-error hover:bg-status-error/10'
                )}
              >
                <FileText className="h-4 w-4" />
                {testCaseCount}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {testCaseCount > 0 ? `${testCaseCount} test cases linked` : 'No test cases - click to view'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {testCaseCount === 0 && onGenerateTests && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 text-xs text-accent-primary h-6 px-2"
            onClick={() => onGenerateTests(story.id, story.title || story.name)}
          >
            Generate
          </Button>
        )}
      </td>

      {/* Execution Status */}
      <td className="px-4 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onExecutionClick(story.id, coverage.executions)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                disabled={executionStats.total === 0}
              >
                {executionStats.total === 0 ? (
                  <span className="text-xs text-text-quaternary">No executions</span>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
                      <span className="text-xs">{executionStats.passed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-status-error" />
                      <span className="text-xs">{executionStats.failed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-status-warning" />
                      <span className="text-xs">{executionStats.blocked}</span>
                    </div>
                    <Progress value={passRate} className="w-16 h-1.5" />
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {executionStats.total > 0
                ? `${executionStats.passed} passed, ${executionStats.failed} failed, ${executionStats.blocked} blocked`
                : 'No executions yet'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>

      {/* Defects */}
      <td className="px-4 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onDefectClick(story.id, defects)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors',
                  defectCount > 0 
                    ? 'text-status-error hover:bg-status-error/10' 
                    : 'text-text-quaternary'
                )}
                disabled={defectCount === 0}
              >
                <Bug className="h-4 w-4" />
                {defectCount}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {defectCount > 0 ? `${defectCount} defects linked` : 'No defects'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>

      {/* Risk Score */}
      <td className="px-4 py-3">
        <Badge className={cn('text-xs font-medium', getRiskColor(riskScore))}>
          {riskScore}% {getRiskLabel(riskScore)}
        </Badge>
      </td>
    </tr>
  );
}

function FeatureSection({
  group,
  onCoverageClick,
  onExecutionClick,
  onDefectClick,
  onGenerateTests,
  defaultExpanded = false,
}: {
  group: FeatureGroup;
  onCoverageClick: (storyId: string, testCases: TraceabilityTestCase[]) => void;
  onExecutionClick: (storyId: string, executions: TraceabilityExecution[]) => void;
  onDefectClick: (storyId: string, defects: TraceabilityDefect[]) => void;
  onGenerateTests?: (storyId: string, storyTitle: string) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { aggregatedStats } = group;

  return (
    <tbody className="bg-surface-1">
      {/* Feature Header Row */}
      <tr 
        className="bg-surface-2 border-b border-border-default cursor-pointer hover:bg-surface-3 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3" colSpan={5}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {expanded ? <ChevronDown className="h-4 w-4 text-text-tertiary" /> : <ChevronRight className="h-4 w-4 text-text-tertiary" />}
              <Layers className="h-4 w-4 text-accent-primary" />
              <span className="font-medium text-text-primary">{group.name}</span>
              {group.epicName && (
                <span className="text-xs text-text-tertiary">({group.epicName})</span>
              )}
              <Badge variant="secondary" className="ml-2">{group.stories.length} stories</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span>{aggregatedStats.storiesWithTests}/{aggregatedStats.totalStories} covered</span>
              <span>{aggregatedStats.totalTests} tests</span>
              <span>{aggregatedStats.passRate}% pass rate</span>
              <span>{aggregatedStats.defectCount} defects</span>
              <Badge className={cn('text-xs', getRiskColor(aggregatedStats.avgRiskScore))}>
                Avg Risk: {aggregatedStats.avgRiskScore}%
              </Badge>
            </div>
          </div>
        </td>
      </tr>

      {/* Story Rows */}
      {expanded && group.stories.map(coverage => (
        <StoryRow
          key={coverage.storyId}
          coverage={coverage}
          onCoverageClick={onCoverageClick}
          onExecutionClick={onExecutionClick}
          onDefectClick={onDefectClick}
          onGenerateTests={onGenerateTests}
        />
      ))}
    </tbody>
  );
}

export function TraceabilityMatrix({
  featureGroups,
  noFeatureStories,
  onCoverageClick,
  onExecutionClick,
  onDefectClick,
  onGenerateTests,
}: TraceabilityMatrixProps) {
  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse">
        <thead className="bg-surface-2 sticky top-0 z-10">
          <tr className="border-b border-border-default">
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Story</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Test Coverage</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Execution Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Defects</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Risk Score</th>
          </tr>
        </thead>

        {featureGroups.map((group, idx) => (
          <FeatureSection
            key={group.id}
            group={group}
            onCoverageClick={onCoverageClick}
            onExecutionClick={onExecutionClick}
            onDefectClick={onDefectClick}
            onGenerateTests={onGenerateTests}
            defaultExpanded={idx < 3}
          />
        ))}

        {noFeatureStories.length > 0 && (
          <tbody className="bg-surface-1">
            <tr className="bg-surface-2 border-b border-border-default">
              <td className="px-4 py-3" colSpan={5}>
                <div className="flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  <span className="font-medium text-text-secondary italic">Unassigned Stories</span>
                  <Badge variant="secondary">{noFeatureStories.length}</Badge>
                </div>
              </td>
            </tr>
            {noFeatureStories.map(coverage => (
              <StoryRow
                key={coverage.storyId}
                coverage={coverage}
                onCoverageClick={onCoverageClick}
                onExecutionClick={onExecutionClick}
                onDefectClick={onDefectClick}
                onGenerateTests={onGenerateTests}
              />
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
