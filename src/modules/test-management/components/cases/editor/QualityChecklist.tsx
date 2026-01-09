/**
 * Quality Checklist Component - Pixel Perfect Match
 * Real-time validation for test case completeness
 */

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const incompleteRequired = requiredChecks.length - passedRequired;

  const totalPassed = checks.filter(c => c.passed).length;
  const score = Math.round((totalPassed / checks.length) * 100);

  return (
    <div
      className="rounded-lg border bg-white"
      style={{ borderColor: '#e5e5e5' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-neutral-900" style={{ fontSize: '14px' }}>
            Quality Checklist
          </h3>
          <Badge
            className={cn(
              'px-2 py-0.5 text-xs font-semibold rounded border-0',
              score >= 70 ? 'bg-[#059669] text-white' : 'bg-[#dc2626] text-white'
            )}
          >
            {score}%
          </Badge>
        </div>

        {/* Subtitle */}
        {incompleteRequired > 0 && (
          <p className="text-sm mb-4" style={{ color: '#d97706' }}>
            {incompleteRequired} required item(s) incomplete - cannot mark as Ready
          </p>
        )}

        {/* Checklist Items */}
        <div className="space-y-0">
          {checks.map((check) => (
            <div
              key={check.id}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 -mx-3 rounded',
                !check.passed && check.required && 'bg-[#fef2f2]'
              )}
            >
              <div className="flex items-center gap-2.5">
                {check.passed ? (
                  <CheckCircle className="w-5 h-5 text-[#059669]" />
                ) : check.required ? (
                  <XCircle className="w-5 h-5 text-[#dc2626]" />
                ) : (
                  <Clock className="w-5 h-5 text-[#d97706]" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    check.passed ? 'text-neutral-500' : 'text-neutral-900'
                  )}
                >
                  {check.label}
                  {check.required && !check.passed && (
                    <span className="text-[#dc2626] ml-0.5">*</span>
                  )}
                </span>
              </div>
              {!check.passed && check.fixAction && (
                <button
                  onClick={check.fixAction}
                  className="text-sm text-neutral-500 hover:text-neutral-700"
                >
                  Fix
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Quality Score */}
        <div className="mt-4 pt-3 border-t" style={{ borderColor: '#e5e5e5' }}>
          <div className="flex items-center justify-between text-sm text-neutral-500 mb-2">
            <span>Quality Score</span>
            <span>{totalPassed}/{checks.length}</span>
          </div>
          <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                score >= 70 ? 'bg-[#059669]' : 'bg-[#dc2626]'
              )}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
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
