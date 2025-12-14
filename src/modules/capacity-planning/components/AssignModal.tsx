import { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { cn } from '@/lib/utils';
import { CapacityBooking } from '../hooks/useCapacityBookings';
import { useResourceInventory } from '@/hooks/useResourceInventory';

interface BusinessRequest {
  id: string;
  request_key: string | null;
  title: string;
  planned_quarter?: string | null;
  rank?: number | null;
}

interface AssignModalProps {
  open: boolean;
  onClose: () => void;
  booking?: CapacityBooking | null;
  resourceId?: string;
  initialDate?: Date;
  businessRequests: BusinessRequest[];
  onSave: (data: {
    booking_type: 'ticket' | 'task' | 'leave';
    business_request_id?: string | null;
    summary?: string;
    start_date: string;
    end_date: string;
    quarter?: string;
    rank?: number;
    kickoff_date?: string;
  }) => void;
  onDelete?: () => void;
}

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
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [quarter, setQuarter] = useState('');
  const [rank, setRank] = useState<number | undefined>();
  const [kickoffDate, setKickoffDate] = useState<Date | undefined>();

  // Get resource info
  const { data: resources = [] } = useResourceInventory();
  const resource = useMemo(() => 
    resources.find(r => r.id === resourceId), 
    [resources, resourceId]
  );

  // Get selected business request
  const selectedRequest = useMemo(() => 
    businessRequests.find(br => br.id === selectedTicketId),
    [businessRequests, selectedTicketId]
  );

  // Filter business requests based on search
  const filteredRequests = useMemo(() => {
    if (!searchQuery) return businessRequests;
    const query = searchQuery.toLowerCase();
    return businessRequests.filter(br => 
      br.request_key?.toLowerCase().includes(query) ||
      br.title.toLowerCase().includes(query)
    );
  }, [businessRequests, searchQuery]);

  // Initialize form when booking changes
  useEffect(() => {
    if (booking) {
      setTab(booking.booking_type === 'leave' ? 'task' : booking.booking_type);
      setIsLeave(booking.booking_type === 'leave');
      setSelectedTicketId(booking.business_request_id || '');
      setSummary(booking.summary || '');
      setStartDate(new Date(booking.start_date));
      setEndDate(new Date(booking.end_date));
      setQuarter(booking.quarter || '');
      setRank(booking.rank || undefined);
      setKickoffDate(booking.kickoff_date ? new Date(booking.kickoff_date) : undefined);
    } else {
      // Reset for new booking
      setTab('ticket');
      setIsLeave(false);
      setSelectedTicketId('');
      setSummary('');
      setSearchQuery('');
      setStartDate(initialDate || new Date());
      setEndDate(addDays(initialDate || new Date(), 4));
      setQuarter('');
      setRank(undefined);
      setKickoffDate(undefined);
    }
  }, [booking, initialDate, open]);

  // Update quarter and rank when ticket is selected (from business_requests table)
  useEffect(() => {
    if (selectedRequest) {
      setQuarter(selectedRequest.planned_quarter || '');
      setRank(selectedRequest.rank || undefined);
    } else {
      setQuarter('');
      setRank(undefined);
    }
  }, [selectedRequest]);

  const handleSave = () => {
    if (!startDate || !endDate) return;

    const bookingType = isLeave ? 'leave' : tab;

    onSave({
      booking_type: bookingType,
      business_request_id: tab === 'ticket' && !isLeave ? selectedTicketId || null : null,
      summary: (tab === 'task' || isLeave) ? summary : undefined,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      quarter: quarter || undefined,
      rank,
      kickoff_date: kickoffDate ? format(kickoffDate, 'yyyy-MM-dd') : undefined,
    });

    onClose();
  };

  // Generate task ID for display
  const taskId = booking?.id ? `T${booking.id.slice(0, 3).toUpperCase()}` : 'T001';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="border-b border-brand-gold/30 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEdit ? 'Edit Assignment' : 'Create Assignment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Resource Card */}
          {resource && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
              <Avatar className="h-12 w-12">
                <AvatarFallback 
                  className="text-sm font-bold text-white"
                  style={{ 
                    background: resource.role_code === 'PO' 
                      ? 'hsl(var(--secondary-green))' 
                      : resource.role_code === 'BA' 
                        ? 'hsl(var(--brand-gold))' 
                        : 'hsl(var(--secondary-bronze))'
                  }}
                >
                  {resource.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{resource.name}</p>
                <p className="text-sm text-muted-foreground">{resource.role_code || 'Team Member'}</p>
              </div>
            </div>
          )}

          {/* Leave Checkbox */}
          <div 
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border-2 transition-colors cursor-pointer",
              isLeave 
                ? "border-violet-400 bg-violet-50" 
                : "border-border hover:border-violet-200"
            )}
            onClick={() => setIsLeave(!isLeave)}
          >
            <Checkbox
              id="is-leave"
              checked={isLeave}
              onCheckedChange={(checked) => setIsLeave(!!checked)}
              className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
            />
            <Label htmlFor="is-leave" className={cn(
              "text-sm font-medium cursor-pointer",
              isLeave ? "text-violet-600" : "text-secondary-green"
            )}>
              Book as Leave
            </Label>
          </div>

          {!isLeave && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'ticket' | 'task')}>
              <TabsList className="grid grid-cols-2 h-10">
                <TabsTrigger value="ticket" className="font-medium">Ticket</TabsTrigger>
                <TabsTrigger value="task" className="font-medium">Task</TabsTrigger>
              </TabsList>

              <TabsContent value="ticket" className="space-y-4 mt-4">
                {/* Request Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Request</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search requests..."
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a request..." />
                    </SelectTrigger>
                    <SelectContent className="z-[400] bg-background max-h-[200px]">
                      {filteredRequests.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No requests found
                        </div>
                      ) : (
                        filteredRequests.map(br => (
                          <SelectItem key={br.id} value={br.id}>
                            <span className="font-medium text-secondary-green">{br.request_key || br.id.slice(0, 8)}</span>
                            <span className="text-muted-foreground mx-1">—</span>
                            <span className="truncate">{br.title}</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quarter & Rank - Read Only */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quarter</Label>
                    <Input
                      value={quarter || '—'}
                      readOnly
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Rank</Label>
                    <Input
                      value={rank || '—'}
                      readOnly
                      className="bg-muted/50"
                    />
                  </div>
                </div>

                {/* Kick-off Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kick-off Date</Label>
                  <CatalystDatePicker
                    value={kickoffDate}
                    onChange={setKickoffDate}
                  />
                </div>
              </TabsContent>

              <TabsContent value="task" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Task Summary <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="What needs to be done?"
                    className="min-h-[100px] resize-y"
                  />
                  <p className="text-xs text-secondary-green">Task ID: {taskId}</p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {isLeave && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Task Summary <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g., Annual Leave, Personal Leave..."
                className="min-h-[100px] resize-y"
              />
              <p className="text-xs text-secondary-green">Task ID: {taskId}</p>
            </div>
          )}

          {/* Schedule Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <CatalystDatePicker
                  value={startDate}
                  onChange={setStartDate}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <CatalystDatePicker
                  value={endDate}
                  onChange={setEndDate}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          {isEdit && onDelete && (
            <Button 
              variant="outline" 
              className="border-destructive text-destructive hover:bg-destructive/10" 
              onClick={onDelete}
            >
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!startDate || !endDate || ((tab === 'task' || isLeave) && !summary)}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {isEdit ? 'Save' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}