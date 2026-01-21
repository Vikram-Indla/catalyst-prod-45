/**
 * Module 5C-4: Scheduled Reports Panel
 * Manage scheduled reports and export jobs
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Trash2,
  Play,
  Pause,
  Download,
  FileText,
  Code,
  Table as TableIcon,
  Braces,
  Sheet,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  useScheduledReports,
  useCreateScheduledReport,
  useDeleteScheduledReport,
  useToggleScheduledReport,
  useExportJobs,
  useCreateExportJob,
  useExportToFormat,
} from '../hooks/useScheduledReports';
import {
  SCHEDULE_FREQUENCY_LABELS,
  EXPORT_FORMAT_CONFIG,
  type ScheduledReport,
  type ExportJob,
  type ScheduleFrequency,
} from '../types/analytics';

interface ScheduledReportsPanelProps {
  releaseId?: string;
}

const FORMAT_ICONS: Record<ExportJob['format'], React.ReactNode> = {
  pdf: <FileText className="h-4 w-4" />,
  html: <Code className="h-4 w-4" />,
  csv: <TableIcon className="h-4 w-4" />,
  json: <Braces className="h-4 w-4" />,
  xlsx: <Sheet className="h-4 w-4" />,
};

export function ScheduledReportsPanel({ releaseId }: ScheduledReportsPanelProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    reportType: 'readiness' as ScheduledReport['reportType'],
    format: 'pdf' as ScheduledReport['format'],
    frequency: 'weekly' as ScheduleFrequency,
    dayOfWeek: 1,
    time: '09:00',
    recipients: '',
  });

  const { data: scheduledReports, isLoading } = useScheduledReports(releaseId);
  const { data: exportJobs } = useExportJobs();
  
  const createScheduledReport = useCreateScheduledReport();
  const deleteScheduledReport = useDeleteScheduledReport();
  const toggleScheduledReport = useToggleScheduledReport();
  const createExportJob = useCreateExportJob();
  const { exportToCSV, exportToJSON, exportToHTML } = useExportToFormat();

  const handleCreateScheduledReport = async () => {
    await createScheduledReport.mutateAsync({
      name: formData.name,
      releaseId,
      reportType: formData.reportType,
      format: formData.format,
      schedule: {
        frequency: formData.frequency,
        dayOfWeek: formData.dayOfWeek,
        time: formData.time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      recipients: formData.recipients.split(',').map(e => e.trim()).filter(Boolean),
    });

    setIsCreateDialogOpen(false);
    setFormData({
      name: '',
      reportType: 'readiness',
      format: 'pdf',
      frequency: 'weekly',
      dayOfWeek: 1,
      time: '09:00',
      recipients: '',
    });
  };

  const handleQuickExport = async (format: ExportJob['format']) => {
    await createExportJob.mutateAsync({ format, releaseId });
    setIsExportDialogOpen(false);
  };

  const getStatusBadge = (job: ExportJob) => {
    switch (job.status) {
      case 'completed':
        return <Badge variant="default" className="bg-teal-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Scheduled Reports</h2>
            <p className="text-sm text-muted-foreground">
              Automate report generation and delivery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Quick Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Export</DialogTitle>
                <DialogDescription>
                  Export current release data in your preferred format.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-4">
                {(['pdf', 'html', 'csv', 'json', 'xlsx'] as const).map((format) => (
                  <Button
                    key={format}
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => handleQuickExport(format)}
                    disabled={createExportJob.isPending}
                  >
                    {FORMAT_ICONS[format]}
                    <span>{EXPORT_FORMAT_CONFIG[format].label}</span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule New Report</DialogTitle>
                <DialogDescription>
                  Configure automated report generation and delivery.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Weekly Release Status"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Report Type</Label>
                    <Select
                      value={formData.reportType}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, reportType: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="readiness">Readiness Report</SelectItem>
                        <SelectItem value="analytics">Analytics Summary</SelectItem>
                        <SelectItem value="comparison">Release Comparison</SelectItem>
                        <SelectItem value="custom">Custom Dashboard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select
                      value={formData.format}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, format: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, frequency: v as ScheduleFrequency }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCHEDULE_FREQUENCY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>

                {formData.frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <Select
                      value={formData.dayOfWeek.toString()}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, dayOfWeek: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients (comma-separated emails)</Label>
                  <Input
                    id="recipients"
                    value={formData.recipients}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                    placeholder="team@example.com, lead@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateScheduledReport} disabled={!formData.name.trim()}>
                  Create Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduled Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Active Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : scheduledReports?.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No scheduled reports yet.</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create your first schedule
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledReports?.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{report.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {SCHEDULE_FREQUENCY_LABELS[report.schedule.frequency]}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {report.schedule.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {report.recipients.length} recipients
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={report.isActive}
                        onCheckedChange={() => toggleScheduledReport.mutate(report.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteScheduledReport.mutate(report.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Exports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" />
              Recent Exports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exportJobs?.length === 0 ? (
              <div className="text-center py-8">
                <Download className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No recent exports.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exportJobs?.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-muted">
                        {FORMAT_ICONS[job.format]}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {EXPORT_FORMAT_CONFIG[job.format].label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job)}
                      {job.status === 'completed' && job.downloadUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
