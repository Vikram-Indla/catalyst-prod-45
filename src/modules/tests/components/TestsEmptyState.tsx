/**
 * TESTS EMPTY STATE
 * Shared empty state component for Test Management module
 * Each page type has a specific CTA that navigates or opens a modal
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ListChecks, 
  RefreshCcw, 
  Play, 
  Package, 
  BarChart3,
  FileText,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryLabel: string;
  primaryNavigation?: string;
  secondaryLabel?: string;
  secondaryNavigation?: string;
}> = {
  overview: {
    icon: <ListChecks className="h-12 w-12 text-text-tertiary" />,
    title: 'No Test Data Yet',
    description: 'Start by creating test cases and organizing them into cycles to track execution.',
    primaryLabel: 'Create Test Case',
    secondaryLabel: 'View All Cases',
    secondaryNavigation: 'cases',
  },
  cases: {
    icon: <FileText className="h-12 w-12 text-text-tertiary" />,
    title: 'No Test Cases',
    description: 'Test cases define what to test and expected results. Create your first test case to get started.',
    primaryLabel: 'Create Test Case',
    secondaryLabel: 'Import Cases',
  },
  sets: {
    icon: <Package className="h-12 w-12 text-text-tertiary" />,
    title: 'No Test Sets',
    description: 'Test sets group related test cases together for reuse across cycles. Create a set to organize your tests.',
    primaryLabel: 'Create Test Set',
    secondaryLabel: 'View Cases',
    secondaryNavigation: 'cases',
  },
  cycles: {
    icon: <RefreshCcw className="h-12 w-12 text-text-tertiary" />,
    title: 'No Test Cycles',
    description: 'Test cycles organize test runs for specific releases or sprints. Create a cycle to start testing.',
    primaryLabel: 'Create Test Cycle',
    secondaryLabel: 'View Cases',
    secondaryNavigation: 'cases',
  },
  executions: {
    icon: <Play className="h-12 w-12 text-text-tertiary" />,
    title: 'No Executions',
    description: 'Executions track the results of running test cases. Create a cycle and run tests to see executions.',
    primaryLabel: 'Run Tests',
    secondaryLabel: 'View Cycles',
    secondaryNavigation: 'cycles',
  },
  reports: {
    icon: <BarChart3 className="h-12 w-12 text-text-tertiary" />,
    title: 'No Report Data',
    description: 'Reports are generated from test execution data. Run some tests to see analytics and trends.',
    primaryLabel: 'View Executions',
    primaryNavigation: 'executions',
    secondaryLabel: 'Run Tests',
    secondaryNavigation: 'cycles',
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

  const handleSecondaryClick = () => {
    if (config.secondaryNavigation) {
      navigate(`/projects/${projectId}/tests/${config.secondaryNavigation}`);
    }
  };

  return (
    <Card className={cn(
      'bg-surface-2 border-border-default p-8 text-center',
      className
    )}>
      <div className="flex flex-col items-center max-w-md mx-auto">
        <div className="p-4 bg-surface-3 rounded-full mb-4">
          {config.icon}
        </div>
        
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {config.title}
        </h3>
        
        <p className="text-text-secondary text-sm mb-6">
          {config.description}
        </p>

        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrimaryClick}
            className="gap-2"
          >
            {config.primaryNavigation ? (
              <ArrowRight className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {config.primaryLabel}
          </Button>

          {config.secondaryLabel && (
            <Button
              variant="outline"
              onClick={handleSecondaryClick}
              className="gap-2"
            >
              {config.secondaryLabel}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default TestsEmptyState;
