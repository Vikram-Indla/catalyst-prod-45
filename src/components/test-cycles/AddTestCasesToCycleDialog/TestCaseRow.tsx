/**
 * Test Case Row Component
 * Individual test case item for selection
 */

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TMTestCase } from '@/types/test-management';
import { getPriorityBadgeClass } from './utils';

interface TestCaseRowProps {
  testCase: TMTestCase;
  isSelected: boolean;
  isAlreadyInCycle: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export function TestCaseRow({
  testCase,
  isSelected,
  isAlreadyInCycle,
  onToggle,
  compact = false,
}: TestCaseRowProps) {
  const priorityName = testCase.priority?.name;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 transition-colors',
        isAlreadyInCycle 
          ? 'opacity-50 bg-slate-50 cursor-not-allowed' 
          : 'hover:bg-blue-50 cursor-pointer',
        isSelected && !isAlreadyInCycle && 'bg-blue-50',
        compact && 'py-2 px-3'
      )}
      onClick={() => !isAlreadyInCycle && onToggle()}
    >
      <Checkbox
        checked={isSelected}
        disabled={isAlreadyInCycle}
        onCheckedChange={() => !isAlreadyInCycle && onToggle()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'h-4 w-4 rounded border-slate-300',
          isAlreadyInCycle && 'opacity-50'
        )}
      />
      
      <span className={cn(
        'text-xs font-mono text-slate-500 shrink-0',
        compact ? 'w-14' : 'w-16'
      )}>
        {testCase.key}
      </span>
      
      <span className={cn(
        'flex-1 text-sm text-slate-700 truncate',
        isAlreadyInCycle && 'text-slate-400'
      )}>
        {testCase.title}
      </span>

      {isAlreadyInCycle ? (
        <Badge variant="outline" className="text-xs text-slate-400 border-slate-200 shrink-0">
          In Cycle
        </Badge>
      ) : priorityName ? (
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs shrink-0 border',
            getPriorityBadgeClass(priorityName)
          )}
        >
          {priorityName.charAt(0).toUpperCase()}
        </Badge>
      ) : null}
    </div>
  );
}
