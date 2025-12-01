import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PriorityRecommendation } from '@/types/aiFeatures.types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PriorityRecommenderProps {
  testCaseTitle: string;
  testCaseDescription?: string;
  linkedWorkItemType?: string;
  linkedWorkItemPriority?: string;
  onRecommendation?: (priority: string) => void;
}

export const PriorityRecommender: React.FC<PriorityRecommenderProps> = ({
  testCaseTitle,
  testCaseDescription,
  linkedWorkItemType,
  linkedWorkItemPriority,
  onRecommendation,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<PriorityRecommendation | null>(null);

  const analyzePriority = async () => {
    if (!testCaseTitle) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-priority', {
        body: {
          testCaseTitle,
          testCaseDescription,
          linkedWorkItemType,
          linkedWorkItemPriority,
        },
      });

      if (error) throw error;

      if (data.priority) {
        setRecommendation(data);
        if (onRecommendation) {
          onRecommendation(data.priority);
        }
      }
    } catch (error) {
      console.error('Error analyzing priority:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-blue-600 text-white';
      case 'low': return 'bg-gray-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {recommendation ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={`gap-1 ${getPriorityColor(recommendation.priority)}`}>
                <Target className="h-3 w-3" />
                Recommended: {recommendation.priority}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-sm">{recommendation.reasoning}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={analyzePriority}
          disabled={isAnalyzing || !testCaseTitle}
          className="gap-2 text-brand-gold border-brand-gold hover:bg-brand-gold/10"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              Get AI Recommendation
            </>
          )}
        </Button>
      )}
    </div>
  );
};
