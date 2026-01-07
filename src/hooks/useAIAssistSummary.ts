import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SummaryData {
  draftId: string;
  draftKey: string;
  title: string;
  language: string;
  runExecutedAt: string;
  runExecutedBy: string | null;
  canonicalHash: string | null;
  promptPackVersion: string | null;
  sourcesPackVersion: string | null;
  model: string;
  stagesCompleted: string[];
  complianceVerdict: string | null;
  complianceScore: number | null;
  openQuestionsAnswered: number;
  openQuestionsPending: number;
  qualityScore: number | null;
  traceabilityScore: number | null;
  gapsRegister: Array<{ code: string; description: string; severity: string }>;
  linkedBRKey: string | null;
  epicsPublishedCount: number;
  epicsQuarter: string | null;
  auditEvents: Array<{ event_type: string; created_at: string; payload_json: any }>;
}

interface GenerateSummaryResult {
  success: boolean;
  html: string;
  pdfUrl: string | null;
  summaryData: SummaryData;
}

export function useAIAssistSummary(draftId: string | undefined, runId: string | undefined) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const generateSummary = useCallback(async () => {
    if (!draftId || !runId) {
      toast.error('Missing draft or run ID');
      return null;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke<GenerateSummaryResult>('ai-assist-summary', {
        body: { draftId, runId }
      });

      if (error) {
        throw error;
      }

      if (data) {
        setSummaryData(data.summaryData);
        setPdfUrl(data.pdfUrl);
        setHtml(data.html);
        
        // Invalidate artifacts and audit events queries
        queryClient.invalidateQueries({ queryKey: ['ai-assist-artifacts', runId] });
        queryClient.invalidateQueries({ queryKey: ['ai-assist-latest-artifacts', draftId] });
        queryClient.invalidateQueries({ queryKey: ['ai-assist-audit-events', draftId] });
        
        toast.success('Summary generated successfully');
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [draftId, runId, queryClient]);

  const downloadPdf = useCallback(() => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      toast.error('PDF not available. Please generate summary first.');
    }
  }, [pdfUrl]);

  const refreshPdfUrl = useCallback(async () => {
    if (!draftId || !runId) return;

    try {
      // Fetch the summary_pdf artifact to get storage path
      const { data: artifacts } = await supabase
        .from('ai_assist_artifacts')
        .select('content_json')
        .eq('run_id', runId)
        .eq('artifact_type', 'summary_pdf')
        .order('version', { ascending: false })
        .limit(1);

      if (artifacts && artifacts.length > 0) {
        const contentJson = artifacts[0].content_json as { storage_path?: string } | null;
        const storagePath = contentJson?.storage_path;
        
        if (storagePath) {
          const { data: signedUrl } = await supabase.storage
            .from('ai-assist-summaries')
            .createSignedUrl(storagePath, 3600);
          
          if (signedUrl?.signedUrl) {
            setPdfUrl(signedUrl.signedUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing PDF URL:', error);
    }
  }, [draftId, runId]);

  return {
    isGenerating,
    summaryData,
    pdfUrl,
    html,
    generateSummary,
    downloadPdf,
    refreshPdfUrl,
  };
}
