import { cn } from '@/lib/utils';
import type { ResourceMetric, CapacityProject } from './types';
import { departmentColors, projectColors } from './types';

export interface ResourceDrawerContentProps {
  resource: ResourceMetric;
  projects: CapacityProject[];
}

export function ResourceDrawerContent({ resource, projects }: ResourceDrawerContentProps) {
  const dept = resource.department || 'Unassigned';
  const deptColor = departmentColors[dept] || departmentColors.default;
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';

  return (
    <div className="mt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold', deptColor.bg, deptColor.text)}>
          {initials}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{resource.name}</h3>
          <p className="text-sm text-muted-foreground">{resource.role}</p>
          <span className={cn('text-[11px] font-semibold px-2 py-1 rounded uppercase mt-1 inline-block', deptColor.badge)}>
            {dept}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className={cn(
            'text-2xl font-bold',
            resource.allocation > 100 ? 'text-[var(--ds-text-danger,#dc2626)]' :
            resource.allocation > 80 ? 'text-[var(--ds-text-warning,#d97706)]' : 'text-[#0d9488]'
          )}>
            {resource.allocation}%
          </p>
          <p className="text-xs text-muted-foreground">Allocated</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{resource.assignments.length}</p>
          <p className="text-xs text-muted-foreground">Projects</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#0d9488]">{Math.max(0, 100 - resource.allocation)}%</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
      </div>

      {/* Assignments */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Current Assignments</h4>
        <div className="space-y-2">
          {resource.assignments.map((assignment, i) => {
            const project = projects.find(p => p.id === assignment.project_id);
            return (
              <div key={assignment.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-1 h-8 rounded-full" style={{ background: projectColors[i % projectColors.length] }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{project?.name || 'Unknown Project'}</p>
                  <p className="text-xs text-muted-foreground">{assignment.work_item_type}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{assignment.allocation_percentage}%</span>
              </div>
            );
          })}
          {resource.assignments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No active assignments</p>
          )}
        </div>
      </div>
    </div>
  );
}
