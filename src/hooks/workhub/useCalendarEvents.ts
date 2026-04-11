/**
 * Calendar Hooks — data fetching + navigation state
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { CalendarEvent } from '@/types/workhub.types';

/** Fetch all calendar events from the view */
export function useCalendarEvents(year: number, month: number) {
  return useQuery({
    queryKey: ['workhub', 'calendar-events', year, month],
    queryFn: async () => {
      // Use raw query since vw_wh_calendar_events may not be in auto-generated types
      const { data, error } = await typedQuery('vw_wh_calendar_events')
        .select('*');
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
    staleTime: 30_000,
  });
}

/** Month/year navigation state */
export function useCalendarNavigation() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToday = () => {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
  };

  return { year, month, goNext, goPrev, goToday };
}
