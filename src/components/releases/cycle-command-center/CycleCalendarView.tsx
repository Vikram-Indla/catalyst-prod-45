/**
 * Calendar View - Month calendar with test counts - WIRED TO SUPABASE
 * Shows tests by due_date and execution activity
 */

import React, { useMemo } from 'react';
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

interface DayStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  inProgress: number;
  notStarted: number;
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

  // Aggregate test cases by due date
  const testsByDate = useMemo(() => {
    const map: Record<string, DayStats> = {};
    
    testCases.forEach(tc => {
      if (!tc.dueDate) return;
      
      const dateKey = new Date(tc.dueDate).toISOString().split('T')[0];
      
      if (!map[dateKey]) {
        map[dateKey] = { total: 0, passed: 0, failed: 0, blocked: 0, inProgress: 0, notStarted: 0 };
      }
      
      map[dateKey].total++;
      
      switch (tc.status) {
        case 'passed':
          map[dateKey].passed++;
          break;
        case 'failed':
          map[dateKey].failed++;
          break;
        case 'blocked':
          map[dateKey].blocked++;
          break;
        case 'in_progress':
          map[dateKey].inProgress++;
          break;
        case 'not_started':
        default:
          map[dateKey].notStarted++;
          break;
      }
    });
    
    return map;
  }, [testCases]);

  // Also aggregate by execution date (executedAt)
  const executionsByDate = useMemo(() => {
    const map: Record<string, DayStats> = {};
    
    testCases.forEach(tc => {
      if (!tc.executedAt) return;
      
      const dateKey = new Date(tc.executedAt).toISOString().split('T')[0];
      
      if (!map[dateKey]) {
        map[dateKey] = { total: 0, passed: 0, failed: 0, blocked: 0, inProgress: 0, notStarted: 0 };
      }
      
      map[dateKey].total++;
      
      switch (tc.status) {
        case 'passed':
          map[dateKey].passed++;
          break;
        case 'failed':
          map[dateKey].failed++;
          break;
        case 'blocked':
          map[dateKey].blocked++;
          break;
        default:
          break;
      }
    });
    
    return map;
  }, [testCases]);

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

  const getDateKey = (day: number) => {
    return new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
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
          const dateKey = getDateKey(day);
          const dueStats = testsByDate[dateKey];
          const execStats = executionsByDate[dateKey];
          
          return (
            <div 
              key={day}
              className={`h-24 border rounded p-2 ${inRange ? 'bg-blue-50/50' : 'bg-background'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  isTodayDate ? 'bg-primary text-primary-foreground' : 'text-foreground'
                }`}>
                  {day}
                </span>
              </div>
              
              {/* Show execution activity */}
              {execStats && (
                <div className="space-y-0.5">
                  {execStats.passed > 0 && (
                    <div 
                      className="text-[10px] px-1 py-0.5 rounded truncate"
                      style={{ backgroundColor: CATALYST_V5.tealLight, color: CATALYST_V5.teal }}
                    >
                      {execStats.passed} Passed
                    </div>
                  )}
                  {execStats.failed > 0 && (
                    <div 
                      className="text-[10px] px-1 py-0.5 rounded truncate"
                      style={{ backgroundColor: CATALYST_V5.dangerLighter, color: CATALYST_V5.danger }}
                    >
                      {execStats.failed} Failed
                    </div>
                  )}
                  {execStats.blocked > 0 && (
                    <div 
                      className="text-[10px] px-1 py-0.5 rounded truncate"
                      style={{ backgroundColor: CATALYST_V5.warningLighter, color: CATALYST_V5.warning }}
                    >
                      {execStats.blocked} Blocked
                    </div>
                  )}
                </div>
              )}
              
              {/* Show due tests if no executions but has due dates */}
              {!execStats && dueStats && (
                <div className="space-y-0.5">
                  {dueStats.total > 0 && (
                    <div 
                      className="text-[10px] px-1 py-0.5 rounded truncate"
                      style={{ backgroundColor: CATALYST_V5.primaryLighter, color: CATALYST_V5.primary }}
                    >
                      {dueStats.total} Due
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t">
        <span className="text-xs text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: CATALYST_V5.tealLight }} />
          <span className="text-xs">Passed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: CATALYST_V5.dangerLighter }} />
          <span className="text-xs">Failed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: CATALYST_V5.warningLighter }} />
          <span className="text-xs">Blocked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: CATALYST_V5.primaryLighter }} />
          <span className="text-xs">Due</span>
        </div>
      </div>
    </Card>
  );
}
