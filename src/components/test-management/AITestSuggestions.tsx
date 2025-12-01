/**
 * CATALYST TESTS - AI Test Suggestions
 * Modal showing AI-generated test suggestions from work item context
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { useGenerateAITestSuggestions, useCreateTestFromWorkItem } from '@/hooks/useWorkItemLinking';
import type { WorkItemType, AITestSuggestion } from '@/types/workItemLinking.types';

interface AITestSuggestionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItemId: string;
  workItemType: WorkItemType;
  workItemTitle: string;
  workItemDescription?: string;
}

export const AITestSuggestions: React.FC<AITestSuggestionsProps> = ({
  open,
  onOpenChange,
  workItemId,
  workItemType,
  workItemTitle,
  workItemDescription,
}) => {
  const [suggestions, setSuggestions] = useState<AITestSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

  const generateMutation = useGenerateAITestSuggestions();
  const createMutation = useCreateTestFromWorkItem();

  // Generate suggestions when modal opens
  useEffect(() => {
    if (open) {
      generateMutation.mutate(
        {
          workItemId,
          workItemType,
          workItemTitle,
          workItemDescription,
        },
        {
          onSuccess: (data) => {
            setSuggestions(data);
            // Select all by default
            setSelectedSuggestions(new Set(data.map((_, idx) => idx)));
          },
        }
      );
    }
  }, [open]);

  const handleToggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleCreateSelected = async () => {
    const selectedSuggestionsList = suggestions.filter((_, idx) =>
      selectedSuggestions.has(idx)
    );

    // Create test cases sequentially
    for (const suggestion of selectedSuggestionsList) {
      await createMutation.mutateAsync({
        work_item_id: workItemId,
        work_item_type: workItemType,
        title: suggestion.title,
        description: suggestion.description,
        test_type: suggestion.test_type,
        priority: suggestion.priority,
        auto_link: true,
      });
    }

    onOpenChange(false);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-gold" />
            AI Test Suggestions
          </DialogTitle>
          <DialogDescription>
            AI-generated test case suggestions based on {workItemTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {generateMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Analyzing work item and generating test suggestions...</p>
            </div>
          )}

          {!generateMutation.isPending && suggestions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No suggestions generated
            </div>
          )}

          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 hover:border-brand-gold/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedSuggestions.has(index)}
                  onCheckedChange={() => handleToggleSuggestion(index)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="font-medium">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {suggestion.description}
                    </p>
                  </div>

                  {suggestion.steps.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Steps:</div>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        {suggestion.steps.map((step, stepIdx) => (
                          <li key={stepIdx}>{step.action}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Badge
                      className={`${getPriorityColor(suggestion.priority)} text-white text-xs`}
                      variant="secondary"
                    >
                      {suggestion.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.test_type}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {selectedSuggestions.size} suggestion(s) selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSelected}
                disabled={
                  selectedSuggestions.size === 0 ||
                  createMutation.isPending ||
                  generateMutation.isPending
                }
              >
                {createMutation.isPending
                  ? 'Creating...'
                  : `Create Selected (${selectedSuggestions.size})`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
