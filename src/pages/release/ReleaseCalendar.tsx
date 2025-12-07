import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import releasesData from '@/data/releases.json';
import type { Release } from '@/types/release';

const releases = (releasesData as { versions: Release[] }).versions;

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReleaseCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // December 2025
  const [view, setView] = useState<'month' | 'quarter'>('month');

  const today = new Date(2025, 11, 7); // December 7, 2025

  // Get quarter start month (0, 3, 6, 9)
  const getQuarterStartMonth = (date: Date) => {
    return Math.floor(date.getMonth() / 3) * 3;
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Array<{ date: Date; isCurrentMonth: boolean; releases: Release[] }> = [];
    const current = new Date(startDate);

    // Only show 5-6 weeks needed
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(endDate.getDate() + (6 - lastDayOfMonth.getDay()));

    while (current <= endDate) {
      const dayReleases = releases.filter((r) => {
        const releaseDate = new Date(r.releaseDate);
        return (
          releaseDate.getDate() === current.getDate() &&
          releaseDate.getMonth() === current.getMonth() &&
          releaseDate.getFullYear() === current.getFullYear()
        );
      });

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        releases: dayReleases,
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate]);

  // Quarter view data - 3 months
  const quarterMonths = useMemo(() => {
    const year = currentDate.getFullYear();
    const quarterStart = getQuarterStartMonth(currentDate);
    
    return [0, 1, 2].map(offset => {
      const month = quarterStart + offset;
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Get releases for this month
      const monthReleases = releases.filter(r => {
        const releaseDate = new Date(r.releaseDate);
        return releaseDate.getMonth() === month && releaseDate.getFullYear() === year;
      });

      // Build weeks for the month
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      const weeks: Array<Array<{ date: Date; isCurrentMonth: boolean; releases: Release[] }>> = [];
      const current = new Date(startDate);
      
      while (current <= lastDay || current.getDay() !== 0) {
        if (current.getDay() === 0) weeks.push([]);
        
        const dayReleases = releases.filter((r) => {
          const releaseDate = new Date(r.releaseDate);
          return (
            releaseDate.getDate() === current.getDate() &&
            releaseDate.getMonth() === current.getMonth() &&
            releaseDate.getFullYear() === current.getFullYear()
          );
        });

        weeks[weeks.length - 1].push({
          date: new Date(current),
          isCurrentMonth: current.getMonth() === month,
          releases: dayReleases,
        });
        
        current.setDate(current.getDate() + 1);
        if (weeks[weeks.length - 1].length === 7 && current > lastDay) break;
      }

      return {
        month,
        year,
        name: MONTHS[month],
        releases: monthReleases,
        weeks,
      };
    });
  }, [currentDate]);

  const navigateMonth = (delta: number) => {
    if (view === 'quarter') {
      // Navigate by quarter (3 months)
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta * 3, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
  const getQuarterLabel = () => {
    const q = Math.floor(currentDate.getMonth() / 3) + 1;
    return `Q${q} ${currentDate.getFullYear()}`;
  };

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getReleaseBarColor = (release: Release) => {
    if (release.status === 'overdue') return 'bg-red-500';
    if (release.status === 'released') return 'bg-green-500';
    if (release.progress >= 50) return 'bg-brand-gold';
    return 'bg-blue-500';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'released': return 'Released';
      case 'overdue': return 'Overdue';
      case 'in-progress': return 'In Progress';
      case 'planned': return 'Planned';
      default: return status;
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="h-[56px] border-b border-border bg-card flex-shrink-0">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-foreground">Release Calendar</h1>
            <Link to="/release/versions">
              <Button variant="outline" size="sm" className="border-border text-muted-foreground text-xs">
                ← Back to List
              </Button>
            </Link>
          </div>
        </div>

        {/* Calendar Navigation - compact, no double border */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-card">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth(-1)}
              className="w-7 h-7 border-border"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="min-w-[100px] text-center text-sm font-medium text-foreground">
              {view === 'quarter' ? getQuarterLabel() : monthYear}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth(1)}
              className="w-7 h-7 border-border"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="border-border text-muted-foreground text-xs h-7 px-2.5"
          >
            Today
          </Button>

          <div className="ml-auto flex border border-border rounded overflow-hidden">
            <button
              onClick={() => setView('month')}
              className={cn(
                "px-3 py-1 text-xs font-medium border-r border-border transition-colors",
                view === 'month'
                  ? "bg-brand-gold/10 text-brand-gold"
                  : "bg-card text-muted-foreground hover:bg-muted/50"
              )}
            >
              Month
            </button>
            <button
              onClick={() => setView('quarter')}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                view === 'quarter'
                  ? "bg-brand-gold/10 text-brand-gold"
                  : "bg-card text-muted-foreground hover:bg-muted/50"
              )}
            >
              Quarter
            </button>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-auto p-3 sm:px-4">
          {view === 'month' ? (
            /* Month View */
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              {/* Header */}
              <div className="grid grid-cols-7 bg-muted/30">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="py-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground border-b border-border"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Body */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[72px] p-1.5 border-r border-b border-border",
                      "[&:nth-child(7n)]:border-r-0",
                      !day.isCurrentMonth && "bg-muted/20",
                      isToday(day.date) && "bg-brand-gold/5"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-medium mb-1",
                        !day.isCurrentMonth && "text-muted-foreground/60",
                        isToday(day.date) && "w-5 h-5 rounded-full bg-brand-gold text-white flex items-center justify-center text-[10px]"
                      )}
                    >
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {day.releases.slice(0, 2).map((release) => (
                        <Tooltip key={release.id}>
                          <TooltipTrigger asChild>
                            <Link
                              to={`/release/versions/${release.id}`}
                              className={cn(
                                "block px-1.5 py-0.5 rounded text-[10px] font-medium text-white truncate",
                                getReleaseBarColor(release)
                              )}
                            >
                              {release.name}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-card border shadow-lg p-4 min-w-[320px] max-w-[400px]">
                            <div className="space-y-3">
                              <div className="font-semibold text-sm text-foreground">{release.name}</div>
                              {release.linkedItems && release.linkedItems.length > 0 ? (
                                <div className="space-y-0">
                                  <div className="text-sm font-semibold text-foreground mb-2">
                                    Linked Items ({release.linkedItems.length})
                                  </div>
                                  <div className="space-y-2">
                                    {release.linkedItems.map((item) => (
                                      <div key={item.id} className="flex items-center justify-between gap-3 py-1.5 border-t border-border first:border-t-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0",
                                            item.type === 'epic' && "bg-purple-100 text-purple-700",
                                            item.type === 'story' && "bg-green-100 text-green-700",
                                            item.type === 'task' && "bg-blue-100 text-blue-700",
                                            item.type === 'defect' && "bg-red-100 text-red-700"
                                          )}>
                                            {item.type}
                                          </span>
                                          <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{item.id}</span>
                                          <span className="text-xs text-foreground truncate">{item.summary}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground flex-shrink-0">{item.status}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">No linked items</div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {day.releases.length > 2 && (
                        <div className="text-[9px] text-muted-foreground px-1">
                          +{day.releases.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Quarter View - 3 months side by side */
            <div className="grid grid-cols-3 gap-3">
              {quarterMonths.map((monthData) => (
                <div key={monthData.month} className="border border-border rounded-lg overflow-hidden bg-card">
                  {/* Month Header */}
                  <div className="py-2 px-3 bg-muted/30 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">{monthData.name} {monthData.year}</span>
                    {monthData.releases.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({monthData.releases.length} releases)
                      </span>
                    )}
                  </div>
                  
                  {/* Mini calendar header */}
                  <div className="grid grid-cols-7 bg-muted/20">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div key={i} className="py-1 text-center text-[9px] font-medium text-muted-foreground">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Mini calendar body */}
                  <div className="p-1">
                    {monthData.weeks.map((week, weekIdx) => (
                      <div key={weekIdx} className="grid grid-cols-7">
                        {week.map((day, dayIdx) => (
                          <div
                            key={dayIdx}
                            className={cn(
                              "aspect-square flex flex-col items-center justify-center relative",
                              !day.isCurrentMonth && "opacity-30",
                              isToday(day.date) && "bg-brand-gold/10 rounded"
                            )}
                          >
                            <span className={cn(
                              "text-[10px]",
                              isToday(day.date) && "font-bold text-brand-gold"
                            )}>
                              {day.date.getDate()}
                            </span>
                            {day.releases.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full mt-0.5",
                                    getReleaseBarColor(day.releases[0])
                                  )} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-card border shadow-lg p-2">
                                  {day.releases.map(r => (
                                    <div key={r.id} className="text-xs">
                                      <span className="font-medium">{r.name}</span>
                                      <span className="text-muted-foreground ml-1">({getStatusLabel(r.status)})</span>
                                    </div>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Releases list for the month */}
                  {monthData.releases.length > 0 && (
                    <div className="border-t border-border p-2 space-y-1 max-h-[100px] overflow-y-auto">
                      {monthData.releases.map(release => (
                        <Tooltip key={release.id}>
                          <TooltipTrigger asChild>
                            <Link
                              to={`/release/versions/${release.id}`}
                              className="flex items-center gap-2 text-xs hover:bg-muted/50 rounded px-1.5 py-1"
                            >
                              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getReleaseBarColor(release))} />
                              <span className="truncate text-foreground font-medium">{release.name}</span>
                              <span className="text-muted-foreground ml-auto text-[10px]">
                                {format(new Date(release.releaseDate), 'dd')}
                              </span>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-card border shadow-lg p-2">
                            <div className="space-y-1">
                              <div className="font-semibold text-xs">{release.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {format(new Date(release.releaseDate), 'MMM dd, yyyy')} • {getStatusLabel(release.status)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {release.progress}% complete
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
