import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';

// Catalyst/shadcn imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import { 
  Search, 
  List, 
  LayoutGrid, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MoreHorizontal,
  AlertTriangle,
  Settings,
  Bookmark,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react';

// Catalyst Demand-specific modals (new)
import { DemandBulkStatusModal } from '@/components/demand/DemandBulkStatusModal';
import { DemandBulkAssignModal } from '@/components/demand/DemandBulkAssignModal';
import { DemandBulkDeleteModal } from '@/components/demand/DemandBulkDeleteModal';
import { DemandBulkActionsBar } from '@/components/demand/DemandBulkActionsBar';
import { DemandColumnsConfigModal } from '@/components/demand/DemandColumnsConfigModal';
import { DemandExportModal } from '@/components/demand/DemandExportModal';

// Local components
import { FilterDemandsDialog, SmartFilters } from '@/components/business-requests/FilterDemandsDialog';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { StatusSummaryKanbanView } from '@/components/business-requests/StatusSummaryKanbanView';
import { PROCESS_STEPS } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'kanban';
type SortOrder = 'ASC' | 'DESC';

// Status badge variant mapping
const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  const statusUpper = status?.toUpperCase() || '';
  if (['IMPLEMENT', 'READY_TO_IMPLEMENT', 'CLOSED'].includes(statusUpper)) return 'default';
  if (['NEW REQUEST', 'NEW_REQUEST'].includes(statusUpper)) return 'secondary';
  if (['REJECTED'].includes(statusUpper)) return 'destructive';
  return 'outline';
};

const getStatusColor = (status: string): string => {
  const statusUpper = status?.toUpperCase() || '';
  const mapping: Record<string, string> = {
    'IMPLEMENT': 'bg-emerald-500 text-white',
    'READY_TO_IMPLEMENT': 'bg-blue-500 text-white',
    'NEW REQUEST': 'bg-sky-500 text-white',
    'NEW_REQUEST': 'bg-sky-500 text-white',
    'ANALYSE': 'bg-amber-500 text-white',
    'APPROVED': 'bg-violet-500 text-white',
    'CLOSED': 'bg-neutral-500 text-white',
    'ON_HOLD': 'bg-amber-400 text-black',
    'REJECTED': 'bg-red-500 text-white',
  };
  return mapping[statusUpper] || 'bg-muted text-muted-foreground';
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const calculateAgeing = (createdAt: string | null): number => {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const ITEMS_PER_PAGE = 20;

// Responsive hook
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile;
};

export default function DemandIntakeCatalyst() {
  const isMobile = useResponsive();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<SmartFilters>({});
  const [sortKey, setSortKey] = useState<string>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  
  // Modal states
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
  // Column configuration
  const [columnConfig, setColumnConfig] = useState<{ key: string; label: string; visible: boolean; required?: boolean }[]>([
    { key: 'checkbox', label: 'Select', visible: true, required: true },
    { key: 'request_key', label: 'Request ID', visible: true, required: true },
    { key: 'title', label: 'Summary', visible: true, required: true },
    { key: 'process_step', label: 'Process Step', visible: true },
    { key: 'rank', label: 'Rank', visible: true },
    { key: 'delivery_platform', label: 'Delivery Platform', visible: true },
    { key: 'business_owner', label: 'Business Owner', visible: true },
    { key: 'planned_quarter', label: 'Quarter', visible: true },
    { key: 'end_date', label: 'Target Date', visible: true },
    { key: 'department', label: 'Department', visible: true },
    { key: 'actions', label: 'Actions', visible: true, required: true },
  ]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle create=true from URL
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateModalOpen(true);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: requests, isLoading } = useBusinessRequests(searchQuery);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('business-requests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
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

  // Quick filters data
  const quickFilters = useMemo(() => {
    if (!requests) return [];
    const newCount = requests.filter((r: any) => r.process_step === 'new_request').length;
    const inProgressCount = requests.filter((r: any) => ['analyse', 'approved', 'ready_to_implement', 'implement'].includes(r.process_step)).length;
    const closedCount = requests.filter((r: any) => r.process_step === 'closed').length;
    const myRequests = requests.filter((r: any) => r.assignee).length;
    
    return [
      { key: 'new', label: 'New', count: newCount },
      { key: 'in-progress', label: 'In Progress', count: inProgressCount },
      { key: 'closed', label: 'Closed', count: closedCount },
      { key: 'my-requests', label: 'My Requests', count: myRequests },
    ];
  }, [requests]);

  // Process and sort data
  const sortedRequests = useMemo(() => {
    if (!requests || requests.length === 0) return [];
    
    let filtered = [...requests];

    // Apply quick filter
    if (quickFilter === 'new') {
      filtered = filtered.filter((r: any) => r.process_step === 'new_request');
    } else if (quickFilter === 'in-progress') {
      filtered = filtered.filter((r: any) => ['analyse', 'approved', 'ready_to_implement', 'implement'].includes(r.process_step));
    } else if (quickFilter === 'closed') {
      filtered = filtered.filter((r: any) => r.process_step === 'closed');
    } else if (quickFilter === 'my-requests') {
      filtered = filtered.filter((r: any) => r.assignee);
    }

    // Apply filters
    if (filters.processStep && filters.processStep.length > 0) {
      filtered = filtered.filter((r: any) => {
        const dbValue = r.process_step;
        if (filters.processStep!.includes(dbValue)) return true;
        const matchingStep = PROCESS_STEPS.find(s => s.label === dbValue);
        if (matchingStep && filters.processStep!.includes(matchingStep.value)) return true;
        return false;
      });
    }

    // Sort
    return filtered.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      
      if (sortKey === 'business_score') {
        aVal = a.business_score ?? 0;
        bVal = b.business_score ?? 0;
      }
      
      if (sortOrder === 'ASC') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    }).map((req, idx) => ({
      ...req,
      displayRank: idx + 1
    }));
  }, [requests, filters, sortKey, sortOrder, quickFilter]);

  const totalPages = Math.ceil(sortedRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortKey(key);
      setSortOrder('ASC');
    }
  };

  const handleExport = () => {
    if (requests && requests.length > 0) {
      const exportData = requests.map(req => ({
        'Request ID': req.request_key || '',
        'Summary': req.title || '',
        'Score': req.business_score ?? '',
        'Rank': req.rank ?? '',
        'Delivery Platform': req.delivery_platform || '',
        'Process Step': req.process_step || '',
        'Business Owner': req.business_owner || '',
        'Submitted Date': req.created_at ? formatDate(req.created_at) : '',
        'Ageing': req.created_at ? calculateAgeing(req.created_at) : '',
        'Quarter': req.planned_quarter || '',
        'Target Date': req.end_date ? formatDate(req.end_date) : '',
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

  // Bulk action mutations
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from('business_requests')
        .update({ process_step: status })
        .in('id', selectedRows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      setSelectedRows([]);
      toast({ title: `Updated ${selectedRows.length} request(s)` });
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async (assignee: string) => {
      const { error } = await supabase
        .from('business_requests')
        .update({ assignee })
        .in('id', selectedRows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      setSelectedRows([]);
      toast({ title: `Assigned ${selectedRows.length} request(s)` });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('business_requests')
        .delete()
        .in('id', selectedRows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      setSelectedRows([]);
      toast({ title: `Deleted ${selectedRows.length} request(s)` });
    },
  });

  // Select all checkbox handler
  const handleSelectAll = () => {
    if (selectedRows.length === paginatedRequests.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedRequests.map((r: any) => r.id));
    }
  };

  const isAllSelected = selectedRows.length === paginatedRequests.length && paginatedRequests.length > 0;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < paginatedRequests.length;

  // Visible columns based on config
  const visibleColumnKeys = columnConfig.filter(c => c.visible).map(c => c.key);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'ASC' 
      ? <ArrowUp className="ml-1 h-3 w-3" /> 
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Demand Intake
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Industry-specific demand requests
          </p>
        </div>

        {/* Search & Controls Bar */}
        <div className="bg-card border rounded-lg p-4 mb-6 flex flex-wrap justify-between items-center gap-4 shadow-sm">
          {/* Left side - Search */}
          <div className="w-full md:w-96 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search industry requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
                {!isMobile && <span className="ml-1">List</span>}
              </Button>
              <Button 
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="rounded-none"
              >
                <LayoutGrid className="h-4 w-4" />
                {!isMobile && <span className="ml-1">Kanban</span>}
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast({ title: 'Saved Filters coming soon' })}
            >
              <Bookmark className="h-4 w-4" />
              {!isMobile && <span className="ml-1">Saved Filters</span>}
            </Button>

            <Button
              variant={activeFilterCount > 0 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltersDialogOpen(true)}
            >
              <Filter className="h-4 w-4" />
              {!isMobile && <span className="ml-1">Filters</span>}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              {!isMobile && <span className="ml-1">Export</span>}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setColumnsModalOpen(true)}
            >
              <Settings className="h-4 w-4" />
              {!isMobile && <span className="ml-1">Columns</span>}
            </Button>

            <Button
              onClick={() => setCreateModalOpen(true)}
              size="sm"
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              <Plus className="h-4 w-4" />
              {!isMobile && <span className="ml-1">Create</span>}
            </Button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Quick filters:</span>
          <Button
            variant={quickFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter(null)}
            className="h-7 text-xs"
          >
            All
          </Button>
          {quickFilters.map((filter) => (
            <Button
              key={filter.key}
              variant={quickFilter === filter.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuickFilter(filter.key)}
              className="h-7 text-xs"
            >
              {filter.label}
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {filter.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Table Content */}
        <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : viewMode === 'kanban' ? (
            <StatusSummaryKanbanView 
              requests={sortedRequests}
              onRequestSelect={(id) => setSelectedRequestId(id)}
            />
          ) : sortedRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    {visibleColumnKeys.includes('checkbox') && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('request_key') && (
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('request_key')}
                      >
                        <div className="flex items-center">
                          Request ID
                          <SortIcon columnKey="request_key" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('title') && (
                      <TableHead 
                        className="cursor-pointer hover:text-foreground min-w-[200px]"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center">
                          Summary
                          <SortIcon columnKey="title" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('process_step') && (
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('process_step')}
                      >
                        <div className="flex items-center">
                          Process Step
                          <SortIcon columnKey="process_step" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('rank') && (
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('rank')}
                      >
                        <div className="flex items-center">
                          Rank
                          <SortIcon columnKey="rank" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('delivery_platform') && (
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('delivery_platform')}
                      >
                        <div className="flex items-center">
                          Delivery Platform
                          <SortIcon columnKey="delivery_platform" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('business_owner') && (
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('business_owner')}
                      >
                        <div className="flex items-center">
                          Business Owner
                          <SortIcon columnKey="business_owner" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('planned_quarter') && (
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('planned_quarter')}
                      >
                        <div className="flex items-center">
                          Quarter
                          <SortIcon columnKey="planned_quarter" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('end_date') && (
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('end_date')}
                      >
                        <div className="flex items-center">
                          Target Date
                          <SortIcon columnKey="end_date" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('department') && (
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('department')}
                      >
                        <div className="flex items-center">
                          Department
                          <SortIcon columnKey="department" />
                        </div>
                      </TableHead>
                    )}
                    {visibleColumnKeys.includes('actions') && (
                      <TableHead className="w-10"></TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map((request: any) => (
                    <TableRow 
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRequestId(request.id)}
                    >
                      {visibleColumnKeys.includes('checkbox') && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRows.includes(request.id)}
                            onCheckedChange={() => {
                              setSelectedRows(prev => 
                                prev.includes(request.id) 
                                  ? prev.filter(id => id !== request.id)
                                  : [...prev, request.id]
                              );
                            }}
                          />
                        </TableCell>
                      )}
                      {visibleColumnKeys.includes('request_key') && (
                        <TableCell>
                          <button 
                            className="text-primary hover:underline font-medium"
                            onClick={(e) => { e.stopPropagation(); setSelectedRequestId(request.id); }}
                          >
                            {request.request_key?.startsWith('MIM-') ? request.request_key : `MIM-${String(request.request_key || '').padStart(3, '0')}`}
                          </button>
                        </TableCell>
                      )}
                      {visibleColumnKeys.includes('title') && (
                        <TableCell className="max-w-[300px] truncate">
                          {request.title || '-'}
                        </TableCell>
                      )}
                      {visibleColumnKeys.includes('process_step') && (
                        <TableCell>
                          <Badge className={cn("text-xs", getStatusColor(request.process_step))}>
                            {PROCESS_STEPS.find(s => s.value === request.process_step)?.label || request.process_step || '-'}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumnKeys.includes('rank') && (
                        <TableCell>{request.rank || '-'}</TableCell>
                      )}
                      {visibleColumnKeys.includes('delivery_platform') && (
                        <TableCell>{request.delivery_platform || '-'}</TableCell>
                      )}
                      {visibleColumnKeys.includes('business_owner') && (
                        <TableCell>{request.business_owner || '-'}</TableCell>
                      )}
                      {visibleColumnKeys.includes('planned_quarter') && (
                        <TableCell>{request.planned_quarter || '-'}</TableCell>
                      )}
                      {visibleColumnKeys.includes('end_date') && (
                        <TableCell>
                          {request.end_date ? (
                            <div className="flex items-center gap-1">
                              {formatDate(request.end_date)}
                              <span className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                new Date(request.end_date) < new Date() ? 'bg-amber-500' : 'bg-emerald-500'
                              )} />
                            </div>
                          ) : '-'}
                        </TableCell>
                      )}
                      {visibleColumnKeys.includes('department') && (
                        <TableCell>{request.department || '-'}</TableCell>
                      )}
                      {visibleColumnKeys.includes('actions') && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedRequestId(request.id)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>Clone</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No demand requests found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first demand request or adjust your filters
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setCreateModalOpen(true)}>
                  Create Request
                </Button>
                <Button variant="outline" onClick={() => setFilters({})}>
                  Clear filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {viewMode === 'list' && sortedRequests.length > ITEMS_PER_PAGE && (
          <div className="flex flex-col items-center gap-2 mt-6">
            <div className="flex items-center gap-1">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {!isMobile && 'Previous'}
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
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
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                {!isMobile && 'Next'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
            </p>
          </div>
        )}
      </main>

      {/* Dialogs and Modals */}
      <FilterDemandsDialog 
        open={filtersDialogOpen} 
        onOpenChange={setFiltersDialogOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <CreateBusinessRequestModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />

      <BusinessRequestDrawer 
        isOpen={!!selectedRequestId}
        requestId={selectedRequestId} 
        onClose={() => setSelectedRequestId(null)} 
      />

      {/* Bulk Actions Bar */}
      <DemandBulkActionsBar
        selectedCount={selectedRows.length}
        onClear={() => setSelectedRows([])}
        onUpdateStatus={() => setBulkStatusModalOpen(true)}
        onAssign={() => setBulkAssignModalOpen(true)}
        onDelete={() => setBulkDeleteModalOpen(true)}
      />

      {/* Bulk Action Modals */}
      <DemandBulkStatusModal
        isOpen={bulkStatusModalOpen}
        onClose={() => setBulkStatusModalOpen(false)}
        onConfirm={(status) => bulkUpdateStatusMutation.mutate(status)}
        selectedCount={selectedRows.length}
      />

      <DemandBulkAssignModal
        isOpen={bulkAssignModalOpen}
        onClose={() => setBulkAssignModalOpen(false)}
        onConfirm={(assignee) => bulkAssignMutation.mutate(assignee)}
        selectedCount={selectedRows.length}
      />

      <DemandBulkDeleteModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate()}
        selectedCount={selectedRows.length}
      />

      <DemandColumnsConfigModal
        isOpen={columnsModalOpen}
        onClose={() => setColumnsModalOpen(false)}
        columns={columnConfig}
        onColumnsChange={setColumnConfig}
      />

      <DemandExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={(format) => {
          handleExport();
          toast({ title: `Exported as ${format.toUpperCase()}` });
        }}
      />
    </div>
  );
}
