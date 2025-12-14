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
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { cn } from '@/lib/utils';
import { CapacityBooking } from '../hooks/useCapacityBookings';

interface BusinessRequest {
  id: string;
  request_key: string | null;
  title: string;
  planned_quarter?: string | null;
  rank?: number | null;
  impl_start_date?: string | null; // Kickoff date from business request
}

interface ResourceItem {
  id: string;
  name: string;
  role_code?: string | null;
}

interface AssignModalProps {
  open: boolean;
  onClose: () => void;
  booking?: CapacityBooking | null;
  resourceId?: string;
  initialDate?: Date;
  businessRequests: BusinessRequest[];
  viewResources: ResourceItem[]; // All resources in current view
  onSave: (data: {
    resource_id: string;
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
  viewResources,
  onSave,
  onDelete,
}: AssignModalProps) {
  const isEdit = !!booking;
  const [tab, setTab] = useState<'ticket' | 'task'>('ticket');
  const [isLeave, setIsLeave] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [quarter, setQuarter] = useState('');
  const [rank, setRank] = useState<number | undefined>();
  const [kickoffDate, setKickoffDate] = useState<Date | undefined>();

  // Get selected resource from viewResources
  const selectedResource = useMemo(() => 
    viewResources.find(r => r.id === selectedResourceId), 
    [viewResources, selectedResourceId]
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
      setSelectedResourceId(booking.resource_id || resourceId || '');
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
      setSelectedResourceId(resourceId || '');
      setSelectedTicketId('');
      setSummary('');
      setSearchQuery('');
      setStartDate(initialDate || new Date());
      setEndDate(addDays(initialDate || new Date(), 4));
      setQuarter('');
      setRank(undefined);
      setKickoffDate(undefined);
    }
  }, [booking, initialDate, open, resourceId]);

  // Update quarter, rank, and kickoff date when ticket is selected (from business_requests table)
  useEffect(() => {
    if (selectedRequest) {
      setQuarter(selectedRequest.planned_quarter || '');
      setRank(selectedRequest.rank || undefined);
      setKickoffDate(selectedRequest.impl_start_date ? new Date(selectedRequest.impl_start_date) : undefined);
    } else {
      setQuarter('');
      setRank(undefined);
      setKickoffDate(undefined);
    }
  }, [selectedRequest]);

  const handleSave = () => {
    if (!startDate || !endDate || !selectedResourceId) return;

    const bookingType = isLeave ? 'leave' : tab;

    onSave({
      resource_id: selectedResourceId,
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
          {/* Resource Selector - List of all resources in view */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Resource <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a resource..." />
              </SelectTrigger>
              <SelectContent className="z-[400] bg-background max-h-[200px]">
                {viewResources.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No resources in view
                  </div>
                ) : (
                  viewResources.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0"
                          style={{ 
                            background: r.role_code === 'PO' 
                              ? 'hsl(var(--secondary-green))' 
                              : r.role_code === 'BA' 
                                ? 'hsl(var(--brand-gold))' 
                                : 'hsl(var(--secondary-bronze))'
                          }}
                        >
                          {r.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground text-xs">({r.role_code || 'N/A'})</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Leave Checkbox - De-emphasized */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsLeave(!isLeave)}
          >
            <Checkbox
              id="is-leave"
              checked={isLeave}
              onCheckedChange={(checked) => setIsLeave(!!checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="is-leave" className="text-xs text-muted-foreground cursor-pointer">
              Book as Leave
            </Label>
          </div>

          {!isLeave && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'ticket' | 'task')}>
              <TabsList className="grid grid-cols-2 h-12 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger 
                  value="ticket" 
                  className="font-semibold text-base data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-secondary-green rounded-md"
                >
                  Ticket
                </TabsTrigger>
                <TabsTrigger 
                  value="task" 
                  className="font-semibold text-base data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-secondary-green rounded-md"
                >
                  Task
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ticket" className="space-y-4 mt-4">
                {/* Request Search with auto-complete dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Request</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        // Clear selection when searching
                        if (e.target.value === '') {
                          setSelectedTicketId('');
                        }
                      }}
                      placeholder="Search requests..."
                      className="pl-9"
                    />
                  </div>
                  {/* Search Results Dropdown */}
                  {searchQuery && filteredRequests.length > 0 && !selectedRequest && (
                    <div className="border rounded-md bg-background shadow-md max-h-[160px] overflow-y-auto">
                      {filteredRequests.slice(0, 5).map(br => (
                        <button
                          key={br.id}
                          type="button"
                          onClick={() => {
                            setSelectedTicketId(br.id);
                            setSearchQuery(`${br.request_key || br.id.slice(0, 8)} — ${br.title}`);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b last:border-b-0"
                        >
                          <span className="font-medium text-secondary-green">{br.request_key || br.id.slice(0, 8)}</span>
                          <span className="text-muted-foreground mx-1">—</span>
                          <span className="truncate">{br.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Selected Request Display */}
                  {selectedRequest && (
                    <div className="text-sm p-2 bg-muted/30 rounded-md flex items-center justify-between">
                      <span>
                        <span className="font-medium text-secondary-green">{selectedRequest.request_key}</span>
                        <span className="text-muted-foreground mx-1">—</span>
                        <span>{selectedRequest.title}</span>
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedTicketId('');
                          setSearchQuery('');
                        }}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Quarter & Rank - Read Only from Business Request */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Quarter</Label>
                    <div className="text-sm font-medium py-2 px-3 bg-muted/30 rounded-md border border-border">
                      {quarter || '—'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Rank</Label>
                    <div className="text-sm font-medium py-2 px-3 bg-muted/30 rounded-md border border-border">
                      {rank || '—'}
                    </div>
                  </div>
                </div>

                {/* Kick-off Date - Read Only from Business Request */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Kick-off Date</Label>
                  <div className="text-sm font-medium py-2 px-3 bg-muted/30 rounded-md border border-border">
                    {kickoffDate ? format(kickoffDate, 'dd/MM/yyyy') : '—'}
                  </div>
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
            disabled={!selectedResourceId || !startDate || !endDate || ((tab === 'task' || isLeave) && !summary)}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {isEdit ? 'Save' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}