import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Users, CheckCircle2, BarChart3, AlertTriangle, TrendingUp, Download, Plus, 
  Search, LayoutGrid, Table2, CalendarDays, GanttChart, FileStack, Bot,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Clock, Eye, Copy, Check, RotateCcw, Play,
  Pencil, Trash2, Cloud, Settings2, ArrowLeftRight, Building2, X, RefreshCw, AlertCircle
} from 'lucide-react';
import { useCapacityData, useAssignments, useAiRecommendations, useCapacityDepartments, useResourceManagement, useResourceAssignments, useResourceAllocations, exportCapacityToPdf } from '@/modules/capacity-planner';
import { AllocationModal } from '@/components/resource-allocation';
import type { AllocationResource } from '@/types/resource-allocation.types';
import { getDefaultForecastBoundary } from '@/utils/allocation.utils';

import type { ViewType, ResourceMetric, CapacityProject, AiRecommendation, ResourceAllocation, AllocationBookingInput } from '@/modules/capacity-planner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Avatar360 } from '@/components/capacity/Avatar360';
import { Resource360Drawer } from '@/components/capacity/resource360/Resource360Drawer';
import { CapacityAIDrawer } from '@/components/capacity/CapacityAIDrawer';
import { CatalystEnterpriseTable, CatalystColumn } from '@/components/industry/CatalystEnterpriseTable';
import { BulkEditModal } from '@/components/capacity/BulkEditModal';
import { DraggableCardsView } from '@/components/capacity/DraggableCardsView';
import { Logo } from '@/components/brand/Logo';

type PeriodType = 'weekly' | 'monthly' | 'quarterly';
type ProjectPeriodType = 'weekly' | 'monthly';
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
import { SleekCapacityHeader, PrimaryView, ResourceViewMode, ProjectViewMode } from '@/components/capacity/SleekCapacityHeader';
import { CompactGroupHeader } from '@/components/capacity/CompactGroupHeader';
import { CompactResourceCard } from '@/components/capacity/CompactResourceCard';
import { CapacityHeatmap } from '@/components/capacity-heatmap';
import { CapacityAnalyticsView, AnalyticsDepartmentTabs } from '@/components/capacity/CapacityAnalyticsView';

import { ProjectCapacityView } from '@/components/capacity/ProjectCapacityView';
import { getPeriodRange, navigatePeriod } from '@/components/capacity/ProjectCapacityView/utils';
import { ContractHorizonView } from '@/components/contract-horizon';
import { BudgetGovernanceView } from '@/components/budget/BudgetGovernanceView';
import { GroupedTableView } from '@/components/capacity/GroupedTableView';
import { ScaleWarningBanner } from '@/components/capacity/ScaleWarningBanner';
import { VirtualizedCardsView } from '@/components/capacity/VirtualizedCardsView';
import { HierarchicalHeatmap } from '@/components/capacity/HierarchicalHeatmap';
import { EnhancedSearch } from '@/components/capacity/EnhancedSearch';
import { EnhancedTimelineView } from '@/components/capacity/timeline';
import { UndoRedoControls } from '@/components/capacity/UndoRedoControls';
import { CapacityPlannerSkeleton } from '@/components/capacity/CapacityPlannerSkeleton';
import { UndoRedoProvider } from '@/contexts/UndoRedoContext';
import { RESOURCE_COLUMN_WIDTH, WEEK_COLUMN_WIDTH, MONTH_COLUMN_WIDTH, QUARTER_COLUMN_WIDTH } from '@/lib/capacity/timeline-columns';
import { useResourceProfiles } from '@/hooks/useResourceProfiles';
import { useCapacityViewStore } from '@/stores/capacityViewStore';
import { CapacityPresentationShell } from '@/components/capacity/CapacityPresentationShell';

// Department colors - Catalyst V5 compliant
const departmentColors: Record<string, { bg: string; text: string; badge: string }> = {
  Product: { bg: 'bg-[#3b82f6]', text: 'text-white', badge: 'bg-[#3b82f6]/15 text-[#2563eb]' },
  Delivery: { bg: 'bg-[#0d9488]', text: 'text-white', badge: 'bg-[#2563eb]/10 text-[#2563eb]' },
  Support: { bg: 'bg-[#10b981]', text: 'text-white', badge: 'bg-[#10b981]/15 text-[#10b981]' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

const projectColors = [
  '#2563eb', // Blue
  '#0d9488', // Teal  
  '#10b981', // Green
  '#3b82f6', // Light Blue
  '#0f766e', // Teal Dark
  '#14b8a6', // Teal Light
];

export default function CapacityPlannerPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { metrics, projects, resources, assignments, isLoading, isFetching, isError, error, refetch } = useCapacityData();
  const [isRetrying, setIsRetrying] = useState(false);
  const { createAssignment, deleteAssignment } = useAssignments();
  const { recommendations, highPriorityCount } = useAiRecommendations({ 
    resources: metrics.resources, 
    projects 
  });
  
  // Edit resource state
  const [editResourceId, setEditResourceId] = useState<string | null>(null);

  // Capacity View Store - source of truth for view state
  const capacityStore = useCapacityViewStore();

  // View state - synced with store
  const [primaryView, setPrimaryViewLocal] = useState<PrimaryView>(capacityStore.primaryView);
  const [resourceView, setResourceViewLocal] = useState<ResourceViewMode>(capacityStore.resourceView);
  const [projectView, setProjectViewLocal] = useState<ProjectViewMode>(capacityStore.projectView);
  const [currentView, setCurrentView] = useState<ViewType>('cards');
  const [period, setPeriodLocal] = useState<PeriodType>(capacityStore.timeline.period);
  const [groupBy, setGroupByLocal] = useState<GroupByType>(capacityStore.filters.groupBy);
  const [searchQuery, setSearchQueryLocal] = useState(capacityStore.filters.searchQuery);
  const [departmentFilter, setDepartmentFilterLocal] = useState<string>(capacityStore.filters.departmentFilter);
  const [activeFilter, setActiveFilterLocal] = useState<'all' | 'available' | 'atCapacity' | 'over'>(capacityStore.filters.activeFilter);
  const [isCollapsed, setIsCollapsedLocal] = useState(capacityStore.ui.isCollapsed);
  const [compactMode, setCompactModeLocal] = useState(capacityStore.ui.compactMode);
  
  // Project period state (for Projects tab)
  const [projectPeriodType, setProjectPeriodType] = useState<ProjectPeriodType>('monthly');
  const [projectCurrentDate, setProjectCurrentDate] = useState(() => new Date(2026, 0, 16));
  
  // Presentation mode from URL or store
  const [presentationMode, setPresentationModeLocal] = useState(false);
  
  // Budget Executive Summary modal state (lifted from BudgetGovernanceView)
  const [budgetExecModalOpen, setBudgetExecModalOpen] = useState(false);

  // Sync local state changes to store
  const setPrimaryView = useCallback((view: PrimaryView) => {
    setPrimaryViewLocal(view);
    capacityStore.setPrimaryView(view);
  }, [capacityStore]);

  const setResourceView = useCallback((view: ResourceViewMode) => {
    setResourceViewLocal(view);
    capacityStore.setResourceView(view);
  }, [capacityStore]);

  const setProjectView = useCallback((view: ProjectViewMode) => {
    setProjectViewLocal(view);
    capacityStore.setProjectView(view);
  }, [capacityStore]);

  const setPeriod = useCallback((p: PeriodType) => {
    setPeriodLocal(p);
    capacityStore.setPeriod(p);
  }, [capacityStore]);

  const setGroupBy = useCallback((g: GroupByType) => {
    setGroupByLocal(g);
    capacityStore.setGroupBy(g);
  }, [capacityStore]);

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryLocal(q);
    capacityStore.setSearchQuery(q);
  }, [capacityStore]);

  const setDepartmentFilter = useCallback((f: string) => {
    setDepartmentFilterLocal(f);
    capacityStore.setDepartmentFilter(f);
  }, [capacityStore]);

  const setActiveFilter = useCallback((f: 'all' | 'available' | 'atCapacity' | 'over') => {
    setActiveFilterLocal(f);
    capacityStore.setActiveFilter(f);
  }, [capacityStore]);

  const setIsCollapsed = useCallback((c: boolean) => {
    setIsCollapsedLocal(c);
    capacityStore.setIsCollapsed(c);
  }, [capacityStore]);

  const setCompactMode = useCallback((c: boolean) => {
    setCompactModeLocal(c);
    capacityStore.setCompactMode(c);
  }, [capacityStore]);

  // Project period range (computed from state)
  const projectPeriodRange = useMemo(() => 
    getPeriodRange(projectCurrentDate, projectPeriodType), 
    [projectCurrentDate, projectPeriodType]
  );

  // Handler for project period navigation
  const handleProjectPeriodNavigate = useCallback((direction: 1 | -1) => {
    setProjectCurrentDate(prev => navigatePeriod(prev, projectPeriodType, direction));
  }, [projectPeriodType]);

  const setPresentationMode = useCallback((mode: boolean) => {
    setPresentationModeLocal(mode);
    capacityStore.setPresentationMode(mode);
    
    // Update URL when entering/exiting presentation mode
    if (mode) {
      const serialized = capacityStore.getSerializedState();
      setSearchParams({ mode: 'present', state: serialized });
    } else {
      // Remove presentation params from URL
      setSearchParams({});
    }
  }, [capacityStore, setSearchParams]);

  // Handle URL-based presentation mode on mount
  useEffect(() => {
    const mode = searchParams.get('mode');
    const state = searchParams.get('state');
    
    if (mode === 'present' && state) {
      // Restore state from URL before first render
      const restored = capacityStore.restoreFromSerializedState(state);
      if (restored) {
        // Sync local state from store
        const storeState = capacityStore.getStateSnapshot();
        setPrimaryViewLocal(storeState.primaryView);
        setResourceViewLocal(storeState.resourceView);
        setProjectViewLocal(storeState.projectView);
        setPeriodLocal(storeState.timeline.period);
        setGroupByLocal(storeState.filters.groupBy);
        setSearchQueryLocal(storeState.filters.searchQuery);
        setDepartmentFilterLocal(storeState.filters.departmentFilter);
        setActiveFilterLocal(storeState.filters.activeFilter);
        setIsCollapsedLocal(storeState.ui.isCollapsed);
        setCompactModeLocal(storeState.ui.compactMode);
        setPresentationModeLocal(true);
      } else {
        // Invalid state, just enter presentation with current defaults
        setPresentationModeLocal(true);
      }
    }
  }, []); // Only run on mount

  // Subscribe to store changes when in presentation mode
  // This ensures tab clicks in the shell update the local state used for rendering
  useEffect(() => {
    if (!presentationMode) return;
    
    const unsubscribe = useCapacityViewStore.subscribe((state) => {
      setPrimaryViewLocal(state.primaryView);
      setResourceViewLocal(state.resourceView);
      setProjectViewLocal(state.projectView);
    });
    
    return () => unsubscribe();
  }, [presentationMode]);
  
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
  
  // Allocation booking modal state
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [allocationModalResource, setAllocationModalResource] = useState<ResourceMetric | null>(null);

  // Add resource form state (simplified - no longer need assignment/allocation, configured via booking modal)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [isAddingResources, setIsAddingResources] = useState(false);
  
  // Booking allocations state for the new modal
  const [bookingAllocations, setBookingAllocations] = useState<{
    id: string;
    assignmentId: string;
    percent: number;
    startDate: string;
    endDate: string;
  }[]>([{
    id: `alloc-${Date.now()}`,
    assignmentId: '',
    percent: 50,
    startDate: new Date().toISOString().split('T')[0],
    endDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0]; })()
  }]);
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');

  // Fetch departments and assignments for the modal
  const { departments } = useCapacityDepartments();
  const { assignments: resourceAssignments = [] } = useResourceAssignments();
  const { allocations, saveAllocations, getAllocationsForResource } = useResourceAllocations();
  const { updateResourceAssignmentType } = useResourceManagement();

  // Auto-select default department when modal opens
  useEffect(() => {
    if (!resourceModalOpen) return;

    if (!selectedDepartmentId && (departments?.length ?? 0) > 0) {
      const delivery = departments?.find((d) => d.name?.toLowerCase() === 'delivery');
      if (delivery) setSelectedDepartmentId(delivery.id);
    }
  }, [resourceModalOpen, departments, selectedDepartmentId]);

  // Get users already assigned in capacity planner
  const assignedUserIds = useMemo(() => {
    return new Set(assignments.map(a => a.user_id));
  }, [assignments]);

  // Available users = all resources minus those already assigned, excluding management roles
  const availableUsers = useMemo(() => {
    return resources.filter(r => {
      if (assignedUserIds.has(r.id)) return false;
      // Only exclude Management roles - they are overheads, not capacity planned
      const roleLower = r.role?.toLowerCase() || '';
      const isManagement = roleLower.includes('management');
      if (isManagement) return false;
      return true;
    });
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
    // Use resourceInventoryId for the drawer since it queries resource_inventory table
    setResource360Id((resource as any).resourceInventoryId || resource.id);
  };

  const currentAllocationByResourceId = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();

    allocations.forEach((a) => {
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      if (allocStart <= now && allocEnd >= now) {
        // Map by both profile_id and resource_id for complete coverage
        if (a.profile_id) {
          map.set(a.profile_id, (map.get(a.profile_id) || 0) + a.allocation_percent);
        }
        if (a.resource_id) {
          map.set(a.resource_id, (map.get(a.resource_id) || 0) + a.allocation_percent);
        }
      }
    });

    return map;
  }, [allocations]);

  // Helper to check if a resource's contract has expired (kept for contract status display, not for filtering)
  const isContractExpired = (resource: ResourceMetric): boolean => {
    if (!resource.contract_end_date) return false;
    const contractEnd = new Date(resource.contract_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return contractEnd < today;
  };

  const filteredResources = useMemo(() => {
    return metrics.resources.filter((r) => {
      // Only exclude Management roles - they are overheads, not capacity planned
      // Show ALL resources regardless of contract expiry status
      const roleLower = r.role?.toLowerCase() || '';
      const isManagement = roleLower.includes('management');
      if (isManagement) return false;

      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.role?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment =
        departmentFilter === 'all' || r.department?.toLowerCase().includes(departmentFilter);

      // Use the SAME status logic as useCapacityData.ts summary:
      // - available: allocation === 0
      // - healthy: 0 < allocation <= 80
      // - at_capacity: 80 < allocation <= 100
      // - over_allocated: allocation > 100
      const currentAllocation =
        currentAllocationByResourceId.get(r.id) ?? (r.allocation || 0);

      let matchesFilter = true;
      if (activeFilter === 'available') {
        // Available = 0% allocation (no contract expiry check)
        matchesFilter = currentAllocation === 0;
      } else if (activeFilter === 'atCapacity') {
        // At Capacity = 80-100% (no contract expiry check)
        matchesFilter = currentAllocation > 80 && currentAllocation <= 100;
      } else if (activeFilter === 'over') {
        // Over-allocated = >100% (no contract expiry check)
        matchesFilter = currentAllocation > 100;
      }

      return matchesSearch && matchesDepartment && matchesFilter;
    });
  }, [
    metrics.resources,
    searchQuery,
    departmentFilter,
    activeFilter,
    currentAllocationByResourceId,
  ]);

  // All resources - same as filteredResources (no longer filtering by contract expiry)
  const activeResources = filteredResources;

  // All plannable resources for all tabs - Only exclude Management roles
  const allGanttResources = useMemo(() => {
    return metrics.resources.filter((r) => {
      // Only exclude Management roles - they are overheads, not capacity planned
      const roleLower = r.role?.toLowerCase() || '';
      const isManagement = roleLower.includes('management');
      if (isManagement) return false;
      
      // Apply only search filter (no status or department filters)
      const matchesSearch = searchQuery 
        ? r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.role?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      
      return matchesSearch;
    });
  }, [metrics.resources, searchQuery]);

  // Get unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const depts = new Set(metrics.resources.map(r => r.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [metrics.resources]);

  // Department tabs for Resources/Gantt views (same as Utilization tab)
  const DEPARTMENT_ORDER = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Governance'];
  
  const resourceDepartmentTabs = useMemo(() => {
    // Get plannable resources (exclude Management roles only)
    const plannableResources = metrics.resources.filter(r => {
      const roleLower = r.role?.toLowerCase() || '';
      return !roleLower.includes('management');
    });
    
    const deptCounts = new Map<string, number>();
    let total = 0;
    
    plannableResources.forEach(r => {
      const dept = r.department || 'Other';
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
      total++;
    });

    const tabs = [{ id: 'all', name: 'All Departments', count: total }];
    
    DEPARTMENT_ORDER.forEach(deptName => {
      const count = deptCounts.get(deptName);
      if (count !== undefined) {
        tabs.push({ id: deptName.toLowerCase(), name: deptName, count });
      }
    });

    // Add any other departments not in the predefined order
    deptCounts.forEach((count, name) => {
      if (!DEPARTMENT_ORDER.includes(name) && name !== 'Other') {
        tabs.push({ id: name.toLowerCase(), name, count });
      }
    });

    // Add 'Other' at the end if it exists
    const otherCount = deptCounts.get('Other');
    if (otherCount !== undefined) {
      tabs.push({ id: 'other', name: 'Other', count: otherCount });
    }

    return tabs;
  }, [metrics.resources]);

  // Group resources by assignment type - using resource_allocations table for multi-assignment support
  // Uses activeResources (excludes expired contracts) for Allocations/Gantt views
  // FIXED: Only use CURRENT MONTH allocations to avoid duplicate grouping
  const groupedByAssignment = useMemo(() => {
    const groups: Record<string, ResourceMetric[]> = {};
    
    // Initialize all active assignment types as empty arrays (so all swim lanes show)
    resourceAssignments.forEach((a) => {
      if (a.name) groups[a.name] = [];
    });
    // Always have Unassigned lane
    groups['Unassigned'] = [];
    
    // Filter allocations to CURRENT MONTH only
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const currentMonthAllocations = allocations.filter(alloc => {
      const allocStart = new Date(alloc.start_date);
      const allocEnd = new Date(alloc.end_date);
      return allocStart <= currentMonthEnd && allocEnd >= currentMonthStart;
    });
    
    // Build a map of profile_id -> CURRENT MONTH allocations only
    const allocationsByProfileId = new Map<string, { assignmentName: string; percent: number }[]>();
    currentMonthAllocations.forEach((alloc) => {
      if (!alloc.profile_id || !alloc.assignment_name) return;
      const existing = allocationsByProfileId.get(alloc.profile_id) || [];
      existing.push({ assignmentName: alloc.assignment_name, percent: alloc.allocation_percent });
      allocationsByProfileId.set(alloc.profile_id, existing);
    });
    
    // Populate with ACTIVE resources only (excludes expired contracts)
    activeResources.forEach((r) => {
      const resourceAllocations = allocationsByProfileId.get(r.id) || [];
      
      if (resourceAllocations.length > 0) {
        // Resource has entries in resource_allocations table for current month - add to each assigned column
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
  }, [activeResources, resourceAssignments, allocations]);

  // Group resources by department - uses activeResources (excludes expired contracts)
  const groupedByDepartment = useMemo(() => {
    const groups: Record<string, ResourceMetric[]> = {};
    
    // Initialize all departments as empty arrays (so all swim lanes show)
    departments?.forEach((d) => {
      if (d.name) groups[d.name] = [];
    });
    // Always have Unassigned lane
    groups['Unassigned'] = [];
    
    // Populate with ACTIVE resources only (excludes expired contracts)
    activeResources.forEach((r) => {
      const deptName = r.department || 'Unassigned';
      if (!groups[deptName]) groups[deptName] = [];
      groups[deptName].push(r);
    });
    return groups;
  }, [activeResources, departments]);

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
  
  // Handler to open allocation booking modal
  const handleOpenAllocationModal = useCallback((resourceId: string) => {
    const resource = metrics.resources.find(r => r.id === resourceId);
    if (resource) {
      setAllocationModalResource(resource);
      setAllocationModalOpen(true);
    }
  }, [metrics.resources]);

  // Handler to save allocations from modal
  const handleSaveAllocations = useCallback(async (resourceId: string, allocationInputs: AllocationBookingInput[]) => {
    await saveAllocations.mutateAsync({ resourceId, allocations: allocationInputs });
  }, [saveAllocations]);

  // Handler to update resource department
  const handleUpdateDepartment = useCallback(async (resourceId: string, departmentId: string | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ department_id: departmentId })
      .eq('id', resourceId);
    
    if (error) {
      toast.error(`Failed to update department: ${error.message}`);
      throw error;
    }
    toast.success('Department updated');
  }, []);

  // Get allocations for a specific resource - CURRENT MONTH ONLY
  // Match by both profile_id OR resource_id to handle resources without linked profiles
  const getResourceAllocations = useCallback((resourceId: string, resourceInventoryId?: string): ResourceAllocation[] => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return allocations.filter(a => {
      // Match resource
      const matchesResource = a.profile_id === resourceId || 
        a.resource_id === resourceId ||
        (resourceInventoryId && a.resource_id === resourceInventoryId);
      if (!matchesResource) return false;
      
      // Filter to CURRENT MONTH only
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= currentMonthEnd && allocEnd >= currentMonthStart;
    });
  }, [allocations]);

  // Calculate BASE summary stats from ALL resources (not filtered by status)
  // This ensures the header stat chips always show the full counts, not filtered counts
  // IMPORTANT: Excludes expired contracts from counts
  const baseSummary = useMemo(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let available = 0;
    let atCapacity = 0;
    let over = 0;
    let totalUtilization = 0;

    // Filter only by search and department, NOT by activeFilter (status)
    // Also exclude expired contracts from summary counts
    const baseResources = metrics.resources.filter((r) => {
      // Only exclude Management roles - they are overheads, not capacity planned
      const roleLower = r.role?.toLowerCase() || '';
      const isManagement = roleLower.includes('management');
      if (isManagement) return false;

      // Exclude expired contracts from summary counts
      if (r.contract_end_date) {
        const contractEnd = new Date(r.contract_end_date);
        if (contractEnd < today) return false;
      }

      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.role?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment =
        departmentFilter === 'all' || r.department?.toLowerCase() === departmentFilter;

      return matchesSearch && matchesDepartment;
    });

    baseResources.forEach(resource => {
      // Use the same allocation calculation as filteredResources
      const currentAllocation = currentAllocationByResourceId.get(resource.id) ?? (resource.allocation || 0);
      totalUtilization += Math.min(currentAllocation, 100);

      // Use the SAME thresholds as the filter logic:
      // - available: allocation === 0
      // - atCapacity: 80 < allocation <= 100
      // - over: allocation > 100
      if (currentAllocation > 100) {
        over++;
      } else if (currentAllocation > 80) {
        atCapacity++;
      } else if (currentAllocation === 0) {
        available++;
      }
      // Note: resources with 0 < allocation <= 80 are "healthy" (not shown as a filter option)
    });

    const utilizationPercentage = baseResources.length > 0 
      ? Math.round(totalUtilization / baseResources.length) 
      : 0;

    return {
      total: baseResources.length,
      available,
      atCapacity,
      over,
      utilizationPercentage,
    };
  }, [metrics.resources, searchQuery, departmentFilter, currentAllocationByResourceId]);

  // Handle retry for error state
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await refetch();
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setIsRetrying(false);
    }
  }, [refetch]);

  // Only show loading state on initial load, not during background refetches (e.g., after DnD)
  const hasData = resources.length > 0 || metrics.resources.length > 0;
  if (isLoading && !hasData) {
    return (
      <PageChrome hideHeader>
        <div className="flex flex-col h-full bg-[hsl(var(--background))]">
          {/* Skeleton Header */}
          <div className="bg-card border-b border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-20 bg-muted rounded animate-pulse" />
                <div className="h-7 w-28 bg-primary/20 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                  <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Skeleton Content */}
          <div className="flex-1 p-6">
            <CapacityPlannerSkeleton view="cards" count={8} />
          </div>
        </div>
      </PageChrome>
    );
  }

  // Error state
  if (isError && !hasData) {
    return (
      <PageChrome hideHeader>
        <div className="flex flex-col h-full bg-[hsl(var(--background))]">
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-8">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Failed to load capacity data
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-6">
              {(error as Error)?.message || 'Something went wrong while loading. Please try again.'}
            </p>
            <Button onClick={handleRetry} disabled={isRetrying} className="transition-transform active:scale-95">
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome hideHeader>
      <div className="capacity-module flex flex-col h-full bg-[hsl(var(--background))] relative">
        {/* Header - Enterprise Grade */}
        <SleekCapacityHeader
          summary={{
            total: baseSummary.total,
            available: baseSummary.available,
            atCapacity: baseSummary.atCapacity,
            over: baseSummary.over,
            utilizationPercentage: baseSummary.utilizationPercentage,
          }}
          primaryView={primaryView}
          resourceView={resourceView}
          projectView={projectView}
          onPrimaryViewChange={(view) => {
            // FIX #3: Tab coupling - Projects tab only allows Cards view
            if (view === 'projects' && resourceView !== 'cards') {
              setResourceView('cards');
              setCurrentView('cards');
            }
            setPrimaryView(view);
          }}
          onResourceViewChange={(view) => {
            // FIX #3: Tab coupling - Timeline/Heatmap should auto-switch to Resources
            if (primaryView === 'projects' && (view === 'timeline' || view === 'heatmap' || view === 'table')) {
              setPrimaryView('resources');
            }
            setResourceView(view);
            if (view !== 'heatmap') {
              setCurrentView(view as ViewType);
            }
          }}
          onProjectViewChange={setProjectView}
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
          onExport={handleExport}
          onPresentationMode={() => setPresentationMode(true)}
          onFilterChange={setActiveFilter}
          onDepartmentFilterChange={setDepartmentFilter}
          projectPeriodType={projectPeriodType}
          projectPeriodRange={projectPeriodRange}
          onProjectPeriodTypeChange={setProjectPeriodType}
          onProjectPeriodNavigate={handleProjectPeriodNavigate}
          onRefresh={handleRetry}
          isRefreshing={isRetrying || isFetching}
          onExecutiveSummary={() => setBudgetExecModalOpen(true)}
          onBookAssignment={() => setAddModalOpen(true)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 px-6 py-6 bg-surface-2 dark:bg-surface-1">

          {/* Resources Primary View */}
          {primaryView === 'resources' && (
            <div className="flex flex-col gap-4">
              {/* Department tabs are now built into CapacityAnalyticsView for all resource views */}
              
            <AnimatePresence mode="wait">
              {/* Empty State - show based on view type: table uses filteredResources, others use activeResources */}
              {((resourceView === 'table' && filteredResources.length === 0) || 
                (resourceView !== 'table' && activeResources.length === 0)) && (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center justify-center py-20 px-8 bg-card rounded-xl border border-border"
                >
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No resources found
                  </h3>
                  <p className="text-muted-foreground text-center max-w-sm mb-6">
                    {resourceView === 'table' 
                      ? 'No resources match your current filters. Try adjusting your search criteria or clearing filters.'
                      : 'No active resources found. Resources with expired contracts are only visible in the Resources and Contracts tabs.'}
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery('');
                        setDepartmentFilter('all');
                        setActiveFilter('all');
                        toast.info('Filters cleared', { description: 'Showing all resources.' });
                      }}
                      className="transition-transform active:scale-95"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                    <Button onClick={() => setResourceModalOpen(true)} className="bg-primary transition-transform active:scale-95">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Resource
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Cards View (Allocations) - uses activeResources (excludes expired contracts) */}
              {activeResources.length > 0 && resourceView === 'cards' && (
                <motion.div
                  key={`cards-${searchQuery}-${departmentFilter}-${activeFilter}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardsView 
                    resources={activeResources} 
                    groupedByAssignment={groupedByAssignment}
                    groupedByDepartment={groupedByDepartment}
                    groupBy={groupBy}
                    isCollapsed={isCollapsed}
                    compactMode={compactMode}
                    allocations={allocations}
                    onResourceClick={openResourceDrawer}
                    onEditResource={handleOpenAllocationModal}
                  />
                </motion.div>
              )}
              {/* Table View - Uses CapacityAnalyticsView with heatmap styling */}
              {resourceView === 'table' && (
                <motion.div
                  key={`table-${searchQuery}-${departmentFilter}-${activeFilter}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CapacityAnalyticsView 
                    departmentFilter={departmentFilter}
                    onDepartmentChange={setDepartmentFilter}
                    onResourceClick={(id) => handleOpenAllocationModal(id)}
                    searchQuery={searchQuery}
                    hideWidgets={true}
                  />
                </motion.div>
              )}
              {/* Timeline View (Gantt) - Uses CapacityAnalyticsView with heatmap styling */}
              {resourceView === 'timeline' && (
                <motion.div
                  key={`timeline-${searchQuery}-${departmentFilter}-${activeFilter}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CapacityAnalyticsView 
                    departmentFilter={departmentFilter}
                    onDepartmentChange={setDepartmentFilter}
                    onResourceClick={(id) => handleOpenAllocationModal(id)}
                    searchQuery={searchQuery}
                    hideWidgets={true}
                  />
                </motion.div>
              )}
              {/* Heatmap View */}
              {resourceView === 'heatmap' && (
                <motion.div
                  key={`analytics-${searchQuery}-${departmentFilter}-${activeFilter}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CapacityAnalyticsView 
                    departmentFilter={departmentFilter}
                    onDepartmentChange={setDepartmentFilter}
                    onResourceClick={(id) => handleOpenAllocationModal(id)}
                    searchQuery={searchQuery}
                    hideWidgets={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          )}

          {/* Projects Primary View - Catalyst View 2 */}
          {primaryView === 'projects' && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProjectCapacityView
                assignments={resourceAssignments.map(a => ({
                  id: a.id,
                  name: a.name,
                  color: '#3b82f6', // Default blue color
                  required_fte: 1 // Default requirement
                }))}
                allocations={allocations.map(a => ({
                  id: a.id,
                  resource_id: a.resource_id,
                  profile_id: a.profile_id,
                  resource_name: (a as any).resource_inventory?.name || (a as any).resource_name,
                  profile_name: (a as any).profile_name,
                  role_name: (a as any).resource_inventory?.role_name || (a as any).role_name,
                  assignment_id: a.assignment_id,
                  assignment_name: (a as any).resource_assignments?.name || (a as any).assignment_name,
                  allocation_percent: a.allocation_percent,
                  allocation_type: (a as any).allocation_type || 'committed',
                  start_date: a.start_date,
                  end_date: a.end_date,
                  department: (a as any).department_name || (a as any).department
                }))}
                periodType={projectPeriodType}
                periodRange={projectPeriodRange}
                searchQuery={searchQuery}
                onResourceClick={(id) => setResource360Id(id)}
              />
            </motion.div>
          )}

          {/* Contracts Primary View */}
          {primaryView === 'contracts' && (
            <motion.div
              key="contracts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <CapacityAnalyticsView 
                departmentFilter={departmentFilter}
                onDepartmentChange={setDepartmentFilter}
                searchQuery={searchQuery}
                onResourceClick={(id) => setResource360Id(id)}
              />
            </motion.div>
          )}

          {/* Budget Primary View */}
          {primaryView === 'budget' && (
            <motion.div
              key="budget"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <BudgetGovernanceView 
                execModalOpen={budgetExecModalOpen} 
                onExecModalClose={() => setBudgetExecModalOpen(false)} 
              />
            </motion.div>
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

        {/* Book Resource Allocation Modal */}
        <Dialog open={resourceModalOpen} onOpenChange={(open) => {
          setResourceModalOpen(open);
          if (!open) {
            setSelectedUserId(null);
            setSelectedDepartmentId('');
            setBookingAllocations([{ id: `alloc-${Date.now()}`, assignmentId: '', percent: 50, startDate: new Date().toISOString().split('T')[0], endDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0]; })() }]);
            setResourceSearchQuery('');
          }
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b border-border -mx-6 px-6 pt-0">
              <DialogTitle>Book Resource Allocation</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select team members and configure their project allocations with date ranges
              </p>
            </DialogHeader>
            <div className="space-y-6 py-4 overflow-y-auto flex-1 -mx-6 px-6">
              {/* Step 1: Select User */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Select User</Label>
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name or role..."
                    value={resourceSearchQuery}
                    onChange={(e) => setResourceSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-[200px] border border-border rounded-lg">
                  {(() => {
                    const filteredUsers = availableUsers.filter(u => 
                      u.name?.toLowerCase().includes(resourceSearchQuery.toLowerCase()) ||
                      u.role?.toLowerCase().includes(resourceSearchQuery.toLowerCase())
                    );
                    if (filteredUsers.length === 0) {
                      return (
                        <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                          {availableUsers.length === 0 ? 'All users are already in Capacity Planner' : 'No users match your search'}
                        </div>
                      );
                    }
                    return (
                    <div className="divide-y divide-border">
                      {filteredUsers.map((user) => {
                        const isSelected = selectedUserId === user.id;
                        const initials = user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                              isSelected ? 'bg-[#2563eb]/10 border-l-2 border-l-[#2563eb]' : 'hover:bg-muted/50'
                            )}
                          >
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-[#2563eb] text-white"
                            >
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.role || 'No role'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{user.department || 'Unassigned'}</span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#2563eb] flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    );
                  })()}
                </ScrollArea>
              </div>
              
              {/* Department */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Department</Label>
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

              {/* Divider */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">Assignments</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setBookingAllocations([...bookingAllocations, {
                        id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        assignmentId: '',
                        percent: 50,
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0]; })()
                      }]);
                    }}
                    className="gap-1 h-8 text-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
                  >
                    <Plus className="h-3 w-3" />
                    Add Assignment
                  </Button>
                </div>

                {/* Allocation Blocks */}
                <div className="space-y-4">
                  {bookingAllocations.map((alloc, index) => {
                    const assignmentName = resourceAssignments.find(a => a.id === alloc.assignmentId)?.name || '';
                    const color = assignmentName ? getAssignmentColor(assignmentName) : '#94a3b8';
                    
                    return (
                      <div key={alloc.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                        {/* Row 1: Assignment + Percentage + Delete */}
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Assignment</Label>
                            <Select 
                              value={alloc.assignmentId} 
                              onValueChange={(v) => {
                                const updated = [...bookingAllocations];
                                updated[index] = { ...updated[index], assignmentId: v };
                                setBookingAllocations(updated);
                              }}
                            >
                              <SelectTrigger className="bg-card mt-1">
                                <SelectValue placeholder="Select assignment..." />
                              </SelectTrigger>
                              <SelectContent className="bg-card border border-border shadow-lg z-50">
                                {resourceAssignments.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getAssignmentColor(a.name || '') }} />
                                      {a.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Label className="text-xs text-muted-foreground">Allocation %</Label>
                            <div className="relative mt-1">
                              <Input
                                type="number"
                                min={5}
                                max={100}
                                step={5}
                                value={alloc.percent}
                                onChange={(e) => {
                                  const updated = [...bookingAllocations];
                                  updated[index] = { ...updated[index], percent: parseInt(e.target.value) || 0 };
                                  setBookingAllocations(updated);
                                }}
                                className="text-center pr-6"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                          {bookingAllocations.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setBookingAllocations(bookingAllocations.filter((_, i) => i !== index))}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Row 2: Date Range */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Start Date</Label>
                            <Input
                              type="date"
                              value={alloc.startDate}
                              onChange={(e) => {
                                const updated = [...bookingAllocations];
                                updated[index] = { ...updated[index], startDate: e.target.value };
                                setBookingAllocations(updated);
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">End Date</Label>
                            <Input
                              type="date"
                              value={alloc.endDate}
                              onChange={(e) => {
                                const updated = [...bookingAllocations];
                                updated[index] = { ...updated[index], endDate: e.target.value };
                                setBookingAllocations(updated);
                              }}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {/* Row 3: Quick Duration Buttons */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Quick:</span>
                          {[
                            { label: '2 weeks', weeks: 2 },
                            { label: '1 month', weeks: 4 },
                            { label: '2 months', weeks: 9 },
                            { label: '3 months', weeks: 13 },
                          ].map(({ label, weeks }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => {
                                const start = new Date(alloc.startDate || new Date());
                                const end = new Date(start);
                                end.setDate(end.getDate() + (weeks * 7) - 1);
                                const updated = [...bookingAllocations];
                                updated[index] = { ...updated[index], endDate: end.toISOString().split('T')[0] };
                                setBookingAllocations(updated);
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* Row 4: Preview Bar */}
                        {assignmentName && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Preview</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(alloc.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(alloc.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <div 
                              className="h-6 rounded flex items-center px-2 text-xs font-medium text-white"
                              style={{ 
                                backgroundColor: color,
                                width: `${Math.min(100, alloc.percent)}%`
                              }}
                            >
                              {assignmentName} ({alloc.percent}%)
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total Allocation Summary */}
                {(() => {
                  const hasSelectedUser = !!selectedUserId;
                  // Only count allocations where an assignment is selected
                  const total = bookingAllocations.reduce((sum, a) => sum + (a.assignmentId ? (a.percent || 0) : 0), 0);
                  const isOver = total > 100;
                  const statusColor = isOver ? '#d97706' : total === 100 ? '#2563eb' : '#0d9488';
                  const statusBg = isOver ? 'rgba(217,119,6,0.08)' : total === 100 ? 'rgba(37,99,235,0.08)' : 'rgba(13,148,136,0.08)';
                  
                  if (!hasSelectedUser) {
                    return (
                      <div className="mt-4 p-4 rounded-lg bg-muted/50 text-center">
                        <span className="text-sm text-muted-foreground">Select a user to configure allocation</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: statusBg }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Allocation Summary</span>
                        <span className="text-xs font-semibold" style={{ color: statusColor }}>{total}% allocated</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, total)}%`,
                            backgroundColor: statusColor
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">{Math.max(0, 100 - total)}% available</span>
                        <span className="text-xs text-muted-foreground">Target: 100%</span>
                      </div>
                      {isOver && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Over-allocated by {total - 100}%
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResourceModalOpen(false)}>Cancel</Button>
              <Button 
                disabled={!selectedUserId || isAddingResources || !selectedDepartmentId}
                onClick={async () => {
                  if (!selectedDepartmentId) {
                    toast.error('Please select a department');
                    return;
                  }
                  if (!selectedUserId) {
                    toast.error('Please select a user');
                    return;
                  }

                  setIsAddingResources(true);
                  try {
                    const startDate = new Date().toISOString().split('T')[0];
                    const userById = new Map<string, ResourceMetric>(resources.map((r) => [r.id, r] as [string, ResourceMetric]));
                    const userId = selectedUserId;

                    // Create assignment for the user
                    const { error: assignmentError } = await (supabase as any).from('assignments').insert({
                      user_id: userId,
                      project_id: null,
                      allocation_percentage: 0,
                      start_date: startDate,
                      status: 'active',
                      work_item_type: 'project',
                    });
                    if (assignmentError) throw assignmentError;

                    // Update department
                    const { error: profileError } = await supabase
                      .from('profiles')
                      .update({ department_id: selectedDepartmentId })
                      .eq('id', userId);
                    if (profileError) throw profileError;

                    // Create resource_inventory entry and allocations
                    const name = userById.get(userId)?.name;
                    if (name) {
                      // Check/create resource_inventory entry
                      let { data: existing } = await supabase
                        .from('resource_inventory')
                        .select('id')
                        .eq('profile_id', userId)
                        .maybeSingle();

                      if (!existing) {
                        const { data: newResource } = await supabase.from('resource_inventory').insert({
                          profile_id: userId,
                          name,
                          is_active: true,
                        }).select('id').single();
                        existing = newResource;
                      }

                      // Create resource_allocations for each booking allocation
                      if (existing) {
                        const validAllocations = bookingAllocations.filter(a => a.assignmentId);
                        if (validAllocations.length > 0) {
                          await supabase.from('resource_allocations').insert(
                            validAllocations.map(a => ({
                              resource_id: existing.id,
                              profile_id: userId,
                              assignment_id: a.assignmentId,
                              allocation_percent: a.percent,
                              start_date: a.startDate,
                              end_date: a.endDate,
                            }))
                          );
                        }
                      }
                    }

                    queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
                    queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
                    queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });

                    const selectedUser = userById.get(userId);
                    toast.success(
                      `Added ${selectedUser?.name || 'resource'} with allocations configured.`
                    );

                    setResourceModalOpen(false);
                    setSelectedUserId(null);
                    setSelectedDepartmentId('');
                    setResourceSearchQuery('');
                    setBookingAllocations([{ id: `alloc-${Date.now()}`, assignmentId: '', percent: 50, startDate: new Date().toISOString().split('T')[0], endDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0]; })() }]);
                  } catch (error: any) {
                    toast.error(`Failed to add resource: ${error?.message ?? 'Unknown error'}`);
                  } finally {
                    setIsAddingResources(false);
                  }
                }} 
                className="bg-[#2563eb] hover:bg-[#1d4ed8]"
              >
                {isAddingResources ? 'Booking...' : 'Book Resource'}
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

        {/* Resource Allocation Modal - Weekly Grid View */}
        {allocationModalOpen && allocationModalResource && (() => {
          // Map ResourceMetric to AllocationResource
          // CRITICAL: Use resourceInventoryId (not profile_id) for database queries to resource_allocations
          const initials = allocationModalResource.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          const resourceInventoryId = (allocationModalResource as any).resourceInventoryId || allocationModalResource.id;
          const allocationResource: AllocationResource = {
            id: resourceInventoryId, // Use resource_inventory.id for querying allocations
            name: allocationModalResource.name,
            initials,
            role: allocationModalResource.role || 'Resource',
            department: allocationModalResource.department || 'Delivery',
            vendor: allocationModalResource.vendor_name || 'Internal',
            country: allocationModalResource.country || 'Saudi Arabia',
            location: allocationModalResource.location || 'On-site',
            contractStart: allocationModalResource.contract_start_date || new Date().toISOString().split('T')[0],
            contractEnd: allocationModalResource.contract_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            forecastBoundary: getDefaultForecastBoundary(),
            profileId: allocationModalResource.id, // Keep profile_id for profile-related operations
          };
          return (
            <AllocationModal 
              resource={allocationResource}
              onClose={() => {
                setAllocationModalOpen(false);
                setAllocationModalResource(null);
              }}
            />
          );
        })()}

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

        {/* Presentation Mode Fullscreen Overlay */}
        {presentationMode && (
          <CapacityPresentationShell
            onExit={() => setPresentationMode(false)}
            onExport={handleExport}
          >
            <div className="h-full w-full p-4 flex flex-col">
              {/* Render the EXACT current view based on primaryView and resourceView state */}
              
              {/* Resources Primary View */}
              {primaryView === 'resources' && resourceView === 'cards' && (
                <CardsView
                  resources={activeResources}
                  groupedByAssignment={groupedByAssignment}
                  groupedByDepartment={groupedByDepartment}
                  groupBy={groupBy}
                  isCollapsed={false}
                  compactMode={true}
                  allocations={allocations}
                  onResourceClick={() => {}}
                  onEditResource={() => {}}
                />
              )}
              
              {primaryView === 'resources' && resourceView === 'table' && (
                <TableView 
                  resources={filteredResources}
                  projects={projects}
                  groupBy={groupBy}
                  groupedByAssignment={groupedByAssignment}
                  groupedByDepartment={groupedByDepartment}
                  allocations={allocations}
                  onResourceClick={() => {}}
                  onEditResource={() => {}}
                  onDeleteResource={() => {}}
                  onBulkDelete={() => {}}
                  onBulkEdit={() => {}}
                />
              )}
              
              {primaryView === 'resources' && resourceView === 'timeline' && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <EnhancedTimelineView 
                    resources={allGanttResources.map(r => ({
                      id: r.id,
                      name: r.name,
                      role: r.role,
                      department: r.department,
                      allocation: r.allocation,
                      contractEndDate: (r as any).contract_end_date || (r as any).contractEndDate || null,
                      assignmentName: r.assignmentName,
                    }))} 
                    allocations={allocations}
                    year={2026}
                    onEditResource={() => {}}
                    groupBy={groupBy}
                    groupedByAssignment={Object.fromEntries(
                      Object.entries(groupedByAssignment).map(([key, resources]) => [
                        key,
                        resources.map(r => ({
                          id: r.id,
                          name: r.name,
                          role: r.role,
                          department: r.department,
                          allocation: r.allocation,
                          contractEndDate: (r as any).contract_end_date || (r as any).contractEndDate || null,
                          assignmentName: r.assignmentName,
                        }))
                      ])
                    )}
                    className="flex-1"
                  />
                </div>
              )}
              
              {primaryView === 'resources' && resourceView === 'heatmap' && (
                <CapacityAnalyticsView 
                  departmentFilter={departmentFilter}
                  onDepartmentChange={setDepartmentFilter}
                  onResourceClick={(id) => setResource360Id(id)}
                  hideWidgets={true}
                />
              )}
              
              {/* Projects Primary View - Now using Catalyst View 2 */}
              {primaryView === 'projects' && (
                <ProjectCapacityView
                  assignments={resourceAssignments.map(a => ({
                    id: a.id,
                    name: a.name,
                    color: '#3b82f6',
                    required_fte: 1
                  }))}
                  allocations={allocations.map(a => ({
                    id: a.id,
                    resource_id: a.resource_id,
                    profile_id: a.profile_id,
                    resource_name: (a as any).resource_inventory?.name || (a as any).resource_name,
                    profile_name: (a as any).profile_name,
                    role_name: (a as any).resource_inventory?.role_name || (a as any).role_name,
                    assignment_id: a.assignment_id,
                    assignment_name: (a as any).resource_assignments?.name || (a as any).assignment_name,
                    allocation_percent: a.allocation_percent,
                    allocation_type: 'committed' as const,
                    start_date: a.start_date,
                    end_date: a.end_date,
                    department: (a as any).department_name || (a as any).department
                  }))}
                  periodType={projectPeriodType}
                  periodRange={projectPeriodRange}
                  searchQuery={searchQuery}
                  onResourceClick={(id) => setResource360Id(id)}
                />
              )}
              
              {/* Contracts Primary View */}
              {primaryView === 'contracts' && (
                <CapacityAnalyticsView 
                  departmentFilter={departmentFilter}
                  onDepartmentChange={setDepartmentFilter}
                  searchQuery={searchQuery}
                  onResourceClick={(id) => setResource360Id(id)}
                />
              )}
              
              {/* Budget Primary View */}
              {primaryView === 'budget' && (
                <BudgetGovernanceView />
              )}
            </div>
          </CapacityPresentationShell>
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
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
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
  allocations = [],
  onResourceClick, 
  onEditResource 
}: { 
  resources: ResourceMetric[]; 
  groupedByAssignment: Record<string, ResourceMetric[]>;
  groupedByDepartment: Record<string, ResourceMetric[]>;
  groupBy: GroupByType;
  isCollapsed?: boolean;
  compactMode?: boolean;
  allocations?: ResourceAllocation[];
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
}) {
  // Helper to get allocations for a specific resource - CURRENT MONTH ONLY
  // Match by profile_id OR resource_id since some resources don't have linked profiles
  const getResourceAllocations = (resourceId: string, resourceInventoryId?: string) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return allocations.filter(a => {
      const matchesResource = a.profile_id === resourceId || 
        a.resource_id === resourceId ||
        (resourceInventoryId && a.resource_id === resourceInventoryId);
      if (!matchesResource) return false;
      
      // Filter to CURRENT MONTH only
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= currentMonthEnd && allocEnd >= currentMonthStart;
    });
  };

  // Helper to calculate total allocation from actual allocations - only for CURRENT period
  const getTotalAllocationForResource = (resourceId: string, resourceInventoryId?: string): number => {
    const now = new Date();
    const resourceAllocations = allocations.filter(a => {
      const matchesResource = a.profile_id === resourceId || 
        a.resource_id === resourceId ||
        (resourceInventoryId && a.resource_id === resourceInventoryId);
      if (!matchesResource) return false;
      // Only count allocations that are active NOW (overlap with today)
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= now && allocEnd >= now;
    });
    return resourceAllocations.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
  };
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
          <div key={assignmentName} className="space-y-3 pb-4 border-b border-border last:border-b-0">
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
                    totalAllocation={getTotalAllocationForResource(resource.id, (resource as any).resourceInventoryId)}
                    allocations={getResourceAllocations(resource.id, (resource as any).resourceInventoryId)}
                    country_flag_svg={(resource as any).country_flag_svg}
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
            <div key={deptName} className="space-y-3 pb-4 border-b border-border last:border-b-0">
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
                      totalAllocation={getTotalAllocationForResource(resource.id, (resource as any).resourceInventoryId)}
                      allocations={getResourceAllocations(resource.id, (resource as any).resourceInventoryId)}
                      country_flag_svg={(resource as any).country_flag_svg}
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
          totalAllocation={getTotalAllocationForResource(resource.id, (resource as any).resourceInventoryId)}
          allocations={getResourceAllocations(resource.id, (resource as any).resourceInventoryId)}
          country_flag_svg={(resource as any).country_flag_svg}
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
      className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-border/80 hover:shadow-sm transition-all"
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
  allocations?: ResourceAllocation[];
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
  onDeleteResource: (r: ResourceMetric) => void;
  onBulkDelete?: (resources: ResourceMetric[]) => void;
  onBulkEdit?: (resources: ResourceMetric[]) => void;
}

function TableView({ resources, projects, groupBy, groupedByAssignment, groupedByDepartment, allocations = [], onResourceClick, onEditResource, onDeleteResource, onBulkDelete, onBulkEdit }: TableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { getProfile } = useResourceProfiles();
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown';

  // Helper to get assignment names from allocations for a resource
  const getAssignmentNamesForResource = useCallback((resourceId: string): string[] => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const resourceAllocations = allocations.filter((a) => {
      const matchesResource = a.profile_id === resourceId || a.resource_id === resourceId;
      if (!matchesResource) return false;

      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= currentMonthEnd && allocEnd >= currentMonthStart;
    });
    const names = resourceAllocations
      .map(a => a.assignment_name)
      .filter((name): name is string => !!name);
    return [...new Set(names)]; // Unique names
  }, [allocations]);

  // Contract ring styles helper
  const getRingStyle = (status: string) => {
    const ringStyles: Record<string, string> = {
      healthy: 'ring-[#0d9488]',
      warning: 'ring-[#ca8a04]',
      critical: 'ring-[#be123c]',
      expired: 'ring-muted-foreground/40',
      permanent: 'ring-muted-foreground/30'
    };
    return ringStyles[status] || 'ring-muted-foreground/30';
  };

  // Sort resources by vendor first, then assignment name from allocations
  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) => {
      const aVendor = a.vendor_name || '';
      const bVendor = b.vendor_name || '';
      
      // First sort by vendor (empty vendors at the end)
      if (!aVendor && bVendor) return 1;
      if (aVendor && !bVendor) return -1;
      if (aVendor !== bVendor) return aVendor.localeCompare(bVendor);
      
      // Then sort by assignment name from allocations
      const aNames = getAssignmentNamesForResource(a.id);
      const bNames = getAssignmentNamesForResource(b.id);
      const aName = aNames[0] || a.assignmentName || 'Unassigned';
      const bName = bNames[0] || b.assignmentName || 'Unassigned';
      if (aName === 'Unassigned' && bName !== 'Unassigned') return 1;
      if (bName === 'Unassigned' && aName !== 'Unassigned') return -1;
      return aName.localeCompare(bName);
    });
  }, [resources, getAssignmentNamesForResource]);

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
      width: '240px',
      sortable: true,
      render: (value: string, row: ResourceMetric) => {
        const initials = row.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
        const profile = getProfile(row.id);
        
        // Location detection - check for onsite/offshore
        const locationName = row.location || profile?.location || '';
        const locationLower = locationName.toLowerCase();
        const isOnsite = locationLower.includes('onsite') || locationLower.includes('riyadh');
        const isOffshore = locationLower.includes('offshore');

        // Use design tokens (no hardcoded colors)
        const avatarBgClass = isOnsite ? 'bg-brand-teal' : 'bg-brand-primary';
        const locLabel = isOnsite ? 'Onsite' : isOffshore ? 'Off-Shore' : locationName;
        const locLabelClass = isOnsite ? 'text-brand-teal' : 'text-brand-primary';
        
        // Country flag
        const countryCode = row.country_code || profile?.country_code;
        const countryName = row.country || profile?.country;
        const flagUrl = countryCode 
          ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`
          : null;
        
        // Online status indicator
        const isOnline = true; // Assume online for demo
        
        return (
          <div className="flex items-center gap-3">
            {/* Avatar with flag overlay and country tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative flex-shrink-0 cursor-pointer">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white ${avatarBgClass}`}
                  >
                    {initials}
                  </div>
                  {/* Flag overlay */}
                  {flagUrl && (
                    <span 
                      className="absolute -bottom-0.5 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                    >
                      <img 
                        src={flagUrl} 
                        alt={countryName || ''} 
                        className="w-3.5 h-3.5 object-cover rounded-sm"
                      />
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-900 text-white text-xs font-medium px-2.5 py-1.5">
                {countryName || 'Unknown Country'}
              </TooltipContent>
            </Tooltip>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[14px] text-[#0f172a] dark:text-foreground truncate">{value}</span>
                {/* Online indicator */}
                {isOnline && (
                  <span className="w-2 h-2 rounded-full bg-[#059669] flex-shrink-0" />
                )}
              </div>
              {/* Location label */}
              {locLabel && (
                <span className={`text-[11px] font-bold tracking-wide ${locLabelClass}`}>
                  {locLabel}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'vendor',
      header: 'Vendor',
      accessor: (row: ResourceMetric) => row.vendor_name || '',
      width: '80px',
      sortable: true,
      filterable: true,
      filterOptions: (() => {
        const uniqueVendors = new Set<string>();
        resources.forEach(r => {
          if (r.vendor_name) uniqueVendors.add(r.vendor_name);
        });
        return Array.from(uniqueVendors).sort().map(v => ({ value: v, label: v }));
      })(),
      render: (_: any, row: ResourceMetric) => {
        const vendor = row.vendor_name;
        if (!vendor) {
          return <span className="text-[13px] text-[#475569]">-</span>;
        }
        return (
          <span className="text-[13px] font-medium text-[#334155]">{vendor}</span>
        );
      },
    },
    {
      id: 'assignments',
      header: 'Assignment (Monthly)',
      accessor: (row: ResourceMetric) => {
        const names = getAssignmentNamesForResource(row.id);
        return names.length > 0 ? names.join(', ') : (row.assignmentName || 'Unassigned');
      },
      width: '300px',
      sortable: true,
      render: (_: any, row: ResourceMetric) => {
        // Get allocations with percentages (CURRENT MONTH ONLY)
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const resourceAllocations = allocations.filter((a) => {
          const matchesResource = a.profile_id === row.id || a.resource_id === row.id;
          if (!matchesResource) return false;

          const allocStart = new Date(a.start_date);
          const allocEnd = new Date(a.end_date);
          return allocStart <= currentMonthEnd && allocEnd >= currentMonthStart;
        });
        
        if (resourceAllocations.length === 0) {
          return (
            <span className="text-[13px] font-medium text-[#475569]">No assignments this month</span>
          );
        }
        
        // Show assignment tags with left accent bar
        return (
          <div className="flex flex-col gap-1.5">
            {resourceAllocations.slice(0, 3).map((alloc, idx) => {
              // Determine if committed or forecast based on dates (forecast if start_date is in the future)
              const now = new Date();
              const startDate = new Date(alloc.start_date);
              const isCommitted = startDate <= now;
              const accentColor = isCommitted ? '#2563eb' : '#f59e0b'; // Blue for committed, Amber for forecast
              const pctColor = isCommitted ? '#2563eb' : '#92400e';
              
              return (
                <span 
                  key={idx}
                  className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded bg-white text-[13px] font-medium text-[#334155]"
                  style={{ 
                    border: '1px solid #e2e8f0',
                    borderLeftWidth: '3px',
                    borderLeftColor: accentColor,
                  }}
                >
                  <span className="truncate max-w-[160px]">{alloc.assignment_name}</span>
                  <span className="font-bold text-[12px]" style={{ color: pctColor }}>
                    {alloc.allocation_percent}%
                  </span>
                </span>
              );
            })}
            {resourceAllocations.length > 3 && (
              <span className="text-[11px] text-[#64748b]">+{resourceAllocations.length - 3} more</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Role',
      accessor: 'role',
      width: '130px',
      sortable: true,
      render: (value: string) => (
        <span className="text-[13px] font-medium text-[#334155] dark:text-slate-300">{value || '-'}</span>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      accessor: 'department',
      width: '110px',
      sortable: true,
      filterable: true,
      filterOptions: [
        { value: 'Product', label: 'Product' },
        { value: 'Delivery', label: 'Delivery' },
        { value: 'Operations', label: 'Operations' },
        { value: 'Support', label: 'Support' },
        { value: 'Unassigned', label: 'Unassigned' },
      ],
      render: (value: string) => {
        const dept = value || 'Unassigned';
        const deptUpper = dept.toUpperCase();
        
        // Department-specific colors from style guide
        const deptStyles: Record<string, { bg: string; text: string }> = {
          'OPERATIONS': { bg: 'rgba(13,148,136,0.15)', text: '#115e59' },
          'PRODUCT': { bg: 'rgba(109,40,217,0.12)', text: '#6d28d9' },
          'DELIVERY': { bg: 'rgba(14,116,144,0.12)', text: '#0e7490' },
          'SUPPORT': { bg: 'rgba(16,185,129,0.12)', text: '#059669' },
        };
        
        const style = deptStyles[deptUpper] || { bg: 'rgba(100,116,139,0.12)', text: '#475569' };
        
        return (
          <span
            className="inline-block px-2.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: style.bg, color: style.text }}
          >
            {dept}
          </span>
        );
      },
    },
    {
      id: 'contractEndDate',
      header: 'Contract End',
      accessor: (row: ResourceMetric) => row.contract_end_date || null,
      width: '110px',
      sortable: true,
      render: (_: any, row: ResourceMetric) => {
        const endDate = row.contract_end_date;
        
        if (!endDate) {
          return <span className="text-[13px] text-[#334155]">Permanent</span>;
        }
        
        const endDateObj = new Date(endDate);
        const now = new Date();
        const diffTime = endDateObj.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const formatted = endDateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        const tooltipText = daysRemaining > 0 
          ? `${daysRemaining} days remaining` 
          : daysRemaining === 0 
            ? 'Expires today' 
            : `Expired ${Math.abs(daysRemaining)} days ago`;
        
        // Calculate status based on days remaining - Catalyst V1 style guide
        // Critical: < 30 days (#b91c1c), Warning: 30-90 days (#92400e), Safe: > 90 days (#334155)
        const status = daysRemaining <= 0 ? 'expired' : daysRemaining < 30 ? 'critical' : daysRemaining < 90 ? 'warning' : 'safe';
        const textColors: Record<string, string> = {
          critical: '#b91c1c',
          warning: '#92400e', 
          safe: '#334155',
          expired: '#64748b',
        };
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                className="text-[13px] font-semibold cursor-help"
                style={{ color: textColors[status] }}
              >
                {formatted}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-medium">
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: 'id',
      width: '80px',
      sortable: false,
      render: (_: any, row: ResourceMetric) => {
        return (
        <div className="flex items-center gap-0.5">
          {/* Edit */}
          <button 
            onClick={(e) => { e.stopPropagation(); onEditResource(row.id); }}
            className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
            title="Edit resource"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {/* Delete */}
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteResource(row); }}
            className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
            title="Remove from Capacity Planner"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        );
      },
    },
  ], [projects, onResourceClick, onEditResource, onDeleteResource, getProfile, getAssignmentNamesForResource, resources, allocations]);

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
          className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
          style={{ borderLeftWidth: '4px', borderLeftColor: theme.accent }}
        >
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: theme.accent }}
          >
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: theme.accent }}>{groupName}</span>
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
  };

  // Render grouped tables for department - REDESIGNED with assignment colors
  const renderDepartmentGroupedTable = (groupResources: ResourceMetric[], deptName: string) => {
    const deptColor = departmentColors[deptName] || departmentColors.default;
    return (
      <div key={deptName} className="space-y-2">
        <div 
          className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
          style={{ borderLeftWidth: '4px', borderLeftColor: CATALYST.blue.primary }}
        >
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", deptColor.bg)}>
            <Building2 className={cn("h-4 w-4", deptColor.text)} />
          </div>
          <span className="text-sm font-semibold text-foreground">{deptName}</span>
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
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
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
// Catalyst V5 Colors: Teal, Blue, Orange, Red (NO olive/bronze/gold/champagne)
// ─────────────────────────────────────────────────────────────────────────────

// FILLED project colors for Timeline bars — Catalyst V5 compliant
const TIMELINE_PROJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Senaei BAU': { bg: '#2563eb', text: '#ffffff' },       // Blue
  'Senaei': { bg: '#2563eb', text: '#ffffff' },           // Blue
  'Innovation Platform': { bg: '#1d4ed8', text: '#ffffff' }, // Blue Dark
  'Innovation': { bg: '#1d4ed8', text: '#ffffff' },       // Blue Dark
  'Inspection Project': { bg: '#0d9488', text: '#ffffff' }, // Teal
  'Inspection': { bg: '#0d9488', text: '#ffffff' },       // Teal
  'International Relations': { bg: '#0f766e', text: '#ffffff' }, // Teal Dark
  'International': { bg: '#0f766e', text: '#ffffff' },    // Teal Dark
  'MIM Website': { bg: '#14b8a6', text: '#ffffff' },      // Teal Light
  'MIM': { bg: '#14b8a6', text: '#ffffff' },              // Teal Light
  'Senaei OPS': { bg: '#3b82f6', text: '#ffffff' },       // Blue Light
  'Sectorial Services': { bg: '#64748b', text: '#ffffff' }, // Slate
  'Sectorial': { bg: '#64748b', text: '#ffffff' },        // Slate
  'Tahommena': { bg: '#0d9488', text: '#ffffff' },        // Teal
  'Data Platform': { bg: '#3b82f6', text: '#ffffff' },    // Blue Light
  'Data': { bg: '#3b82f6', text: '#ffffff' },             // Blue Light
  'ICP': { bg: '#2563eb', text: '#ffffff' },              // Blue
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
  allocations?: ResourceAllocation[];
  onEditResource?: (id: string) => void;
}

function TimelineView({ resources, period, groupBy, groupedByAssignment, groupedByDepartment, allocations = [], onEditResource }: TimelineViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isGroupExpanded = (name: string) => expandedGroups[name] === true;

  // Generate periods based on selected period type - dynamic from current date to Dec 26, 2026
  const periods = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const endDate = new Date(2026, 11, 26); // December 26, 2026
    
    if (period === 'monthly') {
      // Calculate months from current month to December 2026
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const months: { label: string; key: string }[] = [];
      let year = currentYear;
      let monthIndex = currentMonth;
      
      while (year < 2026 || (year === 2026 && monthIndex <= 11)) {
        const shortYear = String(year).slice(-2);
        months.push({
          label: `${monthNames[monthIndex]} '${shortYear}`,
          key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        });
        monthIndex++;
        if (monthIndex > 11) {
          monthIndex = 0;
          year++;
        }
      }
      return months;
    }
    if (period === 'quarterly') {
      // Calculate quarters from current quarter to Q4 2026
      const quarters: { label: string; key: string }[] = [];
      let year = currentYear;
      let quarterIndex = Math.floor(currentMonth / 3);
      
      while (year < 2026 || (year === 2026 && quarterIndex <= 3)) {
        const shortYear = String(year).slice(-2);
        quarters.push({
          label: `Q${quarterIndex + 1} '${shortYear}`,
          key: `${year}-Q${quarterIndex + 1}`,
        });
        quarterIndex++;
        if (quarterIndex > 3) {
          quarterIndex = 0;
          year++;
        }
      }
      return quarters;
    }
    // Weekly - from current week to December 26, 2026
    const weekLabels: { label: string; key: string }[] = [];
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay()); // Sunday start
    
    let weekNum = 1;
    let weekDate = new Date(startOfCurrentWeek);
    
    while (weekDate <= endDate) {
      const weekMonth = weekDate.toLocaleString('en-US', { month: 'short' });
      const weekDay = weekDate.getDate();
      const weekYear = String(weekDate.getFullYear()).slice(-2);
      weekLabels.push({
        label: `${weekMonth} ${weekDay} '${weekYear}`,
        key: `${weekDate.getFullYear()}-W${String(weekNum).padStart(2, '0')}`,
      });
      weekDate.setDate(weekDate.getDate() + 7);
      weekNum++;
    }
    return weekLabels;
  }, [period]);

  // Build a map of resourceId -> allocations from the time-boxed allocations
  // Index by BOTH profile_id AND resource_id to ensure lookups work regardless of key used
  const allocationsByResource = useMemo(() => {
    const map = new Map<string, ResourceAllocation[]>();
    allocations.forEach((a) => {
      // Add by profile_id if present
      if (a.profile_id) {
        if (!map.has(a.profile_id)) {
          map.set(a.profile_id, []);
        }
        map.get(a.profile_id)!.push(a);
      }
      // Also add by resource_id if different from profile_id
      if (a.resource_id && a.resource_id !== a.profile_id) {
        if (!map.has(a.resource_id)) {
          map.set(a.resource_id, []);
        }
        map.get(a.resource_id)!.push(a);
      }
    });
    return map;
  }, [allocations]);

  // Get allocations for a resource that overlap with a specific period
  const getResourceAllocationsForPeriod = useCallback((resourceId: string, periodStart: Date, periodEnd: Date) => {
    const resourceAllocations = allocationsByResource.get(resourceId) || [];
    return resourceAllocations.filter((a) => {
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      // Check overlap
      return allocStart <= periodEnd && allocEnd >= periodStart;
    });
  }, [allocationsByResource]);

  // Calculate total allocation for a period
  const getTotalAllocationForPeriod = useCallback((resourceId: string, periodStart: Date, periodEnd: Date) => {
    const periodAllocations = getResourceAllocationsForPeriod(resourceId, periodStart, periodEnd);
    return periodAllocations.reduce((sum, a) => sum + a.allocation_percent, 0);
  }, [getResourceAllocationsForPeriod]);

  // Check if resource has any time-boxed allocations
  const hasTimeBoxedAllocations = allocations.length > 0;

  // FIX #1: Use fixed pixel widths for column alignment
  const columnWidth = period === 'weekly' ? WEEK_COLUMN_WIDTH : period === 'monthly' ? MONTH_COLUMN_WIDTH : QUARTER_COLUMN_WIDTH;

  // Explicit pixel template (no repeat/fr units) to avoid rounding drift.
  const gridTemplateColumns = `${RESOURCE_COLUMN_WIDTH}px ${Array.from({ length: periods.length }, () => `${columnWidth}px`).join(' ')}`;
  const totalWidth = RESOURCE_COLUMN_WIDTH + (periods.length * columnWidth);

  const renderTimelineHeader = () => (
    <div 
      className="grid bg-muted/50 dark:bg-surface-3 border-b border-border sticky top-0 z-10"
      style={{ 
        gridTemplateColumns, 
        width: totalWidth, 
        minWidth: totalWidth,
        borderLeftWidth: '3px',
        borderLeftColor: 'transparent'
      }}
    >
      <div className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">
        Resource
      </div>
      {periods.map((p, i) => (
        <div 
          key={p.key} 
          className={cn(
            'px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground border-r border-border last:border-r-0',
            i === 0 && 'bg-primary/5 text-primary'
          )}
        >
          {p.label}
        </div>
      ))}
    </div>
  );

  // Calculate period date ranges once for all resources
  const periodDateRanges = useMemo(() => {
    const now = new Date();
    return periods.map((p, colIdx) => {
      let periodStart: Date;
      let periodEnd: Date;

      if (period === 'monthly') {
        const monthIndex = (now.getMonth() + colIdx) % 12;
        const year = now.getFullYear() + Math.floor((now.getMonth() + colIdx) / 12);
        periodStart = new Date(year, monthIndex, 1);
        periodEnd = new Date(year, monthIndex + 1, 0);
      } else if (period === 'quarterly') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterIndex = (currentQuarter + colIdx) % 4;
        const year = now.getFullYear() + Math.floor((currentQuarter + colIdx) / 4);
        periodStart = new Date(year, quarterIndex * 3, 1);
        periodEnd = new Date(year, (quarterIndex + 1) * 3, 0);
      } else {
        const startOfCurrentWeek = new Date(now);
        startOfCurrentWeek.setDate(now.getDate() - now.getDay());
        periodStart = new Date(startOfCurrentWeek);
        periodStart.setDate(startOfCurrentWeek.getDate() + colIdx * 7);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
      }

      // Normalize to full-day range so date-only strings (YYYY-MM-DD) match reliably
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setHours(23, 59, 59, 999);

      return { ...p, start: periodStart, end: periodEnd };
    });
  }, [periods, period]);

  // Calculate Gantt bar position for an allocation - pixel-precise version
  const calculateGanttBar = useCallback((alloc: ResourceAllocation) => {
    const allocStart = new Date(alloc.start_date);
    const allocEnd = new Date(alloc.end_date);
    
    // Normalize allocation dates to full-day range
    allocStart.setHours(0, 0, 0, 0);
    allocEnd.setHours(23, 59, 59, 999);
    
    // Find start column index
    let startColIndex = periodDateRanges.findIndex(p => 
      allocStart >= p.start && allocStart <= p.end
    );
    if (startColIndex === -1 && allocStart < periodDateRanges[0].start) {
      startColIndex = 0; // Starts before visible range
    }
    if (startColIndex === -1) {
      // Allocation starts after visible range
      return null;
    }
    
    // Find end column index
    let endColIndex = periodDateRanges.findIndex(p => 
      allocEnd >= p.start && allocEnd <= p.end
    );
    if (endColIndex === -1 && allocEnd > periodDateRanges[periodDateRanges.length - 1].end) {
      endColIndex = periodDateRanges.length - 1; // Ends after visible range
    }
    if (endColIndex === -1) {
      // Allocation ends before visible range
      return null;
    }
    
    // Ensure startColIndex <= endColIndex
    if (startColIndex > endColIndex) {
      return null;
    }
    
    // Calculate pixel-precise left offset within first column
    const startPeriod = periodDateRanges[startColIndex];
    const periodDuration = startPeriod.end.getTime() - startPeriod.start.getTime();
    const allocStartInPeriod = Math.max(allocStart.getTime(), startPeriod.start.getTime());
    const leftOffsetRatio = (allocStartInPeriod - startPeriod.start.getTime()) / periodDuration;
    const leftOffset = leftOffsetRatio * columnWidth;
    
    // Calculate pixel-precise width
    const endPeriod = periodDateRanges[endColIndex];
    const endPeriodDuration = endPeriod.end.getTime() - endPeriod.start.getTime();
    const allocEndInPeriod = Math.min(allocEnd.getTime(), endPeriod.end.getTime());
    const rightOffsetRatio = (allocEndInPeriod - endPeriod.start.getTime()) / endPeriodDuration;
    const rightOffset = rightOffsetRatio * columnWidth;
    
    // Total width: (full columns in between) + (partial start) + (partial end)
    const span = endColIndex - startColIndex + 1;
    let barWidth: number;
    if (startColIndex === endColIndex) {
      // Bar fits within single column
      barWidth = (rightOffsetRatio - leftOffsetRatio) * columnWidth;
    } else {
      // Bar spans multiple columns
      const startColRemainder = (1 - leftOffsetRatio) * columnWidth;
      const endColPortion = rightOffsetRatio * columnWidth;
      const middleColumns = (span - 2) * columnWidth;
      barWidth = startColRemainder + middleColumns + endColPortion;
    }
    
    // Minimum width for visibility
    barWidth = Math.max(barWidth, 60);
    
    return { startColIndex, endColIndex, span, leftOffset, barWidth };
  }, [periodDateRanges, columnWidth]);

  const renderResourceRow = (resource: ResourceMetric, assignmentName: string, isEven: boolean) => {
    const theme = getAssignmentTheme(assignmentName);
    const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
    
    // Get all allocations for this resource
    const resourceAllocations = allocationsByResource.get(resource.id) || [];
    
    // Calculate Gantt bars for each allocation
    const ganttBars = resourceAllocations
      .map(alloc => {
        const position = calculateGanttBar(alloc);
        if (!position) return null;
        return { alloc, ...position };
      })
      .filter((bar): bar is NonNullable<typeof bar> => bar !== null);

    // Determine which columns are covered by allocations
    const coveredColumns = new Set<number>();
    ganttBars.forEach(bar => {
      for (let i = bar.startColIndex; i <= bar.endColIndex; i++) {
        coveredColumns.add(i);
      }
    });

    // Calculate total allocation per period for warning display
    const periodTotals = periodDateRanges.map((pdr, idx) => {
      const periodAllocs = resourceAllocations.filter(a => {
        const allocStart = new Date(a.start_date);
        const allocEnd = new Date(a.end_date);
        return allocStart <= pdr.end && allocEnd >= pdr.start;
      });
      return periodAllocs.reduce((sum, a) => sum + a.allocation_percent, 0);
    });

    const legacyTotal = resource.allocation || 0;
    const allocTheme = getAllocationTheme(legacyTotal);
    const isUnassigned = assignmentName === 'Unassigned' || !assignmentName;

    return (
      <div 
        key={resource.id} 
        className={cn(
          "grid border-b border-border last:border-b-0 hover:bg-muted/50",
          isEven && "bg-muted/30"
        )}
        style={{ 
          gridTemplateColumns: gridTemplateColumns, 
          width: totalWidth,
          minWidth: totalWidth,
          borderLeftWidth: '3px', 
          borderLeftColor: allocTheme.bar 
        }}
      >
        {/* Resource Info */}
        <div className="px-4 py-3 flex items-center gap-3 border-r border-border">
          <div className="relative shrink-0">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: theme.accent }}
            >
              {initials}
            </div>
            {resource.country_flag_svg && (
              <img 
                src={resource.country_flag_svg} 
                alt={resource.country || ''} 
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-5 object-cover rounded-sm border border-background shadow-sm"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{resource.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{resource.role || 'Team Member'}</p>
          </div>
        </div>

        {/* Timeline Cells - One per period */}
        {periods.map((p, colIdx) => {
          const isCurrentPeriod = colIdx === 0;
          const isOver = periodTotals[colIdx] > 100;
          
          // Find bars that cover this column
          const barsInColumn = ganttBars.filter(bar => 
            colIdx >= bar.startColIndex && colIdx <= bar.endColIndex
          );
          
          // Only render bar on its start column
          const barsStartingHere = ganttBars.filter(bar => bar.startColIndex === colIdx);

          return (
            <div 
              key={p.key}
              className={cn(
                'relative border-r border-border last:border-r-0 min-h-[60px] py-2 px-0',
                isCurrentPeriod && 'bg-primary/5',
                isOver && 'bg-warning/10'
              )}
            >
              {isOver && (
                <div className="absolute top-1 right-1 z-10">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#2563eb]" />
                </div>
              )}
              
              {/* Render bars that START in this column - pixel-precise positioning */}
              {barsStartingHere.map((bar, idx) => {
                const projectName = bar.alloc.assignment_name || 'Allocation';
                const projectColor = getTimelineProjectColor(projectName);
                const tooltipText = `${projectName}: ${bar.alloc.allocation_percent}% (${new Date(bar.alloc.start_date).toLocaleDateString()} – ${new Date(bar.alloc.end_date).toLocaleDateString()})`;
                
                // Use pixel-precise positioning from calculateGanttBar
                const leftPx = bar.leftOffset || 0;
                const widthPx = bar.barWidth || (bar.span * columnWidth);
                
                // Committed = project color, Forecast = transparent with dotted border
                const isForecast = bar.alloc.status === 'forecast';

                return (
                  <div
                    key={bar.alloc.id || idx}
                    className="absolute h-7 rounded flex items-center px-3 text-[11px] font-semibold cursor-pointer hover:opacity-90 transition-opacity z-10"
                    style={{
                      top: 8 + idx * 32,
                      left: leftPx,
                      width: widthPx,
                      backgroundColor: isForecast ? 'transparent' : projectColor.bg,
                      color: isForecast ? projectColor.bg : projectColor.text,
                      border: isForecast ? `3px dotted ${projectColor.bg}` : 'none',
                      boxSizing: 'border-box',
                      boxShadow: !isForecast ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                    }}
                    title={`${isForecast ? '[Forecast] ' : ''}${tooltipText}`}
                    onClick={() => onEditResource?.(resource.id)}
                  >
                    <span className="truncate">
                      {projectName} ({bar.alloc.allocation_percent}%)
                    </span>
                  </div>
                );
              })}
              
            </div>
          );
        })}
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
          className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg hover:shadow-sm transition-all"
          style={{ borderLeftWidth: '4px', borderLeftColor: theme.accent }}
        >
          <div className="flex items-center gap-3">
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
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
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {groupResources.length} resources
          </span>
        </button>

        {/* Timeline Table - header outside scroll container to prevent overlap */}
        {isExpanded && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <div style={{ width: totalWidth, minWidth: totalWidth }}>
                {/* Sticky header outside the vertical scroll */}
                {renderTimelineHeader()}
                {/* Scrollable rows */}
                <div className="max-h-[400px] overflow-y-auto">
                  {groupResources.map((r, i) => renderResourceRow(r, groupName, i % 2 === 0))}
                </div>
              </div>
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
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
  
  // No grouping - header outside scroll container to prevent overlap
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ width: totalWidth, minWidth: totalWidth }}>
            {/* Sticky header outside the vertical scroll */}
            {renderTimelineHeader()}
            {/* Scrollable rows */}
            <div className="max-h-[500px] overflow-y-auto">
              {resources.map((r, i) => renderResourceRow(r, r.assignmentName || 'Unassigned', i % 2 === 0))}
            </div>
          </div>
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
        className="flex items-center gap-4 p-5 rounded-xl text-primary-foreground bg-gradient-to-r from-primary via-primary/90 to-primary/70"
      >
        <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
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
          className="gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold"
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
