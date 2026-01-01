import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageChrome } from '@/components/layout/PageChrome';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, CheckCircle2, BarChart3, AlertTriangle, TrendingUp, Download, Plus, 
  Search, LayoutGrid, Table2, CalendarDays, GanttChart, FileStack, Bot,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Clock, Eye, Copy, Check, RotateCcw, Play,
  Pencil, Trash2, Cloud, Settings2, ArrowLeftRight, Building2, X
} from 'lucide-react';
import { useCapacityData, useAssignments, useAiRecommendations, useCapacityDepartments, useResourceManagement, useResourceAssignments, useResourceAllocations, exportCapacityToPdf } from '@/modules/capacity-planner';

import type { ViewType, ResourceMetric, CapacityProject, AiRecommendation } from '@/modules/capacity-planner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Avatar360 } from '@/components/capacity/Avatar360';
import { Resource360Drawer } from '@/components/capacity/resource360/Resource360Drawer';
import { CapacityAIDrawer } from '@/components/capacity/CapacityAIDrawer';
import { CatalystEnterpriseTable, CatalystColumn } from '@/components/industry/CatalystEnterpriseTable';
import { BulkEditModal } from '@/components/capacity/BulkEditModal';
import { DraggableCardsView } from '@/components/capacity/DraggableCardsView';
import { KanbanAssignView } from '@/components/capacity/KanbanAssignView';
import { Logo } from '@/components/brand/Logo';

type PeriodType = 'weekly' | 'monthly' | 'quarterly';
type GroupByType = 'none' | 'assignment' | 'department';

import { 
  CATALYST,
  getAssignmentColor,
  getAssignmentTheme,
  getAllocationColors,
  getAllocationTheme,
  getAllocationBarColor, 
  getTimelineCellColors, 
  getUtilizationColor,
  getInitials,
} from '@/lib/catalyst-colors';
import { SleekCapacityHeader } from '@/components/capacity/SleekCapacityHeader';
import { CompactGroupHeader } from '@/components/capacity/CompactGroupHeader';
import { CompactResourceCard } from '@/components/capacity/CompactResourceCard';
import { TimelineCellV2 } from '@/components/capacity/TimelineCellV2';

// Department colors - Catalyst V5 compliant
const departmentColors: Record<string, { bg: string; text: string; badge: string }> = {
  Product: { bg: 'bg-[#d4b896]', text: 'text-[#4a3f35]', badge: 'bg-[#d4b896]/15 text-[#c69c6d]' },
  Delivery: { bg: 'bg-[#0d9488]', text: 'text-white', badge: 'bg-[#2563eb]/10 text-[#2563eb]' },
  Support: { bg: 'bg-[#4d8b4d]', text: 'text-white', badge: 'bg-[#5c7c5c]/15 text-[#5c7c5c]' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

const projectColors = [
  '#4d8b4d', // Olive
  '#8b7355', // Bronze  
  '#0d9488', // Teal
  '#d4b896', // Champagne
  '#2563eb', // Blue
  '#0f766e', // Teal Dark (was green)
];

export default function CapacityPlannerPage() {
  const queryClient = useQueryClient();

  const { metrics, projects, resources, assignments, isLoading, isFetching } = useCapacityData();
  const { createAssignment, deleteAssignment } = useAssignments();
  const { recommendations, highPriorityCount } = useAiRecommendations({ 
    resources: metrics.resources, 
    projects 
  });
  
  // Edit resource state
  const [editResourceId, setEditResourceId] = useState<string | null>(null);

  // View state
  const [currentView, setCurrentView] = useState<ViewType>('cards');
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [groupBy, setGroupBy] = useState<GroupByType>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | 'delivery' | 'product' | 'support'>('delivery'); // Default to Delivery Only
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'atCapacity' | 'over'>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  
  // Modal state
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceMetric | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [resource360Id, setResource360Id] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<ResourceMetric | null>(null);
  const [resourcesToDelete, setResourcesToDelete] = useState<ResourceMetric[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [resourcesToBulkEdit, setResourcesToBulkEdit] = useState<ResourceMetric[]>([]);
  const [assignModeOpen, setAssignModeOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  // Add resource form state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [allocationPercentage, setAllocationPercentage] = useState<number>(100);
  const [isAddingResources, setIsAddingResources] = useState(false);

  // Fetch departments and assignments for the modal
  const { departments } = useCapacityDepartments();
  const { assignments: resourceAssignments = [] } = useResourceAssignments();
  const { allocations } = useResourceAllocations();
  const { updateResourceAssignmentType } = useResourceManagement();

  useEffect(() => {
    if (!resourceModalOpen) return;

    if (!selectedDepartmentId && (departments?.length ?? 0) > 0) {
      const delivery = departments?.find((d) => d.name?.toLowerCase() === 'delivery');
      if (delivery) setSelectedDepartmentId(delivery.id);
    }

    if (!selectedAssignment && resourceAssignments.length > 0) {
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
      const target = ['senaei bau', 'senai bau'];
      const defaultAssignment =
        resourceAssignments.find((t) => target.includes(normalize(t.name ?? ''))) ??
        resourceAssignments.find((t) => normalize(t.name ?? '').includes('bau'));

      if (defaultAssignment) setSelectedAssignment(defaultAssignment.id);
    }
  }, [
    resourceModalOpen,
    departments,
    resourceAssignments,
    selectedDepartmentId,
    selectedAssignment,
  ]);

  // Get users already assigned in capacity planner
  const assignedUserIds = useMemo(() => {
    return new Set(assignments.map(a => a.user_id));
  }, [assignments]);

  // Available users = all resources minus those already assigned
  const availableUsers = useMemo(() => {
    return resources.filter(r => !assignedUserIds.has(r.id));
  }, [resources, assignedUserIds]);

  const handleExport = () => {
    exportCapacityToPdf({
      resources: metrics.resources,
      summary: metrics.summary,
      period: 'Q1 2025',
      generatedAt: new Date(),
    });
    toast.success('PDF exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  const openResourceDrawer = (resource: ResourceMetric) => {
    setResource360Id(resource.id);
  };

  const filteredResources = useMemo(() => {
    return metrics.resources.filter((r) => {
      // Exclude management and admin roles - they are overheads, not capacity planned
      const roleLower = r.role?.toLowerCase() || '';
      const isManagement = roleLower.includes('management');
      const isSuperAdmin = roleLower.includes('super admin') || roleLower.includes('superadmin') || roleLower === 'admin';
      if (isManagement || isSuperAdmin) return false;
      
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.role?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || r.department?.toLowerCase() === departmentFilter;
      
      // Apply allocation filter
      let matchesFilter = true;
      if (activeFilter === 'available') {
        matchesFilter = (r.allocation || 0) < 100;
      } else if (activeFilter === 'atCapacity') {
        matchesFilter = (r.allocation || 0) === 100;
      } else if (activeFilter === 'over') {
        matchesFilter = (r.allocation || 0) > 100;
      }
      
      return matchesSearch && matchesDepartment && matchesFilter;
    });
  }, [metrics.resources, searchQuery, departmentFilter, activeFilter]);

  // Get unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const depts = new Set(metrics.resources.map(r => r.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [metrics.resources]);

  // Group resources by assignment type - using resource_allocations table for multi-assignment support
  const groupedByAssignment = useMemo(() => {
    const groups: Record<string, ResourceMetric[]> = {};
    
    // Initialize all active assignment types as empty arrays (so all swim lanes show)
    resourceAssignments.forEach((a) => {
      if (a.name) groups[a.name] = [];
    });
    // Always have Unassigned lane
    groups['Unassigned'] = [];
    
    // Build a map of profile_id -> allocations from the allocations table
    const allocationsByProfileId = new Map<string, { assignmentName: string; percent: number }[]>();
    allocations.forEach((alloc) => {
      if (!alloc.profile_id || !alloc.assignment_name) return;
      const existing = allocationsByProfileId.get(alloc.profile_id) || [];
      existing.push({ assignmentName: alloc.assignment_name, percent: alloc.allocation_percent });
      allocationsByProfileId.set(alloc.profile_id, existing);
    });
    
    // Populate with resources - a resource can appear in multiple groups if they have split allocations
    filteredResources.forEach((r) => {
      const resourceAllocations = allocationsByProfileId.get(r.id) || [];
      
      if (resourceAllocations.length > 0) {
        // Resource has entries in resource_allocations table - add to each assigned column
        resourceAllocations.forEach(({ assignmentName, percent }) => {
          if (!groups[assignmentName]) groups[assignmentName] = [];
          // Create a copy with the specific allocation for this column
          groups[assignmentName].push({ ...r, allocation: percent, assignmentName });
        });
      } else {
        // Fallback to legacy assignment from resource_inventory
        const assignmentName = r.assignmentName || 'Unassigned';
        if (!groups[assignmentName]) groups[assignmentName] = [];
        groups[assignmentName].push(r);
      }
    });
    return groups;
  }, [filteredResources, resourceAssignments, allocations]);

  // Group resources by department
  const groupedByDepartment = useMemo(() => {
    const groups: Record<string, ResourceMetric[]> = {};
    
    // Initialize all departments as empty arrays (so all swim lanes show)
    departments?.forEach((d) => {
      if (d.name) groups[d.name] = [];
    });
    // Always have Unassigned lane
    groups['Unassigned'] = [];
    
    // Populate with resources
    filteredResources.forEach((r) => {
      const deptName = r.department || 'Unassigned';
      if (!groups[deptName]) groups[deptName] = [];
      groups[deptName].push(r);
    });
    return groups;
  }, [filteredResources, departments]);

  // Handle moving a resource to a different assignment via drag-and-drop
  const handleMoveResource = (resourceId: string, fromAssignment: string, toAssignment: string, allocation?: number) => {
    // Find the assignment ID for the target assignment name
    const targetAssignment = resourceAssignments.find(a => a.name === toAssignment);
    const newAssignmentId = toAssignment === 'Unassigned' ? null : targetAssignment?.id || null;

    // Optimistic update for instant feedback
    queryClient.setQueryData(['capacity-planner-resources'], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((r: any) => 
        r.id === resourceId 
          ? { 
              ...r, 
              assignment_id: newAssignmentId, 
              assignmentName: toAssignment === 'Unassigned' ? null : toAssignment,
              allocation: allocation !== undefined ? allocation : r.allocation 
            }
          : r
      );
    });

    // Persist assignment to database
    updateResourceAssignmentType.mutate({ 
      resourceId, 
      assignmentId: newAssignmentId,
      allocation 
    });
  };
  // Only show loading state on initial load, not during background refetches (e.g., after DnD)
  const hasData = resources.length > 0 || metrics.resources.length > 0;
  if (isLoading && !hasData) {
    return (
      <PageChrome>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading capacity data...</div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome hideHeader>
      <div className="flex flex-col h-full bg-[hsl(var(--background))] relative">
        {/* Header - Enterprise Grade */}
        <SleekCapacityHeader
          summary={{
            total: metrics.summary.total,
            available: metrics.summary.available + metrics.summary.healthy,
            atCapacity: metrics.summary.atCapacity,
            over: metrics.summary.overAllocated,
            utilizationPercentage: metrics.summary.avgUtilization,
          }}
          viewMode={currentView as 'cards' | 'table' | 'timeline'}
          groupBy={groupBy}
          timelinePeriod={period}
          searchQuery={searchQuery}
          activeFilter={activeFilter}
          departmentFilter={departmentFilter}
          onViewModeChange={(mode) => setCurrentView(mode as ViewType)}
          onGroupByChange={(g) => setGroupBy(g as GroupByType)}
          onTimelinePeriodChange={(p) => setPeriod(p as PeriodType)}
          onSearchChange={setSearchQuery}
          onAddResource={() => setResourceModalOpen(true)}
          onAssignMode={() => setAssignModeOpen(true)}
          onExport={handleExport}
          onPresentationMode={() => setPresentationMode(true)}
          onFilterChange={setActiveFilter}
          onDepartmentFilterChange={setDepartmentFilter}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 px-6 py-6 bg-[#fafafa]">
          {currentView === 'cards' && (
            <CardsView 
              resources={filteredResources} 
              groupedByAssignment={groupedByAssignment}
              groupedByDepartment={groupedByDepartment}
              groupBy={groupBy}
              isCollapsed={isCollapsed}
              compactMode={compactMode}
              onResourceClick={openResourceDrawer}
              onEditResource={(id) => setEditResourceId(id)}
            />
          )}
          {currentView === 'table' && (
            <TableView 
              resources={filteredResources} 
              projects={projects}
              groupBy={groupBy}
              groupedByAssignment={groupedByAssignment}
              groupedByDepartment={groupedByDepartment}
              onResourceClick={openResourceDrawer}
              onEditResource={(id) => setEditResourceId(id)}
              onDeleteResource={(resource) => {
                setResourceToDelete(resource);
                setResourcesToDelete([]);
                setDeleteConfirmOpen(true);
              }}
              onBulkDelete={(resources) => {
                setResourcesToDelete(resources);
                setResourceToDelete(null);
                setDeleteConfirmOpen(true);
              }}
              onBulkEdit={(resources) => {
                setResourcesToBulkEdit(resources);
                setBulkEditOpen(true);
              }}
            />
          )}
          {currentView === 'timeline' && (
            <TimelineView 
              resources={filteredResources} 
              period={period}
              groupBy={groupBy}
              groupedByAssignment={groupedByAssignment}
              groupedByDepartment={groupedByDepartment}
              onEditResource={(id) => setEditResourceId(id)}
            />
          )}
        </div>

        {/* Resource 360° Drawer - New Implementation */}
        <Resource360Drawer 
          resourceId={resource360Id} 
          onClose={() => setResource360Id(null)} 
        />

        {/* Legacy Resource 360° Sheet */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-[500px] sm:max-w-[500px]">
            <SheetHeader>
              <SheetTitle>Resource 360°</SheetTitle>
            </SheetHeader>
            {selectedResource && (
              <ResourceDrawerContent resource={selectedResource} projects={projects} />
            )}
          </SheetContent>
        </Sheet>

        {/* AI Drawer - New Chat-based Interface */}
        <CapacityAIDrawer 
          isOpen={aiDrawerOpen} 
          onClose={() => setAiDrawerOpen(false)} 
        />

        {/* Add Resource Modal */}
        <Dialog open={resourceModalOpen} onOpenChange={(open) => {
          setResourceModalOpen(open);
          if (!open) {
            setSelectedUserIds([]);
            setSelectedDepartmentId('');
            setSelectedAssignment('');
            setAllocationPercentage(100);
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Resources to Capacity Planner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Users ({selectedUserIds.length} selected)</Label>
                  {availableUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedUserIds.length === availableUsers.length) {
                          setSelectedUserIds([]);
                        } else {
                          setSelectedUserIds(availableUsers.map(u => u.id));
                        }
                      }}
                      className="text-xs text-[#2563eb] hover:underline"
                    >
                      {selectedUserIds.length === availableUsers.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
                <ScrollArea className="h-[200px] border border-border rounded-lg">
                  {availableUsers.length === 0 ? (
                    <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                      All users are already assigned to the Capacity Planner
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {availableUsers.map((user) => {
                        const isSelected = selectedUserIds.includes(user.id);
                        const initials = user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
                        return (
                          <label
                            key={user.id}
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                              isSelected ? 'bg-[#2563eb]/5' : 'hover:bg-muted/50'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds([...selectedUserIds, user.id]);
                                } else {
                                  setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-border text-[#2563eb] focus:ring-[#2563eb]"
                            />
                            <div className="w-8 h-8 rounded-full bg-[#d4b896] flex items-center justify-center text-xs font-semibold text-[#4a3f35]">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.role || 'No role'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{user.department || 'Unassigned'}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
              
              {/* Assignment & Department */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assignment</Label>
                  <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select assignment..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border shadow-lg z-50">
                      {resourceAssignments.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border shadow-lg z-50">
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allocation %</Label>
                <Input 
                  type="number"
                  min={0}
                  max={100}
                  value={allocationPercentage}
                  onChange={(e) => setAllocationPercentage(Number(e.target.value))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResourceModalOpen(false)}>Cancel</Button>
              <Button 
                disabled={
                  selectedUserIds.length === 0 ||
                  isAddingResources ||
                  !selectedAssignment ||
                  !selectedDepartmentId
                }
                onClick={async () => {
                  if (!selectedAssignment || !selectedDepartmentId) {
                    toast.error('Please select an assignment and department');
                    return;
                  }

                  setIsAddingResources(true);
                  try {
                    const startDate = new Date().toISOString().split('T')[0];
                    const userById = new Map(resources.map((r) => [r.id, r]));

                    const { error: assignmentError } = await supabase.from('assignments').insert(
                      selectedUserIds.map((userId) => ({
                        user_id: userId,
                        project_id: null,
                        allocation_percentage: allocationPercentage,
                        start_date: startDate,
                        status: 'active',
                        work_item_type: 'project',
                      }))
                    );
                    if (assignmentError) throw assignmentError;

                    const { error: profileError } = await supabase
                      .from('profiles')
                      .update({ department_id: selectedDepartmentId })
                      .in('id', selectedUserIds);
                    if (profileError) throw profileError;

                    for (const userId of selectedUserIds) {
                      const name = userById.get(userId)?.name;
                      if (!name) continue;

                      const { data: updatedRows, error: updateError } = await supabase
                        .from('resource_inventory')
                        .update({ assignment_id: selectedAssignment, updated_at: new Date().toISOString() })
                        .eq('profile_id', userId)
                        .select('id');

                      if (updateError) throw updateError;

                      if (!updatedRows || updatedRows.length === 0) {
                        const { error: insertError } = await supabase.from('resource_inventory').insert({
                          profile_id: userId,
                          name,
                          assignment_id: selectedAssignment,
                          is_active: true,
                        });
                        if (insertError) throw insertError;
                      }
                    }

                    queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
                    queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });

                    toast.success(
                      `Added ${selectedUserIds.length} resource${selectedUserIds.length === 1 ? '' : 's'}`
                    );

                    setResourceModalOpen(false);
                    setSelectedUserIds([]);
                    setSelectedDepartmentId('');
                    setSelectedAssignment('');
                    setAllocationPercentage(100);
                  } catch (error: any) {
                    toast.error(`Failed to add resources: ${error?.message ?? 'Unknown error'}`);
                  } finally {
                    setIsAddingResources(false);
                  }
                }} 
                className="bg-[#2563eb] hover:bg-[#1d4ed8]"
              >
                {isAddingResources ? 'Adding...' : `Add ${selectedUserIds.length > 0 ? `${selectedUserIds.length} ` : ''}to Capacity Planner`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Resource Modal */}
        <Dialog open={editResourceId !== null} onOpenChange={(open) => !open && setEditResourceId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Resource</DialogTitle>
            </DialogHeader>
            {(() => {
              const editingResource = metrics.resources.find(r => r.id === editResourceId);
              if (!editingResource) return null;
              return (
                <EditResourceForm 
                  resource={editingResource}
                  onSave={() => {
                    setEditResourceId(null);
                  }}
                  onCancel={() => setEditResourceId(null)}
                />
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog - Catalyst Design System */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from Capacity Planner</AlertDialogTitle>
              <AlertDialogDescription>
                {resourcesToDelete.length > 0 ? (
                  <>
                    Are you sure you want to remove <span className="font-semibold">{resourcesToDelete.length} resource{resourcesToDelete.length > 1 ? 's' : ''}</span> from the Capacity Planner? All their assignments will be deleted. This action cannot be undone.
                  </>
                ) : (
                  <>
                    Are you sure you want to remove <span className="font-semibold">{resourceToDelete?.name}</span> from the Capacity Planner? All their assignments will be deleted. This action cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setResourceToDelete(null); setResourcesToDelete([]); }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (resourcesToDelete.length > 0) {
                    // Bulk delete
                    resourcesToDelete.forEach((resource) => {
                      resource.assignments.forEach((a) => {
                        deleteAssignment.mutate(a.id);
                      });
                    });
                    toast.success(`${resourcesToDelete.length} resource${resourcesToDelete.length > 1 ? 's' : ''} removed from Capacity Planner`);
                    setResourcesToDelete([]);
                  } else if (resourceToDelete) {
                    // Single delete
                    resourceToDelete.assignments.forEach((a) => {
                      deleteAssignment.mutate(a.id);
                    });
                    toast.success(`${resourceToDelete.name} removed from Capacity Planner`);
                    setResourceToDelete(null);
                  }
                  setDeleteConfirmOpen(false);
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Edit Modal */}
        <BulkEditModal 
          isOpen={bulkEditOpen}
          onClose={() => {
            setBulkEditOpen(false);
            setResourcesToBulkEdit([]);
          }}
          resources={resourcesToBulkEdit.map(r => ({
            id: r.id,
            name: r.name,
            department: r.department,
            department_id: r.department_id,
            allocation: r.allocation,
          }))}
        />

        <div className="fixed bottom-6 right-6 z-50">
          <div className="absolute inset-[-4px] rounded-full bg-[#0d9488]/25 animate-ping" style={{ animationDuration: '2.5s' }} />
          <button
            onClick={() => setAiDrawerOpen(true)}
            className="relative w-[52px] h-[52px] rounded-full bg-[#0d9488] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer border-0"
            style={{ boxShadow: '0 4px 16px rgba(13, 148, 136, 0.35)' }}
          >
            <Bot className="h-6 w-6 text-white" />
            {highPriorityCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#dc2626] text-white text-[11px] font-bold flex items-center justify-center border-2 border-white">
                {highPriorityCount}
              </span>
            )}
          </button>
        </div>

        {/* Assign Mode - Kanban View Overlay */}
        {assignModeOpen && (
          <KanbanAssignView 
            resources={filteredResources}
            assignments={resourceAssignments}
            onMoveResource={handleMoveResource}
            onClose={() => setAssignModeOpen(false)}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={(v: string) => setDepartmentFilter(v as 'all' | 'delivery' | 'product' | 'support')}
            uniqueDepartments={uniqueDepartments}
          />
        )}

        {/* Presentation Mode Fullscreen Overlay */}
        {presentationMode && (
          <div className="fixed inset-0 z-50 bg-[#fafafa] flex flex-col">
            {/* Logo - Top Left */}
            <div className="absolute top-4 left-6 z-50">
              <Logo variant="dark" size="lg" />
            </div>

            {/* Exit Button - Top Right */}
            <button
              onClick={() => setPresentationMode(false)}
              className="absolute top-4 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
            >
              <X className="h-4 w-4" />
              Exit Presentation
            </button>

            {/* Full Content Area - Minimal padding, max space for cards */}
            <div className="flex-1 overflow-auto pt-16 px-4 pb-4">
              {currentView === 'cards' && (
                <CardsView 
                  resources={filteredResources} 
                  groupedByAssignment={groupedByAssignment}
                  groupedByDepartment={groupedByDepartment}
                  groupBy={groupBy}
                  isCollapsed={isCollapsed}
                  compactMode={compactMode}
                  onResourceClick={() => {}}
                  onEditResource={() => {}}
                />
              )}
              {currentView === 'table' && (
                <TableView 
                  resources={filteredResources} 
                  projects={projects}
                  groupBy={groupBy}
                  groupedByAssignment={groupedByAssignment}
                  groupedByDepartment={groupedByDepartment}
                  onResourceClick={() => {}}
                  onEditResource={() => {}}
                  onDeleteResource={() => {}}
                  onBulkDelete={() => {}}
                  onBulkEdit={() => {}}
                />
              )}
              {currentView === 'timeline' && (
                <TimelineView 
                  resources={filteredResources} 
                  period={period}
                  groupBy={groupBy}
                  groupedByAssignment={groupedByAssignment}
                  groupedByDepartment={groupedByDepartment}
                  onEditResource={() => {}}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </PageChrome>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Card Component
// ─────────────────────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, value, label, iconBg, iconColor }: { 
  icon: React.ElementType; 
  value: number | string; 
  label: string; 
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 min-w-36 flex-1">
      <div className={cn('w-8 h-8 rounded-md flex items-center justify-center', iconBg)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// Stat Pill - Compact inline stat
function StatPill({ icon: Icon, value, label, variant = 'default' }: { 
  icon: React.ElementType; 
  value: number | string; 
  label: string; 
  variant?: 'default' | 'success' | 'primary' | 'warning';
}) {
  const variantStyles = {
    default: { iconBg: 'bg-muted', iconColor: 'text-muted-foreground' },
    success: { iconBg: 'bg-[#0d9488]/10', iconColor: 'text-[#0d9488]' },
    primary: { iconBg: 'bg-[#2563eb]/10', iconColor: 'text-[#2563eb]' },
    warning: { iconBg: 'bg-[#d97706]/10', iconColor: 'text-[#d97706]' },
  };
  const styles = variantStyles[variant];
  
  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2">
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', styles.iconBg)}>
        <Icon className={cn('h-3.5 w-3.5', styles.iconColor)} />
      </div>
      <span className="text-base font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// Legend Dot
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <div className={cn('w-1.5 h-1.5 rounded-full', color)} />
      {label}
    </div>
  );
}

// View Tab
function ViewTab({ icon: Icon, label, active, onClick, badge }: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all',
        active 
          ? 'bg-card text-foreground shadow-sm' 
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className={cn('h-4 w-4', active ? 'opacity-100' : 'opacity-60')} />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
          active ? 'bg-[#d97706] text-white' : 'bg-[#dc2626] text-white'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

// View Tab - Spec compliant styling
function ViewTabSpec({ icon: Icon, label, active, onClick }: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
        active
          ? 'bg-white text-[#0a0a0a] shadow-sm'
          : 'text-[#737373] hover:text-[#525252]'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cards View with Assignment Grouping
// ─────────────────────────────────────────────────────────────────────────────
function CardsView({ 
  resources, 
  groupedByAssignment, 
  groupedByDepartment, 
  groupBy, 
  isCollapsed = false,
  compactMode = false,
  onResourceClick, 
  onEditResource 
}: { 
  resources: ResourceMetric[]; 
  groupedByAssignment: Record<string, ResourceMetric[]>;
  groupedByDepartment: Record<string, ResourceMetric[]>;
  groupBy: GroupByType;
  isCollapsed?: boolean;
  compactMode?: boolean;
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
}) {
  // Default to collapsed state - groups start collapsed
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Default collapsed: return false unless explicitly expanded
  const isGroupExpanded = (groupName: string) => {
    if (isCollapsed) return false;
    return expandedGroups[groupName] === true;
  };

  if (groupBy === 'assignment') {
    return (
      // FIX #12: Visual separation between groups with spacing and borders
      <div className="space-y-4">
        {Object.entries(groupedByAssignment).map(([assignmentName, assignmentResources]) => {
          const availableCount = assignmentResources.filter(r => (r.allocation || 0) === 0).length;
          const partialCount = assignmentResources.filter(r => (r.allocation || 0) > 0 && (r.allocation || 0) < 100).length;
          const atCapacityCount = assignmentResources.filter(r => (r.allocation || 0) === 100).length;
          const overCount = assignmentResources.filter(r => (r.allocation || 0) > 100).length;
          const avgUtil = assignmentResources.length > 0 
            ? Math.round(assignmentResources.reduce((sum, r) => sum + (r.allocation || 0), 0) / assignmentResources.length)
            : 0;
          const expanded = isGroupExpanded(assignmentName);
          return (
          // FIX #12: Add bottom border for group separation
          <div key={assignmentName} className="space-y-3 pb-4 border-b border-slate-100 last:border-b-0">
            {/* Group Header with capacity bar */}
            <CompactGroupHeader
              assignmentName={assignmentName}
              resourceCount={assignmentResources.length}
              availableCount={availableCount + partialCount}
              atCapacityCount={atCapacityCount}
              overCount={overCount}
              averageUtilization={avgUtil}
              isExpanded={expanded}
              onToggle={() => toggleGroup(assignmentName)}
            />
            
            {/* Cards Grid - 5 columns dense with left indent */}
            {expanded && (
              <div className="grid gap-2 pl-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {assignmentResources.map((resource) => (
                  <CompactResourceCard 
                    key={resource.id}
                    id={resource.id}
                    name={resource.name}
                    role={resource.role || 'Team Member'}
                    department={resource.department}
                    assignmentName={assignmentName}
                    totalAllocation={resource.allocation || 0}
                    onOpen360={() => onResourceClick(resource)}
                    onEdit={() => onEditResource(resource.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )})}
      </div>
    );
  }

  if (groupBy === 'department') {
    return (
      // FIX #12: Visual separation between groups
      <div className="space-y-4">
        {Object.entries(groupedByDepartment).map(([deptName, deptResources]) => {
          const deptColor = departmentColors[deptName] || departmentColors.default;
          const expanded = isGroupExpanded(deptName);
          const availableCount = deptResources.filter(r => (r.allocation || 0) < 100).length;
          const atCapacityCount = deptResources.filter(r => (r.allocation || 0) >= 100).length;
          const avgUtil = deptResources.length > 0 
            ? Math.round(deptResources.reduce((sum, r) => sum + (r.allocation || 0), 0) / deptResources.length)
            : 0;
          return (
            // FIX #12: Add bottom border for group separation
            <div key={deptName} className="space-y-3 pb-4 border-b border-slate-100 last:border-b-0">
              {/* Group Header - Enterprise Style */}
              <div 
                className="flex items-center justify-between px-5 py-4 border border-[#e5e5e5] rounded-xl cursor-pointer hover:shadow-md transition-all"
                style={{ 
                  backgroundColor: `${CATALYST.blue.primary}08`,
                  borderLeftWidth: '4px',
                  borderLeftColor: CATALYST.blue.primary,
                }}
                onClick={() => toggleGroup(deptName)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm", deptColor.bg)}>
                    <Building2 className={cn("w-6 h-6", deptColor.text)} />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-[#0a0a0a]">{deptName}</span>
                    <div className="flex items-center gap-4 mt-1">
                      {availableCount > 0 && (
                        <span className="text-sm text-[#525252] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATALYST.teal.primary }} />
                          <span className="font-medium">{availableCount}</span> available
                        </span>
                      )}
                      {atCapacityCount > 0 && (
                        <span className="text-sm text-[#525252] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATALYST.blue.primary }} />
                          <span className="font-medium">{atCapacityCount}</span> at capacity
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-[#737373]">Avg: {avgUtil}%</span>
                    <div className="w-32 h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${Math.min(avgUtil, 100)}%`,
                          backgroundColor: CATALYST.blue.primary
                        }}
                      />
                    </div>
                  </div>
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: CATALYST.blue.bg }}
                  >
                    <Users className="w-4 h-4" style={{ color: CATALYST.blue.primary }} />
                    <span className="text-sm font-bold" style={{ color: CATALYST.blue.primary }}>
                      {deptResources.length}
                    </span>
                  </div>
                  {expanded 
                    ? <ChevronUp className="w-5 h-5 text-[#737373]" />
                    : <ChevronDown className="w-5 h-5 text-[#737373]" />
                  }
                </div>
              </div>
              
              {/* Cards Grid - Collapsible */}
              {expanded && (
                <div className="grid gap-2 pl-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {deptResources.map((resource) => (
                    <CompactResourceCard 
                      key={resource.id}
                      id={resource.id}
                      name={resource.name}
                      role={resource.role || 'Team Member'}
                      department={resource.department}
                      assignmentName={resource.assignmentName}
                      totalAllocation={resource.allocation || 0}
                      onOpen360={() => onResourceClick(resource)}
                      onEdit={() => onEditResource(resource.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {resources.map((resource) => (
        <CompactResourceCard 
          key={resource.id}
          id={resource.id}
          name={resource.name}
          role={resource.role || 'Team Member'}
          department={resource.department}
          assignmentName={resource.assignmentName}
          totalAllocation={resource.allocation || 0}
          onOpen360={() => onResourceClick(resource)}
          onEdit={() => onEditResource(resource.id)}
        />
      ))}
    </div>
  );
}

// Resource Card - Spec Design
function ResourceCard({ resource, groupBy, on360Click, onCardClick }: { 
  resource: ResourceMetric; 
  groupBy: GroupByType;
  on360Click: () => void;
  onCardClick: () => void;
}) {
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
  const allocation = resource.allocation || 0;
  const barColor = getAllocationBarColor(allocation);

  return (
    <div 
      className="flex items-center gap-3 p-4 bg-white border border-[#e5e5e5] rounded-xl cursor-pointer hover:border-[#d4d4d4] hover:shadow-sm transition-all"
      onClick={onCardClick}
    >
      {/* Avatar - Assignment-based color */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          on360Click();
        }}
        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity shrink-0"
        style={{ backgroundColor: getAssignmentColor(resource.assignmentName) }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#0a0a0a] truncate">{resource.name}</div>
        <div className="text-xs text-[#737373]">{resource.role || 'Team Member'}</div>
      </div>

      {/* Allocation Badge */}
      <span
        className="px-3 py-1.5 rounded-lg text-sm font-semibold"
        style={{
          backgroundColor: `${barColor}15`,
          color: barColor,
        }}
      >
        {allocation}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table View using CatalystEnterpriseTable
// ─────────────────────────────────────────────────────────────────────────────
interface TableViewProps {
  resources: ResourceMetric[];
  projects: CapacityProject[];
  groupBy: GroupByType;
  groupedByAssignment: Record<string, ResourceMetric[]>;
  groupedByDepartment: Record<string, ResourceMetric[]>;
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
  onDeleteResource: (r: ResourceMetric) => void;
  onBulkDelete?: (resources: ResourceMetric[]) => void;
  onBulkEdit?: (resources: ResourceMetric[]) => void;
}

function TableView({ resources, projects, groupBy, groupedByAssignment, groupedByDepartment, onResourceClick, onEditResource, onDeleteResource, onBulkDelete, onBulkEdit }: TableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown';

  // Sort resources by assignment name by default
  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) => {
      const aName = a.assignmentName || 'Unassigned';
      const bName = b.assignmentName || 'Unassigned';
      // Put 'Unassigned' at the end
      if (aName === 'Unassigned' && bName !== 'Unassigned') return 1;
      if (bName === 'Unassigned' && aName !== 'Unassigned') return -1;
      return aName.localeCompare(bName);
    });
  }, [resources]);

  // If the table data changes (e.g., after edits, filtering, or refetch),
  // drop any selections that no longer exist in the current dataset.
  useEffect(() => {
    const validIds = new Set(resources.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [resources]);

  const columns: CatalystColumn<ResourceMetric>[] = useMemo(() => [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      width: '220px',
      sortable: true,
      render: (value: string, row: ResourceMetric) => {
        const initials = row.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
        const avatarColor = getAssignmentColor(row.assignmentName);
        return (
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <span className="font-medium text-sm text-[#0a0a0a]">{value}</span>
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Role',
      accessor: 'role',
      width: '160px',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-[#404040]">{value || '-'}</span>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      accessor: 'department',
      width: '140px',
      sortable: true,
      filterable: true,
      filterOptions: [
        { value: 'Product', label: 'Product' },
        { value: 'Delivery', label: 'Delivery' },
        { value: 'Support', label: 'Support' },
        { value: 'Unassigned', label: 'Unassigned' },
      ],
      render: (value: string) => {
        const dept = value || 'Unassigned';
        return (
          <span
            className="px-2.5 py-1 rounded text-xs font-semibold uppercase"
            style={{ backgroundColor: CATALYST.blue.bg, color: CATALYST.blue.primary }}
          >
            {dept}
          </span>
        );
      },
    },
    {
      id: 'allocation',
      header: 'Allocation',
      accessor: 'allocation',
      width: '180px',
      sortable: true,
      render: (value: number) => {
        const barColor = getAllocationBarColor(value);
        return (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#0a0a0a] w-12">{value}%</span>
            <div className="flex-1 h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.min(value, 100)}%`,
                  backgroundColor: barColor 
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      id: 'assignments',
      header: 'Assignment',
      accessor: (row: ResourceMetric) => row.assignmentName || 'Unassigned',
      width: '200px',
      sortable: true,
      render: (_: any, row: ResourceMetric) => {
        const assignmentName = row.assignmentName || 'Unassigned';
        const theme = getAssignmentTheme(assignmentName);
        return (
          <span 
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold truncate max-w-[180px]"
            style={{ 
              backgroundColor: `${theme.accent}15`, 
              color: theme.accent,
              borderLeft: `3px solid ${theme.accent}`
            }}
            title={assignmentName}
          >
            {assignmentName}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: 'id',
      width: '100px',
      sortable: false,
      render: (_: any, row: ResourceMetric) => {
        return (
        <div className="flex items-center gap-1">
          {/* Edit - NO duplicate avatar */}
          <button 
            onClick={(e) => { e.stopPropagation(); onEditResource(row.id); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            title="Edit resource"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {/* Delete */}
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteResource(row); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            title="Remove from Capacity Planner"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        );
      },
    },
  ], [projects, onResourceClick, onEditResource, onDeleteResource]);

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleBulkDelete = () => {
    const selected = resources.filter(r => selectedIds.includes(r.id));
    if (onBulkDelete && selected.length > 0) {
      onBulkDelete(selected);
      setSelectedIds([]);
    }
  };

  const handleBulkEdit = () => {
    const selected = resources.filter(r => selectedIds.includes(r.id));
    if (onBulkEdit && selected.length > 0) {
      onBulkEdit(selected);
    }
  };

  // Render grouped tables for assignment - REDESIGNED with assignment colors
  const renderGroupedTable = (groupResources: ResourceMetric[], groupName: string) => {
    const theme = getAssignmentTheme(groupName);
    return (
      <div key={groupName} className="space-y-2">
        <div 
          className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg"
          style={{ borderLeftWidth: '4px', borderLeftColor: theme.accent }}
        >
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: theme.accent }}
          >
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: theme.accent }}>{groupName}</span>
          <span className="text-xs text-slate-500 ml-auto bg-slate-100 px-2.5 py-1 rounded-full">
            {groupResources.length} resources
          </span>
        </div>
        <CatalystEnterpriseTable
          data={groupResources}
          columns={columns}
          showCheckboxes={true}
          showActionsColumn={false}
          selectedRows={selectedIds}
          onSelectionChange={handleSelectionChange}
          onRowClick={(row) => onResourceClick(row)}
        />
      </div>
    );
  };

  // Render grouped tables for department - REDESIGNED with assignment colors
  const renderDepartmentGroupedTable = (groupResources: ResourceMetric[], deptName: string) => {
    const deptColor = departmentColors[deptName] || departmentColors.default;
    return (
      <div key={deptName} className="space-y-2">
        <div 
          className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg"
          style={{ borderLeftWidth: '4px', borderLeftColor: CATALYST.blue.primary }}
        >
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", deptColor.bg)}>
            <Building2 className={cn("h-4 w-4", deptColor.text)} />
          </div>
          <span className="text-sm font-semibold text-slate-900">{deptName}</span>
          <span className="text-xs text-slate-500 ml-auto bg-slate-100 px-2.5 py-1 rounded-full">
            {groupResources.length} resources
          </span>
        </div>
        <CatalystEnterpriseTable
          data={groupResources}
          columns={columns}
          showCheckboxes={true}
          showActionsColumn={false}
          selectedRows={selectedIds}
          onSelectionChange={handleSelectionChange}
          onRowClick={(row) => onResourceClick(row)}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.length} resource{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkEdit}
              className="gap-1.5"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Bulk Edit
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDelete}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Selected
            </Button>
          </div>
        </div>
      )}

      {groupBy === 'assignment' ? (
        <div className="flex-1 overflow-auto space-y-6">
          {Object.entries(groupedByAssignment).map(([assignmentName, assignmentResources]) => 
            renderGroupedTable(assignmentResources, assignmentName)
          )}
        </div>
      ) : groupBy === 'department' ? (
        <div className="flex-1 overflow-auto space-y-6">
          {Object.entries(groupedByDepartment).map(([deptName, deptResources]) => 
            renderDepartmentGroupedTable(deptResources, deptName)
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <CatalystEnterpriseTable
            data={sortedResources}
            columns={columns}
            showCheckboxes={true}
            showActionsColumn={false}
            selectedRows={selectedIds}
            onSelectionChange={handleSelectionChange}
            onRowClick={(row) => onResourceClick(row)}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline View with GANTT-STYLE Project Blocks - CIO Grade
// ─────────────────────────────────────────────────────────────────────────────

// FILLED project colors for Timeline bars — solid backgrounds with white text
const TIMELINE_PROJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Senaei BAU': { bg: '#2563eb', text: '#ffffff' },
  'Senaei': { bg: '#2563eb', text: '#ffffff' },
  'Innovation Platform': { bg: '#4f46e5', text: '#ffffff' },
  'Innovation': { bg: '#4f46e5', text: '#ffffff' },
  'Inspection Project': { bg: '#0d9488', text: '#ffffff' },
  'Inspection': { bg: '#0d9488', text: '#ffffff' },
  'International Relations': { bg: '#059669', text: '#ffffff' },
  'International': { bg: '#059669', text: '#ffffff' },
  'MIM Website': { bg: '#16a34a', text: '#ffffff' },
  'MIM': { bg: '#16a34a', text: '#ffffff' },
  'Senaei OPS': { bg: '#ca8a04', text: '#ffffff' },
  'Sectorial Services': { bg: '#8b7355', text: '#ffffff' },
  'Sectorial': { bg: '#8b7355', text: '#ffffff' },
  'Tahommena': { bg: '#0891b2', text: '#ffffff' },
  'Data Platform': { bg: '#0284c7', text: '#ffffff' },
  'Data': { bg: '#0284c7', text: '#ffffff' },
  'ICP': { bg: '#7c3aed', text: '#ffffff' },
};

// Get project color with fallback
const getTimelineProjectColor = (name: string) => {
  if (TIMELINE_PROJECT_COLORS[name]) return TIMELINE_PROJECT_COLORS[name];
  
  const key = Object.keys(TIMELINE_PROJECT_COLORS).find(k => 
    name.toLowerCase().includes(k.toLowerCase()) || 
    k.toLowerCase().includes(name.toLowerCase())
  );
  
  return key ? TIMELINE_PROJECT_COLORS[key] : { bg: '#64748b', text: '#ffffff' };
};

// Short form names for project display in timeline cells
const PROJECT_SHORT_NAMES: Record<string, string> = {
  'Senaei BAU': 'Senaei',
  'Innovation Platform': 'Innovation',
  'Inspection Project': 'Inspection',
  'International Relations': 'International',
  'MIM Website': 'MIM',
  'Senaei OPS': 'Senaei OPS',
  'Sectorial Services': 'Sectorial',
  'Tahommena': 'Tahommena',
  'Data Platform': 'Data',
};

// Get short name for a project, with fallback to first word
const getProjectShortName = (fullName: string): string => {
  if (PROJECT_SHORT_NAMES[fullName]) return PROJECT_SHORT_NAMES[fullName];
  const firstWord = fullName.split(' ')[0];
  return firstWord.length > 10 ? firstWord.substring(0, 10) : firstWord;
};

interface TimelineViewProps {
  resources: ResourceMetric[];
  period: PeriodType;
  groupBy: GroupByType;
  groupedByAssignment: Record<string, ResourceMetric[]>;
  groupedByDepartment: Record<string, ResourceMetric[]>;
  onEditResource?: (id: string) => void;
}

function TimelineView({ resources, period, groupBy, groupedByAssignment, groupedByDepartment, onEditResource }: TimelineViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isGroupExpanded = (name: string) => expandedGroups[name] === true;

  // Generate periods based on selected period type - dynamic from current date
  const periods = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (period === 'monthly') {
      // 6 months from current month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Array.from({ length: 6 }, (_, i) => {
        const monthIndex = (currentMonth + i) % 12;
        const year = currentYear + Math.floor((currentMonth + i) / 12);
        const shortYear = String(year).slice(-2);
        return {
          label: `${monthNames[monthIndex]} '${shortYear}`,
          key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        };
      });
    }
    if (period === 'quarterly') {
      // 4 quarters starting from current quarter
      const currentQuarter = Math.floor(currentMonth / 3);
      return Array.from({ length: 4 }, (_, i) => {
        const quarterIndex = (currentQuarter + i) % 4;
        const year = currentYear + Math.floor((currentQuarter + i) / 4);
        const shortYear = String(year).slice(-2);
        return {
          label: `Q${quarterIndex + 1} '${shortYear}`,
          key: `${year}-Q${quarterIndex + 1}`,
        };
      });
    }
    // Weekly - 12 weeks (3 months from current week)
    const weekLabels: { label: string; key: string }[] = [];
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay()); // Sunday start
    
    for (let i = 0; i < 12; i++) {
      const weekDate = new Date(startOfCurrentWeek);
      weekDate.setDate(startOfCurrentWeek.getDate() + (i * 7));
      const weekMonth = weekDate.toLocaleString('en-US', { month: 'short' });
      const weekDay = weekDate.getDate();
      const weekYear = String(weekDate.getFullYear()).slice(-2);
      weekLabels.push({
        label: `${weekMonth} ${weekDay} '${weekYear}`,
        key: `${weekDate.getFullYear()}-W${String(i + 1).padStart(2, '0')}`,
      });
    }
    return weekLabels;
  }, [period]);

  // Get resource allocations - use the assignment group name (the resource's assigned project/assignment)
  const getResourceAllocations = useCallback((resource: ResourceMetric, assignmentGroupName: string) => {
    // Always use the assignment group name - this is the REAL assignment from the capacity planner
    // The resource.assignmentName is what we're grouping by, and it's the correct human-readable name
    return [{
      project: assignmentGroupName,
      percentage: resource.allocation || 100,
    }];
  }, []);

  const renderTimelineHeader = () => (
    <div className="flex bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
      <div className="w-56 px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200 shrink-0">
        Resource
      </div>
      <div className="flex-1 flex">
        {periods.map((p, i) => (
          <div 
            key={p.key} 
            className={cn(
              'flex-1 px-2 py-3 text-center text-[11px] font-semibold text-slate-500 border-r border-slate-200 last:border-r-0 min-w-24',
              i === 0 && 'bg-blue-50/50 text-blue-600'
            )}
          >
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );

  const renderResourceRow = (resource: ResourceMetric, assignmentName: string, isEven: boolean) => {
    const theme = getAssignmentTheme(assignmentName);
    const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
    const allocations = getResourceAllocations(resource, assignmentName);
    const totalAlloc = resource.allocation || 0;
    const isOver = totalAlloc > 100;
    const allocTheme = getAllocationTheme(totalAlloc);

    const isUnassigned = assignmentName === 'Unassigned' || !assignmentName;
    const isAvailable = isUnassigned || totalAlloc === 0;

    return (
      <div 
        key={resource.id} 
        className={cn(
          "flex border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50",
          isEven && "bg-slate-50/30"
        )}
        style={{ borderLeftWidth: '3px', borderLeftColor: allocTheme.bar }}
      >
        {/* Resource Info */}
        <div className="w-56 px-4 py-3 flex items-center gap-3 border-r border-slate-200 shrink-0">
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: theme.accent }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{resource.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{resource.role || 'Team Member'}</p>
          </div>
        </div>

        {/* Period Cells with FILLED Gantt Bars */}
        <div className="flex-1 flex">
          {periods.map((p, colIdx) => {
            const isCurrentPeriod = colIdx === 0;
            
            return (
              <div 
                key={p.key}
                className={cn(
                  'flex-1 p-2 border-r border-slate-200 last:border-r-0 min-w-24 relative',
                  isCurrentPeriod && 'bg-blue-50/30',
                  isOver && 'bg-amber-50/30'
                )}
              >
                {/* Over-allocation warning */}
                {isOver && (
                  <div className="absolute top-1 right-1 z-10">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                )}

                {/* Available State - Clickable to allocate */}
                {isAvailable ? (
                  <button
                    onClick={() => onEditResource?.(resource.id)}
                    className="h-full w-full flex flex-col items-center justify-center text-slate-400 py-2 hover:bg-teal-50 rounded transition-colors cursor-pointer group"
                  >
                    <CheckCircle2 className="w-4 h-4 mb-1 text-teal-500 group-hover:text-teal-600" />
                    <span className="text-[10px] font-medium text-teal-600 group-hover:text-teal-700">Available</span>
                  </button>
                ) : (
                  <>
                    {/* FILLED Project Bars with Width = Percentage */}
                    <div className="space-y-1">
                      {allocations.map((alloc, i) => {
                        const projectColor = getTimelineProjectColor(alloc.project);
                        const shortName = getProjectShortName(alloc.project);
                        const tooltipText = `${alloc.project}: ${alloc.percentage}%`;
                        const barWidthPercent = Math.min(alloc.percentage, 100);
                        
                        return (
                          <div
                            key={i}
                            className="h-6 rounded text-[10px] font-semibold flex items-center px-2 cursor-default group relative"
                            style={{
                              width: `${barWidthPercent}%`,
                              minWidth: '50px',
                              backgroundColor: projectColor.bg,
                              color: projectColor.text,
                            }}
                            title={tooltipText}
                          >
                            <span className="truncate">{shortName} ({alloc.percentage}%)</span>
                            {/* Hover tooltip for full name */}
                            <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 px-2 py-1 text-[10px] bg-slate-900 text-white rounded shadow-lg whitespace-nowrap">
                              {tooltipText}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Badge */}
                    <div className="mt-1.5 flex justify-end">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: allocTheme.labelBg, color: allocTheme.labelColor }}
                      >
                        {totalAlloc}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGroupedTimeline = (groupName: string, groupResources: ResourceMetric[]) => {
    const theme = getAssignmentTheme(groupName);
    const isExpanded = isGroupExpanded(groupName);

    return (
      <div key={groupName} className="space-y-2">
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(groupName)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all"
          style={{ borderLeftWidth: '4px', borderLeftColor: theme.accent }}
        >
          <div className="flex items-center gap-3">
            <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-90")} />
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: theme.accent }}
            >
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: theme.accent }}>
              {groupName}
            </span>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {groupResources.length} resources
          </span>
        </button>

        {/* Timeline Table */}
        {isExpanded && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {renderTimelineHeader()}
            <div className="max-h-[400px] overflow-y-auto">
              {groupResources.map((r, i) => renderResourceRow(r, groupName, i % 2 === 0))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (groupBy === 'assignment') {
    return (
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-teal-100 border-l-2 border-teal-500" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 border-l-2 border-blue-500" />
            Optimal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border-l-2 border-amber-500" />
            Over-allocated
          </span>
        </div>

        {Object.entries(groupedByAssignment).map(([name, resources]) => 
          renderGroupedTimeline(name, resources)
        )}
      </div>
    );
  }

  if (groupBy === 'department') {
    return (
      <div className="space-y-4">
        {Object.entries(groupedByDepartment).map(([name, resources]) => 
          renderGroupedTimeline(name, resources)
        )}
      </div>
    );
  }
  
  // No grouping
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {renderTimelineHeader()}
        <div className="max-h-[500px] overflow-y-auto">
          {resources.map((r, i) => renderResourceRow(r, r.assignmentName || 'Unassigned', i % 2 === 0))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignments View (Gantt) with Add Assignment Modal
// ─────────────────────────────────────────────────────────────────────────────
interface AssignmentsViewProps {
  resources: ResourceMetric[];
  projects: CapacityProject[];
  createAssignment: ReturnType<typeof useAssignments>['createAssignment'];
}

function AssignmentsView({ resources, projects, createAssignment }: AssignmentsViewProps) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Leveling View with AI Banner and Two-Panel Layout
// ─────────────────────────────────────────────────────────────────────────────
function LevelingView({ resources, recommendations }: { resources: ResourceMetric[]; recommendations: AiRecommendation[] }) {
  const [selectedResource, setSelectedResource] = useState<ResourceMetric | null>(resources[0] || null);
  const [releaseVersion, setReleaseVersion] = useState('');
  const [allocationFilter, setAllocationFilter] = useState('under80');
  const [selectedWorkItems, setSelectedWorkItems] = useState<{ id: string; allocation: number }[]>([]);

  // Mock work items for demonstration
  const workItems = [
    { id: '1', itemId: 'SEN-1003', title: 'Create chart component library', project: 'Senaei BAU', epic: 'Real-time Dashboard Analytics', allocation: 30 },
    { id: '2', itemId: 'SEN-1004', title: 'Implement WebSocket real-time sync', project: 'Senaei BAU', epic: 'Real-time Dashboard Analytics', allocation: 30 },
    { id: '3', itemId: 'SEN-1005', title: 'Dashboard layout responsive design', project: 'Senaei BAU', epic: 'Real-time Dashboard Analytics', allocation: 25 },
  ];

  const handleWorkItemToggle = (workItemId: string, defaultAllocation: number) => {
    setSelectedWorkItems(prev => {
      const exists = prev.find(w => w.id === workItemId);
      if (exists) {
        return prev.filter(w => w.id !== workItemId);
      }
      return [...prev, { id: workItemId, allocation: defaultAllocation }];
    });
  };

  const handleAllocationChange = (workItemId: string, allocation: number) => {
    setSelectedWorkItems(prev => 
      prev.map(w => w.id === workItemId ? { ...w, allocation } : w)
    );
  };

  const isSelected = (workItemId: string) => selectedWorkItems.some(w => w.id === workItemId);
  const getAllocation = (workItemId: string, defaultVal: number) => 
    selectedWorkItems.find(w => w.id === workItemId)?.allocation || defaultVal;

  const totalPendingAllocation = selectedWorkItems.reduce((sum, w) => sum + w.allocation, 0);
  const availableCapacity = selectedResource ? 100 - selectedResource.allocation : 0;
  
  const handleSkip = () => {
    const currentIdx = resources.findIndex(r => r.id === selectedResource?.id);
    if (currentIdx < resources.length - 1) {
      setSelectedResource(resources[currentIdx + 1]);
      setSelectedWorkItems([]);
    }
  };

  const handleAssign = () => {
    if (selectedWorkItems.length > 0) {
      toast.success(`Assigned ${selectedWorkItems.length} items to ${selectedResource?.name}`);
      handleSkip();
    }
  };

  return (
    <div className="space-y-5">
      {/* AI Banner - Blue Gradient */}
      <div 
        className="flex items-center gap-4 p-5 rounded-xl text-white"
        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)' }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Cloud className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold mb-0.5">AI Resource Leveling</h3>
          <p className="text-sm opacity-90">
            <strong>{resources.length} resources</strong> have available capacity this period. Start the wizard to optimally assign them to open work items.
          </p>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          className="gap-2 bg-white text-[#2563eb] hover:bg-white/90 font-semibold"
        >
          <Play className="h-4 w-4" />
          Start Wizard
        </Button>
      </div>
      
      {/* Filters Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">Release Version:</span>
          <Select value={releaseVersion} onValueChange={setReleaseVersion}>
            <SelectTrigger className="w-52 h-10 bg-card">
              <SelectValue placeholder="Select Release..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="r2025.1">Release 2025.1 - Q1</SelectItem>
              <SelectItem value="r2025.2">Release 2025.2 - Q2</SelectItem>
              <SelectItem value="r2025.3">Release 2025.3 - Q3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={allocationFilter} onValueChange={setAllocationFilter}>
          <SelectTrigger className="w-52 h-10 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under80">Under-allocated (&lt;80%)</SelectItem>
            <SelectItem value="available">Available (&lt;50%)</SelectItem>
            <SelectItem value="all">All Resources</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Two-Column Layout */}
      <div className="grid grid-cols-[340px_1fr] gap-5 min-h-[520px]">
        {/* Left Panel - Resources List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Resources to Level</h3>
            <span className="text-xs text-muted-foreground">{resources.length} remaining</span>
          </div>
          <div className="max-h-[470px] overflow-y-auto">
            {resources.map((resource) => {
              const dept = resource.department || 'Unassigned';
              const deptColor = departmentColors[dept] || departmentColors.default;
              const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
              const freeCapacity = 100 - resource.allocation;
              const isCurrentSelected = selectedResource?.id === resource.id;
              
              return (
                <button 
                  key={resource.id}
                  onClick={() => { setSelectedResource(resource); setSelectedWorkItems([]); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-5 py-4 text-left transition-colors relative',
                    isCurrentSelected 
                      ? 'bg-[#f5f5f4]' 
                      : 'hover:bg-muted/30'
                  )}
                >
                  {/* Selection indicator */}
                  {isCurrentSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2563eb] rounded-r" />
                  )}
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', deptColor.bg, deptColor.text)}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{resource.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{resource.role}</p>
                  </div>
                  <span className={cn(
                    'text-xs font-semibold',
                    freeCapacity >= 40 ? 'text-[#0d9488]' : 
                    freeCapacity >= 20 ? 'text-[#d97706]' : 'text-[#dc2626]'
                  )}>
                    {freeCapacity}% free
                  </span>
                </button>
              );
            })}
            {resources.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No resources match the current filter
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel - Work Items */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {selectedResource ? (
            <>
              {/* Resource Header */}
              <div className="px-6 py-5 border-b border-border flex items-center gap-4">
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold',
                  departmentColors[selectedResource.department || 'Unassigned']?.bg || departmentColors.default.bg,
                  departmentColors[selectedResource.department || 'Unassigned']?.text || departmentColors.default.text
                )}>
                  {selectedResource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-foreground">{selectedResource.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedResource.role} · {selectedResource.department || 'Unassigned'}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[#d97706]">{selectedResource.allocation}%</p>
                    <p className="text-xs text-muted-foreground">Current</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#0d9488]">{availableCapacity}%</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
              </div>

              {/* Work Items Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Available Work Items <span className="font-normal text-muted-foreground">({workItems.length} items)</span>
                  </h4>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="senaei">Senaei BAU</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-28 h-9 text-sm">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Work Items List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-3">
                  {workItems.map((item) => {
                    const selected = isSelected(item.id);
                    const allocation = getAllocation(item.id, item.allocation);
                    
                    return (
                      <div 
                        key={item.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        {/* Checkbox */}
                        <input 
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleWorkItemToggle(item.id, item.allocation)}
                          className="w-5 h-5 rounded border-border text-[#2563eb] focus:ring-[#2563eb]"
                        />
                        
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-lg bg-[#d4b896]/20 flex items-center justify-center shrink-0">
                          <FileStack className="h-5 w-5 text-[#8b7355]" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#2563eb]">{item.itemId}</p>
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.project} · {item.epic}</p>
                        </div>
                        
                        {/* Allocation Input */}
                        <div className="flex flex-col items-center gap-0.5">
                          <Input 
                            type="number"
                            min={5}
                            max={100}
                            step={5}
                            value={allocation}
                            onChange={(e) => handleAllocationChange(item.id, parseInt(e.target.value) || 0)}
                            disabled={!selected}
                            className={cn(
                              "w-16 h-9 text-center text-sm font-medium",
                              !selected && "bg-muted text-muted-foreground"
                            )}
                          />
                          <span className="text-[10px] text-muted-foreground">% alloc</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleSkip}>
                  Skip
                </Button>
                <Button 
                  onClick={handleAssign}
                  disabled={selectedWorkItems.length === 0}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] gap-2"
                >
                  {selectedWorkItems.length > 0 ? (
                    <>
                      <Check className="h-4 w-4" />
                      Assign {selectedWorkItems.length} items
                    </>
                  ) : (
                    'Select items to assign'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground gap-4">
              <Clock className="h-12 w-12 opacity-50" />
              <p className="text-sm">Select a resource from the queue to begin assignment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Card
// ─────────────────────────────────────────────────────────────────────────────
function RecommendationCard({ recommendation }: { recommendation: AiRecommendation }) {
  const priorityColors = {
    high: 'border-l-[#dc2626]',
    medium: 'border-l-[#d97706]',
    low: 'border-l-[#0d9488]',
  };
  
  const typeIcons = {
    rebalance: TrendingUp,
    hire: Users,
    alert: AlertTriangle,
    reassign: GanttChart,
  };
  
  const Icon = typeIcons[recommendation.type] || AlertTriangle;
  
  return (
    <div className={cn('bg-muted/50 border border-border rounded-lg p-4 border-l-4', priorityColors[recommendation.priority])}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground mb-1">{recommendation.title}</h4>
          <p className="text-xs text-muted-foreground">{recommendation.description}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="h-7 text-xs">Dismiss</Button>
            <Button size="sm" className="h-7 text-xs bg-[#2563eb] hover:bg-[#1d4ed8]">Apply</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource Drawer Content
// ─────────────────────────────────────────────────────────────────────────────
function ResourceDrawerContent({ resource, projects }: { resource: ResourceMetric; projects: CapacityProject[] }) {
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
            resource.allocation > 100 ? 'text-[#dc2626]' :
            resource.allocation > 80 ? 'text-[#d97706]' : 'text-[#0d9488]'
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

// ─────────────────────────────────────────────────────────────────────────────
// Edit Resource Form with Real-time Auto-Save
// ─────────────────────────────────────────────────────────────────────────────
function EditResourceForm({ 
  resource,
  onSave, 
  onCancel 
}: { 
  resource: ResourceMetric;
  onSave: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const { departments } = useCapacityDepartments();
  const { assignments: assignmentTypes = [] } = useResourceAssignments();
  const { updateResource } = useResourceManagement();
  
  const [name, setName] = useState(resource.name);
  const [role, setRole] = useState(resource.role || 'Frontend Developer');
  const [departmentId, setDepartmentId] = useState(resource.department_id || '');
  const [assignmentId, setAssignmentId] = useState(resource.assignment_id || '');
  const [allocation, setAllocation] = useState(resource.allocation || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save function for profile fields
  const saveProfileField = async (field: string, value: string | null) => {
    setIsSaving(true);
    try {
      const updatePayload: any = { id: resource.id };
      
      if (field === 'role') updatePayload.role = value;
      if (field === 'department_id') updatePayload.department_id = value || null;
      if (field === 'assignment_id') updatePayload.assignment_id = value || null;
      if (field === 'full_name') updatePayload.full_name = value;
      
      await updateResource.mutateAsync(updatePayload);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save field:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Save allocation to resource_inventory table
  const saveAllocation = async (newAllocation: number) => {
    setIsSaving(true);
    try {
      // Check if resource exists in resource_inventory by profile_id
      const { data: existingResource } = await supabase
        .from('resource_inventory')
        .select('id')
        .eq('profile_id', resource.id)
        .maybeSingle();
      
      if (existingResource) {
        // Update existing resource_inventory entry
        const { error } = await supabase
          .from('resource_inventory')
          .update({ 
            default_capacity_percent: newAllocation,
            updated_at: new Date().toISOString() 
          })
          .eq('profile_id', resource.id);
        
        if (error) throw error;
      } else {
        // Create resource_inventory entry with profile_id
        const { error } = await supabase
          .from('resource_inventory')
          .insert({
            profile_id: resource.id,
            name: resource.name || 'Unknown',
            role_name: resource.role,
            assignment_id: resource.assignment_id || null,
            default_capacity_percent: newAllocation,
            is_active: true,
          });
        
        if (error) throw error;
      }
      
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save allocation:', error);
      toast.error('Failed to save allocation');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for role change
  const handleRoleChange = (value: string) => {
    setRole(value);
    saveProfileField('role', value);
  };

  // Handler for department change
  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value);
    saveProfileField('department_id', value);
  };

  // Handler for assignment change
  const handleAssignmentChange = (value: string) => {
    setAssignmentId(value);
    saveProfileField('assignment_id', value);
  };

  // Handler for allocation change (save on blur)
  const handleAllocationBlur = () => {
    if (allocation !== resource.allocation) {
      saveAllocation(allocation);
    }
  };

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => saveProfileField('full_name', name)}
              placeholder="Enter name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input 
              value={resource.email || ''}
              readOnly
              disabled
              className="bg-muted cursor-not-allowed"
              placeholder="No email set"
            />
          </div>
        </div>
          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Input 
              value={role}
              readOnly
              disabled
              className="bg-muted cursor-not-allowed"
              placeholder="Managed via Admin > Users"
            />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={handleDepartmentChange}>
              <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Assignment</Label>
            <Select value={assignmentId} onValueChange={handleAssignmentChange}>
              <SelectTrigger><SelectValue placeholder="Select assignment..." /></SelectTrigger>
              <SelectContent>
                {assignmentTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Allocation %</Label>
            <Input 
              type="number"
              min={0}
              max={100}
              step={5}
              value={allocation}
              onChange={(e) => setAllocation(parseInt(e.target.value) || 0)}
              onBlur={handleAllocationBlur}
            />
          </div>
        </div>
        
        {/* Auto-save indicator */}
        {(isSaving || lastSaved) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <div className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-[#0d9488]" />
                <span>Saved</span>
              </>
            ) : null}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={onSave} 
          disabled={isSaving}
          className="bg-[#2563eb] hover:bg-[#1d4ed8]"
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

// Export with Resource360Drawer wrapper
export { Resource360Drawer };
