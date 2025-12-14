import { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { Search, X, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CapacityBooking } from '../hooks/useCapacityBookings';

interface BusinessRequest {
  id: string;
  request_key: string | null;
  title: string;
  planned_quarter?: string | null;
  rank?: number | null;
  impl_start_date?: string | null;
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
  viewResources: ResourceItem[];
  onSave: (data: {
    resource_id: string;
    booking_type: 'ticket' | 'task' | 'leave';
    business_request_id?: string | null;
    summary?: string;
    start_date: string;
    end_date: string;
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
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Get selected requests
  const selectedRequests = useMemo(() => 
    businessRequests.filter(br => selectedTicketIds.includes(br.id)),
    [businessRequests, selectedTicketIds]
  );

  // Filter business requests based on search (exclude already selected)
  const filteredRequests = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return businessRequests
      .filter(br => !selectedTicketIds.includes(br.id))
      .filter(br => 
        br.request_key?.toLowerCase().includes(query) ||
        br.title.toLowerCase().includes(query)
      );
  }, [businessRequests, searchQuery, selectedTicketIds]);

  // Initialize form when booking changes
  useEffect(() => {
    if (booking) {
      setTab(booking.booking_type === 'leave' ? 'task' : booking.booking_type);
      setIsLeave(booking.booking_type === 'leave');
      setSelectedResourceId(booking.resource_id || resourceId || '');
      setSelectedTicketIds(booking.business_request_id ? [booking.business_request_id] : []);
      setSummary(booking.summary || '');
      setStartDate(new Date(booking.start_date));
      setEndDate(new Date(booking.end_date));
    } else {
      setTab('ticket');
      setIsLeave(false);
      setSelectedResourceId(resourceId || '');
      setSelectedTicketIds([]);
      setSummary('');
      setSearchQuery('');
      setStartDate(initialDate || new Date());
      setEndDate(addDays(initialDate || new Date(), 4));
    }
  }, [booking, initialDate, open, resourceId]);

  const handleAddTicket = (ticketId: string) => {
    setSelectedTicketIds(prev => [...prev, ticketId]);
    setSearchQuery('');
  };

  const handleRemoveTicket = (ticketId: string) => {
    setSelectedTicketIds(prev => prev.filter(id => id !== ticketId));
  };

  const handleSave = () => {
    if (!startDate || !endDate || !selectedResourceId) return;

    const bookingType = isLeave ? 'leave' : tab;

    // For multi-ticket selection, create one booking per request
    if (tab === 'ticket' && !isLeave && selectedTicketIds.length > 0) {
      selectedTicketIds.forEach(ticketId => {
        onSave({
          resource_id: selectedResourceId,
          booking_type: bookingType,
          business_request_id: ticketId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        });
      });
    } else {
      onSave({
        resource_id: selectedResourceId,
        booking_type: bookingType,
        business_request_id: null,
        summary: (tab === 'task' || isLeave) ? summary : undefined,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      });
    }

    onClose();
  };

  const taskId = booking?.id ? `T${booking.id.slice(0, 3).toUpperCase()}` : 'T001';

  const formatMetadata = (request: BusinessRequest) => {
    const parts: string[] = [];
    if (request.planned_quarter) parts.push(`Q: ${request.planned_quarter}`);
    if (request.rank) parts.push(`Rank: ${request.rank}`);
    if (request.impl_start_date) parts.push(`Kickoff: ${format(new Date(request.impl_start_date), 'MMM d')}`);
    return parts.join(' • ');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="border-b border-brand-gold/30 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEdit ? 'Edit Assignment' : 'Create Assignment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Resource Selector */}
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

          {/* Leave Checkbox */}
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
                {/* Request Search - Multi-select */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Request(s)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search and add multiple requests..."
                      className="pl-9 h-10"
                    />
                    {/* Search Results Dropdown */}
                    {searchQuery && filteredRequests.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 border rounded-md bg-background shadow-lg max-h-[200px] overflow-y-auto z-50">
                        {filteredRequests.slice(0, 8).map(br => (
                          <TooltipProvider key={br.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleAddTicket(br.id)}
                                  className="w-full text-left px-3 py-2.5 hover:bg-muted/50 text-sm border-b last:border-b-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-secondary-green shrink-0">
                                      {br.request_key || br.id.slice(0, 8)}
                                    </span>
                                    <span className="text-muted-foreground">—</span>
                                    <span className="truncate text-foreground">{br.title}</span>
                                  </div>
                                  {/* Metadata as secondary line */}
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatMetadata(br) || 'No metadata'}
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <div className="space-y-1">
                                  <div className="font-medium">{br.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatMetadata(br) || 'No additional metadata'}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Requests as chips */}
                  {selectedRequests.length > 0 && (
                    <div className="space-y-2">
                      {selectedRequests.map(request => (
                        <TooltipProvider key={request.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-md border border-border group">
                                <span className="flex items-center gap-2 truncate">
                                  <span className="font-medium text-secondary-green shrink-0">
                                    {request.request_key}
                                  </span>
                                  <span className="text-muted-foreground">—</span>
                                  <span className="truncate text-sm">{request.title}</span>
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveTicket(request.id)}
                                  className="text-muted-foreground hover:text-destructive ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">{formatMetadata(request)}</div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  )}

                  {/* Help text */}
                  {selectedRequests.length > 1 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {selectedRequests.length} requests selected. One booking will be created per request.
                    </p>
                  )}
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
            disabled={
              !selectedResourceId || 
              !startDate || 
              !endDate || 
              ((tab === 'task' || isLeave) && !summary) ||
              (tab === 'ticket' && !isLeave && selectedTicketIds.length === 0)
            }
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {isEdit ? 'Save' : selectedTicketIds.length > 1 ? `Create ${selectedTicketIds.length} Bookings` : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
