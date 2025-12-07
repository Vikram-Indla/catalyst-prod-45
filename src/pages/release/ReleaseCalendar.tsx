import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/release/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import releasesData from '@/data/releases.json';
import type { Release } from '@/types/release';

const releases = (releasesData as { versions: Release[] }).versions;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    if (release.status === 'overdue') return 'bg-red-700';
    if (release.status === 'released') return 'bg-green-700';
    if (release.progress >= 50) return 'bg-[#C69C6D]';
    return 'bg-blue-600';
  };

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Release Calendar"
        actions={
          <Link to="/release/versions">
            <Button variant="outline" className="border-[#E8E8E8] text-[#5C5C5C]">
              ← Back to List
            </Button>
          </Link>
        }
      />

      {/* Calendar Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth(-1)}
            className="w-8 h-8 border-[#E8E8E8]"
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
            className="w-8 h-8 border-[#E8E8E8]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={goToToday}
          className="border-[#E8E8E8] text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)]"
        >
          Today
        </Button>

        <div className="ml-auto flex border border-[#E8E8E8] rounded-md overflow-hidden">
          <button
            onClick={() => setView('month')}
            className={cn(
              "px-3.5 py-2 text-sm border-r border-[#E8E8E8]",
              view === 'month'
                ? "bg-[rgba(198,156,109,0.1)] text-[#C69C6D]"
                : "bg-white text-[#8C8C8C]"
            )}
          >
            Month
          </button>
          <button
            onClick={() => setView('quarter')}
            className={cn(
              "px-3.5 py-2 text-sm",
              view === 'quarter'
                ? "bg-[rgba(198,156,109,0.1)] text-[#C69C6D]"
                : "bg-white text-[#8C8C8C]"
            )}
          >
            Quarter
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-[#E8E8E8] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-white">
          {DAYS.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-[11px] font-semibold uppercase text-[#8C8C8C] border-b border-[#E8E8E8]"
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
                "min-h-[120px] p-2 border-r border-b border-[#E8E8E8] last:border-r-0",
                "[&:nth-child(7n)]:border-r-0",
                !day.isCurrentMonth && "bg-[#FAFAFA]",
                isToday(day.date) && "bg-[rgba(198,156,109,0.1)]"
              )}
            >
              <div
                className={cn(
                  "text-[13px] font-medium mb-1.5",
                  !day.isCurrentMonth && "text-[#8C8C8C]",
                  isToday(day.date) && "w-7 h-7 rounded-full bg-[#C69C6D] text-white flex items-center justify-center"
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
  );
}
