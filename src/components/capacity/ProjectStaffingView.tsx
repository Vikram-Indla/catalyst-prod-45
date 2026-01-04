/**
 * ProjectStaffingView - V2.1 Monopoly-Grade Implementation
 * Project-centric capacity view showing staffing by project
 */

import { useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MiniGantt } from './MiniGantt';
import { getAssignmentColor } from '@/lib/catalyst-colors';

interface ResourceAllocation {
  id?: string;
  profile_id?: string;
  profile_name?: string;
  resource_name?: string;  // Also support this field from hook
  role_name?: string;      // Role of the resource
  assignment_id?: string;
  assignment_name?: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
}

interface Assignment {
  id: string;
  name: string;
  color?: string;
}

interface ProjectStaffingViewProps {
  assignments: Assignment[];
  allocations: ResourceAllocation[];
  onAssignResource?: (assignmentId: string) => void;
  className?: string;
}

interface ProjectWithStaffing {
  project: Assignment;
  allocations: ResourceAllocation[];
  totalAssigned: number;
  requiredCapacity: number;
  gap: number;
  status: 'staffed' | 'partial' | 'understaffed';
}

export function ProjectStaffingView({
  assignments,
  allocations,
  onAssignResource,
  className
}: ProjectStaffingViewProps) {
  // Calculate staffing metrics for each project
  const projectsWithStaffing = useMemo((): ProjectWithStaffing[] => {
    return assignments.map(project => {
      const projectAllocations = allocations.filter(a => a.assignment_name === project.name);
      const totalAssigned = projectAllocations.reduce((sum, a) => sum + a.allocation_percent, 0);
      const requiredCapacity = 100; // Default requirement, could be configurable
      const gap = Math.max(0, requiredCapacity - totalAssigned);
      
      let status: 'staffed' | 'partial' | 'understaffed';
      if (totalAssigned >= requiredCapacity) {
        status = 'staffed';
      } else if (totalAssigned > 0) {
        status = 'partial';
      } else {
        status = 'understaffed';
      }

      return {
        project,
        allocations: projectAllocations,
        totalAssigned,
        requiredCapacity,
        gap,
        status
      };
    });
  }, [assignments, allocations]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      staffed: projectsWithStaffing.filter(p => p.status === 'staffed').length,
      partial: projectsWithStaffing.filter(p => p.status === 'partial').length,
      understaffed: projectsWithStaffing.filter(p => p.status === 'understaffed').length
    };
  }, [projectsWithStaffing]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Bar */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Projects:</span>
          <span className="font-semibold">{projectsWithStaffing.length}</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-teal-500" />
          <span className="text-sm">Fully Staffed: {statusCounts.staffed}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-sm">Partial: {statusCounts.partial}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm">Understaffed: {statusCounts.understaffed}</span>
        </div>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projectsWithStaffing.map(({ project, allocations: projectAllocations, totalAssigned, requiredCapacity, gap, status }) => (
          <ProjectStaffingCard
            key={project.id}
            project={project}
            allocations={projectAllocations}
            totalAssigned={totalAssigned}
            requiredCapacity={requiredCapacity}
            gap={gap}
            status={status}
            onAssign={() => onAssignResource?.(project.id)}
          />
        ))}
      </div>

      {projectsWithStaffing.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">No projects found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create assignments to see project staffing
          </p>
        </div>
      )}
    </div>
  );
}

// Project Staffing Card Component
interface ProjectStaffingCardProps {
  project: Assignment;
  allocations: ResourceAllocation[];
  totalAssigned: number;
  requiredCapacity: number;
  gap: number;
  status: 'staffed' | 'partial' | 'understaffed';
  onAssign: () => void;
}

function ProjectStaffingCard({
  project,
  allocations,
  totalAssigned,
  requiredCapacity,
  gap,
  status,
  onAssign
}: ProjectStaffingCardProps) {
  const statusConfig = {
    staffed: { color: '#0d9488', bg: 'bg-teal-50', border: 'border-teal-400', label: 'FULLY STAFFED' },
    partial: { color: '#d97706', bg: 'bg-amber-50', border: 'border-amber-400', label: 'PARTIAL' },
    understaffed: { color: '#ef4444', bg: 'bg-red-50', border: 'border-red-400', label: 'UNDERSTAFFED' }
  };
  const config = statusConfig[status];
  const projectColor = project.color || getAssignmentColor(project.name);

  const totalResources = totalAssigned / 100;
  const formatResources = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');

  // Transform allocations for MiniGantt
  const ganttAllocations = allocations.map(alloc => ({
    id: alloc.id || `${alloc.profile_id}-${alloc.assignment_name}`,
    assignmentName: alloc.resource_name || alloc.profile_name || 'Resource',
    assignmentColor: projectColor,
    allocationPercent: alloc.allocation_percent,
    startDate: alloc.start_date,
    endDate: alloc.end_date
  }));

  return (
    <div className={cn("bg-card rounded-xl border-2 p-4", config.border)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: projectColor }}
          />
          <div>
            <h3 className="font-semibold text-foreground">{project.name}</h3>
            <span
              className={cn("text-xs font-medium px-2 py-0.5 rounded", config.bg)}
              style={{ color: config.color }}
            >
              {config.label}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: config.color }}>
            {formatResources(totalResources)}
          </div>
          <div className="text-sm text-muted-foreground">resources</div>
        </div>
      </div>

      {/* Staffing Progress Bar */}
      <div className="mb-4">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((totalAssigned / requiredCapacity) * 100, 100)}%`,
              backgroundColor: config.color
            }}
          />
        </div>
        {gap > 0 && (
          <div className="text-xs text-destructive mt-1">
            Gap: {gap}% capacity needed
          </div>
        )}
      </div>

      {/* Assigned Resources */}
      <div className="space-y-2 mb-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Assigned Resources</h4>

        {allocations.map((alloc) => {
          // FIX #5: Ensure every allocation displays a name with fallback chain
          const resourceName = alloc.resource_name || alloc.profile_name || 'Unknown Resource';
          const initials = resourceName
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'NA';

          return (
            <div
              key={alloc.id || `${alloc.profile_id}-${alloc.assignment_name}`}
              className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{resourceName}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="mr-2">{alloc.role_name || 'No role'}</span>
                  <span>{format(new Date(alloc.start_date), 'MMM d')} - {format(new Date(alloc.end_date), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="text-sm font-semibold text-foreground">
                {alloc.allocation_percent}%
              </div>
            </div>
          );
        })}

        {allocations.length === 0 && (
          <div className="text-sm text-muted-foreground italic py-2">
            No resources assigned
          </div>
        )}

        {/* Gap Row */}
        {gap > 0 && (
          <div className="flex items-center gap-3 p-2 border-2 border-dashed border-destructive/30 rounded-lg bg-destructive/5">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-destructive">+{gap}% capacity needed</div>
              <div className="text-xs text-destructive/70">Click to find available resources</div>
            </div>
            <Button variant="destructive" size="sm" onClick={onAssign}>
              + Assign
            </Button>
          </div>
        )}
      </div>

      {/* Project Timeline */}
      <div className="pt-3 border-t border-border">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Project Timeline</h4>
        <MiniGantt
          allocations={ganttAllocations}
          startDate={new Date()}
          endDate={addMonths(new Date(), 6)}
          height={Math.max(40, allocations.length * 20 + 24)}
          showToday
        />
      </div>
    </div>
  );
}
