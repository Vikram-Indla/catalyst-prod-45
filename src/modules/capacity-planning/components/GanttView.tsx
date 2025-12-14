import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResourceInventoryItem } from '@/hooks/useResourceInventory';
import { CapacityBooking } from '../hooks/useCapacityBookings';
import { generateDateColumns, isGCCWeekend, isToday, getDayPosition, getDaysBetween, groupDatesByMonth, isPast } from '../utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GanttViewProps {
  resources: ResourceInventoryItem[];
  bookings: CapacityBooking[];
  startDate: Date;
  timeSpan: '2weeks' | '5weeks';
  searchQuery: string;
  onRemoveResource: (resourceId: string) => void;
  onAddResource: () => void;
  onBookingClick: (booking: CapacityBooking) => void;
  onCreateBooking: (resourceId: string, date: Date) => void;
  onAssignResource: (resourceId: string) => void;
}

const COLUMN_WIDTH = 36;
const ROW_HEIGHT = 48;
const RESOURCE_COL_WIDTH = 200;

export function GanttView({
  resources,
  bookings,
  startDate,
  timeSpan,
  searchQuery,
  onRemoveResource,
  onAddResource,
  onBookingClick,
  onCreateBooking,
  onAssignResource,
}: GanttViewProps) {
  const weeks = timeSpan === '2weeks' ? 2 : 5;
  const dateColumns = useMemo(() => generateDateColumns(startDate, weeks), [startDate, weeks]);
  const monthGroups = useMemo(() => groupDatesByMonth(dateColumns), [dateColumns]);

  const filteredResources = useMemo(() => {
    if (!searchQuery) return resources;
    const query = searchQuery.toLowerCase();
    return resources.filter(r => 
      r.name.toLowerCase().includes(query) ||
      r.role_code?.toLowerCase().includes(query)
    );
  }, [resources, searchQuery]);

  const getBookingsForResource = (resourceId: string) => {
    return bookings.filter(b => b.resource_id === resourceId);
  };

  const getBarStyle = (booking: CapacityBooking) => {
    const bookingStart = new Date(booking.start_date);
    const bookingEnd = new Date(booking.end_date);
    
    const startPos = getDayPosition(bookingStart, startDate);
    const duration = getDaysBetween(bookingStart, bookingEnd);
    
    const left = Math.max(0, startPos) * COLUMN_WIDTH;
    const width = Math.min(duration, dateColumns.length - Math.max(0, startPos)) * COLUMN_WIDTH;

    if (width <= 0 || startPos >= dateColumns.length) return null;

    // Color based on type
    let background = 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)';
    if (booking.booking_type === 'leave') {
      background = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
    } else if (booking.booking_type === 'task') {
      background = 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)';
    }

    return {
      left: `${left}px`,
      width: `${width - 4}px`,
      background,
    };
  };

  const todayPosition = useMemo(() => {
    const today = new Date();
    const pos = getDayPosition(today, startDate);
    if (pos < 0 || pos >= dateColumns.length) return null;
    return pos * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  }, [startDate, dateColumns.length]);

  return (
    <TooltipProvider>
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Month Headers */}
          <div className="flex sticky top-0 z-20 bg-background border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <div 
              className="flex-shrink-0 border-r bg-muted/30"
              style={{ width: RESOURCE_COL_WIDTH, borderColor: 'hsl(var(--border))' }}
            />
            <div className="flex relative">
              {Array.from(monthGroups.entries()).map(([month, dates]) => (
                <div 
                  key={month}
                  className="text-xs font-semibold text-muted-foreground px-2 py-1 border-r bg-muted/30"
                  style={{ 
                    width: dates.length * COLUMN_WIDTH,
                    borderColor: 'hsl(var(--border))'
                  }}
                >
                  {month}
                </div>
              ))}
            </div>
          </div>

          {/* Day Headers */}
          <div className="flex sticky top-[25px] z-20 bg-background border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <div 
              className="flex-shrink-0 border-r bg-muted/30 flex items-center px-3"
              style={{ width: RESOURCE_COL_WIDTH, height: 32, borderColor: 'hsl(var(--border))' }}
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase">Resource</span>
            </div>
            <div className="flex relative">
              {dateColumns.map((date, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center justify-center text-xs border-r',
                    isGCCWeekend(date) && 'bg-muted/50',
                    isToday(date) && 'font-bold text-destructive'
                  )}
                  style={{ 
                    width: COLUMN_WIDTH, 
                    height: 32,
                    borderColor: 'hsl(var(--border))'
                  }}
                >
                  <span className={cn(
                    isToday(date) && 'bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center'
                  )}>
                    {format(date, 'd')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Rows */}
          {filteredResources.length > 0 ? (
            filteredResources.map((resource) => {
              const resourceBookings = getBookingsForResource(resource.id);

              return (
                <div 
                  key={resource.id} 
                  className="flex border-b hover:bg-muted/30 group"
                  style={{ height: ROW_HEIGHT, borderColor: 'hsl(var(--border))' }}
                >
                  {/* Resource Cell */}
                  <div 
                    className="flex-shrink-0 border-r flex items-center justify-between px-3 bg-background group-hover:bg-muted/30"
                    style={{ width: RESOURCE_COL_WIDTH, borderColor: 'hsl(var(--border))' }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                        style={{ 
                          background: resource.role_code === 'PO' 
                            ? 'hsl(var(--secondary-green))' 
                            : resource.role_code === 'BA' 
                              ? 'hsl(var(--brand-gold))' 
                              : 'hsl(var(--secondary-bronze))'
                        }}
                      >
                        {resource.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate max-w-[60px]">{resource.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{resource.role_code || '—'}</div>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-6 px-3 text-xs bg-secondary-green hover:bg-secondary-green/90 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignResource(resource.id);
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>

                  {/* Timeline Cells */}
                  <div className="flex relative">
                    {dateColumns.map((date, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'border-r cursor-pointer hover:bg-brand-gold/5',
                          isGCCWeekend(date) && 'bg-muted/50'
                        )}
                        style={{ 
                          width: COLUMN_WIDTH, 
                          height: ROW_HEIGHT,
                          borderColor: 'hsl(var(--border))'
                        }}
                        onClick={() => onCreateBooking(resource.id, date)}
                      />
                    ))}

                    {/* Booking Bars */}
                    {resourceBookings.map((booking) => {
                      const style = getBarStyle(booking);
                      if (!style) return null;

                      const isReadOnly = isPast(new Date(booking.end_date));

                      return (
                        <Tooltip key={booking.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'absolute top-1/2 -translate-y-1/2 h-7 rounded flex items-center px-2 text-white text-xs font-medium shadow-sm',
                                !isReadOnly && 'cursor-grab hover:shadow-md hover:scale-[1.02] transition-all'
                              )}
                              style={style}
                              onClick={(e) => {
                                e.stopPropagation();
                                onBookingClick(booking);
                              }}
                            >
                              <span className="truncate">
                                {booking.booking_type === 'ticket' 
                                  ? booking.business_request?.request_key || booking.business_request?.title
                                  : booking.summary || 'Leave'}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {booking.booking_type === 'ticket' 
                                  ? booking.business_request?.title
                                  : booking.summary || 'Leave'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(booking.start_date), 'MMM d')} — {format(new Date(booking.end_date), 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs capitalize">{booking.booking_type}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    {/* Today Line */}
                    {todayPosition !== null && (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10 pointer-events-none"
                        style={{ left: todayPosition }}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-destructive uppercase">
                          Today
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {searchQuery ? 'No resources match your search' : 'No resources in view'}
            </div>
          )}

          {/* Add Resource Row */}
          <div 
            className="flex border-b border-dashed hover:bg-brand-gold/5 cursor-pointer group"
            style={{ height: ROW_HEIGHT, borderColor: 'hsl(var(--border))' }}
            onClick={onAddResource}
          >
            <div 
              className="flex-shrink-0 flex items-center justify-center gap-2 text-muted-foreground group-hover:text-brand-gold"
              style={{ width: RESOURCE_COL_WIDTH }}
            >
              <div className="w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center group-hover:border-brand-gold">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Add Resource</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
