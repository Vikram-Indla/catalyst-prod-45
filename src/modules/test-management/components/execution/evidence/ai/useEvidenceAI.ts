/**
 * Evidence AI Hook
 * TC-261 to TC-330: OCR, defect detection, and smart suggestions
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DetectedDefect {
  type: 'visual' | 'functional' | 'accessibility' | 'performance' | 'content' | 'layout';
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  title: string;
  description: string;
  location?: string;
  suggestion?: string;
}

export interface DefectAnalysisResult {
  defects: DetectedDefect[];
  summary: string;
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface SuggestedTestStep {
  action: string;
  target?: string;
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TestStepSuggestionResult {
  steps: SuggestedTestStep[];
  pageType: string;
  mainFeatures?: string[];
}

export interface OCRResult {
  text: string;
}

type AIAction = 'ocr' | 'detect_defects' | 'suggest_test_steps' | 'compare_images';

export function useEvidenceAI() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const analyze = useCallback(async <T>(
    action: AIAction,
    imageUrl?: string,
    imageBase64?: string,
    context?: string
  ): Promise<T | null> => {
    if (!imageUrl && !imageBase64) {
      toast.error('No image provided for analysis');
      return null;
    }

    setIsAnalyzing(true);
    setLastError(null);

    try {
      const { data, error } = await supabase.functions.invoke('evidence-ai', {
        body: { action, imageUrl, imageBase64, context }
      });

      if (error) {
        throw new Error(error.message || 'AI analysis failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data?.result as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI analysis failed';
      setLastError(message);
      
      if (message.includes('Rate limit')) {
        toast.error('AI rate limit exceeded. Please wait a moment and try again.');
      } else if (message.includes('Payment required')) {
        toast.error('AI credits depleted. Please add credits to continue.');
      } else {
        toast.error(`AI analysis failed: ${message}`);
      }
      
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const extractText = useCallback(async (imageUrl?: string, imageBase64?: string): Promise<OCRResult | null> => {
    return analyze<OCRResult>('ocr', imageUrl, imageBase64);
  }, [analyze]);

  const detectDefects = useCallback(async (
    imageUrl?: string, 
    imageBase64?: string,
    context?: string
  ): Promise<DefectAnalysisResult | null> => {
    return analyze<DefectAnalysisResult>('detect_defects', imageUrl, imageBase64, context);
  }, [analyze]);

  const suggestTestSteps = useCallback(async (
    imageUrl?: string,
    imageBase64?: string,
    context?: string
  ): Promise<TestStepSuggestionResult | null> => {
    return analyze<TestStepSuggestionResult>('suggest_test_steps', imageUrl, imageBase64, context);
  }, [analyze]);

  return {
    isAnalyzing,
    lastError,
    extractText,
    detectDefects,
    suggestTestSteps,
  };
}
