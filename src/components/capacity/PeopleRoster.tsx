/**
 * People Roster Table
 * Displays team resources with utilization, allocations, and status
 * Following specification exactly with Golden Hour colors
 */

import { Resource, CapacityProject } from '@/types/capacity';
import { calculateUtilization, getStatus, GOLDEN_HOUR } from '@/lib/capacityUtils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PeopleRosterProps {
  resources: Resource[];
  projects: CapacityProject[];
  startWeek: number;
  startYear: number;
  onResourceClick: (resourceId: string) => void;
  onEdit: (resourceId: string) => void;
}

export function PeopleRoster({ 
  resources, 
  projects, 
  startWeek, 
  startYear, 
  onResourceClick,
  onEdit 
}: PeopleRosterProps) {
  const getProjectById = (id: string) => projects.find(p => p.id === id);

  const getStatusBadge = (status: 'over' | 'full' | 'under', label: string) => {
    const styles = {
      over: 'bg-[#c69c6d]/10 text-[#c69c6d] border-[#c69c6d]/20',
      full: 'bg-[#5c7c5c]/10 text-[#5c7c5c] border-[#5c7c5c]/20',
      under: 'bg-[#8b7355]/10 text-[#8b7355] border-[#8b7355]/20',
    };
    return (
      <Badge variant="outline" className={cn("text-xs font-medium", styles[status])}>
        {label}
      </Badge>
    );
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No resources found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-card border border-border rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Resource
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Skill
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Utilization
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Allocations
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Status
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => {
            const utilization = calculateUtilization(resource.allocations, startWeek, startYear);
            const statusInfo = getStatus(utilization);
            const weekAllocations = resource.allocations.filter(
              a => a.weekNumber === startWeek && a.year === startYear
            );

            return (
              <tr 
                key={resource.id} 
                className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                {/* Resource */}
                <td className="py-3 px-4">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onResourceClick(resource.id)}
                  >
                    <Avatar className="h-9 w-9 bg-[#c69c6d]/10 border border-[#c69c6d]/20">
                      <AvatarFallback className="bg-[#c69c6d]/10 text-[#c69c6d] text-xs font-semibold">
                        {resource.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground text-sm hover:text-[#c69c6d] transition-colors">
                        {resource.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{resource.role}</div>
                    </div>
                  </div>
                </td>

                {/* Skill */}
                <td className="py-3 px-4">
                  <span className="text-sm text-foreground">{resource.primarySkill}</span>
                </td>

                {/* Utilization */}
                <td className="py-3 px-4">
                  <span className={cn(
                    "text-sm font-medium",
                    utilization > 100 ? "text-[#c69c6d]" : 
                    utilization >= 80 ? "text-[#5c7c5c]" : 
                    "text-[#8b7355]"
                  )}>
                    {utilization}%
                  </span>
                </td>

                {/* Allocations - Project badges */}
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1.5">
                    {weekAllocations.map((allocation) => {
                      const project = getProjectById(allocation.projectId);
                      if (!project) return null;
                      return (
                        <Badge 
                          key={allocation.id}
                          variant="outline"
                          className="text-xs bg-muted/50 border-border"
                        >
                          {project.shortName} {allocation.percentage}%
                        </Badge>
                      );
                    })}
                    {weekAllocations.length === 0 && (
                      <span className="text-xs text-muted-foreground">No allocations</span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                  {getStatusBadge(statusInfo.status, statusInfo.label)}
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEdit(resource.id)}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
