/**
 * Narrative Report Panel
 * AI-5: Executive Narrative Report Generator
 */

import React, { useState } from 'react';
import { Sparkles, Loader2, Download, FileText, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { useNarrativeReports, NarrativeReport } from '../../hooks/useNarrativeReports';

interface NarrativeReportPanelProps {
  programId?: string;
}

export function NarrativeReportPanel({ programId }: NarrativeReportPanelProps) {
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');
  const [selectedReport, setSelectedReport] = useState<NarrativeReport | null>(null);

  const { reports, isLoading, generateReport, saveReport, isGenerating, isSaving, exportToMarkdown } = useNarrativeReports(programId || null);

  const filteredReports = reports.filter(r => r.report_type === reportType);

  const handleGenerate = async () => {
    const now = new Date();
    const periodStart = reportType === 'daily' ? format(now, 'yyyy-MM-dd') : format(subDays(now, 7), 'yyyy-MM-dd');
    const periodEnd = format(now, 'yyyy-MM-dd');

    try {
      const result = await generateReport({
        reportType,
        periodStart,
        periodEnd,
        metrics: {},
        executions: [],
        defects: [],
      });
      if (result?.report) {
        await saveReport({
          report: result.report,
          reportType,
          periodStart,
          periodEnd,
          aiActionId: result.aiActionId,
        });
        toast.success('Report generated and saved');
      }
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  const handleExport = (report: NarrativeReport) => {
    const markdown = exportToMarkdown(report);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as Markdown');
  };

  const renderContent = (report: NarrativeReport) => (
    <div className="space-y-6">
      {report.executive_summary && (
        <section>
          <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wide mb-2">Executive Summary</h3>
          <p className="text-sm text-text-primary leading-relaxed">{report.executive_summary}</p>
        </section>
      )}
      {report.highlights?.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wide mb-2">Highlights</h3>
          <ul className="space-y-2">
            {(report.highlights as { title: string; description: string }[]).map((h, i) => (
              <li key={i} className="p-2 bg-status-success/5 rounded border border-status-success/20">
                <CheckCircle2 className="h-4 w-4 text-status-success inline mr-2" />
                <span className="text-sm text-text-primary">{h.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {report.risks_and_blockers?.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wide mb-2">Risks & Blockers</h3>
          <ul className="space-y-2">
            {(report.risks_and_blockers as { title: string; severity: string }[]).map((r, i) => (
              <li key={i} className="p-2 bg-status-error/5 rounded border border-status-error/20 text-sm text-text-primary">
                [{r.severity}] {r.title}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-surface-1">
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-primary" />Narrative Reports
        </h3>
        <Button onClick={handleGenerate} disabled={isGenerating || isSaving}>
          {isGenerating || isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          Generate {reportType === 'daily' ? 'Daily' : 'Weekly'}
        </Button>
      </div>
      <div className="border-b border-border-default">
        <Tabs value={reportType} onValueChange={(v) => setReportType(v as 'daily' | 'weekly')}>
          <TabsList className="bg-transparent border-0 h-10 px-4">
            <TabsTrigger value="daily" className="data-[state=active]:bg-accent-primary data-[state=active]:text-white">
              <Calendar className="h-4 w-4 mr-1.5" />Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="data-[state=active]:bg-accent-primary data-[state=active]:text-white">
              <Clock className="h-4 w-4 mr-1.5" />Weekly
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r border-border-default overflow-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : filteredReports.length === 0 ? (
            <div className="p-4 text-center text-text-tertiary">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No reports yet</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredReports.map(report => (
                <button key={report.id} onClick={() => setSelectedReport(report)} className={`w-full p-3 rounded-lg text-left transition-colors ${selectedReport?.id === report.id ? 'bg-accent-subtle border border-accent-primary' : 'bg-surface-2 border border-transparent hover:bg-surface-3'}`}>
                  <p className="text-sm font-medium text-text-primary truncate">{report.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{report.report_type}</Badge>
                    <span className="text-xs text-text-quaternary">{format(new Date(report.created_at), 'MMM d')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {selectedReport ? (
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">{selectedReport.title}</h2>
                  <p className="text-sm text-text-tertiary mt-1">{format(new Date(selectedReport.created_at), 'MMMM d, yyyy')}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport(selectedReport)}>
                  <Download className="h-4 w-4 mr-1.5" />Export
                </Button>
              </div>
              {renderContent(selectedReport)}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-text-tertiary">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium text-text-primary">Select a Report</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NarrativeReportPanel;
