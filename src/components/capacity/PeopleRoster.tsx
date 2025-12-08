/**
 * People Roster Tab
 * Table showing resources with utilization stats
 */

import { Resource, CapacityProject } from '@/types/capacity';
import { calculateUtilization, getStatus, getInitials } from '@/lib/capacityUtils';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeopleRosterProps {
  resources: Resource[];
  projects: CapacityProject[];
  startWeek: number;
  startYear: number;
  onAllocate: (resourceId: string) => void;
}

export function PeopleRoster({ 
  resources, 
  projects, 
  startWeek, 
  startYear, 
  onAllocate 
}: PeopleRosterProps) {
  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse">
        <thead>
          <tr>
            <th className="text-left font-semibold text-xs text-muted-foreground p-3 border-b border-border bg-muted whitespace-nowrap">
              Resource
            </th>
            <th className="text-left font-semibold text-xs text-muted-foreground p-3 border-b border-border bg-muted whitespace-nowrap">
              Skill
            </th>
            <th className="text-left font-semibold text-xs text-muted-foreground p-3 border-b border-border bg-muted whitespace-nowrap">
              Utilization
            </th>
            <th className="text-left font-semibold text-xs text-muted-foreground p-3 border-b border-border bg-muted whitespace-nowrap">
              Allocations
            </th>
            <th className="text-left font-semibold text-xs text-muted-foreground p-3 border-b border-border bg-muted whitespace-nowrap">
              Status
            </th>
            <th className="text-left font-semibold text-xs text-muted-foreground p-3 border-b border-border bg-muted whitespace-nowrap">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => {
            const utilization = calculateUtilization(resource.allocations, startWeek, startYear);
            const status = getStatus(utilization);
            const weekAllocations = resource.allocations.filter(
              a => a.weekNumber === startWeek && a.year === startYear
            );

            return (
              <tr key={resource.id} className="hover:bg-muted/50">
                <td className="p-3 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {resource.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                        {resource.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                        {resource.role}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-3 border-b border-border/50 text-sm text-foreground">
                  {resource.primarySkill}
                </td>
                <td className="p-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          status.status === 'over' ? 'bg-destructive' : 
                          status.status === 'full' ? 'bg-health-green' : 
                          'bg-warning'
                        )}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-sm font-semibold",
                      status.status === 'over' ? 'text-destructive' : 
                      status.status === 'full' ? 'text-health-green' : 
                      'text-warning'
                    )}>
                      {utilization}%
                    </span>
                  </div>
                </td>
                <td className="p-3 border-b border-border/50 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {weekAllocations.map(a => (
                      <span 
                        key={a.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-muted text-foreground"
                      >
                        {getProjectName(a.projectId)} ({a.percentage}%)
                      </span>
                    ))}
                    {weekAllocations.length === 0 && (
                      <span className="text-muted-foreground text-xs">No allocations</span>
                    )}
                  </div>
                </td>
                <td className="p-3 border-b border-border/50">
                  <span className={cn(
                    "inline-flex px-2 py-0.5 rounded text-[11px] font-medium",
                    status.colorClass
                  )}>
                    {status.label}
                  </span>
                </td>
                <td className="p-3 border-b border-border/50">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onAllocate(resource.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Allocate
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {resources.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No resources found matching your filters
        </div>
      )}
    </div>
  );
}
