/**
 * Module 5C-4: Scheduled Reports Panel
 * Manage scheduled reports and export jobs
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lozenge } from '@/components/ads';
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
import CalendarIcon from '@atlaskit/icon/core/calendar';
import ClockIcon from '@atlaskit/icon/core/clock';
import AddIcon from '@atlaskit/icon/core/add';
import DownloadIcon from '@atlaskit/icon/core/download';
import FileIcon from '@atlaskit/icon/core/file';
import RefreshIcon from '@atlaskit/icon/core/refresh';
// No @atlaskit/icon equivalent — inline SVG
const MailIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const Trash2Icon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);
const PlayIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const PauseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);
const CodeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
);
const TableIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
  </svg>
);
const BracesIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" /><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
  </svg>
);
const SheetIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect width="20" height="20" x="2" y="2" rx="2" ry="2" /><path d="M16 2v20" /><path d="M2 12h20" />
  </svg>
);
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
  pdf: <FileIcon label="" size="small" primaryColor="currentColor" />,
  html: <CodeIcon size={16} />,
  csv: <TableIcon size={16} />,
  json: <BracesIcon size={16} />,
  xlsx: <SheetIcon size={16} />,
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
        return <Lozenge appearance="success">Completed</Lozenge>;
      case 'failed':
        return <Lozenge appearance="removed">Failed</Lozenge>;
      case 'processing':
        return <Lozenge appearance="inprogress">Processing</Lozenge>;
      default:
        return <Lozenge appearance="default">Pending</Lozenge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarIcon label="" size="small" primaryColor="currentColor" />
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
                <DownloadIcon label="" size="small" primaryColor="currentColor" />
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
                <AddIcon label="" size="small" primaryColor="currentColor" />
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
              <ClockIcon label="" size="small" primaryColor="currentColor" />
              Active Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : scheduledReports?.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon label="" size="medium" primaryColor="currentColor" />
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
                        <Lozenge appearance="default">
                          {SCHEDULE_FREQUENCY_LABELS[report.schedule.frequency]}
                        </Lozenge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <ClockIcon label="" size="small" primaryColor="currentColor" />
                          {report.schedule.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MailIcon size={12} />
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
                        <Trash2Icon size={16} />
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
              <DownloadIcon label="" size="small" primaryColor="currentColor" />
              Recent Exports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exportJobs?.length === 0 ? (
              <div className="text-center py-8">
                <DownloadIcon label="" size="medium" primaryColor="currentColor" />
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
                          <DownloadIcon label="" size="small" primaryColor="currentColor" />
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
