/**
 * Test Case Row - Selectable row in the test repository browser
 */

import React from 'react';
import { Clock, Bot, User, Settings } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CATALYST_V5, TEST_PRIORITY_COLORS } from '@/lib/catalyst-colors';
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

export function TestCaseRow({ testCase, isSelected, onToggle }: TestCaseRowProps) {
  const priorityColors = TEST_PRIORITY_COLORS[testCase.priority] || TEST_PRIORITY_COLORS.medium;
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span 
              className="flex-1 text-sm truncate"
              style={{ 
                color: isDisabled ? CATALYST_V5.slate[400] : CATALYST_V5.slate[700] 
              }}
            >
              {testCase.title}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{testCase.title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Type Badge */}
      <Badge 
        variant="outline" 
        className="text-[10px] px-1.5 py-0 shrink-0"
        style={{ 
          borderColor: isDisabled ? CATALYST_V5.slate[300] : CATALYST_V5.slate[300],
          color: isDisabled ? CATALYST_V5.slate[400] : CATALYST_V5.slate[600],
        }}
      >
        {TYPE_LABELS[testCase.test_type] || testCase.test_type}
      </Badge>

      {/* Priority Badge */}
      <Badge 
        className="text-[10px] px-1.5 py-0 shrink-0"
        style={{
          backgroundColor: isDisabled ? CATALYST_V5.slate[200] : priorityColors.bg,
          color: isDisabled ? CATALYST_V5.slate[400] : priorityColors.text,
        }}
      >
        {testCase.priority.charAt(0).toUpperCase() + testCase.priority.slice(1)}
      </Badge>

      {/* Duration */}
      <div 
        className="flex items-center gap-1 text-[10px] shrink-0"
        style={{ color: isDisabled ? CATALYST_V5.slate[400] : CATALYST_V5.slate[500] }}
      >
        <Clock className="h-3 w-3" />
        {formatDuration(testCase.estimated_duration_minutes)}
      </div>

      {/* Automation Status Icon */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="shrink-0">
              {getAutomationIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="capitalize">{testCase.automation_status}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Already Added Badge */}
      {isDisabled && (
        <Badge 
          className="text-[10px] px-1.5 py-0 shrink-0"
          style={{
            backgroundColor: CATALYST_V5.slate[200],
            color: CATALYST_V5.slate[500],
          }}
        >
          Added
        </Badge>
      )}
    </div>
  );
}
