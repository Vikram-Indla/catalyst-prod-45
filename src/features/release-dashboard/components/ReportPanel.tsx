/**
 * Release Readiness Report Panel Component
 * Module 5B-4: Report generation and export UI
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Printer,
  Shield,
  BarChart3,
  Bug,
  Users,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Loader2,
  FileJson,
  FileCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGenerateReport, useExportReport } from '../hooks/useReport';
import {
  ReportSection,
  REPORT_SECTION_CONFIG,
  DEFAULT_REPORT_CONFIG,
} from '../types/report';

interface ReportPanelProps {
  releaseId: string;
}

// Section icon component
function SectionIcon({ section, className }: { section: ReportSection; className?: string }) {
  const icons: Record<ReportSection, React.ElementType> = {
    summary: FileText,
    quality_gates: Shield,
    test_metrics: BarChart3,
    defect_summary: Bug,
    signoffs: Users,
    risk_factors: AlertTriangle,
    execution_trend: BarChart3,
    recommendations: Lightbulb,
  };
  const Icon = icons[section];
  return <Icon className={className} />;
}

// Decision badge component
function DecisionBadge({ decision }: { decision: string }) {
  const config: { label: string; appearance: LozengeAppearance } =
    decision === 'go'
      ? { label: 'GO', appearance: 'success' }
      : decision === 'no_go'
      ? { label: 'NO-GO', appearance: 'removed' }
      : decision === 'conditional'
      ? { label: 'CONDITIONAL', appearance: 'moved' }
      : decision === 'pending'
      ? { label: 'PENDING', appearance: 'default' }
      : { label: decision, appearance: 'default' };

  return (
    <Lozenge appearance={config.appearance}>
      {config.label}
    </Lozenge>
  );
}

export function ReportPanel({ releaseId }: ReportPanelProps) {
  const { data: report, isLoading, refetch } = useGenerateReport(releaseId);
  const exportReport = useExportReport();
  
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>(
    DEFAULT_REPORT_CONFIG.sections
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Generating report...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Unable to generate report</p>
        </CardContent>
      </Card>
    );
  }

  const handleExport = (format: 'pdf' | 'html' | 'json') => {
    exportReport.mutate({ report, format });
    setShowExportDialog(false);
  };

  const toggleSection = (section: ReportSection) => {
    setSelectedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Release Readiness Report
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
              >
                <Loader2 className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setShowExportDialog(true)}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Executive Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{report.metadata.releaseName}</h3>
                {report.metadata.releaseVersion && (
                  <p className="text-sm text-muted-foreground">
                    Version {report.metadata.releaseVersion}
                  </p>
                )}
              </div>
              <DecisionBadge decision={report.summary.decision} />
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-2xl font-bold">{report.summary.healthScore.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Health Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{report.testMetrics.passRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{report.defectSummary.totalOpen}</p>
                <p className="text-xs text-muted-foreground">Open Defects</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {report.signoffs.approved}/{report.signoffs.totalRequired}
                </p>
                <p className="text-xs text-muted-foreground">Approvals</p>
              </div>
            </div>

            <div className="space-y-1">
              {report.summary.keyHighlights.map((highlight, i) => (
                <p key={i} className="text-sm text-muted-foreground">• {highlight}</p>
              ))}
            </div>
          </div>

          {/* Quality Gates Summary */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Quality Gates
            </h4>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm">
                {report.qualityGates.passedGates}/{report.qualityGates.totalGates} passed
              </span>
              <Progress 
                value={(report.qualityGates.passedGates / Math.max(report.qualityGates.totalGates, 1)) * 100} 
                className="flex-1 h-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {report.qualityGates.gates.slice(0, 4).map((gate, i) => (
                <div 
                  key={i}
                  className={cn(
                    "flex items-center justify-between p-2 rounded text-sm",
                    gate.passed ? "bg-green-50" : "bg-red-50"
                  )}
                >
                  <span>{gate.name}</span>
                  {gate.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Risk Factors */}
          {report.riskFactors.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Risk Factors ({report.riskFactors.length})
              </h4>
              <div className="space-y-2">
                {report.riskFactors.map((risk, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "p-3 rounded-lg text-sm",
                      risk.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                      risk.severity === 'high' ? 'bg-orange-50 border border-orange-200' :
                      'bg-amber-50 border border-amber-200'
                    )}
                  >
                    <p className="font-medium">{risk.description}</p>
                    <p className="text-muted-foreground text-xs mt-1">{risk.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  {rec}
                </div>
              ))}
            </div>
          </div>

          {/* Report Metadata */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <p>Generated: {new Date(report.metadata.generatedAt).toLocaleString()}</p>
            <p>Report ID: {report.metadata.reportId}</p>
          </div>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription>
              Choose a format to export the release readiness report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">Export Format</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="flex-col h-auto py-4"
                  onClick={() => handleExport('pdf')}
                  disabled={exportReport.isPending}
                >
                  <Printer className="h-6 w-6 mb-2" />
                  <span>PDF</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-col h-auto py-4"
                  onClick={() => handleExport('html')}
                  disabled={exportReport.isPending}
                >
                  <FileCode className="h-6 w-6 mb-2" />
                  <span>HTML</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-col h-auto py-4"
                  onClick={() => handleExport('json')}
                  disabled={exportReport.isPending}
                >
                  <FileJson className="h-6 w-6 mb-2" />
                  <span>JSON</span>
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Include Sections</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(REPORT_SECTION_CONFIG) as ReportSection[]).map(section => (
                  <label
                    key={section}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedSections.includes(section)}
                      onCheckedChange={() => toggleSection(section)}
                    />
                    <SectionIcon section={section} className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{REPORT_SECTION_CONFIG[section].label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
