/**
 * Resource Detail Modal
 * Shows all tasks/allocations for a resource grouped by project
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Resource, CapacityProject } from '@/types/capacity';
import { calculateUtilization, getStatus } from '@/lib/capacityUtils';
import { X, Mail, MapPin, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResourceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource | null;
  projects: CapacityProject[];
  startWeek: number;
  startYear: number;
}

export function ResourceDetailModal({
  open,
  onOpenChange,
  resource,
  projects,
  startWeek,
  startYear,
}: ResourceDetailModalProps) {
  if (!resource) return null;

  const getProjectById = (id: string) => projects.find(p => p.id === id);
  
  // Get allocations for current week
  const weekAllocations = resource.allocations.filter(
    a => a.weekNumber === startWeek && a.year === startYear
  );
  
  const utilization = calculateUtilization(resource.allocations, startWeek, startYear);
  const statusInfo = getStatus(utilization);

  // Group allocations by project
  const allocationsByProject = weekAllocations.reduce((acc, allocation) => {
    const project = getProjectById(allocation.projectId);
    if (!project) return acc;
    
    if (!acc[project.id]) {
      acc[project.id] = {
        project,
        allocations: [],
        totalPercentage: 0,
      };
    }
    acc[project.id].allocations.push(allocation);
    acc[project.id].totalPercentage += allocation.percentage;
    return acc;
  }, {} as Record<string, { project: CapacityProject; allocations: typeof weekAllocations; totalPercentage: number }>);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Resource Details</DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Resource Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 bg-[#c69c6d]/10 border-2 border-[#c69c6d]/20">
              <AvatarFallback className="bg-[#c69c6d]/10 text-[#c69c6d] text-lg font-semibold">
                {resource.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">{resource.name}</h3>
              <p className="text-sm text-muted-foreground">{resource.role}</p>
              <div className="flex items-center gap-4 mt-2">
                {getStatusBadge(statusInfo.status, statusInfo.label)}
                <span className="text-sm font-medium">
                  <span className={cn(
                    utilization > 100 ? "text-[#c69c6d]" : 
                    utilization >= 80 ? "text-[#5c7c5c]" : 
                    "text-[#8b7355]"
                  )}>
                    {utilization}%
                  </span>
                  <span className="text-muted-foreground"> utilization</span>
                </span>
              </div>
            </div>
          </div>

          {/* Resource Info */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{resource.primarySkill}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{resource.location}</span>
            </div>
            {resource.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{resource.email}</span>
              </div>
            )}
          </div>

          {/* 4-Week Overview */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              4-Week Overview
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((offset) => {
                let week = startWeek + offset;
                let year = startYear;
                if (week > 52) {
                  week = week - 52;
                  year++;
                }
                const weekUtil = calculateUtilization(resource.allocations, week, year);
                
                return (
                  <div 
                    key={`${year}-${week}`}
                    className={cn(
                      "p-3 rounded-lg text-center border",
                      offset === 0 ? "border-[#c69c6d] bg-[#c69c6d]/5" : "border-border"
                    )}
                  >
                    <div className="text-xs text-muted-foreground mb-1">W{week}</div>
                    <div className={cn(
                      "text-lg font-semibold",
                      weekUtil > 100 ? "text-[#c69c6d]" : 
                      weekUtil >= 80 ? "text-[#5c7c5c]" : 
                      "text-[#8b7355]"
                    )}>
                      {weekUtil}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allocations by Project */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Allocations for Week {startWeek}
            </h4>
            
            {Object.keys(allocationsByProject).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No allocations for this week
              </div>
            ) : (
              <div className="space-y-3">
                {Object.values(allocationsByProject).map(({ project, allocations, totalPercentage }) => (
                  <div key={project.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Project Header */}
                    <div 
                      className="p-3 flex items-center justify-between"
                      style={{ backgroundColor: `${project.color}10` }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="font-medium text-sm">{project.name}</span>
                      </div>
                      <Badge variant="outline" className="bg-card">
                        {totalPercentage}%
                      </Badge>
                    </div>
                    
                    {/* Allocations List */}
                    <div className="divide-y divide-border">
                      {allocations.map((allocation) => (
                        <div key={allocation.id} className="p-3 flex items-center justify-between bg-card">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                allocation.type === 'HARD' 
                                  ? "bg-[#5c7c5c]/10 text-[#5c7c5c] border-[#5c7c5c]/20" 
                                  : "bg-[#8b7355]/10 text-[#8b7355] border-[#8b7355]/20"
                              )}
                            >
                              {allocation.type}
                            </Badge>
                            {allocation.notes && (
                              <span className="text-xs text-muted-foreground">{allocation.notes}</span>
                            )}
                          </div>
                          <span className="text-sm font-medium">{allocation.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
