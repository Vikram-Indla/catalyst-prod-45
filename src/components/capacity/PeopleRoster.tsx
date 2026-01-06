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
      over: 'bg-[var(--sem-danger-bg)] text-[var(--sem-danger)] border-[var(--sem-danger-border)]',
      full: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)] border-[var(--sem-success-border)]',
      under: 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)] border-[var(--sem-warning-border)]',
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
    <div className="overflow-x-auto bg-card dark:bg-[var(--surface-0)] border border-border dark:border-[var(--border-subtle)] rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border dark:border-[var(--border-default)] bg-muted/30 dark:bg-[var(--surface-2)]">
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground dark:text-[var(--text-primary)] uppercase tracking-wide border-r border-border dark:border-[var(--border-subtle)]">
              Resource
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground dark:text-[var(--text-primary)] uppercase tracking-wide border-r border-border dark:border-[var(--border-subtle)]">
              Skill
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground dark:text-[var(--text-primary)] uppercase tracking-wide border-r border-border dark:border-[var(--border-subtle)]">
              Utilization
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground dark:text-[var(--text-primary)] uppercase tracking-wide border-r border-border dark:border-[var(--border-subtle)]">
              Allocations
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground dark:text-[var(--text-primary)] uppercase tracking-wide border-r border-border dark:border-[var(--border-subtle)]">
              Status
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground dark:text-[var(--text-primary)] uppercase tracking-wide">
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
                className="border-b border-border dark:border-[var(--border-subtle)] last:border-b-0 hover:bg-muted/30 dark:hover:bg-[var(--surface-3)] transition-colors"
              >
                {/* Resource */}
                <td className="py-3 px-4 border-r border-border dark:border-[var(--border-subtle)]">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onResourceClick(resource.id)}
                  >
                    <Avatar className="h-9 w-9 bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40">
                      <AvatarFallback className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary text-xs font-semibold">
                        {resource.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground dark:text-[var(--text-primary)] text-sm hover:text-primary transition-colors">
                        {resource.name}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-[var(--text-secondary)]">{resource.role}</div>
                    </div>
                  </div>
                </td>

                {/* Skill */}
                <td className="py-3 px-4 border-r border-border dark:border-[var(--border-subtle)]">
                  <span className="text-sm text-foreground dark:text-[var(--text-primary)]">{resource.primarySkill}</span>
                </td>

                {/* Utilization */}
                <td className="py-3 px-4 border-r border-border dark:border-[var(--border-subtle)]">
                  <span className={cn(
                    "text-sm font-medium",
                    utilization > 100 ? "text-[var(--sem-danger)]" : 
                    utilization >= 80 ? "text-[var(--sem-success)]" : 
                    "text-[var(--sem-warning)]"
                  )}>
                    {utilization}%
                  </span>
                </td>

                {/* Allocations - Styled cards matching reference */}
                <td className="py-3 px-4 border-r border-border dark:border-[var(--border-subtle)]">
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
                                      : "border border-dashed bg-card dark:bg-[var(--surface-3)]"
                                  )}
                                  style={{ 
                                    borderColor: project.color,
                                    backgroundColor: isFirst ? `${project.color}20` : undefined,
                                    color: isFirst ? project.color : undefined,
                                  }}
                                >
                                  <span 
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <span className={cn(
                                    "truncate",
                                    !isFirst && "text-foreground dark:text-[var(--text-primary)]"
                                  )}>
                                    {project.shortName}
                                  </span>
                                  <span className="ml-auto font-semibold">{allocation.percentage}%</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-[var(--surface-elevated)] dark:bg-[var(--surface-elevated)] text-foreground dark:text-[var(--text-primary)] text-xs border border-border dark:border-[var(--border-subtle)]">
                                <p className="font-medium">{project.name}</p>
                                <p className="text-muted-foreground dark:text-[var(--text-secondary)]">{allocation.percentage}% allocation</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        {weekAllocations.length > 2 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-muted-foreground dark:text-[var(--text-secondary)] font-medium px-2 py-1 bg-muted dark:bg-[var(--surface-3)] rounded cursor-default w-fit">
                                +{weekAllocations.length - 2}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-[var(--surface-elevated)] dark:bg-[var(--surface-elevated)] text-foreground dark:text-[var(--text-primary)] text-xs border border-border dark:border-[var(--border-subtle)]">
                              {weekAllocations.slice(2).map(a => {
                                const p = getProjectById(a.projectId);
                                return <p key={a.id}>{p?.name}: {a.percentage}%</p>;
                              })}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground dark:text-[var(--text-secondary)]">No allocations</span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="py-3 px-4 border-r border-border dark:border-[var(--border-subtle)]">
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
