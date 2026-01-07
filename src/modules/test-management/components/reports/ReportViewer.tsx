/**
 * Report Viewer - Displays generated reports with actions
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Share2, 
  Save, 
  RefreshCw, 
  Edit2, 
  FileSpreadsheet, 
  FileText,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { GeneratedReportData, reportsService } from '../../services/reportsService';
import { reportExportService } from '../../services/reportExportService';
import { REPORT_TYPES } from '../../config/reportTypes';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReportViewerProps {
  report: GeneratedReportData | null;
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function ReportViewer({ report, onClose, onEdit, onRefresh, isRefreshing }: ReportViewerProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportTags, setReportTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  if (!report) return null;

  const reportConfig = REPORT_TYPES.find(rt => rt.id === report.reportType);

  const handleSave = async () => {
    if (!reportName.trim()) {
      toast({ title: 'Error', description: 'Please enter a report name', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const tags = reportTags.split(',').map(t => t.trim()).filter(Boolean);
      await reportsService.saveReport(reportName, report.reportType, report.parameters, tags);
      toast({ title: 'Success', description: 'Report saved successfully' });
      setSaveDialogOpen(false);
      setReportName('');
      setReportTags('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save report', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (exportFormat: 'excel' | 'pdf') => {
    const reportConfig = REPORT_TYPES.find(rt => rt.id === report.reportType);
    const filename = `${reportConfig?.name || 'Report'}-${format(new Date(), 'yyyy-MM-dd')}`;
    
    // Build summary from report data
    const summary: Record<string, any> = {};
    if (report.data.totalRuns !== undefined) summary['Total Runs'] = report.data.totalRuns;
    if (report.data.passRate !== undefined) summary['Pass Rate'] = `${report.data.passRate.toFixed(1)}%`;
    if (report.data.progress !== undefined) summary['Progress'] = `${report.data.progress.toFixed(1)}%`;
    if (report.data.statusCounts) {
      Object.entries(report.data.statusCounts).forEach(([status, count]) => {
        summary[status.charAt(0).toUpperCase() + status.slice(1)] = count;
      });
    }
    
    // Build data array for table export
    let dataArray: any[] = [];
    if (report.data.cases && Array.isArray(report.data.cases)) {
      dataArray = report.data.cases;
    } else if (report.data.defects && Array.isArray(report.data.defects)) {
      dataArray = report.data.defects;
    }
    
    const exportData = {
      title: reportConfig?.name || 'Test Report',
      subtitle: reportConfig?.description,
      generatedAt: format(new Date(report.generatedAt), 'PPpp'),
      summary,
      data: dataArray,
      chartElementId: 'report-chart',
    };
    
    try {
      toast({ title: 'Export Started', description: `Generating ${exportFormat.toUpperCase()} file...` });
      
      if (exportFormat === 'pdf') {
        await reportExportService.exportToPDF(exportData, filename);
      } else {
        await reportExportService.exportToExcel(exportData, filename);
      }
      
      toast({ title: 'Export Complete', description: `Report exported as ${exportFormat.toUpperCase()}` });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Export Failed', description: 'Could not generate the export file', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    toast({ title: 'Share', description: 'Please save the report first to share it' });
    setSaveDialogOpen(true);
  };

  // Render report content based on type
  const renderReportContent = () => {
    const { data } = report;

    switch (report.reportType) {
      case 'execution-summary':
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.totalRuns || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Runs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{(data.passRate || 0).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Pass Rate</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-600">{(data.progress || 0).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Progress</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">{data.statusCounts?.failed || 0}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  {Object.entries(data.statusCounts || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      {status === 'passed' && <CheckCircle2 className="h-4 w-4 text-success-foreground" />}
                      {status === 'failed' && <XCircle className="h-4 w-4 text-danger-foreground" />}
                      {status === 'blocked' && <AlertTriangle className="h-4 w-4 text-warning-foreground" />}
                      {status === 'not_run' && <Clock className="h-4 w-4 text-muted-foreground" />}
                      {!['passed', 'failed', 'blocked', 'not_run'].includes(status) && <Clock className="h-4 w-4 text-muted-foreground" />}
                      <span className="capitalize">{status.replace('_', ' ')}: {count as number}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cycle Info */}
            {data.cycle && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cycle Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {data.cycle.name}</div>
                    <div><span className="text-muted-foreground">Key:</span> {data.cycle.cycle_key}</div>
                    <div><span className="text-muted-foreground">Status:</span> {data.cycle.status}</div>
                    <div><span className="text-muted-foreground">Created:</span> {data.cycle.created_at ? format(new Date(data.cycle.created_at), 'PPP') : 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'case-distribution':
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-4">
                <div className="text-3xl font-bold">{data.totalCases || 0}</div>
                <div className="text-sm text-muted-foreground">Total Test Cases</div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(data.byPriority || {}).map(([priority, count]) => (
                      <div key={priority} className="flex justify-between">
                        <span className="capitalize">{priority}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(data.byStatus || {}).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span className="capitalize">{status}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(data.byType || {}).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'project-metrics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.totalCases || 0}</div>
                  <div className="text-sm text-muted-foreground">Test Cases</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.totalCycles || 0}</div>
                  <div className="text-sm text-muted-foreground">Test Cycles</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.totalExecutions || 0}</div>
                  <div className="text-sm text-muted-foreground">Executions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">{data.openDefects || 0}</div>
                  <div className="text-sm text-muted-foreground">Open Defects</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="text-4xl font-bold text-green-600">{(data.passRate || 0).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Overall Pass Rate</div>
              </CardContent>
            </Card>
          </div>
        );

      case 'multi-cycle-summary':
        return (
          <div className="space-y-6">
            <div className="grid gap-4">
              {(data.cycles || []).map((cycle: any) => (
                <Card key={cycle.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{cycle.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-xl font-bold">{cycle.totalRuns || 0}</div>
                        <div className="text-xs text-muted-foreground">Total Runs</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-600">{(cycle.passRate || 0).toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Pass Rate</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-600">{cycle.statusCounts?.passed || 0}</div>
                        <div className="text-xs text-muted-foreground">Passed</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-red-600">{cycle.statusCounts?.failed || 0}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'traceability-summary':
      case 'traceability-detail':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.totalRequirements || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Requirements</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{data.coveredCount || 0}</div>
                  <div className="text-sm text-muted-foreground">Covered</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">{data.uncoveredCount || 0}</div>
                  <div className="text-sm text-muted-foreground">Uncovered</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-600">{(data.coveragePercentage || 0).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Coverage</div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'defect-impact':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.totalDefects || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Defects</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-orange-600">{data.affectedCases || 0}</div>
                  <div className="text-sm text-muted-foreground">Affected Cases</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {Object.entries(data.bySeverity || {}).map(([severity, count]) => (
                      <div key={severity} className="flex justify-between text-sm">
                        <span className="capitalize">{severity}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <pre className="text-xs overflow-auto max-h-[400px] bg-muted p-4 rounded">
                {JSON.stringify(data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">{reportConfig?.name || 'Report'}</h1>
                <p className="text-sm text-muted-foreground">
                  Generated {format(new Date(report.generatedAt), 'PPP p')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit2 className="h-4 w-4 mr-1" /> Edit
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      <FileText className="h-4 w-4 mr-2" /> Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
                  <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>

                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-1" /> Share
                </Button>

                <Button variant="default" size="sm" onClick={() => setSaveDialogOpen(true)}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>

                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {renderReportContent()}
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reportName">Report Name *</Label>
              <Input
                id="reportName"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter a name for this report"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportTags">Tags (comma separated)</Label>
              <Input
                id="reportTags"
                value={reportTags}
                onChange={(e) => setReportTags(e.target.value)}
                placeholder="e.g. sprint-1, regression, qa"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
