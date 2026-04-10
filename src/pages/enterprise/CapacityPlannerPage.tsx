import { useEffect, useState, useMemo, useCallback } from 'react';
import '@/styles/resource-allocation-enterprise.css';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageChrome } from '@/components/layout/PageChrome';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Users, Plus, X, RefreshCw, AlertCircle
} from 'lucide-react';
import { useCapacityData, useAssignments, useAiRecommendations, useCapacityDepartments, useResourceManagement, useResourceAssignments, useResourceAllocations, exportCapacityToPdf } from '@/modules/capacity-planner';
import { AllocationModal } from '@/components/resource-allocation';
import type { AllocationResource } from '@/types/resource-allocation.types';
import { getDefaultForecastBoundary } from '@/utils/allocation.utils';

import type { ViewType, ResourceMetric, ResourceAllocation, AllocationBookingInput } from '@/modules/capacity-planner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Resource360Drawer } from '@/components/capacity/resource360/Resource360Drawer';
import { ResourceWorkDrawer } from '@/components/capacity/ResourceWorkDrawer';
import { CapacityAIDrawer } from '@/components/capacity/CapacityAIDrawer';
import { BulkEditModal } from '@/components/capacity/BulkEditModal';

import { SleekCapacityHeader, PrimaryView, ResourceViewMode, ProjectViewMode } from '@/components/capacity/SleekCapacityHeader';
import { CapacityAnalyticsView } from '@/components/capacity/CapacityAnalyticsView';

import { ProjectCapacityView } from '@/components/capacity/ProjectCapacityView';
import { getPeriodRange, navigatePeriod } from '@/components/capacity/ProjectCapacityView/utils';
import { ContractHorizonView } from '@/components/contract-horizon';
import { CapacityPlannerGantt } from '@/components/capacity-planner';
import { CapacityPlannerSkeleton } from '@/components/capacity/CapacityPlannerSkeleton';
import { useCapacityViewStore } from '@/stores/capacityViewStore';
import { CapacityPresentationShell } from '@/components/capacity/CapacityPresentationShell';

// Extracted sub-components
import {
  CardsView,
  TableView,
  EditResourceForm,
  ResourceDrawerContent,
  BookResourceModal,
} from './capacity-planner';
import type { PeriodType, ProjectPeriodType, GroupByType } from './capacity-planner';

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
   const [workDrawerResourceId, setWorkDrawerResourceId] = useState<string | null>(null);
   const [workDrawerResourceName, setWorkDrawerResourceName] = useState<string | undefined>(undefined);
   const [analyticsResourceList, setAnalyticsResourceList] = useState<{ id: string; name: string }[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<ResourceMetric | null>(null);
  const [resourcesToDelete, setResourcesToDelete] = useState<ResourceMetric[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [resourcesToBulkEdit, setResourcesToBulkEdit] = useState<ResourceMetric[]>([]);
  
  // Allocation booking modal state
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [allocationModalResource, setAllocationModalResource] = useState<ResourceMetric | null>(null);

  // Fetch departments, assignments and allocations for views
  const { departments } = useCapacityDepartments();
  const { assignments: resourceAssignments = [] } = useResourceAssignments();
  const { allocations, saveAllocations, getAllocationsForResource } = useResourceAllocations();
  const { updateResourceAssignmentType } = useResourceManagement();

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

  const ganttResourcesMemo = useMemo(() => allGanttResources.map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    department: r.department,
    allocation: r.allocation,
    contractEndDate: (r as any).contract_end_date || (r as any).contractEndDate || null,
    assignmentName: r.assignmentName,
    country_flag_svg: (r as any).country_flag_svg || null,
  })), [allGanttResources]);

  const projectAssignmentsMemo = useMemo(() => resourceAssignments.map(a => ({
    id: a.id,
    name: a.name,
    color: '#3b82f6',
    required_fte: 1,
  })), [resourceAssignments]);

  const projectAllocationsMemo = useMemo(() => allocations.map(a => ({
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
    department: (a as any).department_name || (a as any).department,
  })), [allocations]);

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
  // Supports both profile_id (from cards/table) and resource_inventory.id (from heatmap)
  const handleOpenAllocationModal = useCallback((resourceId: string) => {
    // First try direct match by id (profile_id)
    let resource = metrics.resources.find(r => r.id === resourceId);
    
    // If not found, try matching by resourceInventoryId (from heatmap view)
    if (!resource) {
      resource = metrics.resources.find(r => (r as any).resourceInventoryId === resourceId);
    }
    
    // If still not found, try to fetch from resource_inventory directly
    if (!resource) {
      // Build a minimal resource from the ID for the modal
      // The modal will fetch full details using the resource_inventory.id
      supabase
        .from('resource_inventory')
        .select('id, name, role_name, department_id, vendor_name, contract_start_date, contract_end_date, country_id, location_id')
        .eq('id', resourceId)
        .single()
        .then(({ data }) => {
          if (data) {
            const minimalResource = {
              id: resourceId,
              name: data.name || 'Unknown',
              role: data.role_name || 'Resource',
              department: undefined,
              department_id: data.department_id,
              vendor_name: data.vendor_name,
              contract_start_date: data.contract_start_date,
              contract_end_date: data.contract_end_date,
              allocation: 0,
              assignments: [],
              country: undefined,
              location: undefined,
              avatar_url: undefined,
              resourceInventoryId: resourceId,
              status: 'active',
              email: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as unknown as ResourceMetric;
            setAllocationModalResource(minimalResource);
            setAllocationModalOpen(true);
          } else {
            toast.error('Resource not found');
          }
        });
      return;
    }
    
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
          
          onBookAssignment={() => setResourceModalOpen(true)}
        />

        {/* Main Content */}
        <div className="ra-enterprise-clean flex-1 flex flex-col min-h-0 px-6 py-6 bg-surface-2 dark:bg-surface-1">

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
                  className="flex-1 min-h-0 flex flex-col"
                >
                  <CapacityPlannerGantt 
                    resources={ganttResourcesMemo}
                    allocations={allocations}
                    year={2026}
                    departmentFilter={departmentFilter}
                    onDepartmentChange={setDepartmentFilter}
                    onEditResource={(id) => handleOpenAllocationModal(id)}
                    className="flex-1"
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
                    onResourceClick={(id, name) => { setWorkDrawerResourceId(id); setWorkDrawerResourceName(name); }}
                    searchQuery={searchQuery}
                    hideWidgets={true}
                    onFilteredResourcesChange={setAnalyticsResourceList}
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
                assignments={projectAssignmentsMemo}
                allocations={projectAllocationsMemo}
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
              <ContractHorizonView />
            </motion.div>
          )}

        </div>

        {/* Resource 360° Drawer - New Implementation */}
        <Resource360Drawer 
          resourceId={resource360Id} 
          onClose={() => setResource360Id(null)} 
        />

        {/* Resource Work Items Drawer */}
        <ResourceWorkDrawer
          resourceId={workDrawerResourceId}
          resourceName={workDrawerResourceName}
          onClose={() => { setWorkDrawerResourceId(null); setWorkDrawerResourceName(undefined); }}
          departmentResourceIds={analyticsResourceList}
          onNavigate={(id, name) => { setWorkDrawerResourceId(id); setWorkDrawerResourceName(name); }}
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
        <BookResourceModal
          open={resourceModalOpen}
          onOpenChange={setResourceModalOpen}
          availableUsers={availableUsers}
          resources={resources}
        />

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
            avatarUrl: allocationModalResource.avatar_url,
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

        {/* FAB removed - using CatyFabPlaceholder from App.tsx for unified CATY AI experience */}

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
                  <CapacityPlannerGantt 
                    resources={ganttResourcesMemo}
                    allocations={allocations}
                    year={2026}
                    departmentFilter={departmentFilter}
                    onDepartmentChange={setDepartmentFilter}
                    onEditResource={(id) => setResource360Id(id)}
                    className="flex-1"
                  />
                </div>
              )}
              
              {primaryView === 'resources' && resourceView === 'heatmap' && (
                <CapacityAnalyticsView 
                  departmentFilter={departmentFilter}
                  onDepartmentChange={setDepartmentFilter}
                  onResourceClick={(id, name) => { setWorkDrawerResourceId(id); setWorkDrawerResourceName(name); }}
                  hideWidgets={true}
                  onFilteredResourcesChange={setAnalyticsResourceList}
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
              
            </div>
          </CapacityPresentationShell>
        )}
      </div>
    </PageChrome>
  );
}

// Export with Resource360Drawer wrapper
export { Resource360Drawer };
