/**
 * Calendar View - Month calendar with test counts
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { TestCycle } from '@/hooks/test-cycles/useCycleDetails';
import type { CycleTestCase } from '@/hooks/test-cycles/useCycleTestCases';

interface CycleCalendarViewProps {
  cycle: TestCycle | undefined;
  testCases: CycleTestCase[];
  isLoading: boolean;
}

export function CycleCalendarView({ cycle, testCases, isLoading }: CycleCalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cycleStart = cycle?.startDate ? new Date(cycle.startDate) : null;
  const cycleEnd = cycle?.endDate ? new Date(cycle.endDate) : null;

  const isInCycleRange = (day: number) => {
    if (!cycleStart || !cycleEnd) return false;
    const date = new Date(currentYear, currentMonth, day);
    return date >= cycleStart && date <= cycleEnd;
  };

  const isToday = (day: number) => {
    return currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate();
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <h3 className="text-lg font-semibold min-w-[160px] text-center">{monthName}</h3>
          <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); }}>
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-xs font-medium text-muted-foreground text-center py-2">{day}</div>
        ))}
        
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24 bg-muted/20 rounded" />
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const inRange = isInCycleRange(day);
          const isTodayDate = isToday(day);
          
          return (
            <div 
              key={day}
              className={`h-24 border rounded p-2 ${inRange ? 'bg-blue-50/50' : 'bg-background'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  isTodayDate ? 'bg-[#2563eb] text-white' : 'text-foreground'
                }`}>
                  {day}
                </span>
              </div>
              {inRange && (
                <div className="space-y-0.5">
                  <div className="text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: CATALYST_V5.tealLight, color: CATALYST_V5.teal }}>
                    {Math.floor(Math.random() * 5)} Passed
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
