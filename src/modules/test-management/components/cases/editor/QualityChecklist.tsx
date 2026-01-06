/**
 * Quality Checklist Component
 * Real-time validation for test case completeness
 */

import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface QualityCheck {
  id: string;
  label: string;
  passed: boolean;
  required: boolean;
  fixAction?: () => void;
}

interface QualityChecklistProps {
  title: string;
  objective: string;
  preconditions: string;
  steps: Array<{ action: string; expected_result: string }>;
  linkedRequirements: string[];
  priority: string;
  onScrollToSection?: (section: string) => void;
}

export function QualityChecklist({
  title,
  objective,
  preconditions,
  steps,
  linkedRequirements,
  priority,
  onScrollToSection
}: QualityChecklistProps) {
  const checks: QualityCheck[] = [
    {
      id: 'title',
      label: 'Title provided',
      passed: !!title?.trim(),
      required: true,
      fixAction: () => onScrollToSection?.('title')
    },
    {
      id: 'objective',
      label: 'Objective defined',
      passed: !!objective?.trim(),
      required: false,
      fixAction: () => onScrollToSection?.('objective')
    },
    {
      id: 'preconditions',
      label: 'Preconditions specified',
      passed: !!preconditions?.trim(),
      required: false,
      fixAction: () => onScrollToSection?.('preconditions')
    },
    {
      id: 'hasSteps',
      label: 'Has test steps',
      passed: steps.length > 0,
      required: true,
      fixAction: () => onScrollToSection?.('steps')
    },
    {
      id: 'stepsComplete',
      label: 'All steps have expected results',
      passed: steps.length > 0 && steps.every(s => 
        !s.action?.trim() || (s.action?.trim() && s.expected_result?.trim())
      ),
      required: true,
      fixAction: () => onScrollToSection?.('steps')
    },
    {
      id: 'traceability',
      label: 'Linked to requirement',
      passed: linkedRequirements.length > 0,
      required: true,
      fixAction: () => onScrollToSection?.('traceability')
    },
    {
      id: 'priority',
      label: 'Priority set',
      passed: !!priority,
      required: false,
      fixAction: () => onScrollToSection?.('priority')
    }
  ];

  const requiredChecks = checks.filter(c => c.required);
  const passedRequired = requiredChecks.filter(c => c.passed).length;
  const allRequiredPassed = passedRequired === requiredChecks.length;

  const totalPassed = checks.filter(c => c.passed).length;
  const score = Math.round((totalPassed / checks.length) * 100);

  const getScoreColor = () => {
    if (score >= 90) return 'bg-success';
    if (score >= 70) return 'bg-warning';
    return 'bg-destructive';
  };

  const getScoreBadge = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Quality Checklist</CardTitle>
          <Badge variant={getScoreBadge()} className="text-xs">
            {score}%
          </Badge>
        </div>
        {!allRequiredPassed && (
          <p className="text-xs text-destructive mt-1">
            {requiredChecks.length - passedRequired} required item(s) incomplete - 
            cannot mark as Ready
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {checks.map(check => (
            <div
              key={check.id}
              className={cn(
                "flex items-center justify-between py-1.5 px-2 rounded text-sm",
                !check.passed && check.required && "bg-destructive/5"
              )}
            >
              <div className="flex items-center gap-2">
                {check.passed ? (
                  <CheckCircle className="w-4 h-4 text-success shrink-0" />
                ) : check.required ? (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                )}
                <span className={cn(
                  "text-xs",
                  check.passed ? "text-muted-foreground" : "text-foreground font-medium"
                )}>
                  {check.label}
                  {check.required && <span className="text-destructive ml-0.5">*</span>}
                </span>
              </div>
              {!check.passed && check.fixAction && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 text-[10px] px-1.5"
                  onClick={check.fixAction}
                >
                  Fix
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Quality Score</span>
            <span>{totalPassed}/{checks.length}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all duration-300", getScoreColor())}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Validate if test case can be marked as Ready
 */
export function validateTestCaseForReady(
  title: string,
  objective: string,
  steps: Array<{ action?: string; expected_result?: string }>,
  linkedRequirements: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!title?.trim()) {
    errors.push('Title is required');
  }

  if (steps.length === 0) {
    errors.push('At least one test step is required');
  }

  const stepsWithMissingExpected = steps.filter(
    s => s.action?.trim() && !s.expected_result?.trim()
  );
  if (stepsWithMissingExpected.length > 0) {
    errors.push(`${stepsWithMissingExpected.length} step(s) missing expected results`);
  }

  if (linkedRequirements.length === 0) {
    errors.push('Must be linked to at least one requirement');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate quality score
 */
export function calculateQualityScore(
  title: string,
  objective: string,
  preconditions: string,
  steps: Array<{ action?: string; expected_result?: string }>,
  linkedRequirements: string[],
  priority: string
): number {
  const checks = [
    !!title?.trim(),
    !!objective?.trim(),
    !!preconditions?.trim(),
    steps.length > 0,
    steps.length > 0 && steps.every(s => !s.action?.trim() || s.expected_result?.trim()),
    linkedRequirements.length > 0,
    !!priority
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
