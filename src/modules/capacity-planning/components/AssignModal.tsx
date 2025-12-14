import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { cn } from '@/lib/utils';
import { CapacityBooking } from '../hooks/useCapacityBookings';

interface AssignModalProps {
  open: boolean;
  onClose: () => void;
  booking?: CapacityBooking | null;
  resourceId?: string;
  initialDate?: Date;
  businessRequests: Array<{ id: string; request_key: string | null; title: string }>;
  onSave: (data: {
    booking_type: 'ticket' | 'task' | 'leave';
    business_request_id?: string | null;
    summary?: string;
    start_date: string;
    end_date: string;
    status?: string;
    priority?: string;
    quarter?: string;
    rank?: number;
    kickoff_date?: string;
  }) => void;
  onDelete?: () => void;
}

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on-hold', label: 'On Hold' },
];

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const QUARTERS = [
  { value: 'Q1 2025', label: 'Q1 2025' },
  { value: 'Q2 2025', label: 'Q2 2025' },
  { value: 'Q3 2025', label: 'Q3 2025' },
  { value: 'Q4 2025', label: 'Q4 2025' },
];

export function AssignModal({
  open,
  onClose,
  booking,
  resourceId,
  initialDate,
  businessRequests,
  onSave,
  onDelete,
}: AssignModalProps) {
  const isEdit = !!booking;
  const [tab, setTab] = useState<'ticket' | 'task'>('ticket');
  const [isLeave, setIsLeave] = useState(false);

  // Form state
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [status, setStatus] = useState('planned');
  const [priority, setPriority] = useState('medium');
  const [quarter, setQuarter] = useState('');
  const [rank, setRank] = useState<number | undefined>();
  const [kickoffDate, setKickoffDate] = useState<Date | undefined>();

  // Initialize form when booking changes
  useEffect(() => {
    if (booking) {
      setTab(booking.booking_type === 'leave' ? 'task' : booking.booking_type);
      setIsLeave(booking.booking_type === 'leave');
      setSelectedTicketId(booking.business_request_id || '');
      setSummary(booking.summary || '');
      setStartDate(new Date(booking.start_date));
      setEndDate(new Date(booking.end_date));
      setStatus(booking.status || 'planned');
      setPriority(booking.priority || 'medium');
      setQuarter(booking.quarter || '');
      setRank(booking.rank || undefined);
      setKickoffDate(booking.kickoff_date ? new Date(booking.kickoff_date) : undefined);
    } else {
      // Reset for new booking
      setTab('ticket');
      setIsLeave(false);
      setSelectedTicketId('');
      setSummary('');
      setStartDate(initialDate || new Date());
      setEndDate(addDays(initialDate || new Date(), 4));
      setStatus('planned');
      setPriority('medium');
      setQuarter('');
      setRank(undefined);
      setKickoffDate(undefined);
    }
  }, [booking, initialDate, open]);

  const handleSave = () => {
    if (!startDate || !endDate) return;

    const bookingType = isLeave ? 'leave' : tab;

    onSave({
      booking_type: bookingType,
      business_request_id: tab === 'ticket' && !isLeave ? selectedTicketId || null : null,
      summary: (tab === 'task' || isLeave) ? summary : undefined,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      status,
      priority,
      quarter: quarter || undefined,
      rank,
      kickoff_date: kickoffDate ? format(kickoffDate, 'yyyy-MM-dd') : undefined,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Leave Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-leave"
              checked={isLeave}
              onCheckedChange={(checked) => setIsLeave(!!checked)}
            />
            <Label htmlFor="is-leave" className="text-sm cursor-pointer">
              Mark as Leave / Time Off
            </Label>
          </div>

          {!isLeave && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'ticket' | 'task')}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="ticket">Ticket</TabsTrigger>
                <TabsTrigger value="task">Ad-hoc Task</TabsTrigger>
              </TabsList>

              <TabsContent value="ticket" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Business Request</Label>
                  <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a request..." />
                    </SelectTrigger>
                    <SelectContent className="z-[400]">
                      {businessRequests.map(br => (
                        <SelectItem key={br.id} value={br.id}>
                          {br.request_key || br.id.slice(0, 8)} — {br.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quarter</Label>
                    <Select value={quarter} onValueChange={setQuarter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="z-[400]">
                        {QUARTERS.map(q => (
                          <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rank</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rank || ''}
                      onChange={(e) => setRank(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Kick-off Date</Label>
                  <CatalystDatePicker
                    value={kickoffDate}
                    onChange={setKickoffDate}
                  />
                </div>
              </TabsContent>

              <TabsContent value="task" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Task Summary</Label>
                  <Input
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="What needs to be done?"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {isLeave && (
            <div className="space-y-2">
              <Label>Leave Reason</Label>
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g., Annual Leave, Sick Leave..."
              />
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <CatalystDatePicker
                value={startDate}
                onChange={setStartDate}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <CatalystDatePicker
                value={endDate}
                onChange={setEndDate}
              />
            </div>
          </div>

          {/* Status & Priority */}
          {!isLeave && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[400]">
                    {STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[400]">
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEdit && onDelete && (
            <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={onDelete}>
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!startDate || !endDate}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
