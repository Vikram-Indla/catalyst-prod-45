import { useState, useCallback } from 'react';
import { addMonths, addWeeks, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import type { CalendarView, DateRange } from '@/types/calendar.types';

export function useCalendarNavigation(initialDate = new Date()) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [view, setView] = useState<CalendarView>('month');

  const navigate = useCallback((direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const delta = direction === 'prev' ? -1 : 1;

    switch (view) {
      case 'month':
        setCurrentDate(d => addMonths(d, delta));
        break;
      case 'week':
        setCurrentDate(d => addWeeks(d, delta));
        break;
      case 'day':
        setCurrentDate(d => addDays(d, delta));
        break;
    }
  }, [view]);

  const getDateRange = useCallback((): DateRange => {
    switch (view) {
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        // Extend to full weeks for calendar display
        return {
          start: startOfWeek(monthStart, { weekStartsOn: 0 }),
          end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
        };
      }
      case 'week': {
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 }),
        };
      }
      case 'day': {
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
        };
      }
    }
  }, [currentDate, view]);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  return {
    currentDate,
    view,
    setView,
    navigate,
    goToDate,
    dateRange: getDateRange(),
  };
}
