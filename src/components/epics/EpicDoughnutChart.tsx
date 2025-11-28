import { useMemo } from 'react';

interface EpicDoughnutChartProps {
  childCounts: {
    notStarted: number;
    inProgress: number;
    accepted: number;
    done: number;
  };
  epicAccepted?: boolean;
}

export function EpicDoughnutChart({ childCounts, epicAccepted }: EpicDoughnutChartProps) {
  const total = childCounts.notStarted + childCounts.inProgress + childCounts.accepted + childCounts.done;
  
  const centerValue = useMemo(() => {
    if (epicAccepted) return '100%';
    if (total === 0) return '0%';
    return `${Math.round((childCounts.accepted / total) * 100)}%`;
  }, [childCounts, epicAccepted, total]);

  const segments = useMemo(() => {
    if (total === 0) return [];
    
    let cumulative = 0;
    const result: Array<{ offset: number; percent: number; color: string; label: string }> = [];

    const addSegment = (count: number, color: string, label: string) => {
      if (count > 0) {
        const percent = (count / total) * 100;
        result.push({ offset: cumulative, percent, color, label });
        cumulative += percent;
      }
    };

    addSegment(childCounts.notStarted, '#94a3b8', 'Not Started');
    addSegment(childCounts.inProgress, '#3b82f6', 'In Progress');
    addSegment(childCounts.accepted, '#10b981', 'Accepted');
    addSegment(childCounts.done, '#22c55e', 'Done');

    return result;
  }, [childCounts, total]);

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg viewBox="0 0 120 120" className="transform -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
          />
          {segments.map((segment, i) => {
            const circumference = 2 * Math.PI * 50;
            const dashArray = `${(segment.percent / 100) * circumference} ${circumference}`;
            const dashOffset = -((segment.offset / 100) * circumference);
            
            return (
              <circle
                key={i}
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={segment.color}
                strokeWidth="20"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                style={{ transition: 'all 0.3s ease' }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{centerValue}</div>
            <div className="text-xs text-muted-foreground">Accepted</div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">{segment.label}:</span>
            <span className="font-medium">
              {segment.label === 'Not Started' && childCounts.notStarted}
              {segment.label === 'In Progress' && childCounts.inProgress}
              {segment.label === 'Accepted' && childCounts.accepted}
              {segment.label === 'Done' && childCounts.done}
            </span>
          </div>
        ))}
        <div className="pt-2 border-t text-sm font-medium">
          Total: {total} items
        </div>
      </div>
    </div>
  );
}
