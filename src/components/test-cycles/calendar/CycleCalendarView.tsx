import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarHeader } from './CalendarHeader';
import { CalendarToolbar } from './CalendarToolbar';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { DayDetailPanel } from './DayDetailPanel';
import { RescheduleModal } from './RescheduleModal';
import { useCalendarNavigation } from '@/hooks/test-cycles/useCalendarNavigation';
import { useCalendarData, useCalendarFilters } from '@/hooks/test-cycles/useCalendarData';
import { useTestReschedule } from '@/hooks/test-cycles/useTestReschedule';
import { DEFAULT_CALENDAR_FILTERS, type CalendarEvent, type CalendarFilters } from '@/types/calendar.types';
import { Loader2 } from 'lucide-react';

interface CycleCalendarViewProps {
  cycleId: string;
}

export function CycleCalendarView({ cycleId }: CycleCalendarViewProps) {
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_CALENDAR_FILTERS);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  const { currentDate, view, setView, navigate, dateRange, goToDate } = useCalendarNavigation();
  const { data, isLoading } = useCalendarData(cycleId, dateRange, filters);
  const { filterOptions } = useCalendarFilters();
  const { reschedule, bulkReschedule } = useTestReschedule(cycleId);

  const handleDayClick = (date: Date) => {
    if (view === 'month') {
      setSelectedDate(date);
    } else {
      goToDate(date);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event);
    // Could open event detail modal here
  };

  const handleRescheduleEvent = (event: CalendarEvent) => {
    // For now, just log - could open a single-event reschedule modal
    console.log('Reschedule event:', event);
  };

  const handleViewEventDetails = (event: CalendarEvent) => {
    console.log('View details:', event);
    // Navigate to test case details
  };

  const handleBulkReschedule = (params: { shiftDays: number } | { fromDate: Date; toDate: Date }) => {
    if (!data) return;
    
    const testIds = data.events.map(e => e.id);
    if ('shiftDays' in params) {
      bulkReschedule.mutate({ testIds, shiftDays: params.shiftDays });
    } else {
      bulkReschedule.mutate({ 
        testIds, 
        fromRange: { start: params.fromDate, end: params.fromDate },
        toRange: { start: params.toDate, end: params.toDate }
      });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  const { eventsByDate, cycleInfo, events } = data;
  const cycleRange = { start: cycleInfo.startDate, end: cycleInfo.endDate };

  // Get events for selected date (for panel)
  const selectedDateEvents = selectedDate
    ? eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : [];

  // Get events for current day view
  const currentDayEvents = eventsByDate.get(format(currentDate, 'yyyy-MM-dd')) || [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        cycleName={cycleInfo.name}
        cycleRange={cycleRange}
        onNavigate={navigate}
        onViewChange={setView}
      />

      {/* Toolbar */}
      <CalendarToolbar
        filters={filters}
        onFilterChange={setFilters}
        filterOptions={filterOptions}
        onOpenReschedule={() => setIsRescheduleOpen(true)}
      />

      {/* Calendar Views */}
      {view === 'month' && (
        <MonthView
          currentDate={currentDate}
          eventsByDate={eventsByDate}
          cycleRange={cycleRange}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      )}

      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          eventsByDate={eventsByDate}
          cycleRange={cycleRange}
          onEventClick={handleEventClick}
        />
      )}

      {view === 'day' && (
        <DayView
          currentDate={currentDate}
          events={currentDayEvents}
          cycleRange={cycleRange}
          onEventClick={handleEventClick}
        />
      )}

      {/* Day Detail Panel */}
      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          events={selectedDateEvents}
          cycleRange={cycleRange}
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          onReschedule={handleRescheduleEvent}
          onViewDetails={handleViewEventDetails}
        />
      )}

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        cycleRange={cycleRange}
        totalTests={events.length}
        onReschedule={handleBulkReschedule}
      />
    </div>
  );
}

export default CycleCalendarView;
