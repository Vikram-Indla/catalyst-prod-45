/**
 * Evidence AI Hook
 * TC-261 to TC-330: OCR, defect detection, and smart suggestions
 * With database persistence for results
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
  confidence?: number;
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

  /**
   * Extract text via OCR and optionally save to database
   */
  const extractText = useCallback(async (
    imageUrl?: string, 
    imageBase64?: string,
    evidenceId?: string
  ): Promise<OCRResult | null> => {
    const result = await analyze<OCRResult>('ocr', imageUrl, imageBase64);
    
    // Save to database if evidenceId provided
    if (result && evidenceId) {
      try {
        await supabase
          .from('test_evidence')
          .update({
            ocr_text: result.text,
            ocr_confidence: result.confidence || null,
            ocr_processed_at: new Date().toISOString(),
          })
          .eq('id', evidenceId);
      } catch (err) {
        console.error('Failed to save OCR result:', err);
      }
    }
    
    return result;
  }, [analyze]);

  /**
   * Detect defects and optionally save to database
   */
  const detectDefects = useCallback(async (
    imageUrl?: string, 
    imageBase64?: string,
    context?: string,
    evidenceId?: string
  ): Promise<DefectAnalysisResult | null> => {
    const result = await analyze<DefectAnalysisResult>('detect_defects', imageUrl, imageBase64, context);
    
    // Save to database if evidenceId provided
    if (result && evidenceId) {
      try {
        const existingAnalysis = await supabase
          .from('test_evidence')
          .select('ai_analysis')
          .eq('id', evidenceId)
          .single();
        
        const currentAnalysis = (existingAnalysis.data?.ai_analysis as Record<string, unknown>) || {};
        
        // Serialize to JSON-compatible format
        const aiAnalysisData = JSON.parse(JSON.stringify({
          ...currentAnalysis,
          defects: result.defects,
          summary: result.summary,
          overallQuality: result.overallQuality,
        }));
        
        await supabase
          .from('test_evidence')
          .update({
            ai_analysis: aiAnalysisData,
            ai_analyzed_at: new Date().toISOString(),
          })
          .eq('id', evidenceId);
      } catch (err) {
        console.error('Failed to save defect analysis:', err);
      }
    }
    
    return result;
  }, [analyze]);

  /**
   * Suggest test steps and optionally save to database
   */
  const suggestTestSteps = useCallback(async (
    imageUrl?: string,
    imageBase64?: string,
    context?: string,
    evidenceId?: string
  ): Promise<TestStepSuggestionResult | null> => {
    const result = await analyze<TestStepSuggestionResult>('suggest_test_steps', imageUrl, imageBase64, context);
    
    // Save to database if evidenceId provided
    if (result && evidenceId) {
      try {
        const existingAnalysis = await supabase
          .from('test_evidence')
          .select('ai_analysis')
          .eq('id', evidenceId)
          .single();
        
        const currentAnalysis = (existingAnalysis.data?.ai_analysis as Record<string, unknown>) || {};
        
        // Serialize to JSON-compatible format
        const aiAnalysisData = JSON.parse(JSON.stringify({
          ...currentAnalysis,
          testSteps: result.steps,
          pageType: result.pageType,
          mainFeatures: result.mainFeatures,
        }));
        
        await supabase
          .from('test_evidence')
          .update({
            ai_analysis: aiAnalysisData,
            ai_analyzed_at: new Date().toISOString(),
          })
          .eq('id', evidenceId);
      } catch (err) {
        console.error('Failed to save test step suggestions:', err);
      }
    }
    
    return result;
  }, [analyze]);

  /**
   * Save annotations to database (TC-231 to TC-260)
   */
  const saveAnnotations = useCallback(async (
    evidenceId: string,
    annotations: unknown[],
    annotatedBlob?: Blob
  ): Promise<boolean> => {
    try {
      let annotatedFilePath: string | undefined;

      // If annotated image blob provided, upload it
      if (annotatedBlob) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        annotatedFilePath = `${user.id}/annotated/${evidenceId}-${timestamp}.png`;

        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(annotatedFilePath, annotatedBlob, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) throw uploadError;
      }

      // Save annotations to database
      const updateData: Record<string, unknown> = {
        annotations: annotations,
        annotations_updated_at: new Date().toISOString(),
      };
      
      if (annotatedFilePath) {
        updateData.annotated_file_path = annotatedFilePath;
      }

      const { error } = await supabase
        .from('test_evidence')
        .update(updateData)
        .eq('id', evidenceId);

      if (error) throw error;

      toast.success('Annotations saved');
      return true;
    } catch (err) {
      console.error('Failed to save annotations:', err);
      toast.error('Failed to save annotations');
      return false;
    }
  }, []);

  return {
    isAnalyzing,
    lastError,
    extractText,
    detectDefects,
    suggestTestSteps,
    saveAnnotations,
  };
}
