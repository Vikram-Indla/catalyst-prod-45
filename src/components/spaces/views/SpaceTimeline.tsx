// ════════════════════════════════════════════════════════════════════════════
// SPACE TIMELINE - Gantt-style timeline view
// ════════════════════════════════════════════════════════════════════════════

import { useParams } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSpace } from '@/hooks/spaces';

export function SpaceTimeline() {
  const { id } = useParams<{ id: string }>();
  const { data: space, isLoading } = useSpace(id);

  if (isLoading || !space) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Mock weeks
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i * 7);
    return {
      label: `Week ${i + 1}`,
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-2 border border-border rounded-md text-muted-foreground hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-2 border border-border rounded-md text-muted-foreground hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground">Q1 2025</span>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors">
          <Calendar className="w-4 h-4" />
          Today
        </button>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[1200px]">
          {/* Header */}
          <div className="flex border-b border-border bg-muted/50 sticky top-0 z-10">
            <div className="w-60 px-4 py-3 border-r border-border shrink-0">
              <span className="text-xs font-medium text-muted-foreground uppercase">Work Items</span>
            </div>
            <div className="flex-1 flex">
              {weeks.map((week, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-[100px] px-2 py-3 border-r border-border text-center"
                >
                  <p className="text-xs font-medium text-foreground">{week.label}</p>
                  <p className="text-xs text-muted-foreground">{week.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {[
            { key: 'DT-101', title: 'User Authentication', start: 0, duration: 3, color: '#3b82f6' },
            { key: 'DT-98', title: 'Dashboard Redesign', start: 2, duration: 4, color: '#22c55e' },
            { key: 'DT-95', title: 'Export Feature', start: 4, duration: 2, color: '#a855f7' },
            { key: 'DT-103', title: 'Password Reset', start: 5, duration: 3, color: '#f59e0b' },
          ].map((item) => (
            <div key={item.key} className="flex border-b border-border hover:bg-muted/30 transition-colors">
              <div className="w-60 px-4 py-4 border-r border-border shrink-0">
                <p className="text-xs font-medium text-muted-foreground">{item.key}</p>
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              </div>
              <div className="flex-1 flex relative py-2">
                {/* Grid lines */}
                {weeks.map((_, i) => (
                  <div key={i} className="flex-1 min-w-[100px] border-r border-border" />
                ))}
                {/* Bar */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-8 rounded-md flex items-center px-2 text-xs text-white font-medium"
                  style={{
                    left: `calc(${(item.start / weeks.length) * 100}% + 4px)`,
                    width: `calc(${(item.duration / weeks.length) * 100}% - 8px)`,
                    backgroundColor: item.color,
                  }}
                >
                  <span className="truncate">{item.title}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
