import { useMemo, useState, useEffect } from 'react';
import { format, startOfDay, addDays, addWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X, UserPlus, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResourceInventoryItem } from '@/hooks/useResourceInventory';
import { CapacityBooking } from '../hooks/useCapacityBookings';
import { generateDateColumns, isGCCWeekend, isToday, getDayPosition, getDaysBetween, groupDatesByMonth, isPast } from '../utils/dateUtils';
import { ResourceWithLanes, LaneBooking, calculateAvailability } from '../utils/laneAllocation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  onAssign: () => void;
  resourceLaneData: Map<string, ResourceWithLanes>;
}

const COLUMN_WIDTH = 36;
const ROW_HEIGHT_BASE = 48;
const LANE_HEIGHT = 32;
const MAX_VISIBLE_LANES = 3;
const RESOURCE_COL_WIDTH_EXPANDED = 280;
const RESOURCE_COL_WIDTH_COLLAPSED = 56;

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
  onAssign,
  resourceLaneData,
}: GanttViewProps) {
  const [isResourceColumnExpanded, setIsResourceColumnExpanded] = useState(true);
  const [resourceToRemove, setResourceToRemove] = useState<ResourceInventoryItem | null>(null);
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const resourceColWidth = isResourceColumnExpanded ? RESOURCE_COL_WIDTH_EXPANDED : RESOURCE_COL_WIDTH_COLLAPSED;
  
  const weeks = timeSpan === '2weeks' ? 2 : 5;
  const dateColumns = useMemo(() => generateDateColumns(startDate, weeks), [startDate, weeks]);
  const monthGroups = useMemo(() => groupDatesByMonth(dateColumns), [dateColumns]);
  const endDate = addDays(addWeeks(startDate, weeks), -1);

  const handleConfirmRemove = () => {
    if (resourceToRemove) {
      onRemoveResource(resourceToRemove.id);
      setResourceToRemove(null);
    }
  };

  const toggleResourceExpanded = (resourceId: string) => {
    setExpandedResources(prev => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  };

  const filteredResources = useMemo(() => {
    if (!searchQuery) return resources;
    const query = searchQuery.toLowerCase();
    return resources.filter(r => 
      r.name.toLowerCase().includes(query) ||
      r.role_code?.toLowerCase().includes(query)
    );
  }, [resources, searchQuery]);

  const getBookingsForResource = (resourceId: string): LaneBooking[] => {
    const laneData = resourceLaneData.get(resourceId);
    return laneData?.bookings || [];
  };

  const getBarStyle = (booking: LaneBooking, lane: number, visibleLanes: number) => {
    const bookingStart = new Date(booking.start_date);
    const bookingEnd = new Date(booking.end_date);
    
    const startPos = getDayPosition(bookingStart, startDate);
    const duration = getDaysBetween(bookingStart, bookingEnd);
    
    const left = Math.max(0, startPos) * COLUMN_WIDTH;
    const width = Math.min(duration, dateColumns.length - Math.max(0, startPos)) * COLUMN_WIDTH;

    if (width <= 0 || startPos >= dateColumns.length) return null;

    // Calculate vertical position within row
    const laneTop = 8 + (lane * LANE_HEIGHT);

    // Clipping indicators
    const isClippedLeft = startPos < 0;
    const isClippedRight = startPos + duration > dateColumns.length;

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
      top: `${laneTop}px`,
      height: `${LANE_HEIGHT - 6}px`,
      background,
      isClippedLeft,
      isClippedRight,
    };
  };

  // Dynamic today tracking
  const [todayKey, setTodayKey] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  
  useEffect(() => {
    const interval = setInterval(() => {
      const currentDay = format(new Date(), 'yyyy-MM-dd');
      if (currentDay !== todayKey) {
        setTodayKey(currentDay);
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [todayKey]);

  const todayPosition = useMemo(() => {
    const today = startOfDay(new Date());
    const pos = getDayPosition(today, startOfDay(startDate));
    if (pos < 0 || pos >= dateColumns.length) return null;
    return pos * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  }, [startDate, dateColumns.length, todayKey]);

  const getRowHeight = (resourceId: string) => {
    const laneData = resourceLaneData.get(resourceId);
    if (!laneData) return ROW_HEIGHT_BASE;
    
    const isExpanded = expandedResources.has(resourceId);
    const visibleLanes = isExpanded ? laneData.laneCount : Math.min(laneData.laneCount, MAX_VISIBLE_LANES);
    
    return Math.max(ROW_HEIGHT_BASE, 16 + visibleLanes * LANE_HEIGHT);
  };

  return (
    <TooltipProvider>
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Month Headers */}
          <div className="flex sticky top-0 z-20 bg-background border-b" style={{ borderColor: 'hsl(var(--border) / 0.4)' }}>
            <div 
              className="flex-shrink-0 border-r bg-muted/30 transition-all duration-200"
              style={{ width: resourceColWidth, borderColor: 'hsl(var(--border) / 0.4)' }}
            />
            <div className="flex relative">
              {Array.from(monthGroups.entries()).map(([month, dates]) => (
                <div 
                  key={month}
                  className="text-xs font-semibold text-muted-foreground px-2 py-1 border-r bg-muted/30"
                  style={{ 
                    width: dates.length * COLUMN_WIDTH,
                    borderColor: 'hsl(var(--border) / 0.4)'
                  }}
                >
                  {month}
                </div>
              ))}
            </div>
          </div>

          {/* Day Headers */}
          <div className="flex sticky top-[25px] z-20 bg-background border-b" style={{ borderColor: 'hsl(var(--border) / 0.4)' }}>
            <div 
              className="flex-shrink-0 border-r bg-muted/30 flex items-center justify-between px-2 transition-all duration-200"
              style={{ width: resourceColWidth, height: 32, borderColor: 'hsl(var(--border) / 0.4)' }}
            >
              {isResourceColumnExpanded && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Resource</span>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-6 px-2 text-xs bg-secondary-green hover:bg-secondary-green/90 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssign();
                    }}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Assign
                  </Button>
                </div>
              )}
              <button
                onClick={() => setIsResourceColumnExpanded(!isResourceColumnExpanded)}
                className="p-1 rounded hover:bg-muted transition-colors"
                title={isResourceColumnExpanded ? 'Collapse' : 'Expand'}
              >
                {isResourceColumnExpanded ? (
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
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
                    borderColor: 'hsl(var(--border) / 0.3)'
                  }}
                >
                  <span className={cn(
                    isToday(date) && 'bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center'
                  )}>
                    {format(date, 'd')}
                  </span>
                </div>
              ))}
              {todayPosition !== null && (
                <div 
                  className="absolute top-full left-0 text-[9px] font-bold text-destructive/70 uppercase pointer-events-none"
                  style={{ left: todayPosition, transform: 'translateX(-50%)' }}
                >
                  Today
                </div>
              )}
            </div>
          </div>

          {/* Resource Rows */}
          {filteredResources.length > 0 ? (
            filteredResources.map((resource) => {
              const laneData = resourceLaneData.get(resource.id);
              const resourceBookings = getBookingsForResource(resource.id);
              const isExpanded = expandedResources.has(resource.id);
              const totalLanes = laneData?.laneCount || 1;
              const visibleLanes = isExpanded ? totalLanes : Math.min(totalLanes, MAX_VISIBLE_LANES);
              const hasHiddenLanes = totalLanes > MAX_VISIBLE_LANES && !isExpanded;
              const rowHeight = getRowHeight(resource.id);
              
              // Availability calculation
              const resourceOnlyBookings = bookings.filter(b => b.resource_id === resource.id);
              const availability = calculateAvailability(resourceOnlyBookings, startDate, 14);

              return (
                <div 
                  key={resource.id} 
                  className="flex border-b hover:bg-muted/30 group"
                  style={{ height: rowHeight, borderColor: 'hsl(var(--border) / 0.3)' }}
                >
                  {/* Resource Cell */}
                  <div 
                    className="flex-shrink-0 border-r flex flex-col justify-start px-2 pt-2 bg-background group-hover:bg-muted/30 transition-all duration-200"
                    style={{ width: resourceColWidth, borderColor: 'hsl(var(--border) / 0.3)' }}
                  >
                    <div className={cn("flex items-start gap-2 min-w-0", isResourceColumnExpanded ? "flex-1" : "justify-center w-full")}>
                      {/* Remove from View button (X) */}
                      {isResourceColumnExpanded && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResourceToRemove(resource);
                              }}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 mt-1"
                              aria-label="Remove from view"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Remove from view</TooltipContent>
                        </Tooltip>
                      )}
                      
                      {/* Avatar with hover analytics */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 cursor-help"
                            style={{ 
                              background: resource.role_code === 'PO' 
                                ? 'hsl(var(--secondary-green))' 
                                : resource.role_code === 'BA' 
                                  ? 'hsl(var(--brand-gold))' 
                                  : 'hsl(var(--secondary-bronze))'
                            }}
                            title={!isResourceColumnExpanded ? `${resource.name} (${resource.role_code || 'N/A'})` : undefined}
                          >
                            {resource.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1.5">
                            <div className="font-semibold">{resource.name}</div>
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Utilization (14d):</span>
                                <span className="font-medium">{availability.utilizationPercent}%</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Free days:</span>
                                <span className="font-medium">{availability.freeDays}d</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Largest free window:</span>
                                <span className="font-medium">{availability.largestFreeWindow}d</span>
                              </div>
                              {laneData?.hasOverlaps && (
                                <div className="flex justify-between gap-4 text-amber-600">
                                  <span>Conflicts:</span>
                                  <span className="font-medium">{laneData.overlapCount}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {isResourceColumnExpanded && (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{resource.name}</span>
                            {/* Overbooked Badge */}
                            {laneData?.hasOverlaps && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className="h-5 px-1.5 text-[10px] border-amber-400 bg-amber-50 text-amber-700 gap-0.5"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    {laneData.overlapCount}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {laneData.overlapCount} overlapping assignment{laneData.overlapCount > 1 ? 's' : ''}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">{resource.role_code || '—'}</span>
                            {/* Availability Chip */}
                            <span className="text-[9px] text-secondary-green bg-secondary-green/10 px-1.5 py-0.5 rounded">
                              Free: {availability.freeDays}d
                            </span>
                          </div>
                          {/* Expand/Collapse for hidden lanes */}
                          {hasHiddenLanes && (
                            <button
                              onClick={() => toggleResourceExpanded(resource.id)}
                              className="text-[10px] text-brand-gold hover:text-brand-gold-hover mt-1 flex items-center gap-0.5"
                            >
                              <ChevronDown className="h-3 w-3" />
                              +{totalLanes - MAX_VISIBLE_LANES} more
                            </button>
                          )}
                          {isExpanded && totalLanes > MAX_VISIBLE_LANES && (
                            <button
                              onClick={() => toggleResourceExpanded(resource.id)}
                              className="text-[10px] text-brand-gold hover:text-brand-gold-hover mt-1 flex items-center gap-0.5"
                            >
                              <ChevronUp className="h-3 w-3" />
                              Collapse
                            </button>
                          )}
                        </div>
                      )}
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
                          height: rowHeight,
                          borderColor: 'hsl(var(--border) / 0.2)'
                        }}
                        onClick={() => onCreateBooking(resource.id, date)}
                      />
                    ))}

                    {/* Booking Bars with Lane Stacking */}
                    {resourceBookings
                      .filter(b => b.lane < visibleLanes)
                      .map((booking) => {
                        const style = getBarStyle(booking, booking.lane, visibleLanes);
                        if (!style) return null;

                        const isReadOnly = isPast(new Date(booking.end_date));

                        return (
                          <Tooltip key={booking.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute rounded flex items-center px-2 text-white text-xs font-medium shadow-sm',
                                  !isReadOnly && 'cursor-grab hover:shadow-md hover:scale-[1.02] transition-all'
                                )}
                                style={{
                                  left: style.left,
                                  width: style.width,
                                  top: style.top,
                                  height: style.height,
                                  background: style.background,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBookingClick(booking);
                                }}
                              >
                                {/* Clip indicators */}
                                {style.isClippedLeft && (
                                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 rounded-l" />
                                )}
                                {style.isClippedRight && (
                                  <span className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 rounded-r" />
                                )}
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
                        className="absolute top-0 bottom-0 w-0.5 bg-destructive/30 z-10 pointer-events-none"
                        style={{ left: todayPosition }}
                      />
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
            style={{ height: ROW_HEIGHT_BASE, borderColor: 'hsl(var(--border) / 0.4)' }}
            onClick={onAddResource}
          >
            <div 
              className="flex-shrink-0 flex items-center justify-center gap-2 text-muted-foreground group-hover:text-brand-gold transition-all duration-200"
              style={{ width: resourceColWidth }}
            >
              <div className="w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center group-hover:border-brand-gold">
                <Plus className="h-4 w-4" />
              </div>
              {isResourceColumnExpanded && <span className="text-sm font-medium">Add Resource</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!resourceToRemove} onOpenChange={() => setResourceToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from View?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{resourceToRemove?.name}</strong> from the current view? 
              This will not delete the resource from the inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
