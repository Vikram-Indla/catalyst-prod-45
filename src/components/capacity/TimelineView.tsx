/**
 * Timeline View (Gantt-style)
 * Displays allocations as horizontal bars per week with tooltips
 */

import { Resource, CapacityProject } from '@/types/capacity';
import { getWeekDateRange } from '@/lib/capacityUtils';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimelineViewProps {
  resources: Resource[];
  projects: CapacityProject[];
  startWeek: number;
  startYear: number;
  currentWeek: number;
}

export function TimelineView({ 
  resources, 
  projects, 
  startWeek, 
  startYear,
  currentWeek 
}: TimelineViewProps) {
  // Display 4 weeks starting from startWeek
  const weeks = Array.from({ length: 4 }, (_, i) => {
    let weekNum = startWeek + i;
    let yearNum = startYear;
    if (weekNum > 52) {
      weekNum = weekNum - 52;
      yearNum++;
    }
    return { week: weekNum, year: yearNum };
  });

  const getProjectColor = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || 'hsl(var(--muted-foreground))';
  };

  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown';
  };

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className="text-left font-semibold text-xs text-muted-foreground p-3 border border-border bg-muted min-w-[220px] sticky left-0 z-10">
                Resource
              </th>
              {weeks.map((w) => {
                const isCurrent = w.week === currentWeek && w.year === startYear;
                return (
                  <th 
                    key={`${w.year}-${w.week}`}
                    className={cn(
                      "text-center font-semibold text-xs p-3 border border-border bg-muted min-w-[180px]",
                      isCurrent && "bg-brand-gold/10 text-brand-gold"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">W{w.week}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {getWeekDateRange(w.week, w.year)}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id} className="hover:bg-muted/50">
                <td className="p-3 border border-border sticky left-0 bg-card z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {resource.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground whitespace-nowrap">
                        {resource.name}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {resource.role}
                      </div>
                    </div>
                  </div>
                </td>
                {weeks.map((w) => {
                  const weekAllocations = resource.allocations.filter(
                    a => a.weekNumber === w.week && a.year === w.year
                  );
                  
                  // Show first 2 allocations, then "+N" for rest
                  const visibleAllocations = weekAllocations.slice(0, 2);
                  const hiddenCount = weekAllocations.length - 2;

                  return (
                    <td key={`${w.year}-${w.week}`} className="p-2 border border-border align-top">
                      <div className="flex flex-col gap-1.5">
                        {visibleAllocations.length > 0 ? (
                          <>
                            {visibleAllocations.map((allocation, idx) => {
                              const projectColor = getProjectColor(allocation.projectId);
                              const projectName = getProjectName(allocation.projectId);
                              const isFirst = idx === 0;
                              
                              return (
                                <Tooltip key={allocation.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "rounded-lg px-3 py-2 text-xs font-medium cursor-default flex items-center gap-2",
                                        isFirst 
                                          ? "border-2 bg-opacity-10" 
                                          : "border border-dashed bg-white"
                                      )}
                                      style={{ 
                                        borderColor: projectColor,
                                        backgroundColor: isFirst ? `${projectColor}15` : 'white',
                                        color: isFirst ? projectColor : '#1a1a1a',
                                      }}
                                    >
                                      <span 
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: projectColor }}
                                      />
                                      <span className="truncate">
                                        {projects.find(p => p.id === allocation.projectId)?.shortName || projectName}
                                      </span>
                                      <span className="ml-auto font-semibold">{allocation.percentage}%</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-foreground text-background text-xs">
                                    <p className="font-medium">{projectName}</p>
                                    <p>{allocation.percentage}% allocation ({allocation.type})</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {hiddenCount > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded cursor-default w-fit">
                                    +{hiddenCount}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-foreground text-background text-xs">
                                  {weekAllocations.slice(2).map(a => (
                                    <p key={a.id}>{getProjectName(a.projectId)}: {a.percentage}%</p>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-2">—</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {resources.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No resources found matching your filters
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
