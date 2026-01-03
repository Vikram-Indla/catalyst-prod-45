/**
 * TESTS EMPTY STATE (Enterprise Pattern)
 * Shows table structure with inline "No items" text - NEVER centered icons
 * Per Bloomberg/Jira/Linear enterprise standard
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateType = 
  | 'overview' 
  | 'cases' 
  | 'sets' 
  | 'cycles' 
  | 'executions' 
  | 'reports';

interface TestsEmptyStateProps {
  type: EmptyStateType;
  onPrimaryAction?: () => void;
  className?: string;
}

const EMPTY_STATE_CONFIG: Record<EmptyStateType, {
  message: string;
  primaryLabel: string;
  primaryNavigation?: string;
}> = {
  overview: {
    message: 'No test data yet',
    primaryLabel: 'Create Test Case',
  },
  cases: {
    message: 'No test cases yet',
    primaryLabel: 'Create Test Case',
  },
  sets: {
    message: 'No test sets yet',
    primaryLabel: 'Create Test Set',
  },
  cycles: {
    message: 'No test cycles yet',
    primaryLabel: 'Create Cycle',
  },
  executions: {
    message: 'No executions yet',
    primaryLabel: 'Run Tests',
  },
  reports: {
    message: 'No report data yet',
    primaryLabel: 'View Executions',
    primaryNavigation: 'executions',
  },
};

export function TestsEmptyState({ 
  type, 
  onPrimaryAction,
  className 
}: TestsEmptyStateProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const config = EMPTY_STATE_CONFIG[type];

  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else if (config.primaryNavigation) {
      navigate(`/projects/${projectId}/tests/${config.primaryNavigation}`);
    }
  };

  // Enterprise pattern: inline text, left-aligned, ghost button at bottom
  return (
    <div className={cn('border border-border-default rounded-lg bg-surface-0', className)}>
      <div className="px-4 py-6 text-sm text-text-tertiary">
        {config.message}
      </div>
      <div className="px-4 py-3 border-t border-border-subtle">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrimaryClick}
          className="gap-1.5 text-xs text-text-secondary hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          {config.primaryLabel}
        </Button>
      </div>
    </div>
  );
}

export default TestsEmptyState;
