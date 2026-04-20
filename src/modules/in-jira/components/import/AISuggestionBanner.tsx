import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Sparkles, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AISuggestion {
  id: string;
  suggestion_type: string;
  suggestion_data: {
    value?: string;
    category?: string;
    confidence: number;
    reasoning: string;
  };
  confidence_score: number;
}

interface AISuggestionBannerProps {
  suggestions: AISuggestion[];
  issueId: string;
  onAccept?: (suggestion: AISuggestion) => void;
  onReject?: (suggestion: AISuggestion) => void;
}

export function AISuggestionBanner({ suggestions, issueId, onAccept, onReject }: AISuggestionBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  if (!suggestions || suggestions.length === 0) return null;

  const handleAccept = async (suggestion: AISuggestion) => {
    setProcessing(suggestion.id);
    try {
      await supabase
        .from('injira_ai_suggestions')
        .update({ is_accepted: true, accepted_at: new Date().toISOString() })
        .eq('id', suggestion.id);

      // Update the issue with the suggestion
      if (suggestion.suggestion_type === 'priority') {
        await supabase
          .from('injira_issues')
          .update({ priority: suggestion.suggestion_data.value })
          .eq('id', issueId);
      }

      await supabase
        .from('injira_issues')
        .update({ ai_suggestions_pending: false })
        .eq('id', issueId);

      toast.success('Suggestion applied');
      onAccept?.(suggestion);
    } catch (err) {
      toast.error('Failed to apply suggestion');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (suggestion: AISuggestion) => {
    setProcessing(suggestion.id);
    try {
      await supabase
        .from('injira_ai_suggestions')
        .update({ is_accepted: false })
        .eq('id', suggestion.id);

      toast.info('Suggestion dismissed');
      onReject?.(suggestion);
    } catch (err) {
      toast.error('Failed to dismiss suggestion');
    } finally {
      setProcessing(null);
    }
  };

  const getConfidenceAppearance = (score: number): LozengeAppearance => {
    if (score >= 0.8) return 'success';
    if (score >= 0.5) return 'moved';
    return 'default';
  };

  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  return (
    <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 dark:from-purple-950/20 dark:to-blue-950/20">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-purple-900 dark:text-purple-100">
              AI Suggestions Available
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          
          {expanded && (
            <div className="mt-3 space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Lozenge appearance="default">{formatType(suggestion.suggestion_type)}</Lozenge>
                    <Lozenge appearance={getConfidenceAppearance(suggestion.confidence_score)}>
                      {Math.round(suggestion.confidence_score * 100)}% confident
                    </Lozenge>
                    {suggestion.suggestion_data.value && (
                      <Lozenge appearance="default">{suggestion.suggestion_data.value}</Lozenge>
                    )}
                  </div>
                  <AlertDescription className="text-sm text-muted-foreground">
                    {suggestion.suggestion_data.reasoning}
                  </AlertDescription>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(suggestion)}
                      disabled={processing === suggestion.id}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(suggestion)}
                      disabled={processing === suggestion.id}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}
