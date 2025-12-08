/**
 * Project Allocation Grid
 * Editable grid showing resource allocations per project
 */

import { useState } from 'react';
import { Resource, CapacityProject } from '@/types/capacity';
import { calculateUtilization, getStatus, isWeekEditable } from '@/lib/capacityUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

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
  onReset
}: ProjectGridProps) {
  const hasChanges = Object.keys(gridChanges).length > 0;
  const editable = isWeekEditable(startWeek, startYear, currentWeek, currentYear, adminMode);

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

  return (
    <div>
      {/* Action buttons */}
      <div className="flex justify-end gap-2 mb-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onReset}
          disabled={!hasChanges}
          className="h-8"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset
        </Button>
        <Button 
          size="sm" 
          onClick={onSave}
          disabled={!hasChanges}
          className="h-8 bg-brand-gold hover:bg-brand-gold/90 text-white"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save
        </Button>
      </div>

      {/* Grid table */}
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
            {resources.map((resource) => {
              // Calculate total including changes
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
                            changed && "bg-brand-gold/10 border-brand-gold"
                          )}
                        />
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

        {resources.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No resources found matching your filters
          </div>
        )}
      </div>
    </div>
  );
}
