import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AnalysisType = 'evidence' | 'glossary' | 'functional_requirements' | 'compliance' | 'brd' | 'open_questions';

interface AnalysisResult {
  success: boolean;
  artifact_id: string;
  artifact_type: AnalysisType;
  content: unknown;
  content_hash: string;
  version: number;
}

interface UseAIAssistAnalyzeOptions {
  onSuccess?: (result: AnalysisResult) => void;
  onError?: (error: Error) => void;
}

export function useAIAssistAnalyze(options?: UseAIAssistAnalyzeOptions) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState<string>('');

  const runAnalysis = async (params: {
    draftId: string;
    runId: string;
    documentText: string;
    analysisType: AnalysisType;
    language?: string;
  }): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    setProgress(10);
    setCurrentTask(`Starting ${params.analysisType} analysis...`);

    try {
      setProgress(30);
      setCurrentTask(`Analyzing document for ${params.analysisType}...`);

      const { data, error } = await supabase.functions.invoke('ai-assist-analyze', {
        body: {
          draft_id: params.draftId,
          run_id: params.runId,
          document_text: params.documentText,
          analysis_type: params.analysisType,
          language: params.language || 'en',
        },
      });

      if (error) {
        throw new Error(error.message || 'Analysis failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis returned unsuccessful');
      }

      setProgress(100);
      setCurrentTask('Analysis complete');

      const result: AnalysisResult = {
        success: true,
        artifact_id: data.artifact_id,
        artifact_type: params.analysisType,
        content: data.content,
        content_hash: data.content_hash,
        version: data.version,
      };

      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Analysis error:', err);
      toast.error(`Analysis failed: ${err.message}`);
      options?.onError?.(err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runFullPipeline = async (params: {
    draftId: string;
    runId: string;
    documentText: string;
    language?: string;
  }): Promise<{ success: boolean; artifacts: AnalysisResult[] }> => {
    const analysisSteps: AnalysisType[] = [
      'evidence',
      'glossary',
      'functional_requirements',
      'compliance',
      'open_questions',
      'brd',
    ];

    const artifacts: AnalysisResult[] = [];
    const totalSteps = analysisSteps.length;

    setIsAnalyzing(true);

    for (let i = 0; i < analysisSteps.length; i++) {
      const analysisType = analysisSteps[i];
      const stepProgress = Math.round(((i + 1) / totalSteps) * 100);
      
      setProgress(stepProgress * 0.9); // Reserve last 10% for completion
      setCurrentTask(`Step ${i + 1}/${totalSteps}: Analyzing ${analysisType.replace('_', ' ')}...`);

      const result = await runAnalysis({
        draftId: params.draftId,
        runId: params.runId,
        documentText: params.documentText,
        analysisType,
        language: params.language,
      });

      if (result) {
        artifacts.push(result);
      } else {
        // Continue with remaining steps even if one fails
        console.warn(`Analysis step ${analysisType} failed, continuing...`);
      }
    }

    setProgress(100);
    setCurrentTask('Full analysis pipeline complete');
    setIsAnalyzing(false);

    return {
      success: artifacts.length > 0,
      artifacts,
    };
  };

  return {
    runAnalysis,
    runFullPipeline,
    isAnalyzing,
    progress,
    currentTask,
  };
}
