/**
 * People Roster Table
 * Displays team resources with utilization and allocation status
 * Following Skills Inventory table pattern
 */

import { Resource, CapacityProject } from '@/types/capacity';
import { calculateUtilization, getStatus } from '@/lib/capacityUtils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeopleRosterProps {
  resources: Resource[];
  projects: CapacityProject[];
  startWeek: number;
  startYear: number;
  onAllocate: (resourceId: string) => void;
}

export function PeopleRoster({ resources, projects, startWeek, startYear, onAllocate }: PeopleRosterProps) {
  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-destructive';
    if (utilization >= 80) return 'bg-brand-gold';
    if (utilization >= 50) return 'bg-warning';
    return 'bg-muted-foreground/30';
  };

  const getStatusBadge = (status: 'over' | 'full' | 'under') => {
    switch (status) {
      case 'over':
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Over</Badge>;
      case 'full':
        return <Badge className="bg-brand-gold text-white text-[10px] px-1.5 py-0">Full</Badge>;
      case 'under':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Under</Badge>;
    }
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No resources found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Team Member
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Primary Skill
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Location
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Utilization
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

            return (
              <tr 
                key={resource.id} 
                className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 bg-brand-gold/10 border border-brand-gold/20">
                      <AvatarFallback className="bg-brand-gold/10 text-brand-gold text-xs font-semibold">
                        {resource.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground text-sm">{resource.name}</div>
                      <div className="text-xs text-muted-foreground">{resource.role}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-foreground">{resource.primarySkill}</span>
                </td>
                <td className="py-3 px-4">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs",
                      resource.location === 'Onsite' && "bg-brand-gold/10 text-brand-gold",
                      resource.location === 'Offshore' && "bg-muted-foreground/10 text-muted-foreground",
                      resource.location === 'Hybrid' && "bg-warning/10 text-warning"
                    )}
                  >
                    {resource.location}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", getUtilizationColor(utilization))}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground min-w-[40px]">
                      {utilization}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {getStatusBadge(statusInfo.status)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onAllocate(resource.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
