import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TestCycle } from '@/data/testCyclesData';

interface CycleCalendarViewProps {
  cycles: TestCycle[];
  onCycleClick: (cycle: TestCycle) => void;
}

interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  fullDate: Date;
  cycles: TestCycle[];
}

const statusColors: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  aborted: 'bg-red-100 text-red-700 border-red-300'
};

const envColors: Record<string, string> = {
  dev: 'text-purple-600',
  beta: 'text-cyan-600',
  staging: 'text-orange-600',
  uat: 'text-yellow-600',
  production: 'text-red-600'
};

export function CycleCalendarView({ cycles, onCycleClick }: CycleCalendarViewProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // January 2026
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const fullDate = new Date(year, month - 1, day);
      days.push({
        date: day,
        isCurrentMonth: false,
        isToday: false,
        fullDate,
        cycles: getCyclesForDate(fullDate)
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = new Date(year, month, day);
      const isToday = 
        fullDate.getDate() === today.getDate() &&
        fullDate.getMonth() === today.getMonth() &&
        fullDate.getFullYear() === today.getFullYear();
      
      days.push({
        date: day,
        isCurrentMonth: true,
        isToday,
        fullDate,
        cycles: getCyclesForDate(fullDate)
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length; // 6 rows x 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const fullDate = new Date(year, month + 1, day);
      days.push({
        date: day,
        isCurrentMonth: false,
        isToday: false,
        fullDate,
        cycles: getCyclesForDate(fullDate)
      });
    }
    
    return days;
  }, [currentDate, cycles]);

  function getCyclesForDate(date: Date): TestCycle[] {
    return cycles.filter(cycle => {
      if (!cycle.startDate || !cycle.endDate) return false;
      const start = new Date(cycle.startDate);
      const end = new Date(cycle.endDate);
      return date >= start && date <= end;
    });
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCycleClick = (e: React.MouseEvent, cycle: TestCycle) => {
    e.stopPropagation();
    navigate(`/releases/test-cycles/${cycle.id}`);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const formatDayKey = (fullDate: Date) => fullDate.toISOString().split('T')[0];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">{monthName}</h2>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'month' | 'week')}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 px-2 py-3 text-center text-xs font-semibold text-gray-600">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarDays.map((day, i) => {
          const dayKey = formatDayKey(day.fullDate);
          const visibleCycles = day.cycles.slice(0, 2);
          const hiddenCycles = day.cycles.slice(2);
          const hasMore = hiddenCycles.length > 0;
          
          return (
            <div 
              key={i} 
              className={cn(
                "bg-white min-h-[120px] p-2",
                !day.isCurrentMonth && "bg-gray-50",
                day.isToday && "ring-2 ring-inset ring-primary"
              )}
            >
              <span className={cn(
                "text-sm",
                day.isCurrentMonth ? "text-gray-900" : "text-gray-400",
                day.isToday && "font-bold text-primary"
              )}>
                {day.date}
              </span>
              
              {/* Cycle Events - Show Cycle ID + Name */}
              <div className="mt-1 space-y-1">
                {visibleCycles.map(cycle => (
                  <div 
                    key={cycle.id}
                    className={cn(
                      "text-xs px-2 py-1.5 rounded border cursor-pointer hover:shadow-sm transition-shadow",
                      statusColors[cycle.status]
                    )}
                    title={`${cycle.id} · ${cycle.name} · ${cycle.releaseId}`}
                    onClick={(e) => handleCycleClick(e, cycle)}
                  >
                    <div className="font-mono font-medium truncate text-[10px]">{cycle.id}</div>
                    <div className="truncate opacity-75">{cycle.name}</div>
                  </div>
                ))}
                
                {/* "+X more" with popover */}
                {hasMore && (
                  <Popover 
                    open={expandedDayDate === dayKey} 
                    onOpenChange={(open) => setExpandedDayDate(open ? dayKey : null)}
                  >
                    <PopoverTrigger asChild>
                      <button 
                        className="text-xs text-primary hover:underline font-medium w-full text-left px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDayDate(dayKey);
                        }}
                      >
                        +{hiddenCycles.length} more
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <div className="p-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">
                            {day.fullDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => setExpandedDayDate(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">{day.cycles.length} test cycles</p>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                        {day.cycles.map(cycle => (
                          <div 
                            key={cycle.id}
                            className="p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={(e) => handleCycleClick(e, cycle)}
                          >
                            <div className="font-mono text-xs font-medium text-primary">{cycle.id}</div>
                            <div className="text-sm font-medium text-gray-900">{cycle.name}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span>{cycle.releaseId}</span>
                              <span>·</span>
                              <span className={envColors[cycle.environment]}>{cycle.environment}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-sm border-t pt-4">
        <span className="text-gray-500 font-medium">Status:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
          <span className="text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
          <span className="text-gray-600">Planned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
          <span className="text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
          <span className="text-gray-600">Aborted</span>
        </div>
      </div>
    </div>
  );
}
