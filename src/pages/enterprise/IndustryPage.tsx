import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Upload, Download, GripVertical, ChevronLeft, ChevronRight, Lock, ChevronDown, ChevronRight as ChevronRightIcon, Equal, Flame } from 'lucide-react';
import { useBusinessRequests, useUpdateBusinessRequest } from '@/hooks/useBusinessRequests';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { RankUpdateNotification } from '@/components/business-requests/RankUpdateNotification';
import { SimpleColumnHeader, SortDirection } from '@/components/business-requests/SimpleColumnHeader';
import { BusinessRequestsKanbanView } from '@/components/business-requests/BusinessRequestsKanbanView';
import { ViewToggle, ViewMode } from '@/components/business-requests/ViewToggle';
import { PROCESS_STEPS } from '@/types/business-request';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { ColumnsDropdown, ColumnConfig } from '@/components/backlog/ColumnsDropdown';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { useQueryClient } from '@tanstack/react-query';
import { useIndustryPreferences } from '@/hooks/useIndustryPreferences';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';

const COLUMN_DEFINITIONS: Record<string, { label: string; width: string }> = {
  request_key: { label: 'Request ID', width: 'w-24' },
  rank: { label: 'Rank', width: 'w-16' },
  title: { label: 'Summary', width: 'flex-1 min-w-0' },
  process_step: { label: 'Process Step', width: 'w-36' },
  business_score: { label: 'Score', width: 'w-20' },
  planned_quarter: { label: 'Quarter', width: 'w-24' },
  end_date: { label: 'Target Date', width: 'w-28' },
  ageing: { label: 'Ageing', width: 'w-20' },
};

const DEFAULT_COLUMN_ORDER = ['request_key', 'rank', 'title', 'process_step', 'business_score', 'planned_quarter', 'end_date', 'ageing'];

const getDefaultColumns = (order: string[], visibility: Record<string, boolean>): ColumnConfig[] => {
  return order.map(id => ({
    id,
    label: COLUMN_DEFINITIONS[id]?.label || id,
    visible: visibility[id] ?? true,
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

// Get ageing color class and tooltip based on days
const getAgeingInfo = (days: number): { class: string; tooltip: string } => {
  if (days >= 30) return { 
    class: 'text-destructive font-medium', 
    tooltip: `Critical aging: ${days} days old. Immediate escalation required (threshold: 30+ days)` 
  };
  if (days >= 15) return { 
    class: 'text-orange-600', 
    tooltip: `Escalation recommended: ${days} days old (threshold: 15-29 days)` 
  };
  if (days >= 8) return { 
    class: 'text-amber-600', 
    tooltip: `Attention needed: ${days} days old (threshold: 8-14 days)` 
  };
  return { 
    class: 'text-muted-foreground', 
    tooltip: `Normal: ${days} days old (within 7-day threshold)` 
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

// Process step semantic colors and descriptions
const PROCESS_STEP_INFO: Record<string, { bg: string; text: string; description: string }> = {
  'COMPLETED': { bg: 'bg-green-100', text: 'text-green-800', description: 'Work completed and delivered' },
  'IN PROGRESS': { bg: 'bg-blue-100', text: 'text-blue-800', description: 'Active work underway' },
  'AWAITING BUSINESS RESPONSE': { bg: 'bg-amber-100', text: 'text-amber-800', description: 'Blocked - waiting for business input' },
  'UNDER STUDY': { bg: 'bg-purple-100', text: 'text-purple-800', description: 'Analysis and feasibility assessment' },
  'ON HOLD': { bg: 'bg-gray-200', text: 'text-gray-700', description: 'Paused - pending decision or dependency' },
  'CLOSED': { bg: 'bg-gray-100', text: 'text-gray-600', description: 'Request closed (completed or cancelled)' },
  'REQUEST RECEIVED': { bg: 'bg-sky-100', text: 'text-sky-800', description: 'New request - pending triage' },
  'REOPEN': { bg: 'bg-indigo-100', text: 'text-indigo-800', description: 'Previously closed, now reopened' },
};

// Score tier information
const getScoreInfo = (score: number | null | undefined): { colorClass: string; glowClass: string; tier: string; tooltip: string } => {
  if (score === null || score === undefined) {
    return { colorClass: 'bg-muted text-muted-foreground', glowClass: '', tier: 'N/A', tooltip: 'Score not calculated' };
  }
  
  if (score >= 90) return { 
    colorClass: 'bg-green-100 text-green-700 ring-1 ring-green-200', 
    glowClass: 'shadow-sm shadow-green-200',
    tier: 'Hot',
    tooltip: `Score ${score}/100 = HOT priority\nTier: 90-100 (Top priority)\nFormula: 45% Business Value + 35% Urgency + 20% Simplicity`
  };
  if (score >= 75) return { 
    colorClass: 'bg-emerald-100 text-emerald-700', 
    glowClass: '',
    tier: 'High',
    tooltip: `Score ${score}/100 = HIGH priority\nTier: 75-89\nFormula: 45% Business Value + 35% Urgency + 20% Simplicity`
  };
  if (score >= 60) return { 
    colorClass: 'bg-amber-100 text-amber-700', 
    glowClass: '',
    tier: 'Medium',
    tooltip: `Score ${score}/100 = MEDIUM priority\nTier: 60-74\nFormula: 45% Business Value + 35% Urgency + 20% Simplicity`
  };
  if (score >= 40) return { 
    colorClass: 'bg-orange-100 text-orange-700', 
    glowClass: '',
    tier: 'Low',
    tooltip: `Score ${score}/100 = LOW priority\nTier: 40-59\nFormula: 45% Business Value + 35% Urgency + 20% Simplicity`
  };
  return { 
    colorClass: 'bg-destructive/10 text-destructive', 
    glowClass: '',
    tier: 'Critical',
    tooltip: `Score ${score}/100 = CRITICAL attention needed\nTier: 0-39 (Lowest priority)\nFormula: 45% Business Value + 35% Urgency + 20% Simplicity`
  };
};

const ITEMS_PER_PAGE = 20;

interface ColumnSort {
  columnId: string;
  direction: SortDirection;
}

// Tie-breaking sort with cascade logic (only used for Rank column)
const sortByRankWithTieBreaker = (items: any[]) => {
  return [...items].sort((a, b) => {
    // Force-ranked items maintain their explicit rank position
    if (a.is_force_ranked && b.is_force_ranked) {
      return (a.rank ?? 999) - (b.rank ?? 999);
    }
    if (a.is_force_ranked) return -1;
    if (b.is_force_ranked) return 1;
    
    // 1. Primary: Business Score (descending)
    const scoreA = a.business_score ?? 0;
    const scoreB = b.business_score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    
    // 2. Tie-breaker: Executive Urgency (descending)
    const urgA = a.executive_urgency ?? 0;
    const urgB = b.executive_urgency ?? 0;
    if (urgB !== urgA) return urgB - urgA;
    
    // 3. Tie-breaker: Business Value (descending)
    const bvA = a.business_value ?? 0;
    const bvB = b.business_value ?? 0;
    if (bvB !== bvA) return bvB - bvA;
    
    // 4. Tie-breaker: Created Date (FIFO - ascending)
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    
    // 5. Final fallback: Request ID (deterministic)
    return (a.request_key ?? '').localeCompare(b.request_key ?? '');
  });
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
      default:
        return 0;
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Check if item has score tie with adjacent items
const hasScoreTie = (item: any, allItems: any[], index: number): boolean => {
  if (item.is_force_ranked) return false;
  const prevItem = index > 0 ? allItems[index - 1] : null;
  const nextItem = index < allItems.length - 1 ? allItems[index + 1] : null;
  
  const score = item.business_score ?? 0;
  const prevScore = prevItem?.business_score ?? -1;
  const nextScore = nextItem?.business_score ?? -1;
  
  return (prevScore === score && !prevItem?.is_force_ranked) || 
         (nextScore === score && !nextItem?.is_force_ranked);
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

  const columns = useMemo(() => 
    getDefaultColumns(columnOrder, columnVisibility), 
    [columnOrder, columnVisibility]
  );

  const handleColumnsChange = useCallback((newColumns: ColumnConfig[]) => {
    const newVisibility: Record<string, boolean> = {};
    newColumns.forEach(col => {
      newVisibility[col.id] = col.visible;
    });
    updatePreferences({ column_visibility: newVisibility });
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

  const { industryFilters } = useCatalystContext();
  const deliveryPlatforms = industryFilters?.deliveryPlatforms || [];
  const processSteps = industryFilters?.processSteps || [];
  const quarters = industryFilters?.quarters || [];
  const { data: requests, isLoading } = useBusinessRequests(searchQuery);

  // Apply sorting and filtering
  useEffect(() => {
    if (!requests || requests.length === 0) {
      setSortedRequests([]);
      return;
    }
    let filtered = [...requests];

    // Apply filters
    if (deliveryPlatforms.length > 0) {
      filtered = filtered.filter((r: any) => deliveryPlatforms.includes(r.delivery_platform));
    }
    if (processSteps.length > 0) {
      filtered = filtered.filter((r: any) => processSteps.includes(r.process_step));
    }
    if (quarters.length > 0) {
      filtered = filtered.filter((r: any) => quarters.includes(r.planned_quarter));
    }

    // Apply sorting based on selected column
    let sorted: any[];
    if (columnSort.columnId === 'rank' || !columnSort.direction) {
      // Use business logic sort for Rank column
      sorted = sortByRankWithTieBreaker(filtered);
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
  }, [requests, columnSort, deliveryPlatforms, processSteps, quarters]);

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

  const getStatusBadge = (status: string) => {
    const step = PROCESS_STEPS.find(s => s.value === status);
    const info = PROCESS_STEP_INFO[status] || { bg: 'bg-muted', text: 'text-muted-foreground', description: 'Unknown status' };
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${info.bg} ${info.text}`}>
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

  const getBusinessScoreBadge = (score: number | null | undefined) => {
    const info = getScoreInfo(score);
    
    if (score === null || score === undefined) {
      return <span className="text-muted-foreground text-xs">-</span>;
    }
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-semibold cursor-help ${info.colorClass} ${info.glowClass}`}>
            {score}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-brand-dark text-white text-xs max-w-xs whitespace-pre-line">
          {info.tooltip}
        </TooltipContent>
      </Tooltip>
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

  const activeFilterCount = deliveryPlatforms.length + processSteps.length + quarters.length;

  // Check if current sort is business logic (rank-based)
  const isBusinessLogicSort = columnSort.columnId === 'rank' || !columnSort.direction;

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b bg-card px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Demand Intake</h1>
              <p className="text-sm text-muted-foreground">Industry-specific demand requests</p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)} className="bg-brand-gold text-white hover:bg-brand-gold-hover">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        {/* Search & Toolbar */}
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-card">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search industry requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-white border-border" />
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
              </span>
            )}

            {totalPages > 1 && (
              <div className="flex items-center gap-1 border-l border-r px-3 border-border">
                <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-foreground px-2 whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </span>
                <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
            <Button variant="outline" size="sm" className="border-border">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            {viewMode === 'list' && <ColumnsDropdown columns={columns} onChange={handleColumnsChange} />}
            <Button variant="outline" size="sm" onClick={handleExport} className="border-border">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-4 sm:p-6 relative">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : viewMode === 'kanban' ? (
              <BusinessRequestsKanbanView requests={sortedRequests} onRequestSelect={setSelectedRequestId} />
            ) : sortedRequests.length > 0 ? (
              <Card className="overflow-hidden relative flex flex-col">
                {/* Column Headers */}
                <DragDropContext onDragEnd={handleColumnDragEnd}>
                  <Droppable droppableId="column-headers" direction="horizontal">
                    {(provided) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex items-center gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide relative"
                      >
                        <RankUpdateNotification show={notification.show} oldRank={notification.oldRank} newRank={notification.newRank} score={notification.score} onClose={closeNotification} />
                        <div className="w-5" />
                        <div className="w-5" />
                        <div className="w-5" />
                        {columnOrder.map((colId, index) => {
                          if (!isColumnVisible(colId)) return null;
                          const colDef = COLUMN_DEFINITIONS[colId];
                          if (!colDef) return null;
                          
                          return (
                            <Draggable key={colId} draggableId={`col-${colId}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`${colDef.width} shrink-0 ${colId === 'rank' || colId === 'business_score' || colId === 'ageing' ? 'text-center' : ''} cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'bg-brand-gold/10 rounded px-2 shadow-sm' : ''}`}
                                >
                                  <SimpleColumnHeader 
                                    label={colDef.label} 
                                    columnId={colId} 
                                    sortDirection={columnSort.columnId === colId ? columnSort.direction : null} 
                                    onSort={handleSort} 
                                  />
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

                {/* Rows */}
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="requests">
                    {provided => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1">
                        {paginatedRequests.map((request: any, index: number) => {
                          const globalIndex = startIndex + index;
                          const isTop10 = isBusinessLogicSort && (request.displayRank || globalIndex + 1) <= 10;
                          const isForceRanked = request.is_force_ranked;
                          const isTied = isBusinessLogicSort && hasScoreTie(request, sortedRequests, globalIndex);
                          const isExpanded = expandedRows.has(request.id);
                          const ageing = calculateAgeing(request.created_at);
                          const ageingInfo = getAgeingInfo(ageing);
                          const targetInfo = getTargetDateInfo(request.end_date);
                          const quarterDays = getDaysUntilQuarterEnd(request.planned_quarter);
                          
                          const renderColumnValue = (colId: string) => {
                            const colDef = COLUMN_DEFINITIONS[colId];
                            if (!colDef || !isColumnVisible(colId)) return null;
                            
                            switch(colId) {
                              case 'request_key':
                                return (
                                  <div className="w-24 shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedRequestId(request.id); }}
                                      className="text-sm text-brand-gold hover:text-brand-gold-hover hover:underline font-medium transition-colors"
                                    >
                                      {request.request_key?.startsWith('MIM-') ? request.request_key : `MIM-${String(request.request_key || '').padStart(3, '0')}`}
                                    </button>
                                  </div>
                                );
                              case 'rank':
                                return (
                                  <div className="w-16 shrink-0 text-center">
                                    <span className="text-sm text-foreground inline-flex items-center gap-1 justify-center">
                                      {isTied && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Equal className="h-3 w-3 text-muted-foreground cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="bg-brand-dark text-white text-xs max-w-xs">
                                            <div className="font-medium">Score Tie Detected</div>
                                            <div className="text-gray-300 mt-1">Rank determined by tie-breaker cascade: Urgency → Business Value → Submission Date</div>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {isForceRanked && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Lock className="h-3 w-3 text-muted-foreground cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="bg-brand-dark text-white text-xs max-w-xs">
                                            <div className="font-medium">Manually Prioritized</div>
                                            <div className="text-gray-300 mt-1">This item's rank was manually overridden, bypassing score-based ordering.</div>
                                            {request.force_ranked_by && <div className="text-gray-300">By: {request.force_ranked_by}</div>}
                                            {request.force_ranked_at && <div className="text-gray-300">{new Date(request.force_ranked_at).toLocaleDateString()}</div>}
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      <span className="font-medium">{request.displayRank || globalIndex + 1}</span>
                                    </span>
                                  </div>
                                );
                              case 'title':
                                return (
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm text-foreground truncate block">{request.title}</span>
                                  </div>
                                );
                              case 'process_step':
                                return <div className="w-36 shrink-0">{getStatusBadge(request.process_step)}</div>;
                              case 'business_score':
                                return <div className="w-20 shrink-0 text-center">{getBusinessScoreBadge(request.business_score)}</div>;
                              case 'planned_quarter':
                                return (
                                  <div className="w-24 shrink-0">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help">
                                          <span className="text-sm text-muted-foreground">{request.planned_quarter || '-'}</span>
                                          {quarterDays !== null && quarterDays <= 30 && quarterDays > 0 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">{quarterDays}d</span>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-brand-dark text-white text-xs">
                                        {quarterDays !== null ? (
                                          quarterDays > 0 ? `${quarterDays} days until ${request.planned_quarter} quarter close` : 'Quarter has ended'
                                        ) : 'No quarter assigned'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                );
                              case 'end_date':
                                return (
                                  <div className="w-28 shrink-0">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help">
                                          {targetInfo.isOverdue && <span className="text-destructive">⚠️</span>}
                                          <span className={`text-sm ${targetInfo.class}`}>{formatDate(request.end_date)}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-brand-dark text-white text-xs">{targetInfo.tooltip}</TooltipContent>
                                    </Tooltip>
                                  </div>
                                );
                              case 'ageing':
                                return (
                                  <div className="w-20 shrink-0 text-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className={`text-sm inline-flex items-center gap-1 cursor-help ${ageingInfo.class}`}>
                                          {ageing >= 30 && <Flame className="h-3 w-3" />}
                                          {ageing} days
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-brand-dark text-white text-xs">{ageingInfo.tooltip}</TooltipContent>
                                    </Tooltip>
                                  </div>
                                );
                              default:
                                return null;
                            }
                          };
                          
                          return (
                            <Draggable key={request.id} draggableId={request.id} index={index}>
                              {(provided, snapshot) => (
                                <div ref={provided.innerRef} {...provided.draggableProps}>
                                  <div 
                                    className={`flex items-center gap-4 px-4 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors relative
                                      ${snapshot.isDragging ? 'bg-brand-gold/5 shadow-md ring-1 ring-brand-gold' : ''}
                                      ${selectedRows.includes(request.id) ? 'bg-primary/5' : 'bg-card'}
                                      ${isTop10 ? 'bg-brand-gold/[0.03]' : ''}`}
                                    onClick={() => setSelectedRequestId(request.id)}
                                  >
                                    {isTop10 && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gold cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-brand-dark text-white text-xs">
                                          Top 10 Priority Queue (Rank {request.displayRank})
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    
                                    <button onClick={(e) => toggleRowExpansion(request.id, e)} className="w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                                    </button>
                                    
                                    <div {...provided.dragHandleProps} className="w-5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                    
                                    <div className="w-5" onClick={e => e.stopPropagation()}>
                                      <Checkbox checked={selectedRows.includes(request.id)} onCheckedChange={() => toggleRowSelection(request.id)} className="h-4 w-4" />
                                    </div>

                                    {columnOrder.map(colId => renderColumnValue(colId))}
                                  </div>
                                  
                                  {isExpanded && (
                                    <div className="bg-muted/20 border-b px-4 py-3 ml-[60px]">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="text-muted-foreground font-medium">Description:</span>
                                          <p className="text-foreground mt-1 line-clamp-2">{request.description || 'No description provided'}</p>
                                        </div>
                                        <div className="space-y-2">
                                          <div><span className="text-muted-foreground font-medium">Business Owner:</span><span className="text-foreground ml-2">{request.requestor || '-'}</span></div>
                                          <div><span className="text-muted-foreground font-medium">Dependencies:</span><span className="text-foreground ml-2">{request.dependencies || 'None'}</span></div>
                                          <div><span className="text-muted-foreground font-medium">Last Updated:</span><span className="text-foreground ml-2">{request.updated_at ? new Date(request.updated_at).toLocaleDateString() : '-'}</span></div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
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
                    <div className="w-1 h-4 bg-brand-gold rounded" />
                    <span>Top 10 Priority</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    <span>Force-ranked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Equal className="h-3 w-3" />
                    <span>Score tie</span>
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
        <BusinessRequestDrawer isOpen={!!selectedRequestId} onClose={() => setSelectedRequestId(null)} requestId={selectedRequestId} />
      </div>
    </TooltipProvider>
  );
}
