/**
 * AI Suggest Steps Component
 * Suggest next test steps in case editor
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface SuggestedStep {
  id: string;
  action: string;
  expected_result: string;
  test_data?: string;
  confidence: number;
  accepted?: boolean;
  rejected?: boolean;
}

interface AISuggestStepsProps {
  caseId: string;
  caseTitle: string;
  existingSteps: Array<{
    action: string;
    expected_result: string;
  }>;
  onAccept: (steps: SuggestedStep[]) => void;
  className?: string;
}

export function AISuggestSteps({
  caseId,
  caseTitle,
  existingSteps,
  onAccept,
  className,
}: AISuggestStepsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedStep[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI generation - in real implementation, call the API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate mock suggestions based on existing steps
      const mockSuggestions: SuggestedStep[] = [
        {
          id: `sug-${Date.now()}-1`,
          action: 'Verify data persistence after page refresh',
          expected_result: 'Data should be retained after browser refresh',
          confidence: 0.92,
        },
        {
          id: `sug-${Date.now()}-2`,
          action: 'Test with special characters in input fields',
          expected_result: 'Special characters should be handled correctly',
          test_data: '!@#$%^&*()_+{}|:"<>?',
          confidence: 0.85,
        },
        {
          id: `sug-${Date.now()}-3`,
          action: 'Validate error message for invalid input',
          expected_result: 'Appropriate error message is displayed',
          confidence: 0.78,
        },
      ];

      setSuggestions(mockSuggestions);
      setIsExpanded(true);
      toast.success('Generated step suggestions');
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptStep = (stepId: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, accepted: true, rejected: false } : s
      )
    );
  };

  const handleRejectStep = (stepId: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, rejected: true, accepted: false } : s
      )
    );
  };

  const handleInsertAccepted = () => {
    const acceptedSteps = suggestions.filter((s) => s.accepted);
    if (acceptedSteps.length === 0) {
      toast.error('Please accept at least one suggestion');
      return;
    }
    onAccept(acceptedSteps);
    setSuggestions([]);
    toast.success(`Inserted ${acceptedSteps.length} steps`);
  };

  const acceptedCount = suggestions.filter((s) => s.accepted).length;
  const pendingCount = suggestions.filter((s) => !s.accepted && !s.rejected).length;

  return (
    <div className={cn('space-y-3', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Suggest Next Steps
          </>
        )}
      </Button>

      {suggestions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <div
            className="flex items-center justify-between p-3 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">AI Suggestions</span>
              <Badge variant="secondary" className="text-xs">
                {pendingCount} pending
              </Badge>
              {acceptedCount > 0 && (
                <Badge className="text-xs bg-green-100 text-green-700">
                  {acceptedCount} accepted
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {isExpanded && (
            <CardContent className="pt-0 pb-3 space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={cn(
                    'p-3 rounded-lg border bg-background transition-all',
                    suggestion.accepted && 'border-green-300 bg-green-50 dark:bg-green-950/20',
                    suggestion.rejected && 'border-red-300 bg-red-50 dark:bg-red-950/20 opacity-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Step {existingSteps.length + index + 1}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            suggestion.confidence > 0.85
                              ? 'border-green-300 text-green-700'
                              : suggestion.confidence > 0.7
                              ? 'border-amber-300 text-amber-700'
                              : 'border-gray-300'
                          )}
                        >
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Action:</span>{' '}
                          {suggestion.action}
                        </p>
                        <p>
                          <span className="font-medium">Expected:</span>{' '}
                          {suggestion.expected_result}
                        </p>
                        {suggestion.test_data && (
                          <p className="font-mono text-xs bg-muted p-1 rounded">
                            Test Data: {suggestion.test_data}
                          </p>
                        )}
                      </div>
                    </div>

                    {!suggestion.accepted && !suggestion.rejected && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={() => handleAcceptStep(suggestion.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                          onClick={() => handleRejectStep(suggestion.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {suggestion.accepted && (
                      <Badge className="bg-green-500 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Accepted
                      </Badge>
                    )}

                    {suggestion.rejected && (
                      <Badge variant="secondary" className="text-muted-foreground">
                        Rejected
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {acceptedCount > 0 && (
                <Button
                  className="w-full mt-2"
                  onClick={handleInsertAccepted}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Insert {acceptedCount} Accepted Step(s)
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
