import { useState } from 'react';
import { Plus, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ResourceMetric, CapacityProject } from './types';
import { departmentColors, projectColors } from './types';
import type { useAssignments } from '@/modules/capacity-planner';

export interface AssignmentsViewProps {
  resources: ResourceMetric[];
  projects: CapacityProject[];
  createAssignment: ReturnType<typeof useAssignments>['createAssignment'];
}

export function AssignmentsView({ resources, projects, createAssignment }: AssignmentsViewProps) {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [workItemType, setWorkItemType] = useState<'project' | 'epic' | 'feature' | 'story'>('project');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [allocationPercent, setAllocationPercent] = useState(50);

  const resetForm = () => {
    setSelectedUserId('');
    setAssignmentName('');
    setWorkItemType('project');
    setSelectedProjectId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setAllocationPercent(50);
  };

  const handleAddAssignment = async () => {
    if (!selectedUserId || !selectedProjectId) {
      toast.error('Please select a resource and project');
      return;
    }

    try {
      await createAssignment.mutateAsync({
        user_id: selectedUserId,
        project_id: selectedProjectId,
        allocation_percentage: allocationPercent,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        work_item_type: workItemType,
        notes: assignmentName || undefined,
      });
      setAddModalOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-3">
      {/* Scenario Panel */}
      <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#0d9488]/10 text-[#0d9488] uppercase">Active</span>
          <span className="text-sm font-semibold text-foreground">Current Plan - Q1 2025</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            New Scenario
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Copy className="h-3.5 w-3.5" />
            Compare
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 border border-border rounded-md bg-card text-muted-foreground hover:text-foreground flex items-center justify-center">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="w-8 h-8 border border-border rounded-md bg-card text-muted-foreground hover:text-foreground flex items-center justify-center">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground px-2 min-w-32 text-center">January 2025</span>
          <Button variant="outline" size="sm">Today</Button>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Assignment
        </Button>
      </div>

      {/* Gantt Chart */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex bg-muted/50 border-b border-border sticky top-0 z-10">
          <div className="w-56 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border shrink-0">
            Resource
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {weeks.map((week, i) => (
              <div key={week} className="min-w-36 flex-1 border-r border-border last:border-r-0">
                <div className={cn(
                  'px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground border-b border-border',
                  i === 0 && 'bg-[#2563eb]/5 text-[#2563eb]'
                )}>
                  {week}
                </div>
                <div className="flex border-b border-border">
                  {[29, 30, 31, 1, 2, 3, 4].map((day, di) => (
                    <div
                      key={di}
                      className={cn(
                        'flex-1 px-0.5 py-1 text-[9px] text-center text-muted-foreground',
                        (di === 5 || di === 6) && 'bg-muted/50'
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[480px] overflow-y-auto">
          {resources.slice(0, 8).map((resource) => {
            const dept = resource.department || 'Unassigned';
            const deptColor = departmentColors[dept] || departmentColors.default;
            const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';

            return (
              <div key={resource.id} className="flex border-b border-border last:border-b-0 min-h-[60px] hover:bg-muted/20">
                <div className="w-56 px-4 py-2.5 flex items-start gap-3 border-r border-border shrink-0">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', deptColor.bg, deptColor.text)}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{resource.name}</p>
                    <p className="text-[11px] text-muted-foreground">{resource.role}</p>
                    <span className={cn(
                      'text-[10px] font-semibold mt-1 inline-block',
                      resource.allocation > 100 ? 'text-[#dc2626]' :
                      resource.allocation > 80 ? 'text-[#d97706]' : 'text-[#0d9488]'
                    )}>
                      {resource.allocation}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 flex relative">
                  {weeks.map((week, i) => (
                    <div key={week} className="min-w-36 flex-1 border-r border-border last:border-r-0 p-1.5">
                      {/* Gantt bar from real assignments */}
                      {resource.assignments.slice(i, i + 1).map((assignment, ai) => {
                        const project = projects.find(p => p.id === assignment.project_id);
                        return (
                          <div
                            key={assignment.id}
                            className="h-6 rounded text-[10px] font-medium text-white flex items-center px-2 cursor-grab hover:translate-y-[-1px] hover:shadow-md transition-all truncate"
                            style={{ background: projectColors[ai % projectColors.length] }}
                          >
                            {project?.name || 'Project'}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {/* Capacity indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
                    <div
                      className={cn(
                        'h-full',
                        resource.allocation > 100 ? 'bg-[#dc2626]' :
                        resource.allocation > 80 ? 'bg-[#d97706]' : 'bg-[#0d9488]'
                      )}
                      style={{ width: `${Math.min(resource.allocation, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Assignment Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Resource */}
            <div className="space-y-2">
              <Label>Resource</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Select resource..." /></SelectTrigger>
                <SelectContent>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({100 - r.allocation}% available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Name */}
            <div className="space-y-2">
              <Label>Assignment Name</Label>
              <Input
                value={assignmentName}
                onChange={(e) => setAssignmentName(e.target.value)}
                placeholder="e.g., EPIC-123: User Authentication"
              />
            </div>

            {/* Type and Project */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={workItemType} onValueChange={(v) => setWorkItemType(v as 'project' | 'epic' | 'feature' | 'story')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates and Allocation */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Allocation %</Label>
                <Input
                  type="number"
                  min={5}
                  max={100}
                  step={5}
                  value={allocationPercent}
                  onChange={(e) => setAllocationPercent(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAssignment}
              disabled={createAssignment.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {createAssignment.isPending ? 'Adding...' : 'Add Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
