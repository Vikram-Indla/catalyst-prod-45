/**
 * Calendar View - Month calendar with test counts
 * 
 * DATA SOURCE: useCycleExecutionItems (shared hook)
 * Shows tests by due_date and execution activity from tm_cycle_scope
 */

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { 
  useCycleExecutionItems, 
  groupByDate,
  type CycleExecutionItem,
  type UIStatus,
} from '@/hooks/test-cycles/useCycleExecutionItems';
import { useCycleDetails } from '@/hooks/test-cycles/useCycleDetails';

interface CycleCalendarViewProps {
  cycleId: string;
}

interface DayStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  inProgress: number;
  notStarted: number;
}

function calculateDayStats(items: CycleExecutionItem[]): DayStats {
  const stats: DayStats = {
    total: items.length,
    passed: 0,
    failed: 0,
    blocked: 0,
    inProgress: 0,
    notStarted: 0,
  };
  
  items.forEach(item => {
    switch (item.status) {
      case 'passed':
        stats.passed++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'blocked':
        stats.blocked++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'not_started':
      default:
        stats.notStarted++;
        break;
    }
  });
  
  return stats;
}

export function CycleCalendarView({ cycleId }: CycleCalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());

  // Use shared execution hook - single source of truth
  const { items, isLoading } = useCycleExecutionItems(cycleId);
  const { cycle } = useCycleDetails(cycleId);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cycleStart = cycle?.startDate ? new Date(cycle.startDate) : null;
  const cycleEnd = cycle?.endDate ? new Date(cycle.endDate) : null;

  // Group items by due date
  const itemsByDueDate = useMemo(() => groupByDate(items, 'dueDate'), [items]);
  
  // Group items by execution date
  const itemsByExecDate = useMemo(() => groupByDate(items, 'executedAt'), [items]);

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

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

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
          
          const dueItems = itemsByDueDate[dateKey] || [];
          const execItems = itemsByExecDate[dateKey] || [];
          
          const dueStats = dueItems.length > 0 ? calculateDayStats(dueItems) : null;
          const execStats = execItems.length > 0 ? calculateDayStats(execItems) : null;
          
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
