/**
 * Hook for AI Evidence Analysis
 * TC-261 to TC-330: AI-powered defect detection
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AiAnalysisResult } from './types';

export function useAnalyzeEvidence() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const analyzeEvidence = useCallback(async (
    attachmentId: string,
    imageUrl: string,
    testCaseContext?: string
  ): Promise<AiAnalysisResult | null> => {
    if (!attachmentId || !imageUrl) {
      toast.error('Attachment ID and image URL are required');
      return null;
    }

    setIsAnalyzing(true);
    setLastError(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-evidence', {
        body: { attachmentId, imageUrl, testCaseContext }
      });

      if (error) {
        throw new Error(error.message || 'AI analysis failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as AiAnalysisResult;
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

  return {
    isAnalyzing,
    lastError,
    analyzeEvidence,
  };
}
