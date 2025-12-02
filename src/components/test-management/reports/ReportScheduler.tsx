/**
 * Report Scheduler - Schedule automated report generation
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Mail, Trash2, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

const REPORT_TYPES = [
  { value: 'execution-summary', label: 'Execution Summary' },
  { value: 'tester-productivity', label: 'Tester Productivity' },
  { value: 'defect-density', label: 'Defect Density' },
  { value: 'requirements-coverage', label: 'Requirements Coverage' },
  { value: 'cycle-progress', label: 'Cycle Progress' },
  { value: 'trend-analysis', label: 'Trend Analysis' },
];

interface ReportSchedulerProps {
  schedules: ScheduledReport[];
  onCreateSchedule: (schedule: Omit<ScheduledReport, 'id' | 'lastRun' | 'nextRun'>) => void;
  onDeleteSchedule: (id: string) => void;
  onToggleSchedule: (id: string, enabled: boolean) => void;
}

export const ReportScheduler: React.FC<ReportSchedulerProps> = ({
  schedules,
  onCreateSchedule,
  onDeleteSchedule,
  onToggleSchedule,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    reportType: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek: number;
    dayOfMonth: number;
    time: string;
    recipients: string;
    format: 'pdf' | 'excel' | 'csv';
    enabled: boolean;
  }>({
    name: '',
    reportType: '',
    frequency: 'weekly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    time: '09:00',
    recipients: '',
    format: 'pdf',
    enabled: true,
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.reportType || !formData.recipients) {
      toast.error('Please fill in all required fields');
      return;
    }

    onCreateSchedule({
      name: formData.name,
      reportType: formData.reportType,
      frequency: formData.frequency,
      dayOfWeek: formData.frequency === 'weekly' ? formData.dayOfWeek : undefined,
      dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined,
      time: formData.time,
      recipients: formData.recipients.split(',').map(e => e.trim()),
      format: formData.format,
      enabled: formData.enabled,
    });

    setIsModalOpen(false);
    resetForm();
    toast.success('Report schedule created');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      reportType: '',
      frequency: 'weekly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      time: '09:00',
      recipients: '',
      format: 'pdf',
      enabled: true,
    });
  };

  const getFrequencyLabel = (schedule: ScheduledReport) => {
    switch (schedule.frequency) {
      case 'daily':
        return `Daily at ${schedule.time}`;
      case 'weekly':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${days[schedule.dayOfWeek || 0]} at ${schedule.time}`;
      case 'monthly':
        return `${schedule.dayOfMonth}${getOrdinalSuffix(schedule.dayOfMonth || 1)} at ${schedule.time}`;
      default:
        return '';
    }
  };

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Scheduled Reports</h2>
          <p className="text-sm text-muted-foreground">
            Automate report generation and delivery
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Schedule
        </Button>
      </div>

      {/* Schedules List */}
      <div className="grid gap-4">
        {schedules.map((schedule) => (
          <Card key={schedule.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-brand-gold/10 rounded-lg">
                    <FileText className="h-6 w-6 text-brand-gold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{schedule.name}</h3>
                      <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                        {schedule.enabled ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {REPORT_TYPES.find(t => t.value === schedule.reportType)?.label || schedule.reportType}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getFrequencyLabel(schedule)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {schedule.recipients.length} recipient(s)
                      </span>
                    </div>
                    {schedule.nextRun && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Next run: {new Date(schedule.nextRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleSchedule(schedule.id, !schedule.enabled)}
                  >
                    {schedule.enabled ? 'Pause' : 'Resume'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteSchedule(schedule.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {schedules.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scheduled reports yet</p>
              <p className="text-sm">Create a schedule to automate report delivery</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Schedule Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Report Schedule</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Weekly Execution Report"
              />
            </div>

            <div className="space-y-2">
              <Label>Report Type *</Label>
              <Select
                value={formData.reportType}
                onValueChange={(v) => setFormData({ ...formData, reportType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v: 'daily' | 'weekly' | 'monthly') =>
                    setFormData({ ...formData, frequency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>

            {formData.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={String(formData.dayOfWeek)}
                  onValueChange={(v) => setFormData({ ...formData, dayOfWeek: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                      (day, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {day}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Select
                  value={String(formData.dayOfMonth)}
                  onValueChange={(v) => setFormData({ ...formData, dayOfMonth: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients (comma-separated) *</Label>
              <Input
                id="recipients"
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="team@company.com, manager@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select
                value={formData.format}
                onValueChange={(v: 'pdf' | 'excel' | 'csv') =>
                  setFormData({ ...formData, format: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enabled: checked === true })
                }
              />
              <label htmlFor="enabled" className="text-sm">
                Enable schedule immediately
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
            >
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
