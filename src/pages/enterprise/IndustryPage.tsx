import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Upload, Download, GripVertical, ChevronLeft, ChevronRight, Lock, ChevronDown, ChevronRight as ChevronRightIcon, Flame, Clock, AlertTriangle, Filter } from 'lucide-react';
import { FilterDemandsDialog, SmartFilters } from '@/components/business-requests/FilterDemandsDialog';
import { useBusinessRequests, useUpdateBusinessRequest } from '@/hooks/useBusinessRequests';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { RankUpdateNotification } from '@/components/business-requests/RankUpdateNotification';
import { SimpleColumnHeader, SortDirection } from '@/components/business-requests/SimpleColumnHeader';
import { DraggableColumnHeaders, useColumnWidths, ColumnWidths } from '@/components/business-requests/DraggableColumnHeaders';
import { BusinessRequestsKanbanView } from '@/components/business-requests/BusinessRequestsKanbanView';
import { ViewToggle, ViewMode } from '@/components/business-requests/ViewToggle';
import { PROCESS_STEPS } from '@/types/business-request';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { ColumnsDropdown, ColumnConfig } from '@/components/backlog/ColumnsDropdown';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useIndustryPreferences } from '@/hooks/useIndustryPreferences';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [sortedRequests, setSortedRequests] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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
  const { user } = useAuth();

  const { 
    columnOrder, 
    columnVisibility, 
    updateColumnOrder, 
    updatePreferences,
  } = useIndustryPreferences();

  // Resizable column widths
  const { columnWidths, handleColumnResize } = useColumnWidths(
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

  const handleColumnDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    
    const newOrder = Array.from(columnOrder);
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);
    
    updateColumnOrder(newOrder);
    toast({ title: 'Column order saved' });
  }, [columnOrder, updateColumnOrder, toast]);

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
      exportToCSV(requests, 'industry-requests', ['request_key', 'title', 'process_step', 'planned_quarter', 'end_date', 'created_at']);
      toast({ title: 'Requests exported successfully' });
    }
  };

  const isColumnVisible = (columnId: string) => {
    return columns.find(c => c.id === columnId)?.visible ?? false;
  };

  const getDeservedRank = (businessScore: number | null | undefined, allRequests: any[]) => {
    if (businessScore === null || businessScore === undefined) return allRequests.length;
    const sortedByScore = [...allRequests].sort((a, b) => (b.business_score || 0) - (a.business_score || 0));
    const position = sortedByScore.findIndex(r => (r.business_score || 0) <= businessScore);
    return position === -1 ? allRequests.length : position + 1;
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;
    
    const actualSourceIndex = startIndex + sourceIndex;
    const actualDestIndex = startIndex + destIndex;
    const reordered = Array.from(sortedRequests);
    const [movedItem] = reordered.splice(actualSourceIndex, 1);
    reordered.splice(actualDestIndex, 0, movedItem);
    
    const oldRank = movedItem.displayRank || actualSourceIndex + 1;
    const newRank = actualDestIndex + 1;
    const businessScore = movedItem.business_score;
    const deservedRank = getDeservedRank(businessScore, sortedRequests);
    const isForceRanking = newRank !== deservedRank;
    
    const updatedRequests = reordered.map((req, index) => ({
      ...req,
      displayRank: index + 1,
      rank: index + 1,
      is_force_ranked: req.id === movedItem.id ? isForceRanking : req.is_force_ranked
    }));
    setSortedRequests(updatedRequests);
    
    const affectedItems = updatedRequests.filter((req, idx) => {
      const original = sortedRequests.find(r => r.id === req.id);
      return original?.rank !== idx + 1 || (req.id === movedItem.id && isForceRanking);
    });
    
    try {
      await Promise.all(affectedItems.map(item => {
        const updateData: any = { rank: item.rank };
        if (item.id === movedItem.id && isForceRanking) {
          updateData.is_force_ranked = true;
          updateData.force_ranked_by = user?.email || 'Unknown';
          updateData.force_ranked_at = new Date().toISOString();
        }
        return supabase.from('business_requests').update(updateData).eq('id', item.id);
      }));

      await queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      
      if (newRank < deservedRank) {
        setNotification({ show: true, oldRank, newRank, score: businessScore });
      }
    } catch (error) {
      console.error('Failed to update ranks:', error);
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const toggleRowExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
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
            <Button onClick={() => setCreateModalOpen(true)} className="bg-brand-gold text-white hover:bg-brand-gold-hover">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
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

            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <div className="flex items-center gap-1 border-l border-r px-3 border-border">
                  <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-[#172B4D] px-2 whitespace-nowrap">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
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
              {/* Import button hidden - functionality preserved for future use */}
              {viewMode === 'list' && <ColumnsDropdown columns={columns} onChange={handleColumnsChange} />}
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
              <BusinessRequestsKanbanView requests={sortedRequests} onRequestSelect={setSelectedRequestId} />
            ) : sortedRequests.length > 0 ? (
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border border-[#E4E6EB] rounded shadow-none">
                {/* Single scroll container for header + body */}
                <div className="flex-1 overflow-x-auto overflow-y-auto">
                  {/* Notification bar */}
                  <div className="sticky top-0 z-20">
                    <RankUpdateNotification show={notification.show} oldRank={notification.oldRank} newRank={notification.newRank} score={notification.score} onClose={closeNotification} />
                  </div>
                  
                  {/* Inner table with fixed min-width for horizontal scroll */}
                  <div style={{ minWidth: '1400px' }}>
                    {/* Column Headers - Sticky */}
                    <div className="sticky top-0 z-30 flex items-center h-10 px-4 bg-white border-b border-[#DFE1E6] text-[12px] font-medium text-[#5E6C84] uppercase tracking-wide">
                      {/* Leading icons placeholder - fixed width */}
                      <div className="flex items-center gap-2 mr-2" style={{ width: '80px', minWidth: '80px' }}>
                        <div className="w-8" /> {/* Drag */}
                        <div className="w-8" /> {/* Checkbox */}
                      </div>
                      
                      {/* Column headers - using flex-grow for remaining space */}
                      {columns.filter(col => col.visible).map(col => {
                        const colDef = COLUMN_DEFINITIONS[col.id];
                        if (!colDef) return null;
                        const width = columnWidths[col.id] || colDef.defaultWidth;
                        const isCentered = col.id === 'rank' || col.id === 'business_score' || col.id === 'ageing';
                        
                        return (
                          <div 
                            key={col.id}
                            className={cn(
                              "shrink-0 px-3.5 flex items-center gap-1 border-r border-[#E4E6EB] last:border-r-0",
                              isCentered && "justify-center"
                            )}
                            style={{ width: `${width}px`, minWidth: `${colDef.minWidth}px` }}
                          >
                            <SimpleColumnHeader
                              label={colDef.label}
                              columnId={col.id}
                              sortDirection={columnSort.columnId === col.id ? columnSort.direction : null}
                              onSort={handleSort}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Table Body Rows */}
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="requests">
                        {provided => (
                          <div {...provided.droppableProps} ref={provided.innerRef}>
                            {paginatedRequests.map((request: any, index: number) => {
                              const globalIndex = startIndex + index;
                              const isForceRanked = request.is_force_ranked;
                              const isExpanded = expandedRows.has(request.id);
                              const ageing = calculateAgeing(request.created_at);
                              const ageingInfo = getAgeingInfo(ageing);
                              const targetInfo = getTargetDateInfo(request.end_date);
                              const quarterDays = getDaysUntilQuarterEnd(request.planned_quarter);
                              
                              const renderColumnValue = (col: ColumnConfig) => {
                                const colDef = COLUMN_DEFINITIONS[col.id];
                                if (!colDef || !col.visible) return null;
                                
                                const width = columnWidths[col.id] || colDef.defaultWidth;
                                const isCentered = col.id === 'rank' || col.id === 'business_score' || col.id === 'ageing';
                                
                                const cellContent = (() => {
                                  switch(col.id) {
                                    case 'request_key':
                                      return (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setSelectedRequestId(request.id); }}
                                          className="text-[13px] text-[#172B4D] hover:text-[#0052CC] hover:underline font-medium transition-colors truncate"
                                        >
                                          {request.request_key?.startsWith('MIM-') ? request.request_key : `MIM-${String(request.request_key || '').padStart(3, '0')}`}
                                        </button>
                                      );
                                    case 'rank':
                                      return (
                                        <span className="text-[14px] text-[#172B4D] inline-flex items-center gap-1">
                                          {isForceRanked && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Lock className="h-3 w-3 text-[#97A0AF] cursor-help" />
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
                                      return <span className="text-[14px] text-[#172B4D] truncate">{request.title}</span>;
                                    case 'process_step':
                                      return getStatusBadge(request.process_step);
                                    case 'business_score':
                                      return getBusinessScoreBadge(request);
                                    case 'submitted_date':
                                      return <span className="text-[14px] text-[#5E6C84] truncate">{formatDate(request.created_at)}</span>;
                                    case 'planned_quarter':
                                      return (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 cursor-help">
                                              <span className="text-[14px] text-[#5E6C84] truncate">{request.planned_quarter || '-'}</span>
                                              {quarterDays !== null && quarterDays <= 30 && quarterDays > 0 && (
                                                <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">{quarterDays}d</span>
                                              )}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="bg-brand-dark text-white text-xs">
                                            {quarterDays !== null ? (quarterDays > 0 ? `${quarterDays} days until quarter close` : 'Quarter has ended') : 'No quarter assigned'}
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    case 'end_date':
                                      return (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className={`text-[14px] cursor-help truncate ${targetInfo.class}`}>{formatDate(request.end_date)}</span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="bg-brand-dark text-white text-xs">{targetInfo.tooltip}</TooltipContent>
                                        </Tooltip>
                                      );
                                    case 'ageing':
                                      return (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className={`text-[14px] inline-flex items-center gap-1 cursor-help ${ageingInfo.class}`}>
                                              {ageingInfo.icon === 'flame' && <Flame className="h-3 w-3" />}
                                              {ageingInfo.icon === 'alert' && <AlertTriangle className="h-3 w-3" />}
                                              {ageingInfo.icon === 'clock' && <Clock className="h-3 w-3" />}
                                              {ageing} days
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="bg-brand-dark text-white text-xs max-w-xs">
                                            <div className="font-medium">{ageingInfo.label}</div>
                                            <div className="text-gray-300 mt-1">{ageingInfo.tooltip}</div>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    case 'delivery_platform':
                                      return <span className="text-[14px] text-[#172B4D] truncate">{request.delivery_platform || '-'}</span>;
                                    case 'requestor':
                                      return <span className="text-[14px] text-[#172B4D] truncate">{request.requestor || '-'}</span>;
                                    case 'business_owner':
                                      return <span className="text-[14px] text-[#172B4D] truncate">{request.business_owner || '-'}</span>;
                                    case 'department':
                                      return <span className="text-[14px] text-[#5E6C84] truncate">{request.department || '-'}</span>;
                                    case 'created_by':
                                      return <span className="text-[14px] text-[#5E6C84] truncate">{request.created_by || '-'}</span>;
                                    default:
                                      return null;
                                  }
                                })();
                                
                                return (
                                  <div 
                                    key={col.id}
                                    className={cn(
                                      "shrink-0 px-3.5 flex items-center min-w-0 border-r border-[#E4E6EB] last:border-r-0",
                                      isCentered && "justify-center"
                                    )}
                                    style={{ width: `${width}px`, minWidth: `${colDef.minWidth}px` }}
                                  >
                                    {cellContent}
                                  </div>
                                );
                              };
                              
                              return (
                                <Draggable key={request.id} draggableId={request.id} index={index}>
                                  {(provided, snapshot) => (
                                      <div ref={provided.innerRef} {...provided.draggableProps}>
                                      <div 
                                        className={cn(
                                          "flex items-center h-11 px-4 border-b border-[#E4E6EB] cursor-pointer transition-colors",
                                          "hover:bg-[#FAFBFC]",
                                          snapshot.isDragging && 'bg-brand-gold/5 shadow-md ring-1 ring-brand-gold',
                                          selectedRows.includes(request.id) ? 'bg-blue-50' : 'bg-white'
                                        )}
                                        onClick={() => setSelectedRequestId(request.id)}
                                      >
                                        {/* Leading icons - fixed width matching header */}
                                        <div className="flex items-center gap-2 mr-2" style={{ width: '80px', minWidth: '80px' }}>
                                          <div {...provided.dragHandleProps} className="w-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex items-center justify-center" onClick={e => e.stopPropagation()}>
                                            <GripVertical className="h-4 w-4" />
                                          </div>
                                          
                                          <div className="w-8 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                                            <Checkbox checked={selectedRows.includes(request.id)} onCheckedChange={() => toggleRowSelection(request.id)} className="h-4 w-4" />
                                          </div>
                                        </div>

                                        {/* Column values */}
                                        {columns.map(col => renderColumnValue(col))}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                  <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
                  </div>
                )}

                {/* Legend Bar */}
                <div className="px-4 py-2 bg-muted/50 border-t flex items-center gap-6 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Legend:</span>
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    <span>Force-ranked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3 w-3 text-destructive" />
                    <span>Critical aging (30d+)</span>
                  </div>
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
