import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import releasesData from '@/data/releases.json';
import type { Release } from '@/types/release';

const releases = (releasesData as { versions: Release[] }).versions;

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function ReleaseCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // December 2025
  const [view, setView] = useState<'month' | 'quarter'>('month');

  const today = new Date(2025, 11, 7); // December 7, 2025

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Array<{ date: Date; isCurrentMonth: boolean; releases: Release[] }> = [];
    const current = new Date(startDate);

    while (days.length < 42) {
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

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getReleaseBarColor = (release: Release) => {
    if (release.status === 'overdue') return 'bg-red-600';
    if (release.status === 'released') return 'bg-green-600';
    if (release.progress >= 50) return 'bg-brand-gold';
    return 'bg-blue-600';
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - fixed height 72px to align with sidebar */}
      <div className="h-[72px] border-b border-border bg-card flex-shrink-0">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Release Calendar</h1>
          </div>
          <Link to="/release/versions">
            <Button variant="outline" className="border-border text-muted-foreground">
              ← Back to List
            </Button>
          </Link>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth(-1)}
            className="w-8 h-8 border-border"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="min-w-[180px] text-center text-lg font-semibold">
            {monthYear}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth(1)}
            className="w-8 h-8 border-border"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={goToToday}
          className="border-border text-muted-foreground hover:bg-brand-gold/10"
        >
          Today
        </Button>

        <div className="ml-auto flex border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setView('month')}
            className={cn(
              "px-3.5 py-2 text-sm border-r border-border",
              view === 'month'
                ? "bg-brand-gold/10 text-brand-gold"
                : "bg-card text-muted-foreground"
            )}
          >
            Month
          </button>
          <button
            onClick={() => setView('quarter')}
            className={cn(
              "px-3.5 py-2 text-sm",
              view === 'quarter'
                ? "bg-brand-gold/10 text-brand-gold"
                : "bg-card text-muted-foreground"
            )}
          >
            Quarter
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4 sm:px-6 pb-6">
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-7 bg-card">
            {DAYS.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-[11px] font-semibold uppercase text-muted-foreground border-b border-border"
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
                  "min-h-[120px] p-2 border-r border-b border-border last:border-r-0",
                  "[&:nth-child(7n)]:border-r-0",
                  !day.isCurrentMonth && "bg-muted/30",
                  isToday(day.date) && "bg-brand-gold/10"
                )}
              >
                <div
                  className={cn(
                    "text-[13px] font-medium mb-1.5",
                    !day.isCurrentMonth && "text-muted-foreground",
                    isToday(day.date) && "w-7 h-7 rounded-full bg-brand-gold text-white flex items-center justify-center"
                  )}
                >
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {day.releases.map((release) => (
                    <Link
                      key={release.id}
                      to={`/release/versions/${release.id}`}
                      className={cn(
                        "block px-2 py-1 rounded text-[11px] font-semibold text-white truncate",
                        getReleaseBarColor(release)
                      )}
                    >
                      {release.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
