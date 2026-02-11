import { useState, useEffect } from 'react';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCatySuggestStep } from '@/hooks/useCatyAI';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface StepSuggesterProps {
  projectId: string;
  testCaseTitle: string;
  testCaseDescription?: string;
  existingSteps: Array<{ action: string; expected_result: string }>;
  currentStepNumber: number;
  onAccept: (suggestion: { action: string; expected_result: string; test_data?: string }) => void;
  isActive: boolean;
}

export function StepSuggester({
  projectId,
  testCaseTitle,
  testCaseDescription,
  existingSteps,
  currentStepNumber,
  onAccept,
  isActive,
}: StepSuggesterProps) {
  const [suggestion, setSuggestion] = useState<any>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const suggestMutation = useCatySuggestStep();
  const debouncedSteps = useDebounce(existingSteps, 1000);

  useEffect(() => {
    if (!isActive || !projectId || !testCaseTitle || debouncedSteps.length === 0) {
      setSuggestion(null);
      return;
    }

    const fetchSuggestion = async () => {
      try {
        const result = await suggestMutation.mutateAsync({
          projectId,
          testCaseTitle,
          testCaseDescription,
          existingSteps: debouncedSteps,
        });
        setSuggestion(result.suggested_step);
        setShowSuggestion(true);
      } catch {
        setSuggestion(null);
      }
    };

    fetchSuggestion();
  }, [debouncedSteps, isActive, testCaseTitle, testCaseDescription, projectId]);

  const handleAccept = () => {
    if (suggestion) {
      onAccept(suggestion);
      setSuggestion(null);
      setShowSuggestion(false);
    }
  };

  const handleDismiss = () => {
    setSuggestion(null);
    setShowSuggestion(false);
  };

  if (!isActive || !showSuggestion || !suggestion) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mt-2 animate-in slide-in-from-top-2">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
            CATY suggests Step {currentStepNumber}:
          </p>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Action:</span>{' '}
              <span className="text-muted-foreground">{suggestion.action}</span>
            </p>
            <p>
              <span className="font-medium">Expected:</span>{' '}
              <span className="text-muted-foreground">{suggestion.expected_result}</span>
            </p>
            {suggestion.test_data && (
              <p>
                <span className="font-medium">Data:</span>{' '}
                <span className="text-muted-foreground">{suggestion.test_data}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleAccept}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
        Press Tab to accept • Esc to dismiss
      </p>
    </div>
  );
}
