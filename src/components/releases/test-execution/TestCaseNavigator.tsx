/**
 * TestCaseNavigator — Right panel showing all test cases in cycle
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  PlayCircle, 
  Circle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { CycleTestCase } from '@/data/testExecutionData';

interface TestCaseNavigatorProps {
  cycleId: string;
  cycleName: string;
  testCases: CycleTestCase[];
  currentTestCaseId: string;
  onNavigate: (tcId: string) => void;
}

export function TestCaseNavigator({
  cycleId,
  cycleName,
  testCases,
  currentTestCaseId,
  onNavigate,
}: TestCaseNavigatorProps) {
  const currentIndex = testCases.findIndex(tc => tc.id === currentTestCaseId);
  const completedCount = testCases.filter(tc => tc.status === 'passed' || tc.status === 'failed').length;
  const progressPercent = (completedCount / testCases.length) * 100;
  
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < testCases.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      onNavigate(testCases[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate(testCases[currentIndex + 1].id);
    }
  };

  const statusIcons = {
    passed: <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />,
    failed: <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
    in_progress: <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" />,
    not_run: <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />,
  };

  return (
    <div className="bg-background border rounded-lg sticky top-6">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-foreground">Test Cases in Cycle</h3>
        <p className="text-sm text-muted-foreground mt-1">{cycleId} · {cycleName}</p>
      </div>

      {/* Progress Summary */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{completedCount} / {testCases.length} completed</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Test Case List */}
      <div className="max-h-[500px] overflow-y-auto">
        {testCases.map((tc) => (
          <div
            key={tc.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors",
              tc.id === currentTestCaseId && "bg-primary/10 border-l-4 border-l-primary"
            )}
            onClick={() => onNavigate(tc.id)}
          >
            {/* Status Icon */}
            {statusIcons[tc.status]}

            {/* Test Case Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{tc.id}</span>
                {tc.priority === 'critical' && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{tc.title}</p>
            </div>

            {/* Progress for in_progress */}
            {tc.status === 'in_progress' && tc.progress && (
              <span className="text-xs text-primary font-medium">{tc.progress}</span>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="p-4 border-t flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!hasPrevious}
          onClick={handlePrevious}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {testCases.length}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!hasNext}
          onClick={handleNext}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
