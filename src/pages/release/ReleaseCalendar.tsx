import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import releasesData from '@/data/releases.json';
import type { Release } from '@/types/release';

const releases = (releasesData as { versions: Release[] }).versions;

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReleaseCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // December 2025
  const [view, setView] = useState<'month' | 'quarter'>('month');
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);

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
      
      const monthReleases = releases.filter(r => {
        const releaseDate = new Date(r.releaseDate);
        return releaseDate.getMonth() === month && releaseDate.getFullYear() === year;
      });

      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      const weeks: Array<Array<{ date: Date; isCurrentMonth: boolean; releases: Release[] }>> = [];
      let current = new Date(startDate);
      
      // Build up to 6 weeks
      for (let w = 0; w < 6; w++) {
        const week: Array<{ date: Date; isCurrentMonth: boolean; releases: Release[] }> = [];
        for (let d = 0; d < 7; d++) {
          const dayReleases = releases.filter((r) => {
            const releaseDate = new Date(r.releaseDate);
            return (
              releaseDate.getDate() === current.getDate() &&
              releaseDate.getMonth() === current.getMonth() &&
              releaseDate.getFullYear() === current.getFullYear()
            );
          });

          week.push({
            date: new Date(current),
            isCurrentMonth: current.getMonth() === month,
            releases: dayReleases,
          });
          current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
        // Stop if we've passed the last day and completed the week
        if (current > lastDay && current.getDay() === 0) break;
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

  const handleReleaseClick = (release: Release, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedRelease(selectedRelease?.id === release.id ? null : release);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-[72px] border-b border-border bg-card flex-shrink-0">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Release Calendar</h1>
          <Link to="/release/versions">
            <Button variant="outline" size="sm" className="border-border text-muted-foreground text-xs">
              Back to List
            </Button>
          </Link>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-card border-b border-border">
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
                      <button
                        key={release.id}
                        onClick={(e) => handleReleaseClick(release, e)}
                        className={cn(
                          "block w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium text-white truncate cursor-pointer hover:opacity-90 transition-opacity",
                          getReleaseBarColor(release),
                          selectedRelease?.id === release.id && "ring-2 ring-offset-1 ring-foreground"
                        )}
                      >
                        {release.name}
                      </button>
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
                            "aspect-square flex flex-col items-center justify-center relative cursor-pointer hover:bg-muted/30 rounded",
                            !day.isCurrentMonth && "opacity-30",
                            isToday(day.date) && "bg-brand-gold/10"
                          )}
                          onClick={() => {
                            if (day.releases.length > 0) {
                              setSelectedRelease(selectedRelease?.id === day.releases[0].id ? null : day.releases[0]);
                            }
                          }}
                        >
                          <span className={cn(
                            "text-[10px]",
                            isToday(day.date) && "font-bold text-brand-gold"
                          )}>
                            {day.date.getDate()}
                          </span>
                          {day.releases.length > 0 && (
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full mt-0.5",
                              getReleaseBarColor(day.releases[0])
                            )} />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Releases list for the month */}
                {monthData.releases.length > 0 && (
                  <div className="border-t border-border p-2 space-y-1 max-h-[80px] overflow-y-auto">
                    {monthData.releases.map(release => (
                      <button
                        key={release.id}
                        onClick={(e) => handleReleaseClick(release, e)}
                        className={cn(
                          "flex items-center gap-2 text-xs hover:bg-muted/50 rounded px-1.5 py-1 w-full text-left",
                          selectedRelease?.id === release.id && "bg-muted"
                        )}
                      >
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getReleaseBarColor(release))} />
                        <span className="truncate text-foreground font-medium">{release.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Selected Release - Linked Items Table (below calendar) */}
        {selectedRelease && (
          <Card className="mt-4 border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{selectedRelease.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Linked Items ({selectedRelease.linkedItems?.length || 0})
                </p>
              </div>
              <div className="flex gap-2">
                <Link to={`/release/versions/${selectedRelease.id}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    View Details
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRelease(null)} className="text-xs">
                  Close
                </Button>
              </div>
            </div>
            
            {selectedRelease.linkedItems && selectedRelease.linkedItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full w-max border-separate border-spacing-0">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                        Type
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                        ID
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border min-w-[300px]">
                        Summary
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRelease.linkedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 border-b border-border">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
                            item.type === 'epic' && "bg-purple-100 text-purple-700",
                            item.type === 'story' && "bg-green-100 text-green-700",
                            item.type === 'task' && "bg-blue-100 text-blue-700",
                            item.type === 'defect' && "bg-red-100 text-red-700"
                          )}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-border">
                          <span className="text-sm font-mono text-muted-foreground">{item.id}</span>
                        </td>
                        <td className="px-4 py-3 border-b border-border">
                          <span className="text-sm text-foreground">{item.summary}</span>
                        </td>
                        <td className="px-4 py-3 border-b border-border">
                          <span className="text-sm text-muted-foreground">{item.status || '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No linked items for this release
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
