/**
 * Available Capacity Tab
 * Shows which resources have availability for current and upcoming weeks
 */

import { Resource, CapacityProject } from '@/types/capacity';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AvailableCapacityTabProps {
  resources: Resource[];
  projects: CapacityProject[];
  currentWeek: number;
  currentYear: number;
  onAllocate: (resourceId: string) => void;
}

// Calculate resource availability for a week
function getResourceAvailability(resource: Resource, weekNumber: number, year: number): number {
  const used = resource.allocations
    .filter(a => a.weekNumber === weekNumber && a.year === year)
    .reduce((sum, a) => sum + a.percentage, 0);
  return Math.max(0, 100 - used);
}

// Get week total availability
function getWeekTotalAvailability(
  resources: Resource[], 
  weekNumber: number,
  year: number
): { total: number; peopleWithCapacity: number } {
  let total = 0;
  let peopleWithCapacity = 0;
  
  resources.forEach(r => {
    const avail = getResourceAvailability(r, weekNumber, year);
    total += avail;
    if (avail > 0) peopleWithCapacity++;
  });
  
  return { total, peopleWithCapacity };
}

// Get 4 weeks starting from current
function getNext4Weeks(currentWeek: number, currentYear: number) {
  const weeks = [];
  let week = currentWeek;
  let year = currentYear;
  
  for (let i = 0; i < 4; i++) {
    weeks.push({ weekNumber: week, year, isCurrent: i === 0 });
    week++;
    if (week > 52) {
      week = 1;
      year++;
    }
  }
  return weeks;
}

export function AvailableCapacityTab({
  resources,
  projects,
  currentWeek,
  currentYear,
  onAllocate
}: AvailableCapacityTabProps) {
  const weeks = getNext4Weeks(currentWeek, currentYear);
  
  // Calculate weekly summaries
  const weekSummaries = weeks.map(w => ({
    ...w,
    ...getWeekTotalAvailability(resources, w.weekNumber, w.year)
  }));

  return (
    <div className="space-y-6">
      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {weekSummaries.map((w) => {
          const colorClass = w.total > 200 ? 'text-[#5c7c5c]' : 
                            w.total >= 50 ? 'text-[#8b7355]' : 'text-[#8b5c5c]';
          
          return (
            <div
              key={`${w.year}-${w.weekNumber}`}
              className={cn(
                "rounded-md p-3 text-center transition-colors",
                w.isCurrent 
                  ? "border-2 border-[#c69c6d] bg-[#F5EDE4]" 
                  : "border border-border bg-card"
              )}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                W{w.weekNumber}{w.isCurrent ? ' (Current)' : ''}
              </div>
              <div className={cn("text-xl font-bold", colorClass)}>
                {w.total}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Total Available
              </div>
              <div className="text-xs text-muted-foreground">
                {w.peopleWithCapacity} of {resources.length} have capacity
              </div>
            </div>
          );
        })}
      </div>

      {/* Resource Availability Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground w-[180px]">Resource</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground w-[80px]">Skill</th>
                {weeks.map(w => (
                  <th key={`${w.year}-${w.weekNumber}`} className="text-center p-3 text-xs font-medium text-muted-foreground w-[120px]">
                    W{w.weekNumber}{w.isCurrent ? ' (Current)' : ''}
                  </th>
                ))}
                <th className="text-center p-3 text-xs font-medium text-muted-foreground w-[80px]">Avg</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground w-[100px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => {
                const weekAvailability = weeks.map(w => 
                  getResourceAvailability(resource, w.weekNumber, w.year)
                );
                const avgAvailable = Math.round(
                  weekAvailability.reduce((a, b) => a + b, 0) / weekAvailability.length
                );
                const hasAvailability = weekAvailability.some(a => a > 0);

                return (
                  <tr key={resource.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                    {/* Resource */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#F5EDE4] text-[#c69c6d] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {resource.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">{resource.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{resource.role}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Skill */}
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {resource.primarySkill}
                      </Badge>
                    </td>

                    {/* Week columns */}
                    {weekAvailability.map((avail, idx) => (
                      <td key={idx} className="p-3">
                        <CapacityCell availablePercent={avail} />
                      </td>
                    ))}

                    {/* Average */}
                    <td className="p-3 text-center">
                      <span className={cn(
                        "font-semibold text-sm",
                        avgAvailable >= 50 ? 'text-[#5c7c5c]' :
                        avgAvailable >= 20 ? 'text-[#8b7355]' :
                        avgAvailable > 0 ? 'text-[#8b5c5c]' : 'text-[#c8ccd0]'
                      )}>
                        {avgAvailable}%
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-3 text-center">
                      {hasAvailability ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onAllocate(resource.id)}
                          className="text-xs h-7 px-3 border-[#c69c6d] text-[#c69c6d] hover:bg-[#F5EDE4]"
                        >
                          Allocate
                        </Button>
                      ) : (
                        <Badge variant="destructive" className="text-xs bg-[#8b5c5c]/10 text-[#8b5c5c] border-0">
                          Full
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Capacity Cell Component with visual progress bar
function CapacityCell({ availablePercent }: { availablePercent: number }) {
  const colorClass = 
    availablePercent >= 50 ? 'bg-[#5c7c5c]' :
    availablePercent >= 20 ? 'bg-[#8b7355]' :
    availablePercent > 0 ? 'bg-[#8b5c5c]' : 'bg-[#c8ccd0]';
  
  const textClass =
    availablePercent >= 50 ? 'text-[#5c7c5c]' :
    availablePercent >= 20 ? 'text-[#8b7355]' :
    availablePercent > 0 ? 'text-[#8b5c5c]' : 'text-[#c8ccd0]';

  return (
    <div className="flex items-center gap-2 justify-center">
      {/* Progress bar */}
      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${Math.min(availablePercent, 100)}%` }}
        />
      </div>
      {/* Value */}
      <span className={cn("font-medium text-xs min-w-[32px] text-right", textClass)}>
        {availablePercent}%
      </span>
    </div>
  );
}
