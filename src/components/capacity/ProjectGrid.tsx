/**
 * Project Allocation Grid
 * Editable grid showing resource allocations per project, grouped by project
 */

import { useState, useMemo } from 'react';
import { Resource, CapacityProject } from '@/types/capacity';
import { calculateUtilization, getStatus, isWeekEditable } from '@/lib/capacityUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, Save, Lock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ProjectGridProps {
  resources: Resource[];
  projects: CapacityProject[];
  startWeek: number;
  startYear: number;
  currentWeek: number;
  currentYear: number;
  adminMode: boolean;
  gridChanges: Record<string, number>;
  onGridChange: (resourceId: string, projectId: string, value: number) => void;
  onSave: () => void;
  onReset: () => void;
  isLocked?: boolean;
  lockedBy?: string | null;
}

const RESOURCES_PER_PAGE = 10;

export function ProjectGrid({
  resources,
  projects,
  startWeek,
  startYear,
  currentWeek,
  currentYear,
  adminMode,
  gridChanges,
  onGridChange,
  onSave,
  onReset,
  isLocked = false,
  lockedBy
}: ProjectGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id)));
  
  const hasChanges = Object.keys(gridChanges).length > 0;
  const editable = isWeekEditable(startWeek, startYear, currentWeek, currentYear, adminMode) && !isLocked;

  // Group resources by their primary project (first allocation's project)
  const groupedResources = useMemo(() => {
    const groups: Record<string, { project: CapacityProject; resources: Resource[] }> = {};
    
    // Initialize groups for all projects
    projects.forEach(p => {
      groups[p.id] = { project: p, resources: [] };
    });
    
    // Add "Unassigned" group
    groups['unassigned'] = { 
      project: { id: 'unassigned', name: 'Unassigned', shortName: 'Unassigned', color: '#9ca3af', health: 'green', status: 'Active' } as CapacityProject, 
      resources: [] 
    };
    
    // Group resources by their primary project
    resources.forEach(resource => {
      const primaryAllocation = resource.allocations.find(
        a => a.weekNumber === startWeek && a.year === startYear && a.percentage > 0
      );
      
      if (primaryAllocation && groups[primaryAllocation.projectId]) {
        groups[primaryAllocation.projectId].resources.push(resource);
      } else {
        groups['unassigned'].resources.push(resource);
      }
    });
    
    // Filter out empty groups and sort
    return Object.values(groups).filter(g => g.resources.length > 0);
  }, [resources, projects, startWeek, startYear]);

  // Flatten for pagination
  const allGroupedResources = useMemo(() => {
    const result: { projectId: string; projectName: string; resource: Resource; isFirst: boolean }[] = [];
    
    groupedResources.forEach(group => {
      group.resources.forEach((resource, idx) => {
        result.push({
          projectId: group.project.id,
          projectName: group.project.name,
          resource,
          isFirst: idx === 0
        });
      });
    });
    
    return result;
  }, [groupedResources]);

  // Pagination
  const totalPages = Math.ceil(allGroupedResources.length / RESOURCES_PER_PAGE);
  const paginatedResources = useMemo(() => {
    const start = (currentPage - 1) * RESOURCES_PER_PAGE;
    return allGroupedResources.slice(start, start + RESOURCES_PER_PAGE);
  }, [allGroupedResources, currentPage]);

  // Get unique project groups in current page
  const pageProjectGroups = useMemo(() => {
    const groups: Record<string, { projectId: string; projectName: string; resources: Resource[] }> = {};
    
    paginatedResources.forEach(item => {
      if (!groups[item.projectId]) {
        groups[item.projectId] = { projectId: item.projectId, projectName: item.projectName, resources: [] };
      }
      groups[item.projectId].resources.push(item.resource);
    });
    
    return Object.values(groups);
  }, [paginatedResources]);

  const getOriginalValue = (resource: Resource, projectId: string): number => {
    const allocation = resource.allocations.find(
      a => a.projectId === projectId && a.weekNumber === startWeek && a.year === startYear
    );
    return allocation?.percentage || 0;
  };

  const getDisplayValue = (resourceId: string, projectId: string, originalValue: number): number => {
    const key = `${resourceId}_${projectId}`;
    return gridChanges[key] !== undefined ? gridChanges[key] : originalValue;
  };

  const isChanged = (resourceId: string, projectId: string, originalValue: number): boolean => {
    const key = `${resourceId}_${projectId}`;
    return gridChanges[key] !== undefined && gridChanges[key] !== originalValue;
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  return (
    <TooltipProvider>
    <div>
      {/* Lock indicator + Action buttons */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {isLocked && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
            <Lock className="h-4 w-4" />
            <span>Locked by {lockedBy}</span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReset}
            disabled={!hasChanges || isLocked}
            className="h-8"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
          <Button 
            size="sm" 
            onClick={onSave}
            disabled={!hasChanges || isLocked}
            className="h-8 bg-brand-gold hover:bg-brand-gold/90 text-white"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Grid grouped by project */}
      <div className="space-y-4">
        {pageProjectGroups.map(group => (
          <Collapsible 
            key={group.projectId} 
            open={expandedProjects.has(group.projectId)}
            onOpenChange={() => toggleProject(group.projectId)}
          >
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Project Group Header */}
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-2">
                    {expandedProjects.has(group.projectId) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm">{group.projectName}</span>
                    <span className="text-xs text-muted-foreground">({group.resources.length} resources)</span>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left font-semibold text-xs text-muted-foreground p-3 border-b border-border bg-muted whitespace-nowrap sticky left-0 z-10">
                          Resource
                        </th>
                        {projects.map(project => (
                          <th 
                            key={project.id}
                            className="text-center font-semibold text-xs text-muted-foreground p-3 border-b border-border bg-muted whitespace-nowrap min-w-[80px]"
                          >
                            {project.shortName}
                          </th>
                        ))}
                        <th className="text-center font-semibold text-xs text-muted-foreground p-3 border-b border-border bg-brand-gold/10 whitespace-nowrap min-w-[80px]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.resources.map((resource) => {
                        let total = 0;
                        projects.forEach(p => {
                          const original = getOriginalValue(resource, p.id);
                          const display = getDisplayValue(resource.id, p.id, original);
                          total += display;
                        });
                        const status = getStatus(total);

                        return (
                          <tr key={resource.id} className="hover:bg-muted/50">
                            <td className="p-3 border-b border-border/50 sticky left-0 bg-card z-10">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                  {resource.initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm text-foreground whitespace-nowrap">
                                    {resource.name}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    {resource.role}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {projects.map(project => {
                              const original = getOriginalValue(resource, project.id);
                              const display = getDisplayValue(resource.id, project.id, original);
                              const changed = isChanged(resource.id, project.id, original);

                              return (
                                <td key={project.id} className="p-2 border-b border-border/50 text-center">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={5}
                                        value={display}
                                        disabled={!editable}
                                        onChange={(e) => onGridChange(resource.id, project.id, parseInt(e.target.value) || 0)}
                                        className={cn(
                                          "w-16 h-8 text-center text-sm mx-auto",
                                          changed && "bg-brand-gold/10 border-brand-gold",
                                          isLocked && "bg-muted text-muted-foreground cursor-not-allowed"
                                        )}
                                      />
                                    </TooltipTrigger>
                                    {isLocked && (
                                      <TooltipContent>Locked by {lockedBy}</TooltipContent>
                                    )}
                                  </Tooltip>
                                </td>
                              );
                            })}
                            <td className="p-3 border-b border-border/50 text-center">
                              <span className={cn(
                                "inline-flex px-2 py-1 rounded text-sm font-semibold",
                                status.colorClass
                              )}>
                                {total}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * RESOURCES_PER_PAGE) + 1} - {Math.min(currentPage * RESOURCES_PER_PAGE, allGroupedResources.length)} of {allGroupedResources.length} resources
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "h-8 w-8 p-0",
                    page === currentPage && "bg-brand-gold hover:bg-brand-gold/90"
                  )}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {resources.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No resources found matching your filters
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
