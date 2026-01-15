// =====================================================
// RELEASES TIMELINE COMPONENT
// Gantt-style timeline view
// =====================================================

import { useMemo } from 'react';
import { Release, STATUS_CONFIG, HEALTH_CONFIG } from '@/types/releases';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths } from 'date-fns';

interface Props {
  releases: Release[];
}

export function ReleasesTimeline({ releases }: Props) {
  // Calculate timeline range
  const { months, startDate, endDate, totalDays } = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(addMonths(now, -1));
    const end = endOfMonth(addMonths(now, 5));
    
    const months = eachMonthOfInterval({ start, end });
    const totalDays = differenceInDays(end, start);
    
    return { months, startDate: start, endDate: end, totalDays };
  }, []);

  const getBarPosition = (release: Release) => {
    const releaseStart = release.start_date ? parseISO(release.start_date) : new Date();
    const releaseEnd = release.target_date ? parseISO(release.target_date) : addMonths(releaseStart, 1);
    
    const startOffset = Math.max(0, differenceInDays(releaseStart, startDate));
    const duration = Math.max(14, differenceInDays(releaseEnd, releaseStart));
    
    const left = (startOffset / totalDays) * 100;
    const width = Math.min((duration / totalDays) * 100, 100 - left);
    
    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      {/* Month Headers */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <div className="w-64 shrink-0 px-4 py-3 border-r border-slate-200">
          <span className="text-xs font-bold uppercase text-slate-500">Release</span>
        </div>
        <div className="flex-1 flex">
          {months.map((month, i) => (
            <div 
              key={i} 
              className="flex-1 px-2 py-3 text-center border-r border-slate-100 last:border-r-0"
            >
              <span className="text-xs font-semibold text-slate-600">
                {format(month, 'MMM yyyy')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      {releases.map((release) => {
        const statusConfig = STATUS_CONFIG[release.status] || STATUS_CONFIG.planning;
        const healthConfig = HEALTH_CONFIG[release.health] || HEALTH_CONFIG.none;
        const position = getBarPosition(release);

        return (
          <div 
            key={release.id} 
            className="flex h-16 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            {/* Release Info */}
            <div className="w-64 shrink-0 px-4 flex items-center gap-3 border-r border-slate-200">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                statusConfig.className
              )}>
                {release.version}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{release.name}</div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", healthConfig.dotClass)} />
                  <span className="text-xs text-slate-400">{statusConfig.label}</span>
                </div>
              </div>
            </div>

            {/* Timeline Bar */}
            <div className="flex-1 relative px-2 py-2">
              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {months.map((_, i) => (
                  <div key={i} className="flex-1 border-r border-slate-100 last:border-r-0" />
                ))}
              </div>
              
              {/* Bar */}
              <div 
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 h-8 rounded-lg flex items-center px-3 gap-2 shadow-sm",
                  release.is_blocked ? "bg-red-500" : "bg-primary"
                )}
                style={position}
              >
                <span className="text-xs font-medium text-white truncate">{release.name}</span>
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  {release.owner && (
                    <Avatar className="w-5 h-5 border border-white/30">
                      <AvatarImage src={release.owner.avatar_url || undefined} />
                      <AvatarFallback className="bg-white/20 text-white text-[8px]">
                        {release.owner.full_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className="text-[10px] text-white/80 font-medium">{release.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {releases.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          No releases to display in timeline
        </div>
      )}
    </div>
  );
}
