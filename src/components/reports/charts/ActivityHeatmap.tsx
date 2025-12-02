import { HourlyActivityData } from '@/types/reports.types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityHeatmapProps {
  data: HourlyActivityData[];
  maxValue?: number;
}

export function ActivityHeatmap({ data, maxValue }: ActivityHeatmapProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Calculate max if not provided
  const calculatedMax = maxValue || Math.max(
    ...data.flatMap(d => d.hours),
    1
  );

  const getIntensityColor = (value: number) => {
    if (value === 0) return 'bg-muted';
    const intensity = value / calculatedMax;
    if (intensity < 0.25) return 'bg-brand-gold/20';
    if (intensity < 0.5) return 'bg-brand-gold/40';
    if (intensity < 0.75) return 'bg-brand-gold/60';
    return 'bg-brand-gold';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex mb-1">
          <div className="w-12" />
          {hours.map(hour => (
            <div
              key={hour}
              className="flex-1 text-center text-xs text-muted-foreground"
            >
              {hour % 3 === 0 ? `${hour}:00` : ''}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <TooltipProvider>
          {data.map((dayData, dayIndex) => (
            <div key={dayData.day} className="flex items-center gap-1 mb-1">
              <div className="w-12 text-xs text-muted-foreground font-medium">
                {dayData.day}
              </div>
              {dayData.hours.map((value, hourIndex) => (
                <Tooltip key={hourIndex}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex-1 h-6 rounded-sm cursor-pointer transition-colors hover:ring-1 hover:ring-brand-gold ${getIntensityColor(value)}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">
                      {dayData.day} {hourIndex}:00 - {hourIndex + 1}:00
                    </p>
                    <p className="text-sm font-medium">{value} activities</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <span className="text-xs text-muted-foreground">Less</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-sm bg-muted" />
            <div className="w-4 h-4 rounded-sm bg-brand-gold/20" />
            <div className="w-4 h-4 rounded-sm bg-brand-gold/40" />
            <div className="w-4 h-4 rounded-sm bg-brand-gold/60" />
            <div className="w-4 h-4 rounded-sm bg-brand-gold" />
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}
