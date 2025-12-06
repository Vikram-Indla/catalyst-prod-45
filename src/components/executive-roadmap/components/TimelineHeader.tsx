import { useMemo } from 'react';
import { format, addWeeks, addMonths, addQuarters, addYears, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimeScale, Language } from '../types';

interface TimelineHeaderProps {
  timeScale: TimeScale;
  language: Language;
  todayPosition: number | null;
}

interface TimeUnit {
  label: string;
  subLabel: string;
  isToday: boolean;
}

export function TimelineHeader({ timeScale, language, todayPosition }: TimelineHeaderProps) {
  const isRTL = language === 'ar';
  
  const timeUnits = useMemo((): TimeUnit[] => {
    const units: TimeUnit[] = [];
    const today = new Date();
    let startDate: Date;
    let count: number;

    switch (timeScale) {
      case 'weekly':
        startDate = startOfWeek(addWeeks(today, -4));
        count = 12;
        for (let i = 0; i < count; i++) {
          const weekStart = addWeeks(startDate, i);
          const weekEnd = addWeeks(weekStart, 1);
          const isTodayInWeek = today >= weekStart && today < weekEnd;
          units.push({
            label: `W${i + 1}`,
            subLabel: format(weekStart, 'MMM d'),
            isToday: isTodayInWeek,
          });
        }
        break;
        
      case 'monthly':
        startDate = startOfMonth(addMonths(today, -2));
        count = 12;
        for (let i = 0; i < count; i++) {
          const monthDate = addMonths(startDate, i);
          const isTodayInMonth = today.getMonth() === monthDate.getMonth() && 
                                  today.getFullYear() === monthDate.getFullYear();
          units.push({
            label: format(monthDate, 'MMM'),
            subLabel: format(monthDate, 'yyyy'),
            isToday: isTodayInMonth,
          });
        }
        break;
        
      case 'quarterly':
        startDate = startOfQuarter(addQuarters(today, -2));
        count = 8;
        for (let i = 0; i < count; i++) {
          const quarterDate = addQuarters(startDate, i);
          const quarterNum = Math.floor(quarterDate.getMonth() / 3) + 1;
          const isTodayInQuarter = today >= quarterDate && today < addQuarters(quarterDate, 1);
          units.push({
            label: `Q${quarterNum}`,
            subLabel: format(quarterDate, 'yyyy'),
            isToday: isTodayInQuarter,
          });
        }
        break;
        
      case 'yearly':
        startDate = startOfYear(addYears(today, -1));
        count = 4;
        for (let i = 0; i < count; i++) {
          const yearDate = addYears(startDate, i);
          const isTodayInYear = today.getFullYear() === yearDate.getFullYear();
          units.push({
            label: format(yearDate, 'yyyy'),
            subLabel: '',
            isToday: isTodayInYear,
          });
        }
        break;
    }

    return units;
  }, [timeScale]);

  return (
    <div className="sticky top-0 z-20 bg-[#FAF8F5] border-b border-[#E8E4DD]">
      <div className="flex" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        {/* Fixed first column placeholder */}
        <div 
          className="flex-shrink-0 w-[200px] sm:w-[260px] lg:w-[320px] px-4 py-3 border-r border-[#E8E4DD] bg-[#FAF8F5]"
          style={{ borderRightWidth: isRTL ? 0 : 1, borderLeftWidth: isRTL ? 1 : 0 }}
        >
          <span className="text-xs font-semibold text-[#5C5650] uppercase tracking-wide">
            {language === 'ar' ? 'طلب الأعمال' : 'Business Request'}
          </span>
        </div>
        
        {/* Timeline columns */}
        <div className="flex-1 flex">
          {timeUnits.map((unit, i) => (
            <div 
              key={i} 
              className={cn(
                "flex-1 min-w-[60px] sm:min-w-[80px] px-2 py-3 text-center border-r border-[#E8E4DD] last:border-r-0",
                unit.isToday && "bg-[#F7F1E8]"
              )}
              style={{ borderRightWidth: isRTL && i === 0 ? 0 : 1 }}
            >
              <div className={cn(
                "text-xs sm:text-sm font-semibold",
                unit.isToday ? "text-[#C69C6D]" : "text-[#2C2825]"
              )}>
                {unit.label}
              </div>
              {unit.subLabel && (
                <div className="text-[10px] text-[#9A9389]">{unit.subLabel}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Today marker line */}
      {todayPosition !== null && todayPosition >= 0 && todayPosition <= 100 && (
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-[#C69C6D] z-30 pointer-events-none"
          style={{ 
            left: isRTL ? undefined : `calc(200px + ${todayPosition}%)`,
            right: isRTL ? `calc(200px + ${todayPosition}%)` : undefined,
          }}
        >
          <div className={cn(
            "absolute top-0 px-2 py-0.5 text-[10px] font-semibold text-white bg-[#C69C6D] rounded-b",
            isRTL ? "-left-6" : "-right-6"
          )}>
            {language === 'ar' ? 'اليوم' : 'TODAY'}
          </div>
        </div>
      )}
    </div>
  );
}
