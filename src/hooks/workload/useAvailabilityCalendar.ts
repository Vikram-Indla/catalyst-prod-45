/**
 * Availability Calendar Hook
 * Fetches team availability heatmap data
 */

import { useQuery } from '@tanstack/react-query';
import { format, addDays, isToday } from 'date-fns';
import type { AvailabilityRow, AvailabilityCell } from '@/types/workload.types';

// Mock availability data
const MOCK_MEMBERS = [
  { id: '1', name: 'Ahmed Al-Rashid', initials: 'AR' },
  { id: '2', name: 'Sara Mohammed', initials: 'SM' },
  { id: '3', name: 'Omar Hassan', initials: 'OH' },
  { id: '4', name: 'Fatima Ali', initials: 'FA' },
  { id: '5', name: 'Khalid Ibrahim', initials: 'KI' },
];

function getWorkloadLevel(testsDue: number, isAvailable: boolean): AvailabilityCell['workloadLevel'] {
  if (!isAvailable) return 'low';
  if (testsDue >= 8) return 'overloaded';
  if (testsDue >= 5) return 'high';
  if (testsDue >= 2) return 'medium';
  return 'low';
}

function generateMockAvailability(startDate: Date, days: number): AvailabilityRow[] {
  return MOCK_MEMBERS.map(member => {
    const cells: AvailabilityCell[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = addDays(startDate, i);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Simulate some unavailability
      const isKhalidOut = member.id === '5' && i < 3;
      const isVacation = member.id === '3' && i >= 10 && i <= 12;
      const isAvailable = !isWeekend && !isKhalidOut && !isVacation;
      
      // Simulate tests due
      const testsDue = isAvailable ? Math.floor(Math.random() * 8) + (member.id === '1' ? 3 : 0) : 0;
      
      cells.push({
        userId: member.id,
        userName: member.name,
        date: format(date, 'yyyy-MM-dd'),
        availableHours: isAvailable ? 8 : 0,
        isAvailable,
        notes: isKhalidOut ? 'On leave' : isVacation ? 'Vacation' : undefined,
        testsDue,
        workloadLevel: getWorkloadLevel(testsDue, isAvailable),
      });
    }
    
    return {
      userId: member.id,
      userName: member.name,
      initials: member.initials,
      cells,
    };
  });
}

export function useAvailabilityCalendar(teamId: string, startDate: Date, days: number = 14) {
  return useQuery({
    queryKey: ['availability-calendar', teamId, format(startDate, 'yyyy-MM-dd'), days],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return generateMockAvailability(startDate, days);
    },
  });
}

export function useDateHeaders(startDate: Date, days: number) {
  const headers: { date: Date; label: string; dayName: string; isToday: boolean }[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    headers.push({
      date,
      label: format(date, 'd'),
      dayName: format(date, 'EEE'),
      isToday: isToday(date),
    });
  }
  
  return headers;
}
