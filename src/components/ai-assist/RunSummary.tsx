import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileCode,
  Link,
  Target,
  AlertTriangle,
  HelpCircle,
  Layers
} from 'lucide-react';
import { useAIAssistSummary } from '@/hooks/useAIAssistSummary';
import { cn } from '@/lib/utils';

interface RunSummaryProps {
  draftId: string;
  runId: string | undefined;
}

export function RunSummary({ draftId, runId }: RunSummaryProps) {
  const {
    isGenerating,
    summaryData,
    pdfUrl,
    generateSummary,
    downloadPdf,
    refreshPdfUrl,
  } = useAIAssistSummary(draftId, runId);

  // Try to refresh PDF URL on mount if we have a runId
  useEffect(() => {
    if (runId) {
      refreshPdfUrl();
    }
  }, [runId, refreshPdfUrl]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getVerdictVariant = (verdict: string | null) => {
    switch (verdict) {
      case 'COMPLIANT': return 'default';
      case 'CONDITIONAL': return 'secondary';
      case 'NON_COMPLIANT': return 'destructive';
      default: return 'outline';
    }
  };

  const stageLabels = [
    { key: 'ingest', label: 'A: Ingest & Evidence' },
    { key: 'understand', label: 'B: Understand & Diagnose' },
    { key: 'compliance', label: 'C: Compliance & Clarify' },
    { key: 'produce', label: 'D: Produce & Publish' },
  ];

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          No run available. Complete a run to generate summary.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Generate/Download buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-[hsl(var(--info))]" />
          <div>
            <h3 className="text-base font-semibold">Run Summary</h3>
            <p className="text-xs text-muted-foreground">
              Executive-grade summary of AI Assist run
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateSummary}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {summaryData ? 'Regenerate' : 'Generate Summary'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={downloadPdf}
            disabled={!pdfUrl || isGenerating}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {/* Summary Preview */}
      {summaryData && !isGenerating && (
        <div className="space-y-4">
          {/* Meta Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Draft Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Draft Key</p>
                  <p className="font-mono font-medium">{summaryData.draftKey}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Language</p>
                  <p className="font-medium">{summaryData.language.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Executed At</p>
                  <p className="font-medium">{formatDate(summaryData.runExecutedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Model</p>
                  <p className="font-mono text-xs">{summaryData.model}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prompt Pack</p>
                  <p className="font-mono text-xs">{summaryData.promptPackVersion || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sources Pack</p>
                  <p className="font-mono text-xs">{summaryData.sourcesPackVersion || 'N/A'}</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Canonical Hash</p>
                <p className="font-mono text-xs break-all">{summaryData.canonicalHash || 'Not computed'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stages Execution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Stages Execution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {stageLabels.map(stage => {
                  const completed = summaryData.stagesCompleted.includes(stage.key);
                  return (
                    <div
                      key={stage.key}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md text-sm",
                        completed 
                          ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" 
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      <span>{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Compliance & Quality */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Compliance & Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <Badge variant={getVerdictVariant(summaryData.complianceVerdict)}>
                    {summaryData.complianceVerdict || 'N/A'}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Verdict</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {summaryData.complianceScore !== null ? `${summaryData.complianceScore}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">Compliance Score</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {summaryData.qualityScore !== null ? `${summaryData.qualityScore}/10` : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">Quality Score</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {summaryData.traceabilityScore !== null ? `${summaryData.traceabilityScore}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">Traceability</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Open Questions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Open Questions Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  <span className="text-sm">
                    <span className="font-bold">{summaryData.openQuestionsAnswered}</span> Answered
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-[hsl(var(--danger))]" />
                  <span className="text-sm">
                    <span className="font-bold">{summaryData.openQuestionsPending}</span> Pending
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gaps Register */}
          {summaryData.gapsRegister.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Gaps Register
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summaryData.gapsRegister.map((gap, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{gap.code}</span>
                        <span>{gap.description}</span>
                      </div>
                      <Badge 
                        variant={
                          gap.severity === 'CRITICAL' ? 'destructive' :
                          gap.severity === 'HIGH' ? 'destructive' :
                          gap.severity === 'MEDIUM' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {gap.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linkage & Publishing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link className="h-4 w-4" />
                Linkage & Publishing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Linked Business Request</p>
                  <p className="font-medium">
                    {summaryData.linkedBRKey || (
                      <span className="text-muted-foreground">Not linked</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Epics Published</p>
                  <p className="font-medium">
                    {summaryData.epicsPublishedCount > 0 
                      ? `${summaryData.epicsPublishedCount} epics${summaryData.epicsQuarter ? ` (${summaryData.epicsQuarter})` : ''}`
                      : <span className="text-muted-foreground">None</span>
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log Excerpt */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Audit Log (Last 10 Events)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryData.auditEvents.length > 0 ? (
                <div className="space-y-2">
                  {summaryData.auditEvents.slice(0, 10).map((event, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                    >
                      <span className="capitalize">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(event.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No audit events recorded
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state when no summary generated yet */}
      {!summaryData && !isGenerating && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              No summary generated yet for this run.
            </p>
            <Button onClick={generateSummary} className="gap-2">
              <FileText className="h-4 w-4" />
              Generate Summary
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
