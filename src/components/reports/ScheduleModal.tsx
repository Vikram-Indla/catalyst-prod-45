import { useState } from 'react';
import { Calendar, Clock, Mail, Plus, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateSchedule, useUpdateSchedule } from '@/hooks/useReportAnalytics';
import { ReportSchedule } from '@/types/reports';
import { toast } from 'sonner';

interface ScheduleModalProps { open: boolean; onClose: () => void; reportId: string; reportName: string; existingSchedule?: ReportSchedule; }

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' }, { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' }, { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' }, { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' }, { value: 'Europe/London', label: 'London' },
  { value: 'Asia/Dubai', label: 'Dubai' },
];

export function ScheduleModal({ open, onClose, reportId, reportName, existingSchedule }: ScheduleModalProps) {
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const [config, setConfig] = useState<{
    frequency: 'daily' | 'weekly' | 'monthly';
    day_of_week: number;
    day_of_month: number;
    time_of_day: string;
    timezone: string;
    export_format: string;
    recipients: Array<{ email: string; name?: string }>;
  }>({
    frequency: (existingSchedule?.frequency || 'weekly') as 'daily' | 'weekly' | 'monthly',
    day_of_week: existingSchedule?.day_of_week ?? 1,
    day_of_month: existingSchedule?.day_of_month ?? 1,
    time_of_day: existingSchedule?.time_of_day || '09:00',
    timezone: existingSchedule?.timezone || 'UTC',
    export_format: existingSchedule?.export_format || 'pdf',
    recipients: existingSchedule?.recipients || [] as Array<{ email: string; name?: string }>,
  });
  const [newEmail, setNewEmail] = useState('');

  const handleAddRecipient = () => {
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setConfig({ ...config, recipients: [...config.recipients, { email: newEmail }] });
      setNewEmail('');
    }
  };

  const handleSave = async () => {
    if (config.recipients.length === 0) { toast.error('Add at least one recipient'); return; }
    const data = {
      report_id: reportId,
      frequency: config.frequency as any,
      day_of_week: config.frequency === 'weekly' ? config.day_of_week : null,
      day_of_month: config.frequency === 'monthly' ? config.day_of_month : null,
      time_of_day: config.time_of_day,
      timezone: config.timezone,
      export_format: config.export_format,
      recipients: config.recipients,
      is_active: true,
    };
    if (existingSchedule) { await updateSchedule.mutateAsync({ id: existingSchedule.id, ...data }); }
    else { await createSchedule.mutateAsync(data); }
    onClose();
  };

  const isLoading = createSchedule.isPending || updateSchedule.isPending;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Schedule Report</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Automatically generate and email "{reportName}"</p>
          <div className="space-y-2"><Label>Frequency</Label>
            <Select value={config.frequency} onValueChange={v => setConfig({...config, frequency: v as 'daily' | 'weekly' | 'monthly'})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
            </Select>
          </div>
          {config.frequency === 'weekly' && (
            <div className="space-y-2"><Label>Day of Week</Label>
              <Select value={config.day_of_week.toString()} onValueChange={v => setConfig({...config, day_of_week: parseInt(v)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {config.frequency === 'monthly' && (
            <div className="space-y-2"><Label>Day of Month</Label>
              <Select value={config.day_of_month.toString()} onValueChange={v => setConfig({...config, day_of_month: parseInt(v)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 28 }, (_, i) => i + 1).map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Time</Label>
              <div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="time" value={config.time_of_day} onChange={e => setConfig({...config, time_of_day: e.target.value})} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2"><Label>Timezone</Label>
              <Select value={config.timezone} onValueChange={v => setConfig({...config, timezone: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Format</Label>
            <Select value={config.export_format} onValueChange={v => setConfig({...config, export_format: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pdf">PDF</SelectItem><SelectItem value="excel">Excel</SelectItem><SelectItem value="csv">CSV</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Recipients</Label>
            <div className="flex gap-2">
              <div className="relative flex-1"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="email@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddRecipient()} className="pl-10" />
              </div>
              <Button variant="outline" size="icon" onClick={handleAddRecipient}><Plus className="h-4 w-4" /></Button>
            </div>
            {config.recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {config.recipients.map(r => (
                  <Badge key={r.email} variant="secondary" className="gap-1">{r.email}
                    <button onClick={() => setConfig({...config, recipients: config.recipients.filter(x => x.email !== r.email)})} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : existingSchedule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
