import { useEffect, useState, useMemo } from 'react';
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
  ChevronLeft, ChevronRight, Clock, Eye, Copy, Check, RotateCcw, Play,
  Pencil, Trash2, Cloud, GitCompare, Settings2, ArrowLeftRight
} from 'lucide-react';
import { useCapacityData, useAssignments, useAiRecommendations, useCapacityScenarios, useCapacityDepartments, useResourceManagement, useResourceAssignments, exportCapacityToPdf } from '@/modules/capacity-planner';

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

type PeriodType = 'weekly' | 'monthly' | 'quarterly';
type GroupByType = 'none' | 'assignment' | 'department';
type ExtendedViewType = ViewType | 'scenarios';

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
  '#22c55e', // Green
];

export default function CapacityPlannerPage() {
  const queryClient = useQueryClient();

  const { metrics, projects, resources, assignments, isLoading } = useCapacityData();
  const { createAssignment, deleteAssignment } = useAssignments();
  const { recommendations, highPriorityCount } = useAiRecommendations({ 
    resources: metrics.resources, 
    projects 
  });
  
  // Edit resource state
  const [editResourceId, setEditResourceId] = useState<string | null>(null);

  // View state
  const [currentView, setCurrentView] = useState<ExtendedViewType>('cards');
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [groupBy, setGroupBy] = useState<GroupByType>('assignment');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Add resource form state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [allocationPercentage, setAllocationPercentage] = useState<number>(100);
  const [isAddingResources, setIsAddingResources] = useState(false);

  // Fetch departments and assignments for the modal
  const { departments } = useCapacityDepartments();
  const { assignments: resourceAssignments = [] } = useResourceAssignments();
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

  const filteredResources = metrics.resources.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group resources by assignment type
  const groupedByAssignment = useMemo(() => {
    const groups: Record<string, ResourceMetric[]> = {};
    
    // Initialize all active assignment types as empty arrays (so all swim lanes show)
    resourceAssignments.forEach((a) => {
      if (a.name) groups[a.name] = [];
    });
    // Always have Unassigned lane
    groups['Unassigned'] = [];
    
    // Populate with resources
    filteredResources.forEach((r) => {
      const assignmentName = r.assignmentName || 'Unassigned';
      if (!groups[assignmentName]) groups[assignmentName] = [];
      groups[assignmentName].push(r);
    });
    return groups;
  }, [filteredResources, resourceAssignments]);

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
  if (isLoading) {
    return (
      <PageChrome>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading capacity data...</div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome>
      <div className="flex flex-col h-full bg-[hsl(var(--background))]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            {/* Period Toggle - Only show in Timeline view */}
            {currentView === 'timeline' && (
              <div className="flex bg-card border border-border rounded-lg p-1">
                {(['weekly', 'monthly', 'quarterly'] as PeriodType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-4 py-2 text-xs font-semibold rounded-md transition-all capitalize',
                      period === p
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search resources..." 
                className="pl-9 w-48 h-9 text-sm bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Enterprise Assign Mode Toggle */}
            <button
              onClick={() => setAssignModeOpen(!assignModeOpen)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                assignModeOpen
                  ? 'bg-[#2563eb] border-[#2563eb] text-white'
                  : 'bg-card border-border text-[#2563eb] hover:bg-[#2563eb]/5 hover:border-[#2563eb]/50'
              )}
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Assign Mode</span>
            </button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setResourceModalOpen(true)} className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]">
              <Plus className="h-4 w-4" />
              Add Resource
            </Button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="flex gap-2 px-5 pb-4 flex-wrap">
          <SummaryCard 
            icon={Users} 
            value={metrics.summary.total} 
            label="Resources" 
            iconBg="bg-[#2563eb]/10" 
            iconColor="text-[#2563eb]" 
          />
          <SummaryCard 
            icon={CheckCircle2} 
            value={metrics.summary.available + metrics.summary.healthy} 
            label="Available" 
            iconBg="bg-[#0d9488]/10" 
            iconColor="text-[#0d9488]" 
          />
          <SummaryCard 
            icon={BarChart3} 
            value={metrics.summary.atCapacity} 
            label="At Capacity" 
            iconBg="bg-[#d97706]/10" 
            iconColor="text-[#d97706]" 
          />
          <SummaryCard 
            icon={BarChart3} 
            value={metrics.summary.overAllocated} 
            label="Over-allocated" 
            iconBg="bg-[#64748b]/10" 
            iconColor="text-[#64748b]" 
          />
          
          {/* Utilization Gauge */}
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex-1 min-w-40">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Utilization</span>
              <span className={cn(
                'text-lg font-bold',
                metrics.summary.avgUtilization >= 80 ? 'text-[#dc2626]' : 
                metrics.summary.avgUtilization >= 60 ? 'text-[#d97706]' : 'text-[#0d9488]'
              )}>
                {metrics.summary.avgUtilization}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
              <div 
                className={cn(
                  'h-full rounded-full transition-all',
                  metrics.summary.avgUtilization >= 80 ? 'bg-[#dc2626]' : 
                  metrics.summary.avgUtilization >= 60 ? 'bg-[#d97706]' : 'bg-[#0d9488]'
                )}
                style={{ width: `${Math.min(metrics.summary.avgUtilization, 100)}%` }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <LegendDot color="bg-[#2563eb]" label={`0`} />
              <LegendDot color="bg-[#0d9488]" label={`${metrics.summary.available + metrics.summary.healthy}`} />
              <LegendDot color="bg-[#d97706]" label={`${metrics.summary.atCapacity}`} />
              <LegendDot color="bg-[#dc2626]" label={`${metrics.summary.overAllocated}`} />
            </div>
          </div>
        </div>

        {/* Toolbar with View Tabs */}
        <div className="flex items-center justify-between px-5 pb-4 gap-3 flex-wrap">
          <div className="flex bg-muted p-1 rounded-lg border border-border">
            <ViewTab icon={LayoutGrid} label="Cards" active={currentView === 'cards'} onClick={() => setCurrentView('cards')} />
            <ViewTab icon={Table2} label="Table" active={currentView === 'table'} onClick={() => setCurrentView('table')} />
            <ViewTab icon={CalendarDays} label="Timeline" active={currentView === 'timeline'} onClick={() => setCurrentView('timeline')} />
            <ViewTab icon={FileStack} label="Scenarios" active={currentView === 'scenarios'} onClick={() => setCurrentView('scenarios')} />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByType)}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="Group by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="assignment">Group by Assignment</SelectItem>
                <SelectItem value="department">Group by Department</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto px-5 pb-5">
          {currentView === 'cards' && (
            <CardsView 
              resources={filteredResources} 
              groupedByAssignment={groupedByAssignment}
              groupBy={groupBy}
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
            />
          )}
          {currentView === 'scenarios' && (
            <ScenariosView />
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
          />
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

// ─────────────────────────────────────────────────────────────────────────────
// Cards View with Assignment Grouping
// ─────────────────────────────────────────────────────────────────────────────
function CardsView({ resources, groupedByAssignment, groupBy, onResourceClick, onEditResource }: { 
  resources: ResourceMetric[]; 
  groupedByAssignment: Record<string, ResourceMetric[]>;
  groupBy: GroupByType;
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
}) {
  if (groupBy === 'assignment') {
    return (
      <div className="space-y-6">
        {Object.entries(groupedByAssignment).map(([assignmentName, assignmentResources]) => (
          <div key={assignmentName} className="space-y-3">
            {/* Group Header */}
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <div className="w-8 h-8 rounded-md bg-[#2563eb] flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">{assignmentName}</span>
              <span className="text-xs text-muted-foreground ml-auto bg-muted px-2.5 py-1 rounded-full">
                {assignmentResources.length} resources
              </span>
            </div>
            
            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignmentResources.map((resource) => (
                <ResourceCard 
                  key={resource.id} 
                  resource={resource} 
                  on360Click={() => onResourceClick(resource)}
                  onCardClick={() => onEditResource(resource.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {resources.map((resource) => (
        <ResourceCard 
          key={resource.id} 
          resource={resource} 
          on360Click={() => onResourceClick(resource)}
          onCardClick={() => onEditResource(resource.id)}
        />
      ))}
    </div>
  );
}

// Resource Card - V5 Design with Button360
function ResourceCard({ resource, on360Click, onCardClick }: { 
  resource: ResourceMetric; 
  on360Click: () => void;
  onCardClick: () => void;
}) {
  const dept = resource.department || 'Unassigned';
  const deptColor = departmentColors[dept] || departmentColors.default;
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
  const assignmentName = resource.assignmentName || 'Unassigned';

  return (
    <div 
      className="bg-card border border-border rounded-lg p-4 hover:border-border-strong hover:shadow-sm transition-all cursor-pointer"
      onClick={onCardClick}
    >
      <div className="flex items-center gap-3">
        {/* Avatar with 360° hover animation */}
        <Avatar360 
          onClick={on360Click}
          size="md"
        />
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{resource.name}</p>
          <p className="text-xs text-muted-foreground truncate">{resource.role}</p>
          {/* Assignment Tag */}
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded uppercase",
              assignmentName === 'Unassigned' 
                ? "bg-muted text-muted-foreground" 
                : "bg-[#4d8b4d] text-white"
            )}>
              {assignmentName}
            </span>
          </div>
        </div>
        
        {/* Allocation */}
        <div className="text-right">
          <p className={cn(
            'text-lg font-bold',
            resource.allocation > 100 ? 'text-[#dc2626]' :
            resource.allocation > 80 ? 'text-[#b45309]' : 'text-[#0d9488]'
          )}>
            {resource.allocation}%
          </p>
          <p className="text-[10px] text-muted-foreground">Allocated</p>
        </div>
      </div>
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
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
  onDeleteResource: (r: ResourceMetric) => void;
  onBulkDelete?: (resources: ResourceMetric[]) => void;
  onBulkEdit?: (resources: ResourceMetric[]) => void;
}

function TableView({ resources, projects, groupBy, groupedByAssignment, onResourceClick, onEditResource, onDeleteResource, onBulkDelete, onBulkEdit }: TableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown';

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
        const dept = row.department || 'Unassigned';
        const deptColor = departmentColors[dept] || departmentColors.default;
        const initials = row.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
        return (
          <div className="flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', deptColor.bg, deptColor.text)}>
              {initials}
            </div>
            <span className="text-sm font-medium text-foreground truncate">{value}</span>
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
        <span className="text-sm text-muted-foreground">{value || '-'}</span>
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
        const deptColor = departmentColors[dept] || departmentColors.default;
        return (
          <span className={cn('text-[11px] font-semibold px-2 py-1 rounded uppercase', deptColor.badge)}>
            {dept}
          </span>
        );
      },
    },
    {
      id: 'allocation',
      header: 'Allocation',
      accessor: 'allocation',
      width: '160px',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold min-w-[40px]">{value}%</span>
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full',
                value > 100 ? 'bg-[#dc2626]' :
                value > 80 ? 'bg-[#d97706]' : 'bg-[#0d9488]'
              )}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'assignments',
      header: 'Assignments',
      accessor: (row: ResourceMetric) => row.assignments.length,
      width: '100px',
      sortable: true,
      render: (value: number) => (
        <span className="text-sm text-muted-foreground text-center block">{value}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: 'id',
      width: '140px',
      sortable: false,
      render: (_: any, row: ResourceMetric) => {
        return (
        <div className="flex items-center justify-end gap-2">
          <Avatar360 
            onClick={() => onResourceClick(row)} 
            size="sm"
          />
          <button 
            onClick={(e) => { e.stopPropagation(); onEditResource(row.id); }}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Edit resource"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteResource(row); }}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Remove from Capacity Planner"
          >
            <Trash2 className="h-4 w-4" />
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

  // Render grouped tables
  const renderGroupedTable = (groupResources: ResourceMetric[], groupName: string) => (
    <div key={groupName} className="space-y-2">
      <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
        <div className="w-8 h-8 rounded-md bg-[#2563eb] flex items-center justify-center">
          <Users className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-foreground">{groupName}</span>
        <span className="text-xs text-muted-foreground ml-auto bg-muted px-2.5 py-1 rounded-full">
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

  return (
    <div className="space-y-3">
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
        <div className="space-y-6">
          {Object.entries(groupedByAssignment).map(([assignmentName, assignmentResources]) => 
            renderGroupedTable(assignmentResources, assignmentName)
          )}
        </div>
      ) : (
        <CatalystEnterpriseTable
          data={resources}
          columns={columns}
          showCheckboxes={true}
          showActionsColumn={false}
          selectedRows={selectedIds}
          onSelectionChange={handleSelectionChange}
          onRowClick={(row) => onResourceClick(row)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline View with Monthly Columns and Grouping Support
// ─────────────────────────────────────────────────────────────────────────────
interface TimelineViewProps {
  resources: ResourceMetric[];
  period: PeriodType;
  groupBy: GroupByType;
  groupedByAssignment: Record<string, ResourceMetric[]>;
}

function TimelineView({ resources, period, groupBy, groupedByAssignment }: TimelineViewProps) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  
  const renderResourceRow = (resource: ResourceMetric) => {
    const dept = resource.department || 'Unassigned';
    const deptColor = departmentColors[dept] || departmentColors.default;
    const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
    
    return (
      <div key={resource.id} className="flex border-b border-border last:border-b-0 hover:bg-muted/20">
        <div className="w-52 px-4 py-3 flex items-center gap-3 border-r border-border shrink-0">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold', deptColor.bg, deptColor.text)}>
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{resource.name}</p>
            <p className="text-xs text-muted-foreground">{resource.role}</p>
          </div>
        </div>
        <div className="flex-1 flex">
          {months.map((month, i) => {
            // Use actual allocation, vary slightly per month for visual
            const baseAlloc = resource.allocation || 0;
            const alloc = Math.max(0, Math.min(150, baseAlloc + Math.floor((Math.random() - 0.5) * 20)));
            return (
              <div 
                key={month}
                className={cn(
                  'flex-1 px-2 py-2.5 flex items-center justify-center border-r border-border last:border-r-0 min-w-20',
                  i === 0 && 'bg-[#2563eb]/5'
                )}
              >
                <span className={cn(
                  'text-[11px] font-semibold px-2.5 py-1 rounded',
                  alloc > 100 ? 'bg-[#dc2626]/10 text-[#dc2626]' :
                  alloc > 80 ? 'bg-[#d97706]/10 text-[#d97706]' : 'bg-[#0d9488]/10 text-[#0d9488]'
                )}>
                  {alloc}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimelineHeader = () => (
    <div className="flex bg-muted/50 border-b border-border sticky top-0 z-10">
      <div className="w-52 px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border shrink-0">
        Resource
      </div>
      <div className="flex-1 flex">
        {months.map((month, i) => (
          <div 
            key={month} 
            className={cn(
              'flex-1 px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground border-r border-border last:border-r-0 min-w-20',
              i === 0 && 'bg-[#2563eb]/5 text-[#2563eb]'
            )}
          >
            {month}
          </div>
        ))}
      </div>
    </div>
  );

  if (groupBy === 'assignment') {
    return (
      <div className="space-y-6">
        {Object.entries(groupedByAssignment).map(([assignmentName, assignmentResources]) => (
          <div key={assignmentName} className="space-y-2">
            {/* Group Header */}
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <div className="w-8 h-8 rounded-md bg-[#2563eb] flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">{assignmentName}</span>
              <span className="text-xs text-muted-foreground ml-auto bg-muted px-2.5 py-1 rounded-full">
                {assignmentResources.length} resources
              </span>
            </div>
            
            {/* Timeline Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {renderTimelineHeader()}
              <div className="max-h-[400px] overflow-y-auto">
                {assignmentResources.map(renderResourceRow)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {renderTimelineHeader()}
      <div className="max-h-[500px] overflow-y-auto">
        {resources.map(renderResourceRow)}
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
// Scenarios View
// ─────────────────────────────────────────────────────────────────────────────
function ScenariosView() {
  const { 
    scenarios, 
    activeScenario, 
    draftScenarios,
    isLoading,
    createScenario,
    activateScenario,
    duplicateScenario,
    createSnapshot,
    restoreSnapshot,
  } = useCapacityScenarios();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompare, setSelectedCompare] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [timeScope, setTimeScope] = useState<'release' | 'custom'>('release');
  const [releaseVersion, setReleaseVersion] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Format scenarios for display
  const displayScenarios = useMemo(() => {
    if (scenarios.length === 0) {
      // Fallback demo data
      return [
        { id: 'SCN-2025-001', fullId: 'demo-1', name: 'Current Plan - Q1 2025', version: 'v1.0', status: 'active' as const, created: '2025-01-02', resources: 26, metrics: { totalResources: 26, available: 4, atCapacity: 19, overAllocated: 3, avgUtilization: 93 } },
        { id: 'SCN-2025-002', fullId: 'demo-2', name: 'Q2 Hiring Plan', version: 'v1.0', status: 'draft' as const, created: '2025-01-10', resources: 26, metrics: { totalResources: 26, available: 7, atCapacity: 19, overAllocated: 1, avgUtilization: 85 } },
      ];
    }
    return scenarios.map(s => ({
      id: s.id.slice(0, 8).toUpperCase(),
      fullId: s.id,
      name: s.name,
      version: 'v1.0',
      status: s.status,
      created: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A',
      resources: s.metrics?.totalResources || 26,
      metrics: s.metrics || { totalResources: 26, available: 4, atCapacity: 19, overAllocated: 3, avgUtilization: 93 },
    }));
  }, [scenarios]);

  const filteredScenarios = displayScenarios.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDisplayScenario = displayScenarios.find(s => s.status === 'active') || displayScenarios[0];
  const compareScenario = selectedCompare ? displayScenarios.find(s => s.fullId === selectedCompare || s.id === selectedCompare) : draftScenarios[0] ? displayScenarios.find(s => s.fullId === draftScenarios[0]?.id) : displayScenarios[1];

  const handleCreateScenario = async () => {
    if (!scenarioName.trim()) {
      toast.error('Scenario name is required');
      return;
    }
    
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    await createScenario.mutateAsync({
      name: scenarioName,
      description: description || undefined,
      time_scope: timeScope,
      start_date: startDate,
      end_date: endDate,
    });
    
    setCreateModalOpen(false);
    setScenarioName('');
    setDescription('');
    setReleaseVersion('');
  };

  const handleViewScenario = (id: string) => {
    toast.info(`Opening scenario details`);
  };

  const handleRestoreSnapshot = async (id: string) => {
    const scenario = displayScenarios.find(s => s.id === id || s.fullId === id);
    if (scenario?.fullId) {
      await restoreSnapshot.mutateAsync(scenario.fullId);
    }
  };

  const handleActivateScenario = async (id: string) => {
    const scenario = displayScenarios.find(s => s.id === id || s.fullId === id);
    if (scenario?.fullId) {
      await activateScenario.mutateAsync(scenario.fullId);
    }
  };

  const handleDuplicateScenario = async (id: string) => {
    const scenario = displayScenarios.find(s => s.id === id || s.fullId === id);
    if (scenario?.fullId) {
      await duplicateScenario.mutateAsync(scenario.fullId);
    }
  };

  const handleCreateSnapshot = async () => {
    if (activeScenario) {
      await createSnapshot.mutateAsync(activeScenario.id);
    } else {
      toast.success('Snapshot created');
    }
  };

  // Calculate comparison deltas
  const getCompareDelta = (current: number, compare: number) => {
    const delta = compare - current;
    if (delta === 0) return null;
    return delta > 0 ? `+${delta}` : `${delta}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#0d9488]/10 text-[#0d9488] uppercase">Active</span>
          <h2 className="text-lg font-semibold text-foreground">{activeDisplayScenario?.name || 'Current Plan'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Scenario
          </Button>
          <Button 
            variant={compareMode ? "default" : "outline"}
            size="sm" 
            className={cn("gap-2", compareMode && "bg-[#2563eb] hover:bg-[#1d4ed8]")}
            onClick={() => setCompareMode(!compareMode)}
          >
            <GitCompare className="h-4 w-4" />
            Compare
          </Button>
        </div>
      </div>

      {/* Compare View */}
      {compareMode && (
        <div className="grid grid-cols-2 gap-5">
          {/* Current Plan Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#0d9488]/10 text-[#0d9488] uppercase">Current</span>
              <h3 className="text-base font-semibold text-foreground">Current Plan</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Total Resources</span>
                <span className="text-sm font-semibold text-foreground">{activeDisplayScenario?.metrics?.totalResources || 26}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Available (&lt;80%)</span>
                <span className="text-sm font-semibold text-foreground">{activeDisplayScenario?.metrics?.available || 4}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">At Capacity</span>
                <span className="text-sm font-semibold text-foreground">{activeDisplayScenario?.metrics?.atCapacity || 19}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Over-allocated</span>
                <span className="text-sm font-semibold text-foreground">{activeDisplayScenario?.metrics?.overAllocated || 3}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Avg Utilization</span>
                <span className="text-sm font-semibold text-foreground">{activeDisplayScenario?.metrics?.avgUtilization || 93}%</span>
              </div>
            </div>
          </div>

          {/* Comparison Scenario Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#d97706]/10 text-[#d97706] uppercase">Draft</span>
                <h3 className="text-base font-semibold text-foreground">{compareScenario?.name || 'Q2 Hiring Plan'}</h3>
              </div>
              {compareScenario && (
                <span className="text-xs font-medium px-2 py-1 rounded-full border border-[#0d9488] text-[#0d9488]">
                  +{Math.round(((compareScenario.metrics?.available || 7) - (activeDisplayScenario?.metrics?.available || 4)) / (activeDisplayScenario?.metrics?.available || 4) * 100)}% capacity
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Total Resources</span>
                <span className="text-sm font-semibold text-foreground">{compareScenario?.metrics?.totalResources || 26}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Available (&lt;80%)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{compareScenario?.metrics?.available || 7}</span>
                  {getCompareDelta(activeDisplayScenario?.metrics?.available || 4, compareScenario?.metrics?.available || 7) && (
                    <span className="text-xs font-medium text-[#0d9488]">{getCompareDelta(activeDisplayScenario?.metrics?.available || 4, compareScenario?.metrics?.available || 7)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">At Capacity</span>
                <span className="text-sm font-semibold text-foreground">{compareScenario?.metrics?.atCapacity || 19}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Over-allocated</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{compareScenario?.metrics?.overAllocated || 1}</span>
                  {getCompareDelta(activeDisplayScenario?.metrics?.overAllocated || 3, compareScenario?.metrics?.overAllocated || 1) && (
                    <span className="text-xs font-medium text-[#0d9488]">{getCompareDelta(activeDisplayScenario?.metrics?.overAllocated || 3, compareScenario?.metrics?.overAllocated || 1)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Avg Utilization</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{compareScenario?.metrics?.avgUtilization || 85}%</span>
                  {getCompareDelta(activeDisplayScenario?.metrics?.avgUtilization || 93, compareScenario?.metrics?.avgUtilization || 85) && (
                    <span className="text-xs font-medium text-[#0d9488]">{getCompareDelta(activeDisplayScenario?.metrics?.avgUtilization || 93, compareScenario?.metrics?.avgUtilization || 85)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scenarios Table */}
      {!compareMode && (
        <div className="grid grid-cols-[340px_1fr] gap-5">
          {/* Active Scenario Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#0d9488]/10 text-[#0d9488] uppercase">Active</span>
              <span className="text-xs text-muted-foreground">v1.0</span>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">{activeDisplayScenario?.name}</h3>
            <p className="text-xs text-muted-foreground mb-4">ID: {activeDisplayScenario?.id} &nbsp;&nbsp; Created: {activeDisplayScenario?.created}</p>
            
            <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{activeDisplayScenario?.metrics?.totalResources || 26}</p>
                <p className="text-[10px] text-muted-foreground">Resources</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{activeDisplayScenario?.metrics?.avgUtilization || 76}% <span className="text-[10px]">Avg</span></p>
                <p className="text-[10px] text-muted-foreground">Util</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">42</p>
                <p className="text-[10px] text-muted-foreground">Assignments</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewScenario(activeDisplayScenario?.id || '')}>View Details</Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={handleCreateSnapshot}>Create Snapshot</Button>
            </div>
          </div>
          
          {/* Scenarios Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Saved Scenarios & Snapshots</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search scenarios..." 
                  className="pl-9 w-48 h-8 text-sm" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">ID</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Version</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Created</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Resources</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScenarios.map((scenario) => (
                  <tr key={scenario.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-5 py-3 text-sm text-[#2563eb] font-medium">{scenario.id}</td>
                    <td className="px-5 py-3 text-sm text-foreground">{scenario.name}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{scenario.version}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-[10px] font-semibold px-2 py-1 rounded uppercase',
                        scenario.status === 'active' && 'bg-[#0d9488]/10 text-[#0d9488]',
                        scenario.status === 'draft' && 'bg-[#d97706]/10 text-[#d97706]',
                        scenario.status === 'snapshot' && 'bg-muted text-muted-foreground'
                      )}>
                        {scenario.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{scenario.created}</td>
                    <td className="px-5 py-3 text-sm text-center text-foreground">{scenario.resources ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleViewScenario(scenario.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {scenario.status === 'snapshot' && (
                          <button 
                            onClick={() => handleRestoreSnapshot(scenario.fullId || scenario.id)}
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Restore"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {scenario.status === 'draft' && (
                          <button 
                            onClick={() => handleActivateScenario(scenario.fullId || scenario.id)}
                            className="w-7 h-7 rounded flex items-center justify-center text-[#0d9488] hover:bg-[#0d9488]/10 transition-colors"
                            title="Activate"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDuplicateScenario(scenario.fullId || scenario.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Scenario Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Scenario Name *</Label>
              <Input 
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Q2 Hiring Plan"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Time Scope</Label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={timeScope === 'release'}
                    onChange={() => setTimeScope('release')}
                    className="w-4 h-4 text-[#2563eb] accent-[#2563eb]"
                  />
                  <span className="text-sm">By Release Version</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={timeScope === 'custom'}
                    onChange={() => setTimeScope('custom')}
                    className="w-4 h-4 text-[#2563eb] accent-[#2563eb]"
                  />
                  <span className="text-sm">Custom Date Range</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Release Version *</Label>
              <Select value={releaseVersion} onValueChange={setReleaseVersion}>
                <SelectTrigger><SelectValue placeholder="Select release..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="v2025.1">v2025.1 - Q1 2025</SelectItem>
                  <SelectItem value="v2025.2">v2025.2 - Q2 2025</SelectItem>
                  <SelectItem value="v2025.3">v2025.3 - Q3 2025</SelectItem>
                  <SelectItem value="v2025.4">v2025.4 - Q4 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of scenario purpose..."
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-border rounded-md bg-background resize-y"
              />
            </div>

            {/* Scenario Preview */}
            <div className="border border-[#2563eb]/30 bg-[#2563eb]/5 rounded-lg p-4">
              <p className="text-xs font-semibold text-[#2563eb] uppercase mb-3">Scenario Preview</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-foreground">26</p>
                  <p className="text-xs text-muted-foreground">Resources</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">--</p>
                  <p className="text-xs text-muted-foreground">Work Items</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">SCN-2025-{(scenarios.length + 1).toString().padStart(3, '0')}</p>
                  <p className="text-xs text-muted-foreground">Scenario ID</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateScenario} 
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
              disabled={createScenario.isPending}
            >
              {createScenario.isPending ? 'Creating...' : 'Create Scenario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  // Save allocation to assignments table
  const saveAllocation = async (newAllocation: number) => {
    setIsSaving(true);
    try {
      // Get the user's active assignments
      const activeAssignments = resource.assignments?.filter(a => a.status === 'active') || [];
      
      if (activeAssignments.length > 0) {
        // Update the first active assignment's allocation
        const { error } = await supabase
          .from('assignments')
          .update({ 
            allocation_percentage: newAllocation,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeAssignments[0].id);
        
        if (error) throw error;
      } else {
        // Create a new assignment if none exists
        const { error } = await supabase
          .from('assignments')
          .insert({
            user_id: resource.id,
            allocation_percentage: newAllocation,
            start_date: new Date().toISOString().split('T')[0],
            status: 'active',
            work_item_type: 'project',
          });
        
        if (error) throw error;
      }
      
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
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
