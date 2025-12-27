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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
      over: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)]',
      full: 'bg-[rgba(13,148,136,0.1)] text-[#0d9488] border-[rgba(13,148,136,0.2)]',
      under: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]',
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
    <TooltipProvider>
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
                    <Avatar className="h-9 w-9 bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)]">
                      <AvatarFallback className="bg-[rgba(37,99,235,0.1)] text-[#2563eb] text-xs font-semibold">
                        {resource.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground text-sm hover:text-[#2563eb] transition-colors">
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
                    utilization > 100 ? "text-[#ef4444]" : 
                    utilization >= 80 ? "text-[#0d9488]" : 
                    "text-[#f59e0b]"
                  )}>
                    {utilization}%
                  </span>
                </td>

                {/* Allocations - Styled cards matching reference */}
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1.5">
                    {weekAllocations.length > 0 ? (
                      <>
                        {weekAllocations.slice(0, 2).map((allocation, idx) => {
                          const project = getProjectById(allocation.projectId);
                          if (!project) return null;
                          const isFirst = idx === 0;
                          
                          return (
                            <Tooltip key={allocation.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "rounded-lg px-3 py-2 text-xs font-medium cursor-default flex items-center gap-2 max-w-[180px]",
                                    isFirst 
                                      ? "border-2" 
                                      : "border border-dashed bg-white"
                                  )}
                                  style={{ 
                                    borderColor: project.color,
                                    backgroundColor: isFirst ? `${project.color}15` : 'white',
                                    color: isFirst ? project.color : '#1a1a1a',
                                  }}
                                >
                                  <span 
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <span className="truncate">
                                    {project.shortName}
                                  </span>
                                  <span className="ml-auto font-semibold">{allocation.percentage}%</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-foreground text-background text-xs">
                                <p className="font-medium">{project.name}</p>
                                <p>{allocation.percentage}% allocation</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        {weekAllocations.length > 2 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded cursor-default w-fit">
                                +{weekAllocations.length - 2}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-foreground text-background text-xs">
                              {weekAllocations.slice(2).map(a => {
                                const p = getProjectById(a.projectId);
                                return <p key={a.id}>{p?.name}: {a.percentage}%</p>;
                              })}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </>
                    ) : (
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
    </TooltipProvider>
  );
}
