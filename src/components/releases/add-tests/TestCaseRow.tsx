/**
 * Test Case Row - Selectable row in the test repository browser
 */

import React from 'react';
import { Clock, Bot, User, Settings } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Lozenge, Tooltip } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { cn } from '@/lib/utils';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { TestCase } from '@/types/add-tests.types';

interface TestCaseRowProps {
  testCase: TestCase;
  isSelected: boolean;
  onToggle: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  functional: 'Func',
  integration: 'Int',
  e2e: 'E2E',
  performance: 'Perf',
};

const PRIORITY_APPEARANCE: Record<string, LozengeAppearance> = {
  critical: 'removed',
  high: 'moved',
  medium: 'moved',
  low: 'success',
};

export function TestCaseRow({ testCase, isSelected, onToggle }: TestCaseRowProps) {
  const priorityAppearance: LozengeAppearance = PRIORITY_APPEARANCE[testCase.priority] ?? 'default';
  const isDisabled = testCase.alreadyInCycle;

  const getAutomationIcon = () => {
    switch (testCase.automation_status) {
      case 'automated':
        return <Bot className="h-3.5 w-3.5" style={{ color: CATALYST_V5.teal }} />;
      case 'manual':
        return <User className="h-3.5 w-3.5" style={{ color: CATALYST_V5.slate[400] }} />;
      case 'partial':
        return <Settings className="h-3.5 w-3.5" style={{ color: CATALYST_V5.warning }} />;
      default:
        return null;
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div
      onClick={() => !isDisabled && onToggle()}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2",
        isDisabled && "cursor-not-allowed"
      )}
      style={{
        backgroundColor: isDisabled 
          ? CATALYST_V5.slate[100] 
          : isSelected 
            ? CATALYST_V5.primaryLighter 
            : 'white',
        borderLeftColor: isSelected ? CATALYST_V5.primary : 'transparent',
      }}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => !isDisabled && onToggle()}
        disabled={isDisabled}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4"
      />

      {/* Test ID */}
      <span 
        className="text-xs font-mono shrink-0"
        style={{ 
          color: isDisabled ? CATALYST_V5.slate[400] : CATALYST_V5.primary 
        }}
      >
        {testCase.test_case_id}
      </span>

      {/* Title */}
      <Tooltip content={<p className="max-w-xs">{testCase.title}</p>}>
        <span
          className="flex-1 text-sm truncate"
          style={{
            color: isDisabled ? CATALYST_V5.slate[400] : CATALYST_V5.slate[700]
          }}
        >
          {testCase.title}
        </span>
      </Tooltip>

      {/* Type Badge */}
      <span className="shrink-0">
        <Lozenge appearance="default">
          {TYPE_LABELS[testCase.test_type] || testCase.test_type}
        </Lozenge>
      </span>

      {/* Priority Badge */}
      <span className="shrink-0">
        <Lozenge appearance={isDisabled ? 'default' : priorityAppearance}>
          {testCase.priority.charAt(0).toUpperCase() + testCase.priority.slice(1)}
        </Lozenge>
      </span>

      {/* Duration */}
      <div 
        className="flex items-center gap-1 text-[10px] shrink-0"
        style={{ color: isDisabled ? CATALYST_V5.slate[400] : CATALYST_V5.slate[500] }}
      >
        <Clock className="h-3 w-3" />
        {formatDuration(testCase.estimated_duration_minutes)}
      </div>

      {/* Automation Status Icon */}
      <Tooltip content={<p className="capitalize">{testCase.automation_status}</p>}>
        <div className="shrink-0">
          {getAutomationIcon()}
        </div>
      </Tooltip>

      {/* Already Added Badge */}
      {isDisabled && (
        <span className="shrink-0">
          <Lozenge appearance="default">
            Added
          </Lozenge>
        </span>
      )}
    </div>
  );
}
