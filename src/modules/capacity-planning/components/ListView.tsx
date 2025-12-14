import React, { useMemo, useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ArrowUpDown, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ResourceInventoryItem } from '@/hooks/useResourceInventory';
import { CapacityBooking } from '../hooks/useCapacityBookings';

interface ListViewProps {
  resources: ResourceInventoryItem[];
  bookings: CapacityBooking[];
  groupBy: string;
  searchQuery: string;
  selectedItems: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onBookingClick: (booking: CapacityBooking) => void;
  onDeleteBooking: (bookingId: string) => void;
}

type SortColumn = 'rank' | 'ticket' | 'status' | 'quarter' | 'kickoff';
type SortDirection = 'asc' | 'desc';

// Type badge colors
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  ticket: { bg: 'bg-secondary-green', text: 'text-white' },
  leave: { bg: 'bg-amber-500', text: 'text-white' },
  task: { bg: 'bg-teal-500', text: 'text-white' },
};

// Status with dot indicator colors
const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  'in-progress': { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  'in_progress': { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  planned: { dot: 'bg-teal-500', text: 'text-teal-600', bg: 'bg-teal-50' },
  leave: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  completed: { dot: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' },
  draft: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', bg: 'bg-muted' },
};

// Priority colors
const PRIORITY_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  high: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  medium: { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  low: { text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
};

// Rank circle colors based on rank number
const getRankColor = (rank: number | null): string => {
  if (!rank) return 'bg-muted-foreground/30';
  if (rank <= 3) return 'bg-secondary-green';
  if (rank <= 6) return 'bg-brand-gold';
  return 'bg-muted-foreground/50';
};

export function ListView({
  resources,
  bookings,
  groupBy,
  searchQuery,
  selectedItems,
  onSelectionChange,
  onBookingClick,
  onDeleteBooking,
}: ListViewProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('kickoff');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const resourceMap = useMemo(() => {
    const map = new Map<string, ResourceInventoryItem>();
    resources.forEach(r => map.set(r.id, r));
    return map;
  }, [resources]);

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b => {
        const resource = resourceMap.get(b.resource_id);
        return (
          b.business_request?.request_key?.toLowerCase().includes(query) ||
          b.business_request?.title?.toLowerCase().includes(query) ||
          b.summary?.toLowerCase().includes(query) ||
          resource?.name.toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'rank':
          comparison = (a.rank || 999) - (b.rank || 999);
          break;
        case 'ticket':
          comparison = (a.business_request?.title || a.summary || '').localeCompare(b.business_request?.title || b.summary || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'quarter':
          comparison = (a.quarter || '').localeCompare(b.quarter || '');
          break;
        case 'kickoff':
          comparison = new Date(a.kickoff_date || a.start_date).getTime() - new Date(b.kickoff_date || b.start_date).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [bookings, searchQuery, sortColumn, sortDirection, resourceMap]);

  const groupedBookings = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Items': filteredBookings };
    }

    const groups: Record<string, CapacityBooking[]> = {};
    filteredBookings.forEach(booking => {
      let key = 'Ungrouped';
      switch (groupBy) {
        case 'status':
          key = booking.status || 'No Status';
          break;
        case 'quarter':
          key = booking.quarter || 'No Quarter';
          break;
        case 'resource':
          key = resourceMap.get(booking.resource_id)?.name || 'Unknown';
          break;
        case 'type':
          key = booking.booking_type.charAt(0).toUpperCase() + booking.booking_type.slice(1);
          break;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(booking);
    });

    return groups;
  }, [filteredBookings, groupBy, resourceMap]);

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredBookings.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(filteredBookings.map(b => b.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange(newSelected);
  };

  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => toggleSort(column)}
    >
      {children}
      <ArrowUpDown className={cn(
        'h-3 w-3',
        sortColumn === column ? 'text-brand-gold' : 'text-muted-foreground/50'
      )} />
    </button>
  );

  const getDisplayKey = (booking: CapacityBooking): string => {
    if (booking.booking_type === 'ticket') {
      return booking.business_request?.request_key || 'N/A';
    }
    if (booking.booking_type === 'leave') {
      return 'LEAVE';
    }
    return `T${booking.id.slice(0, 3).toUpperCase()}`;
  };

  const getDisplayTitle = (booking: CapacityBooking): string => {
    if (booking.booking_type === 'ticket') {
      return booking.business_request?.title || 'Untitled';
    }
    return booking.summary || (booking.booking_type === 'leave' ? 'Leave' : 'Task');
  };

  const getStatusDisplay = (booking: CapacityBooking) => {
    if (booking.booking_type === 'leave') {
      return { label: 'Leave', style: STATUS_STYLES.leave };
    }
    const status = booking.status?.replace('_', '-') || 'draft';
    return { 
      label: status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      style: STATUS_STYLES[status] || STATUS_STYLES.draft 
    };
  };

  const formatQuarter = (quarter: string | null): React.ReactNode => {
    if (!quarter) return '—';
    // Parse Q1 2025 or Q1'25 format
    const match = quarter.match(/Q(\d)\s*'?(\d{2,4})/i);
    if (match) {
      const q = match[1];
      const year = match[2].length === 2 ? match[2] : match[2].slice(-2);
      return (
        <span className="inline-flex flex-col items-center text-xs">
          <span className="font-medium">Q{q}</span>
          <span className="text-muted-foreground">20{year}</span>
        </span>
      );
    }
    return quarter;
  };

  // Show table even if no bookings - just show empty state within table
  const hasData = filteredBookings.length > 0 || resources.length > 0;

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10 bg-background border-b" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
          <tr className="text-xs font-semibold text-muted-foreground uppercase">
            <th className="w-10 px-3 py-3 text-center">
              <Checkbox
                checked={selectedItems.size === filteredBookings.length && filteredBookings.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </th>
            <th className="w-16 px-3 py-3 text-left">
              <SortableHeader column="rank">Rank</SortableHeader>
            </th>
            <th className="min-w-[300px] px-3 py-3 text-left">
              <SortableHeader column="ticket">Ticket / Task</SortableHeader>
            </th>
            <th className="w-24 px-3 py-3 text-center">Type</th>
            <th className="w-32 px-3 py-3 text-left">
              <SortableHeader column="status">Status</SortableHeader>
            </th>
            <th className="w-24 px-3 py-3 text-center">Priority</th>
            <th className="w-20 px-3 py-3 text-center">
              <SortableHeader column="quarter">Quarter</SortableHeader>
            </th>
            <th className="w-24 px-3 py-3 text-left">Kick-Off</th>
            <th className="w-16 px-3 py-3 text-center">Res</th>
            <th className="w-12 px-3 py-3 text-center"></th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedBookings).map(([group, groupBookings]) => (
            <React.Fragment key={group}>
              {groupBy !== 'none' && (
                <tr className="bg-muted/30">
                  <td colSpan={10} className="px-3 py-2 text-sm font-semibold">
                    {group} ({groupBookings.length})
                  </td>
                </tr>
              )}
              {groupBookings.map((booking) => {
                const resource = resourceMap.get(booking.resource_id);
                const statusDisplay = getStatusDisplay(booking);
                const typeStyle = TYPE_COLORS[booking.booking_type] || TYPE_COLORS.ticket;
                const priorityStyle = PRIORITY_STYLES[booking.priority || 'medium'] || PRIORITY_STYLES.medium;

                return (
                  <tr
                    key={booking.id}
                    className={cn(
                      'border-b hover:bg-muted/30 cursor-pointer transition-colors',
                      selectedItems.has(booking.id) && 'bg-brand-gold/5'
                    )}
                    style={{ borderColor: 'hsl(var(--border) / 0.4)' }}
                    onClick={() => onBookingClick(booking)}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedItems.has(booking.id)}
                        onCheckedChange={() => toggleSelectItem(booking.id)}
                      />
                    </td>

                    {/* Rank - Colored circle with number */}
                    <td className="px-3 py-3">
                      {booking.rank ? (
                        <div 
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold',
                            getRankColor(booking.rank)
                          )}
                        >
                          {booking.rank}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted text-muted-foreground text-sm">
                          —
                        </div>
                      )}
                    </td>

                    {/* Ticket/Task - ID with colored border + title */}
                    <td className="px-3 py-3">
                      <div className="space-y-0.5">
                        <span className={cn(
                          'inline-block px-1.5 py-0.5 text-xs font-medium border rounded',
                          booking.booking_type === 'ticket' && 'text-secondary-green border-secondary-green/30 bg-secondary-green/5',
                          booking.booking_type === 'leave' && 'text-amber-600 border-amber-300 bg-amber-50',
                          booking.booking_type === 'task' && 'text-teal-600 border-teal-300 bg-teal-50'
                        )}>
                          {getDisplayKey(booking)}
                        </span>
                        <p className="text-sm text-foreground truncate max-w-[300px]">
                          {getDisplayTitle(booking)}
                        </p>
                      </div>
                    </td>

                    {/* Type - Colored badge */}
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        'inline-flex px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide',
                        typeStyle.bg, typeStyle.text
                      )}>
                        {booking.booking_type}
                      </span>
                    </td>

                    {/* Status - Dot + label */}
                    <td className="px-3 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                        statusDisplay.style.bg, statusDisplay.style.text
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusDisplay.style.dot)} />
                        {statusDisplay.label}
                      </span>
                    </td>

                    {/* Priority - Colored text badge */}
                    <td className="px-3 py-3 text-center">
                      {booking.priority ? (
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded border text-xs font-medium',
                          priorityStyle.bg, priorityStyle.text, priorityStyle.border
                        )}>
                          {booking.priority}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>

                    {/* Quarter */}
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex flex-col items-center px-2 py-1 bg-muted/50 rounded text-xs">
                        {formatQuarter(booking.quarter)}
                      </div>
                    </td>

                    {/* Kick-Off */}
                    <td className="px-3 py-3 text-sm text-muted-foreground">
                      {booking.kickoff_date 
                        ? format(new Date(booking.kickoff_date), 'MMM d')
                        : format(new Date(booking.start_date), 'MMM d')}
                    </td>

                    {/* Resource Avatar */}
                    <td className="px-3 py-3 text-center">
                      {resource ? (
                        <Avatar className="h-7 w-7 mx-auto">
                          <AvatarFallback 
                            className="text-[10px] font-semibold text-white"
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
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[400] bg-background">
                          <DropdownMenuItem onClick={() => onBookingClick(booking)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => onDeleteBooking(booking.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}