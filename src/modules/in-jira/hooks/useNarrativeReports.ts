/**
 * Narrative Reports Hook
 * Handles AI-5: Executive Narrative Report Generator
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useTestAISettings } from './useTestAISettings';

export interface NarrativeReport {
  id: string;
  program_id: string | null;
  report_type: 'daily' | 'weekly' | 'sprint' | 'release';
  title: string;
  period_start: string;
  period_end: string;
  executive_summary: string | null;
  metrics_snapshot: Record<string, unknown> | null;
  highlights: Record<string, unknown>[] | null;
  risks_and_blockers: Record<string, unknown>[] | null;
  recommendations: Record<string, unknown>[] | null;
  narrative_sections: Record<string, unknown>[] | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  published_by: string | null;
  ai_action_id: string | null;
  export_formats: string[] | null;
  created_at: string;
  created_by: string | null;
}

interface GeneratedReport {
  title: string;
  executive_summary: string;
  highlights: { title: string; description: string; metric_value?: string; trend?: 'up' | 'down' | 'stable' }[];
  risks_and_blockers: { title: string; description: string; severity: string; mitigation?: string }[];
  metrics_snapshot: Record<string, number>;
  recommendations: { title: string; description: string; priority: string; owner?: string }[];
  narrative_sections: { heading: string; content: string }[];
}

export function useNarrativeReports(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings, recordAction } = useTestAISettings(programId);

  // Fetch existing reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['narrative-reports', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_narrative_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NarrativeReport[];
    },
    enabled: !!user,
  });

  // Generate narrative report using AI
  const generateReportMutation = useMutation({
    mutationFn: async (input: {
      reportType: 'daily' | 'weekly' | 'sprint' | 'release';
      periodStart: string;
      periodEnd: string;
      metrics: Record<string, unknown>;
      executions: Record<string, unknown>[];
      defects: Record<string, unknown>[];
      releases?: Record<string, unknown>[];
    }) => {
      const startTime = Date.now();

      const { data, error } = await supabase.functions.invoke('ai-narrative-report', {
        body: {
          reportType: input.reportType,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          metrics: input.metrics,
          executions: input.executions,
          defects: input.defects,
          releases: input.releases,
        },
      });

      if (error) throw error;

      const latencyMs = Date.now() - startTime;
      const report = data.report as GeneratedReport;

      // Record provenance
      const aiAction = await recordAction({
        entityType: 'program',
        entityId: programId || 'global',
        actionType: 'generate_narrative_report',
        provider: settings?.provider || 'lovable',
        model: settings?.model || 'google/gemini-2.5-flash',
        inputSources: {
          reportType: input.reportType,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
        confidence: 0.90,
        outputSummary: {
          title: report.title,
          highlightCount: report.highlights?.length,
          riskCount: report.risks_and_blockers?.length,
        },
        latencyMs,
      });

      return {
        report,
        aiActionId: aiAction?.id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        reportType: input.reportType,
      };
    },
    onError: (err: Error) => {
      toast.error('Failed to generate report', { description: err.message });
    },
  });

  // Save report to database
  const saveReportMutation = useMutation({
    mutationFn: async (input: {
      report: GeneratedReport;
      reportType: 'daily' | 'weekly' | 'sprint' | 'release';
      periodStart: string;
      periodEnd: string;
      aiActionId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_narrative_reports')
        .insert({
          program_id: programId,
          report_type: input.reportType,
          title: input.report.title,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          executive_summary: input.report.executive_summary,
          metrics_snapshot: input.report.metrics_snapshot as unknown as string,
          highlights: input.report.highlights as unknown as string,
          risks_and_blockers: input.report.risks_and_blockers as unknown as string,
          recommendations: input.report.recommendations as unknown as string,
          narrative_sections: input.report.narrative_sections as unknown as string,
          status: 'draft',
          ai_action_id: input.aiActionId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrative-reports', programId] });
      toast.success('Report saved');
    },
    onError: (err: Error) => {
      toast.error('Failed to save report', { description: err.message });
    },
  });

  // Publish report
  const publishReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_narrative_reports')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          published_by: user.id,
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrative-reports', programId] });
      toast.success('Report published');
    },
    onError: (err: Error) => {
      toast.error('Failed to publish report', { description: err.message });
    },
  });

  // Archive report
  const archiveReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase
        .from('test_narrative_reports')
        .update({ status: 'archived' })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrative-reports', programId] });
      toast.success('Report archived');
    },
  });

  // Export report to markdown
  const exportToMarkdown = (report: NarrativeReport): string => {
    let md = `# ${report.title}\n\n`;
    md += `**Period:** ${report.period_start} to ${report.period_end}\n\n`;
    md += `## Executive Summary\n\n${report.executive_summary || 'N/A'}\n\n`;

    if (report.highlights?.length) {
      md += `## Highlights\n\n`;
      for (const h of report.highlights as { title: string; description: string; metric_value?: string }[]) {
        md += `### ${h.title}\n${h.description}${h.metric_value ? ` (${h.metric_value})` : ''}\n\n`;
      }
    }

    if (report.risks_and_blockers?.length) {
      md += `## Risks & Blockers\n\n`;
      for (const r of report.risks_and_blockers as { title: string; description: string; severity: string }[]) {
        md += `### [${r.severity.toUpperCase()}] ${r.title}\n${r.description}\n\n`;
      }
    }

    if (report.recommendations?.length) {
      md += `## Recommendations\n\n`;
      for (const rec of report.recommendations as { title: string; description: string; priority: string }[]) {
        md += `- **[${rec.priority}]** ${rec.title}: ${rec.description}\n`;
      }
    }

    if (report.narrative_sections?.length) {
      for (const sec of report.narrative_sections as { heading: string; content: string }[]) {
        md += `\n## ${sec.heading}\n\n${sec.content}\n`;
      }
    }

    return md;
  };

  // Stats
  const publishedReports = reports?.filter(r => r.status === 'published') || [];
  const draftReports = reports?.filter(r => r.status === 'draft') || [];

  return {
    reports: reports || [],
    isLoading,
    publishedReports,
    draftReports,

    // Generate
    generateReport: generateReportMutation.mutateAsync,
    isGenerating: generateReportMutation.isPending,
    generatedReport: generateReportMutation.data?.report,

    // Save
    saveReport: saveReportMutation.mutateAsync,
    isSaving: saveReportMutation.isPending,

    // Actions
    publishReport: publishReportMutation.mutateAsync,
    archiveReport: archiveReportMutation.mutateAsync,
    isPublishing: publishReportMutation.isPending,

    // Export
    exportToMarkdown,
  };
}
