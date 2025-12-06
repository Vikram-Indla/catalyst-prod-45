import { useMemo } from 'react';
import { format, parseISO, differenceInDays, addWeeks, addMonths, addQuarters, addYears, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoadmapRequest, TimeScale, Language, STAGE_NAMES, STAGE_NAMES_AR, STAGE_COLORS } from '../types';

interface RequestRowProps {
  request: RoadmapRequest;
  index: number;
  timeScale: TimeScale;
  language: Language;
  showMilestones: boolean;
  onRequestClick?: (id: string) => void;
}

export function RequestRow({ request, index, timeScale, language, showMilestones, onRequestClick }: RequestRowProps) {
  const isRTL = language === 'ar';
  const stageColor = STAGE_COLORS[request.stage];

  // Calculate bar position based on time scale
  const barPosition = useMemo(() => {
    if (!request.start || !request.end) return null;

    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    let count: number;

    switch (timeScale) {
      case 'weekly':
        startDate = startOfWeek(addWeeks(today, -4));
        endDate = addWeeks(startDate, 12);
        count = 12;
        break;
      case 'monthly':
        startDate = startOfMonth(addMonths(today, -2));
        endDate = addMonths(startDate, 12);
        count = 12;
        break;
      case 'quarterly':
        startDate = startOfQuarter(addQuarters(today, -2));
        endDate = addQuarters(startDate, 8);
        count = 8;
        break;
      case 'yearly':
        startDate = startOfYear(addYears(today, -1));
        endDate = addYears(startDate, 4);
        count = 4;
        break;
    }

    const requestStart = parseISO(request.start);
    const requestEnd = parseISO(request.end);
    const totalDays = differenceInDays(endDate, startDate);
    
    if (requestEnd < startDate || requestStart > endDate) return null;

    const startOffset = Math.max(0, differenceInDays(requestStart, startDate));
    const duration = differenceInDays(requestEnd, requestStart);

    return {
      left: (startOffset / totalDays) * 100,
      width: Math.max((duration / totalDays) * 100, 5),
    };
  }, [request.start, request.end, timeScale]);

  const formatDateRange = () => {
    if (!request.start || !request.end) return '';
    try {
      return `${format(parseISO(request.start), 'MMM yyyy')} - ${format(parseISO(request.end), 'MMM yyyy')}`;
    } catch {
      return '';
    }
  };

  return (
    <div 
      className={cn(
        "flex border-b border-[#E8E4DD] hover:bg-[#FAF8F5]/50 transition-colors",
        "min-h-[60px] sm:min-h-[72px]"
      )}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Request info column - fixed width */}
      <div 
        className={cn(
          "flex-shrink-0 w-[200px] sm:w-[260px] lg:w-[320px] px-3 sm:px-4 py-3",
          "border-r border-[#E8E4DD] bg-white cursor-pointer hover:bg-[#FAF8F5]"
        )}
        style={{ borderRightWidth: isRTL ? 0 : 1, borderLeftWidth: isRTL ? 1 : 0 }}
        onClick={() => onRequestClick?.(request.id)}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${request.title}`}
      >
        <div className="flex items-start gap-2">
          {/* Rank badge */}
          <div 
            className={cn(
              "flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold",
              request.locked 
                ? "bg-[#C69C6D] text-white ring-2 ring-[#C69C6D] ring-offset-1" 
                : "bg-[#E8E4DD] text-[#5C5650]"
            )}
          >
            {request.rank}
          </div>
          
          {/* Request details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {request.locked && (
                <Lock className="w-3 h-3 text-[#C69C6D] flex-shrink-0" aria-label="Locked rank" />
              )}
              <span className="text-xs font-mono text-[#9A9389]">{request.id}</span>
            </div>
            
            <div className="text-sm font-semibold text-[#2C2825] truncate mt-0.5">
              {language === 'ar' && request.titleAr ? request.titleAr : request.title}
            </div>
            
            <div className="flex items-center gap-2 mt-1 text-xs text-[#9A9389]">
              <span className="truncate">
                {language === 'ar' && request.ownerAr ? request.ownerAr : request.owner}
              </span>
              <span>·</span>
              <span 
                className="font-medium uppercase"
                style={{ color: stageColor }}
              >
                {language === 'ar' ? STAGE_NAMES_AR[request.stage] : STAGE_NAMES[request.stage]}
              </span>
            </div>
            
            <div className="text-[10px] text-[#C4BEB4] mt-0.5">
              {language === 'ar' && request.platformNameAr ? request.platformNameAr : request.platformName}
            </div>
          </div>
          
          <ChevronRight className={cn(
            "w-4 h-4 text-[#C4BEB4] flex-shrink-0 mt-1",
            isRTL && "rotate-180"
          )} />
        </div>
      </div>
      
      {/* Timeline column */}
      <div className="flex-1 relative py-3 px-2">
        {barPosition && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute h-6 sm:h-7 rounded-md flex items-center justify-between px-2 cursor-pointer",
                    "transition-all hover:shadow-md hover:z-10 group"
                  )}
                  style={{
                    left: isRTL ? undefined : `${barPosition.left}%`,
                    right: isRTL ? `${barPosition.left}%` : undefined,
                    width: `${barPosition.width}%`,
                    minWidth: '80px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: stageColor,
                  }}
                  onClick={() => onRequestClick?.(request.id)}
                >
                  {/* Milestone nodes */}
                  {showMilestones && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((m) => (
                        <div
                          key={m}
                          className={cn(
                            "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold",
                            m < request.stage 
                              ? "bg-white text-[#2C2825]" 
                              : m === request.stage 
                                ? "bg-white/30 text-white" 
                                : "bg-transparent text-white/60"
                          )}
                        >
                          {m < request.stage ? '✓' : m}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Progress indicator */}
                  {request.progress > 0 && (
                    <div 
                      className="absolute left-0 top-0 h-full bg-black/10 rounded-l-md"
                      style={{ width: `${request.progress}%` }}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="bg-white border border-[#E8E4DD] shadow-lg rounded-lg p-3 max-w-xs z-50"
              >
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-mono text-xs text-[#9A9389]">{request.id}</span>
                    <h4 className="font-semibold text-[#2C2825]">{request.title}</h4>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: stageColor }}
                    >
                      {language === 'ar' ? STAGE_NAMES_AR[request.stage] : STAGE_NAMES[request.stage]}
                    </span>
                    <span className="text-xs text-[#9A9389]">
                      Score: {request.score}
                    </span>
                  </div>
                  
                  <div className="text-xs text-[#5C5650]">
                    <div>{formatDateRange()}</div>
                    <div className="mt-1">
                      <span className="text-[#9A9389]">Owner:</span> {request.owner}
                    </div>
                    <div>
                      <span className="text-[#9A9389]">Platform:</span> {request.platformName}
                    </div>
                  </div>
                  
                  {/* Milestone legend */}
                  <div className="pt-2 border-t border-[#E8E4DD] flex gap-3 text-[10px] text-[#9A9389]">
                    <span>✓ Complete</span>
                    <span className="font-bold">{request.stage} Current</span>
                    <span>{request.stage + 1} Pending</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {!barPosition && (
          <div className="h-full flex items-center justify-center text-xs text-[#C4BEB4] italic">
            {language === 'ar' ? 'لا توجد تواريخ' : 'No dates set'}
          </div>
        )}
      </div>
    </div>
  );
}
