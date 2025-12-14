import { useMemo, useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ArrowUpDown, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

type SortColumn = 'rank' | 'ticket' | 'status' | 'quarter' | 'start' | 'end' | 'days';
type SortDirection = 'asc' | 'desc';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  planned: 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  'on-hold': 'bg-purple-100 text-purple-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-destructive',
  medium: 'text-amber-600',
  low: 'text-muted-foreground',
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
  const [sortColumn, setSortColumn] = useState<SortColumn>('start');
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
        case 'start':
          comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
        case 'end':
          comparison = new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
          break;
        case 'days':
          const daysA = differenceInDays(new Date(a.end_date), new Date(a.start_date));
          const daysB = differenceInDays(new Date(b.end_date), new Date(b.start_date));
          comparison = daysA - daysB;
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

  if (filteredBookings.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No bookings match your search' : 'No bookings yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Switch to Gantt view to create bookings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10 bg-muted/50 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <tr className="text-xs font-semibold text-muted-foreground uppercase">
            <th className="w-10 px-3 py-2 text-center">
              <Checkbox
                checked={selectedItems.size === filteredBookings.length && filteredBookings.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </th>
            <th className="w-14 px-3 py-2 text-left">
              <SortableHeader column="rank">Rank</SortableHeader>
            </th>
            <th className="min-w-[240px] px-3 py-2 text-left">
              <SortableHeader column="ticket">Ticket/Task</SortableHeader>
            </th>
            <th className="w-20 px-3 py-2 text-left">Type</th>
            <th className="w-28 px-3 py-2 text-left">
              <SortableHeader column="status">Status</SortableHeader>
            </th>
            <th className="w-24 px-3 py-2 text-left">Priority</th>
            <th className="w-24 px-3 py-2 text-left">
              <SortableHeader column="quarter">Quarter</SortableHeader>
            </th>
            <th className="w-24 px-3 py-2 text-left">Resource</th>
            <th className="w-24 px-3 py-2 text-left">
              <SortableHeader column="start">Start</SortableHeader>
            </th>
            <th className="w-24 px-3 py-2 text-left">
              <SortableHeader column="end">End</SortableHeader>
            </th>
            <th className="w-16 px-3 py-2 text-left">
              <SortableHeader column="days">Days</SortableHeader>
            </th>
            <th className="w-20 px-3 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedBookings).map(([group, groupBookings]) => (
            <React.Fragment key={group}>
              {groupBy !== 'none' && (
                <tr className="bg-muted/30">
                  <td colSpan={12} className="px-3 py-2 text-sm font-semibold">
                    {group} ({groupBookings.length})
                  </td>
                </tr>
              )}
              {groupBookings.map((booking) => {
                const resource = resourceMap.get(booking.resource_id);
                const days = differenceInDays(new Date(booking.end_date), new Date(booking.start_date)) + 1;

                return (
                  <tr
                    key={booking.id}
                    className={cn(
                      'border-b hover:bg-muted/30 cursor-pointer',
                      selectedItems.has(booking.id) && 'bg-indigo-50'
                    )}
                    style={{ borderColor: 'hsl(var(--border))' }}
                    onClick={() => onBookingClick(booking)}
                  >
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedItems.has(booking.id)}
                        onCheckedChange={() => toggleSelectItem(booking.id)}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm font-mono text-muted-foreground">
                      {booking.rank || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-secondary-green">
                          {booking.booking_type === 'ticket' 
                            ? booking.business_request?.request_key 
                            : `T-${booking.id.slice(0, 4).toUpperCase()}`}
                        </span>
                        <p className="text-sm truncate max-w-[280px]">
                          {booking.booking_type === 'ticket' 
                            ? booking.business_request?.title
                            : booking.summary || 'Leave'}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {booking.booking_type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                        STATUS_COLORS[booking.status || 'draft']
                      )}>
                        {booking.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'text-sm capitalize',
                        PRIORITY_COLORS[booking.priority || 'medium']
                      )}>
                        {booking.priority || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {booking.quarter || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {resource?.name || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {format(new Date(booking.start_date), 'MMM d')}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {format(new Date(booking.end_date), 'MMM d')}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium">
                      {days}d
                    </td>
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[400]">
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

import React from 'react';
