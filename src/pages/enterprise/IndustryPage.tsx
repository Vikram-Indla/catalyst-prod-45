import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, Filter, Maximize2, Minimize2 } from 'lucide-react';
import { FilterDemandsDialog, SmartFilters } from '@/components/business-requests/FilterDemandsDialog';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { RankUpdateNotification } from '@/components/business-requests/RankUpdateNotification';
import { SimpleColumnHeader, SortDirection } from '@/components/business-requests/SimpleColumnHeader';
import { useResizableColumns } from '@/components/business-requests/ResizableColumnHeader';
import { BusinessRequestsKanbanView } from '@/components/business-requests/BusinessRequestsKanbanView';
import { ViewToggle, ViewMode } from '@/components/business-requests/ViewToggle';
import { InlineEditableCell } from '@/components/business-requests/InlineEditableCell';
import { PROCESS_STEPS } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { ColumnsDropdown, ColumnConfig } from '@/components/backlog/ColumnsDropdown';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useIndustryPreferences } from '@/hooks/useIndustryPreferences';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Non-editable columns
const NON_EDITABLE_COLUMNS = ['request_key', 'rank', 'title', 'submitted_date', 'ageing', 'business_score'];

const COLUMN_DEFINITIONS: Record<string, { label: string; defaultWidth: number; minWidth: number }> = {
  request_key: { label: 'Request ID', defaultWidth: 110, minWidth: 100 },
  rank: { label: 'Rank', defaultWidth: 80, minWidth: 70 },
  title: { label: 'Summary', defaultWidth: 250, minWidth: 180 },
  process_step: { label: 'Process Step', defaultWidth: 140, minWidth: 130 },
  business_score: { label: 'Score', defaultWidth: 80, minWidth: 70 },
  submitted_date: { label: 'Submitted Date', defaultWidth: 145, minWidth: 135 },
  planned_quarter: { label: 'Quarter', defaultWidth: 100, minWidth: 90 },
  end_date: { label: 'Target Date', defaultWidth: 120, minWidth: 110 },
  ageing: { label: 'Ageing', defaultWidth: 95, minWidth: 85 },
  delivery_platform: { label: 'Delivery Platform', defaultWidth: 160, minWidth: 150 },
  requestor: { label: 'Assignee', defaultWidth: 130, minWidth: 110 },
  business_owner: { label: 'Business Owner', defaultWidth: 150, minWidth: 140 },
  department: { label: 'Department', defaultWidth: 130, minWidth: 110 },
  created_by: { label: 'Reporter', defaultWidth: 130, minWidth: 110 },
};

type ColumnWidths = Record<string, number>;

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = Object.fromEntries(
  Object.entries(COLUMN_DEFINITIONS).map(([id, def]) => [id, def.defaultWidth])
);

const DEFAULT_COLUMN_ORDER = ['request_key', 'rank', 'title', 'process_step', 'business_score', 'submitted_date', 'planned_quarter', 'end_date', 'ageing', 'delivery_platform', 'requestor', 'business_owner', 'department', 'created_by'];

const ALL_COLUMN_IDS = Object.keys(COLUMN_DEFINITIONS);

const getDefaultColumns = (savedOrder: string[], savedVisibility: Record<string, boolean>): ColumnConfig[] => {
  // Merge saved order with all available columns (add any missing columns at the end)
  const orderSet = new Set(savedOrder);
  const fullOrder = [...savedOrder];
  ALL_COLUMN_IDS.forEach(id => {
    if (!orderSet.has(id)) {
      fullOrder.push(id);
    }
  });
  
  return fullOrder
    .filter(id => COLUMN_DEFINITIONS[id]) // Only include valid columns
    .map(id => ({
      id,
      label: COLUMN_DEFINITIONS[id]?.label || id,
      visible: savedVisibility[id] ?? false, // Default to hidden for new columns
      default: true,
    }));
};

const calculateAgeing = (createdAt: string | null): number => {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Get ageing color class, icon, and tooltip based on days (quiet default, loud exception pattern)
const getAgeingInfo = (days: number): { class: string; tooltip: string; icon: 'flame' | 'alert' | 'clock' | null; label: string } => {
  if (days >= 30) return { 
    class: 'text-destructive font-medium', 
    icon: 'flame',
    label: 'Critical',
    tooltip: `${days} days old. Immediate escalation required (threshold: 30+ days)` 
  };
  if (days >= 15) return { 
    class: 'text-orange-600', 
    icon: 'alert',
    label: 'Escalation',
    tooltip: `${days} days old. Escalation recommended (threshold: 15-29 days)` 
  };
  if (days >= 8) return { 
    class: 'text-amber-600', 
    icon: 'clock',
    label: 'Attention',
    tooltip: `${days} days old. Attention needed (threshold: 8-14 days)` 
  };
  return { 
    class: 'text-muted-foreground', 
    icon: null,
    label: 'Normal',
    tooltip: `${days} days old (within 7-day threshold)` 
  };
};

// Get days until quarter end
const getDaysUntilQuarterEnd = (quarter: string | null): number | null => {
  if (!quarter) return null;
  const match = quarter.match(/Q(\d)\s*(\d{4})/);
  if (!match) return null;
  
  const q = parseInt(match[1]);
  const year = parseInt(match[2]);
  const quarterEndMonth = q * 3;
  const quarterEnd = new Date(year, quarterEndMonth, 0);
  const now = new Date();
  const diffTime = quarterEnd.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Get target date urgency
const getTargetDateInfo = (dateStr: string | null): { class: string; isOverdue: boolean; daysLeft: number | null; tooltip: string } => {
  if (!dateStr) return { class: 'text-muted-foreground', isOverdue: false, daysLeft: null, tooltip: 'No target date set' };
  const target = new Date(dateStr);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) return { 
    class: 'text-destructive font-medium', 
    isOverdue: true, 
    daysLeft, 
    tooltip: `Overdue by ${Math.abs(daysLeft)} days. Immediate action required.` 
  };
  if (daysLeft <= 7) return { 
    class: 'text-amber-600 font-medium', 
    isOverdue: false, 
    daysLeft, 
    tooltip: `Urgent: Due in ${daysLeft} days (within 7-day threshold)` 
  };
  return { 
    class: 'text-muted-foreground', 
    isOverdue: false, 
    daysLeft, 
    tooltip: `On track: ${daysLeft} days remaining` 
  };
};

// Process step descriptions (plain text, no color)
const PROCESS_STEP_INFO: Record<string, { description: string }> = {
  'closed': { description: 'Work completed and closed' },
  'in_progress': { description: 'Active work underway' },
  'awaiting_business_response': { description: 'Blocked - waiting for business input' },
  'under_study': { description: 'Analysis and feasibility assessment' },
  'on_hold': { description: 'Paused - pending decision or dependency' },
  'implemented': { description: 'Solution implemented and deployed' },
  'request_received': { description: 'New request - pending triage' },
};


const ITEMS_PER_PAGE = 20;

interface ColumnSort {
  columnId: string;
  direction: SortDirection;
}

// Default sort: Use saved rank if available, otherwise sort by business score
const sortByScoreWithTieBreaker = (items: any[]) => {
  // Separate force-ranked items from auto-scored items
  const forceRankedItems = items.filter(item => item.is_force_ranked === true && item.rank != null);
  const autoScoredItems = items.filter(item => !(item.is_force_ranked === true && item.rank != null));
  
  // Sort auto-scored items by score (descending), then by submission date (FIFO)
  const sortedAutoItems = [...autoScoredItems].sort((a, b) => {
    const scoreA = a.business_score ?? 0;
    const scoreB = b.business_score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    
    return (a.request_key ?? '').localeCompare(b.request_key ?? '');
  });
  
  // Sort force-ranked items by their rank (ascending)
  const sortedForceRanked = [...forceRankedItems].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  
  // Build final list: insert force-ranked items at their exact positions
  const result: any[] = [...sortedAutoItems];
  
  for (const forceItem of sortedForceRanked) {
    const targetPosition = (forceItem.rank ?? 1) - 1; // rank is 1-indexed, array is 0-indexed
    // Clamp position to valid range
    const insertAt = Math.max(0, Math.min(targetPosition, result.length));
    result.splice(insertAt, 0, forceItem);
  }
  
  return result;
};

// Generic column sort (for non-rank columns)
const sortByColumn = (items: any[], columnId: string, direction: SortDirection) => {
  if (!direction) return items;
  
  return [...items].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (columnId) {
      case 'rank':
        // Use business logic sort for rank
        return 0; // Will be handled separately
      case 'business_score':
        aVal = a.business_score ?? 0;
        bVal = b.business_score ?? 0;
        break;
      case 'title':
        aVal = a.title?.toLowerCase() ?? '';
        bVal = b.title?.toLowerCase() ?? '';
        break;
      case 'request_key':
        aVal = a.request_key ?? '';
        bVal = b.request_key ?? '';
        break;
      case 'process_step':
        aVal = a.process_step ?? '';
        bVal = b.process_step ?? '';
        break;
      case 'planned_quarter':
        aVal = a.planned_quarter ?? '';
        bVal = b.planned_quarter ?? '';
        break;
      case 'end_date':
        aVal = a.end_date ? new Date(a.end_date).getTime() : 0;
        bVal = b.end_date ? new Date(b.end_date).getTime() : 0;
        break;
      case 'ageing':
        aVal = a.created_at ? calculateAgeing(a.created_at) : 0;
        bVal = b.created_at ? calculateAgeing(b.created_at) : 0;
        break;
      case 'submitted_date':
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        break;
      case 'delivery_platform':
        aVal = a.delivery_platform?.toLowerCase() ?? '';
        bVal = b.delivery_platform?.toLowerCase() ?? '';
        break;
      case 'requestor':
        aVal = a.requestor?.toLowerCase() ?? '';
        bVal = b.requestor?.toLowerCase() ?? '';
        break;
      case 'business_owner':
        aVal = a.business_owner?.toLowerCase() ?? '';
        bVal = b.business_owner?.toLowerCase() ?? '';
        break;
      case 'department':
        aVal = a.department?.toLowerCase() ?? '';
        bVal = b.department?.toLowerCase() ?? '';
        break;
      case 'created_by':
        aVal = a.created_by?.toLowerCase() ?? '';
        bVal = b.created_by?.toLowerCase() ?? '';
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export default function IndustryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [sortedRequests, setSortedRequests] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [kanbanExpanded, setKanbanExpanded] = useState<boolean | undefined>(undefined);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<SmartFilters>({});
  const [columnSort, setColumnSort] = useState<ColumnSort>({
    columnId: 'rank',
    direction: 'asc'
  });
  const [notification, setNotification] = useState<{
    show: boolean;
    oldRank: number;
    newRank: number;
    score: number | null;
  }>({
    show: false,
    oldRank: 0,
    newRank: 0,
    score: null
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle create=true from URL (from global Create dropdown)
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateModalOpen(true);
      // Remove the create param from URL
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const {
    columnOrder, 
    columnVisibility, 
    updatePreferences,
  } = useIndustryPreferences();

  // Resizable column widths
  const { columnWidths, handleColumnResize } = useResizableColumns(
    'industry-column-widths',
    DEFAULT_COLUMN_WIDTHS
  );

  const columns = useMemo(() => 
    getDefaultColumns(columnOrder, columnVisibility), 
    [columnOrder, columnVisibility]
  );

  const handleColumnsChange = useCallback((newColumns: ColumnConfig[]) => {
    const newOrder = newColumns.map(col => col.id);
    const newVisibility: Record<string, boolean> = {};
    newColumns.forEach(col => {
      newVisibility[col.id] = col.visible;
    });
    // Save both order and visibility together for real-time update
    updatePreferences({ column_order: newOrder, column_visibility: newVisibility });
  }, [updatePreferences]);

  const { data: requests, isLoading } = useBusinessRequests(searchQuery);

  // Real-time subscription to auto-refresh table on any changes
  useEffect(() => {
    const channel = supabase
      .channel('business-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_requests'
        },
        () => {
          // Invalidate queries to refresh the table
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
          queryClient.invalidateQueries({ queryKey: ['all-business-requests-for-rank'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'activeSmartFilter' || key === 'requestIdMode') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Date) return true;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  // Apply sorting and filtering
  useEffect(() => {
    if (!requests || requests.length === 0) {
      setSortedRequests([]);
      return;
    }
    let filtered = [...requests];

    // Apply filters
    // Request ID filter
    if (filters.requestId) {
      filtered = filtered.filter((r: any) => 
        r.request_key?.toLowerCase().includes(filters.requestId!.toLowerCase())
      );
    }
    
    // Rank filter (multi-select)
    if (filters.rank && filters.rank.length > 0) {
      filtered = filtered.filter((r: any) => filters.rank!.includes(r.rank));
    }
    
    // Score range filter
    if (filters.scoreMin !== undefined) {
      filtered = filtered.filter((r: any) => (r.business_score ?? 0) >= filters.scoreMin!);
    }
    if (filters.scoreMax !== undefined) {
      filtered = filtered.filter((r: any) => (r.business_score ?? 0) <= filters.scoreMax!);
    }
    
    // Summary text filter
    if (filters.summary) {
      filtered = filtered.filter((r: any) => 
        r.title?.toLowerCase().includes(filters.summary!.toLowerCase())
      );
    }
    
    // Process Step filter (multi-select) - match both value and label since DB may store either
    if (filters.processStep && filters.processStep.length > 0) {
      filtered = filtered.filter((r: any) => {
        const dbValue = r.process_step;
        // Check if DB value matches filter value directly
        if (filters.processStep!.includes(dbValue)) return true;
        // Check if DB stores label but filter uses value - find matching step
        const matchingStep = PROCESS_STEPS.find(s => s.label === dbValue);
        if (matchingStep && filters.processStep!.includes(matchingStep.value)) return true;
        // Check if DB stores value but filter uses label
        const matchingStepByValue = PROCESS_STEPS.find(s => s.value === dbValue);
        if (matchingStepByValue && filters.processStep!.includes(matchingStepByValue.label)) return true;
        return false;
      });
    }
    
    // Submitted Date range filter
    if (filters.submittedDateFrom) {
      const fromDate = new Date(filters.submittedDateFrom).setHours(0, 0, 0, 0);
      filtered = filtered.filter((r: any) => {
        if (!r.created_at) return false;
        return new Date(r.created_at).getTime() >= fromDate;
      });
    }
    if (filters.submittedDateTo) {
      const toDate = new Date(filters.submittedDateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter((r: any) => {
        if (!r.created_at) return false;
        return new Date(r.created_at).getTime() <= toDate;
      });
    }
    
    // Ageing filter (multi-select buckets)
    if (filters.ageing && filters.ageing.length > 0) {
      filtered = filtered.filter((r: any) => {
        const age = calculateAgeing(r.created_at);
        return filters.ageing!.some(bucket => {
          switch (bucket) {
            case '0-7': return age >= 0 && age <= 7;
            case '8-30': return age >= 8 && age <= 30;
            case '31-60': return age >= 31 && age <= 60;
            case '60+': return age > 60;
            default: return false;
          }
        });
      });
    }
    
    // Department filter (multi-select)
    if (filters.department && filters.department.length > 0) {
      filtered = filtered.filter((r: any) => filters.department!.includes(r.department));
    }
    
    // Business Owner filter (multi-select with string values)
    if (filters.businessOwnerValues && filters.businessOwnerValues.length > 0) {
      filtered = filtered.filter((r: any) => {
        if (!r.business_owner) return false;
        return filters.businessOwnerValues!.some(owner =>
          r.business_owner.toLowerCase().includes(owner.toLowerCase())
        );
      });
    }
    
    // Reporter filter (multi-select with user IDs)
    if (filters.reporterIds && filters.reporterIds.length > 0) {
      filtered = filtered.filter((r: any) => {
        return filters.reporterIds!.includes(r.requestor);
      });
    }
    
    // Assignee filter (multi-select with user IDs)
    if (filters.assigneeIds && filters.assigneeIds.length > 0) {
      filtered = filtered.filter((r: any) => {
        if (filters.assigneeIds!.includes('UNASSIGNED')) {
          // Include unassigned items
          if (!r.assignee || r.assignee === '') return true;
        }
        // Filter by user IDs
        const userIds = filters.assigneeIds!.filter(id => id !== 'UNASSIGNED');
        if (userIds.length === 0) return !r.assignee || r.assignee === '';
        return userIds.includes(r.assignee);
      });
    }
    
    // Delivery Platform filter (multi-select)
    if (filters.deliveryPlatform && filters.deliveryPlatform.length > 0) {
      filtered = filtered.filter((r: any) => filters.deliveryPlatform!.includes(r.delivery_platform));
    }
    
    // Target Date range filter
    if (filters.targetDateFrom) {
      const fromDate = new Date(filters.targetDateFrom).setHours(0, 0, 0, 0);
      filtered = filtered.filter((r: any) => {
        if (!r.impl_target_end_date && !r.end_date) return false;
        const targetDate = r.impl_target_end_date || r.end_date;
        return new Date(targetDate).getTime() >= fromDate;
      });
    }
    if (filters.targetDateTo) {
      const toDate = new Date(filters.targetDateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter((r: any) => {
        if (!r.impl_target_end_date && !r.end_date) return false;
        const targetDate = r.impl_target_end_date || r.end_date;
        return new Date(targetDate).getTime() <= toDate;
      });
    }
    
    // Quarter filter (multi-select)
    if (filters.quarter && filters.quarter.length > 0) {
      filtered = filtered.filter((r: any) => filters.quarter!.includes(r.planned_quarter));
    }

    // Apply sorting based on selected column
    let sorted: any[];
    if (columnSort.columnId === 'rank' || !columnSort.direction) {
      // Use default sort by score with tie-breakers
      sorted = sortByScoreWithTieBreaker(filtered);
    } else {
      // Use normal column sort for other columns
      sorted = sortByColumn(filtered, columnSort.columnId, columnSort.direction);
    }
    
    // Assign display ranks
    const withRanks = sorted.map((req, idx) => ({
      ...req,
      displayRank: idx + 1
    }));
    
    setSortedRequests(withRanks);
  }, [requests, columnSort, filters]);

  const totalPages = Math.ceil(sortedRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

  const handleSort = (columnId: string) => {
    setColumnSort(prev => ({
      columnId,
      direction: prev.columnId === columnId 
        ? prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc' 
        : 'asc'
    }));
  };

  // Inline edit save handler
  const handleInlineSave = useCallback(async (requestId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('business_requests')
        .update({ [field]: value })
        .eq('id', requestId);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [queryClient, toast]);

  // Jira-style status badge colors
  const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
    'implemented': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    'closed': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    'in_progress': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'active': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'on_hold': { bg: 'bg-amber-100', text: 'text-amber-700' },
    'paused': { bg: 'bg-amber-100', text: 'text-amber-700' },
    'request_received': { bg: 'bg-slate-100', text: 'text-slate-600' },
    'received': { bg: 'bg-slate-100', text: 'text-slate-600' },
    'under_study': { bg: 'bg-violet-100', text: 'text-violet-700' },
    'analysis': { bg: 'bg-violet-100', text: 'text-violet-700' },
    'awaiting_business_response': { bg: 'bg-orange-100', text: 'text-orange-700' },
  };

  const getStatusBadge = (status: string) => {
    const step = PROCESS_STEPS.find(s => s.value === status);
    const info = PROCESS_STEP_INFO[status] || { description: 'Unknown status' };
    const styles = STATUS_BADGE_STYLES[status] || { bg: 'bg-slate-100', text: 'text-slate-600' };
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded cursor-help",
            styles.bg,
            styles.text
          )}>
            {step?.label || status}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-brand-dark text-white text-xs max-w-xs">
          <div className="font-medium">{step?.label || status}</div>
          <div className="text-gray-300 mt-1">{info.description}</div>
        </TooltipContent>
      </Tooltip>
    );
  };

  const getBusinessScoreBadge = (request: any) => {
    const score = request.business_score;
    
    // Show score value for all items (including force-ranked)
    if (score === null || score === undefined || score === 0) {
      return <span className="text-[#97A0AF] text-[14px]">—</span>;
    }
    
    // Jira-style bold score
    return (
      <span className="text-[14px] font-semibold text-[#172B4D] tabular-nums">
        {score}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleExport = () => {
    if (requests && requests.length > 0) {
      // Export columns as per specification
      const exportData = requests.map(req => ({
        'Request ID': req.request_key || '',
        'Summary': req.title || '',
        'Score': req.business_score ?? '',
        'Rank': req.rank ?? '',
        'Delivery Platform': req.delivery_platform || '',
        'Process Step': req.process_step || '',
        'Business Owner': req.business_owner || '',
        'Submitted Date': req.created_at ? new Date(req.created_at).toLocaleDateString('en-GB') : '',
        'Ageing': req.created_at ? calculateAgeing(req.created_at) : '',
        'Quarter': req.planned_quarter || '',
        'Target Date': req.end_date ? new Date(req.end_date).toLocaleDateString('en-GB') : '',
        'Assignee': req.requestor || '',
        'Department': req.department || '',
        'Reporter': req.created_by || '',
      }));
      
      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(h => {
            const val = String(row[h as keyof typeof row] ?? '');
            return val.includes(',') || val.includes('"') || val.includes('\n') 
              ? `"${val.replace(/"/g, '""')}"` 
              : val;
          }).join(',')
        )
      ];
      
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `industry-requests-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast({ title: 'Requests exported successfully' });
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-[#F4F5F7]">
        {/* Header */}
        <div className="border-b border-[#E4E6EB] bg-white px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#172B4D]">Demand Intake</h1>
              <p className="text-sm text-[#5E6C84]">Industry-specific demand requests</p>
            </div>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col gap-3 px-4 sm:px-6 py-3 border-b border-[#E4E6EB] bg-white">
          {/* Row 1: Search + Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search industry requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-white border-border" />
            </div>

            {/* Pagination - separate container */}
            <div className="flex items-center gap-1 border border-border rounded-md bg-white px-1">
              <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-[#172B4D] px-2 whitespace-nowrap">
                {sortedRequests.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, sortedRequests.length)} of ${sortedRequests.length}` : '0 items'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Toggle - separate container */}
            <ViewToggle currentView={viewMode} onViewChange={setViewMode} />

            {/* Expand/Collapse All - only visible in kanban mode */}
            {viewMode === 'kanban' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setKanbanExpanded(prev => prev === true ? false : true)}
                className="border-border gap-2"
              >
                {kanbanExpanded ? (
                  <>
                    <Minimize2 className="h-4 w-4" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4" />
                    Expand All
                  </>
                )}
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFiltersDialogOpen(true)}
                className={activeFilterCount > 0 ? "border-brand-gold text-brand-gold" : "border-border"}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-brand-gold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="border-border">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content - Single scroll container to fix drag-drop */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-4 sm:p-6 min-h-0 flex flex-col">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : viewMode === 'kanban' ? (
              <BusinessRequestsKanbanView 
                requests={sortedRequests} 
                onRequestSelect={setSelectedRequestId}
                allExpanded={kanbanExpanded}
                onExpandedChange={setKanbanExpanded}
              />
            ) : sortedRequests.length > 0 ? (
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border border-border rounded shadow-none">
                {/* Notification bar */}
                <div className="sticky top-0 z-40">
                  <RankUpdateNotification show={notification.show} oldRank={notification.oldRank} newRank={notification.newRank} score={notification.score} onClose={closeNotification} />
                </div>
                
                {/* Single scroll container for semantic table */}
                <div className="flex-1 overflow-x-auto overflow-y-auto">
                  <table className="min-w-full w-max border-separate border-spacing-0">
                    {/* Table Header */}
                    <thead className="sticky top-0 z-30 bg-card">
                      <tr>
                        {/* Checkbox header cell */}
                        <th className="h-10 px-3 text-xs font-medium text-text-secondary uppercase tracking-wide border-b border-r border-border bg-card" style={{ width: '48px', minWidth: '48px' }}>
                          <div className="w-4" />
                        </th>
                        
                        {/* Column headers */}
                        {columns.filter(col => col.visible).map((col, idx, arr) => {
                          const colDef = COLUMN_DEFINITIONS[col.id];
                          if (!colDef) return null;
                          const width = columnWidths[col.id] || colDef.defaultWidth;
                          const isCentered = col.id === 'rank' || col.id === 'business_score' || col.id === 'ageing';
                          
                          return (
                            <th 
                              key={col.id}
                              className={cn(
                                "h-10 px-3.5 text-xs font-medium text-text-secondary uppercase tracking-wide border-b border-r border-border bg-card relative group",
                                isCentered && "text-center"
                              )}
                              style={{ width: `${width}px`, minWidth: `${colDef.minWidth}px` }}
                            >
                              <SimpleColumnHeader
                                label={colDef.label}
                                columnId={col.id}
                                sortDirection={columnSort.columnId === col.id ? columnSort.direction : null}
                                onSort={handleSort}
                              />
                              {/* Resize handle */}
                              <div
                                className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 hover:bg-brand-gold/50 active:bg-brand-gold transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const startX = e.clientX;
                                  const startWidth = width;
                                  
                                  const handleMouseMove = (moveEvent: MouseEvent) => {
                                    const delta = moveEvent.clientX - startX;
                                    const newWidth = Math.max(colDef.minWidth, Math.min(800, startWidth + delta));
                                    handleColumnResize(col.id, newWidth);
                                  };
                                  
                                  const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                    document.body.style.cursor = '';
                                    document.body.style.userSelect = '';
                                  };
                                  
                                  document.addEventListener('mousemove', handleMouseMove);
                                  document.addEventListener('mouseup', handleMouseUp);
                                  document.body.style.cursor = 'col-resize';
                                  document.body.style.userSelect = 'none';
                                }}
                              />
                            </th>
                          );
                        })}
                        
                        {/* Add column button header cell - sticky right */}
                        <th className="h-10 border-b border-border bg-card sticky right-0 z-20" style={{ width: '48px', minWidth: '48px' }}>
                          <div className="flex items-center justify-center">
                            <ColumnsDropdown
                              columns={columns}
                              onChange={handleColumnsChange}
                              trigger={
                                <button className="h-8 w-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-muted rounded transition-colors">
                                  <Plus className="h-4 w-4" />
                                </button>
                              }
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    
                    {/* Table Body */}
                    <tbody>
                      {paginatedRequests.map((request: any) => {
                        const isForceRanked = request.is_force_ranked;
                        const ageing = calculateAgeing(request.created_at);
                        const ageingInfo = getAgeingInfo(ageing);
                        const targetInfo = getTargetDateInfo(request.end_date);
                        const quarterDays = getDaysUntilQuarterEnd(request.planned_quarter);
                        
                        const renderColumnValue = (col: ColumnConfig) => {
                          const colDef = COLUMN_DEFINITIONS[col.id];
                          if (!colDef || !col.visible) return null;
                          
                          switch(col.id) {
                            case 'request_key':
                              return (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedRequestId(request.id); }}
                                  className="text-sm text-text-primary hover:text-primary hover:underline font-medium transition-colors truncate"
                                >
                                  {request.request_key?.startsWith('MIM-') ? request.request_key : `MIM-${String(request.request_key || '').padStart(3, '0')}`}
                                </button>
                              );
                            case 'rank':
                              return (
                                <span className="text-sm text-text-primary inline-flex items-center gap-1">
                                  {isForceRanked && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Lock className="h-3 w-3 text-text-muted cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-brand-dark text-white text-xs max-w-xs">
                                        <div className="font-medium">Manually Prioritized</div>
                                        <div className="text-gray-300 mt-1">This item's rank was manually overridden.</div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  <span className="font-medium">{request.rank ?? '-'}</span>
                                </span>
                              );
                            case 'title':
                              return <span className="text-sm text-text-primary truncate">{request.title}</span>;
                            case 'process_step':
                              return (
                                <InlineEditableCell
                                  value={request.process_step}
                                  field="process_step"
                                  requestId={request.id}
                                  onSave={handleInlineSave}
                                  type="select"
                                  displayValue={getStatusBadge(request.process_step)}
                                />
                              );
                            case 'business_score':
                              return getBusinessScoreBadge(request);
                            case 'submitted_date':
                              return <span className="text-sm text-text-secondary truncate">{formatDate(request.created_at)}</span>;
                            case 'planned_quarter':
                              return (
                                <InlineEditableCell
                                  value={request.planned_quarter}
                                  field="planned_quarter"
                                  requestId={request.id}
                                  onSave={handleInlineSave}
                                  type="select"
                                  displayValue={
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-text-secondary truncate">{request.planned_quarter || '-'}</span>
                                      {quarterDays !== null && quarterDays <= 30 && quarterDays > 0 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                          </TooltipTrigger>
                                          <TooltipContent>Quarter ends in {quarterDays} days</TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  }
                                />
                              );
                            case 'end_date':
                              return (
                                <InlineEditableCell
                                  value={request.end_date}
                                  field="end_date"
                                  requestId={request.id}
                                  onSave={handleInlineSave}
                                  type="date"
                                  displayValue={
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-text-secondary truncate">{request.end_date ? formatDate(request.end_date) : '-'}</span>
                                      {targetInfo && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className={cn("flex-shrink-0 h-2 w-2 rounded-full", targetInfo.isOverdue ? "bg-red-500" : "bg-amber-400 animate-pulse")} />
                                          </TooltipTrigger>
                                          <TooltipContent>{targetInfo.tooltip}</TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  }
                                />
                              );
                            case 'delivery_platform':
                              return (
                                <InlineEditableCell
                                  value={request.delivery_platform}
                                  field="delivery_platform"
                                  requestId={request.id}
                                  onSave={handleInlineSave}
                                  type="select"
                                  displayValue={<span className="text-sm text-text-secondary truncate">{request.delivery_platform || '-'}</span>}
                                />
                              );
                            case 'ageing':
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={cn("inline-flex items-center gap-1 text-sm font-medium", ageingInfo.class)}>
                                      {ageing}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{ageingInfo.label}</TooltipContent>
                                </Tooltip>
                              );
                            case 'requestor':
                              return (
                                <InlineEditableCell
                                  value={request.requestor}
                                  field="requestor"
                                  requestId={request.id}
                                  onSave={handleInlineSave}
                                  type="user"
                                  displayValue={<span className="text-sm text-text-secondary truncate">{request.requestor || '-'}</span>}
                                />
                              );
                            case 'business_owner':
                              return (
                                <InlineEditableCell
                                  value={request.business_owner}
                                  field="business_owner"
                                  requestId={request.id}
                                  onSave={handleInlineSave}
                                  type="user"
                                  displayValue={<span className="text-sm text-text-secondary truncate">{request.business_owner || '-'}</span>}
                                />
                              );
                            case 'department':
                              return (
                                <InlineEditableCell
                                  value={request.department}
                                  field="department"
                                  requestId={request.id}
                                  onSave={handleInlineSave}
                                  type="select"
                                  displayValue={<span className="text-sm text-text-secondary truncate">{request.department || '-'}</span>}
                                />
                              );
                            case 'created_by':
                              return (
                                <InlineEditableCell
                                  value={request.created_by}
                                  field="created_by"
                                  requestId={request.id}
                                  onSave={handleInlineSave}
                                  type="user"
                                  displayValue={<span className="text-sm text-text-secondary truncate">{request.created_by || '-'}</span>}
                                />
                              );
                            default:
                              return null;
                          }
                        };
                        
                        return (
                          <tr 
                            key={request.id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              "hover:bg-muted/50",
                              selectedRows.includes(request.id) ? 'bg-blue-50' : 'bg-card'
                            )}
                            onClick={() => setSelectedRequestId(request.id)}
                          >
                            {/* Checkbox cell */}
                            <td 
                              className="h-11 px-3 border-b border-r border-border bg-inherit"
                              style={{ width: '48px', minWidth: '48px' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center">
                                <Checkbox checked={selectedRows.includes(request.id)} onCheckedChange={() => toggleRowSelection(request.id)} className="h-4 w-4" />
                              </div>
                            </td>

                            {/* Column value cells */}
                            {columns.filter(col => col.visible).map((col) => {
                              const colDef = COLUMN_DEFINITIONS[col.id];
                              if (!colDef) return null;
                              const width = columnWidths[col.id] || colDef.defaultWidth;
                              const isCentered = col.id === 'rank' || col.id === 'business_score' || col.id === 'ageing';
                              
                              return (
                                <td 
                                  key={col.id}
                                  className={cn(
                                    "h-11 px-3.5 border-b border-r border-border overflow-hidden bg-inherit",
                                    isCentered && "text-center"
                                  )}
                                  style={{ width: `${width}px`, minWidth: `${colDef.minWidth}px` }}
                                >
                                  <div className={cn("flex items-center h-full", isCentered && "justify-center")}>
                                    {renderColumnValue(col)}
                                  </div>
                                </td>
                              );
                            })}
                            
                            {/* Empty action cell - sticky right to match header */}
                            <td 
                              className="h-11 border-b border-border bg-inherit sticky right-0 z-10"
                              style={{ width: '48px', minWidth: '48px' }}
                            />
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* + Create Row - Always visible at bottom with prominent styling */}
                <div 
                  className="flex items-center h-12 px-4 border-t border-[#E4E6EB] cursor-pointer hover:bg-[#FAFBFC] transition-colors bg-white"
                  onClick={() => setCreateModalOpen(true)}
                >
                  <div className="flex items-center gap-2 text-[#5E6C84] hover:text-[#172B4D]">
                    <Plus className="h-4 w-4" />
                    <span className="text-[14px] font-medium">Create</span>
                  </div>
                </div>

                {/* Pagination Footer */}
                <div className="px-4 py-3 bg-white border-t flex items-center justify-between">
                  <div className="text-[13px] text-[#5E6C84]">
                    Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="h-8 px-2 text-[13px]"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-2 text-[13px]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              "h-8 w-8 text-[13px]",
                              currentPage === pageNum && "bg-brand-gold text-white hover:bg-brand-gold/90"
                            )}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2 text-[13px]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2 text-[13px]"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {activeFilterCount > 0 ? 'No requests match the current filters' : 'No industry requests found'}
              </div>
            )}
          </div>
        </div>

        <CreateBusinessRequestModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
        <BusinessRequestDrawer 
          isOpen={!!selectedRequestId} 
          onClose={() => setSelectedRequestId(null)} 
          requestId={selectedRequestId}
          onRequestChange={(newId) => setSelectedRequestId(newId)}
        />
        <FilterDemandsDialog
          open={filtersDialogOpen}
          onOpenChange={setFiltersDialogOpen}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
    </TooltipProvider>
  );
}
