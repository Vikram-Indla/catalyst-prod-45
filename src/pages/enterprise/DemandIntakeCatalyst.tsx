import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';

// Catalyst/shadcn imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Bookmark,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

// Catalyst Demand-specific modals
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
import { PROCESS_STEPS, getProcessStepInfo } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'kanban';
type SortOrder = 'NONE' | 'ASC' | 'DESC';

// Process Step lozenge styles matching production
const getProcessStepStyle = (status: string): string => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'implement' || statusLower === 'ready_to_implement') {
    return 'bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9]';
  }
  if (statusLower === 'new_request' || statusLower === 'new request') {
    return 'bg-[#fff3e0] text-[#e65100] border border-[#ffe0b2]';
  }
  if (statusLower === 'closed') {
    return 'bg-[#e3f2fd] text-[#1565c0] border border-[#bbdefb]';
  }
  if (statusLower === 'analyse' || statusLower === 'in_review') {
    return 'bg-[#fce4ec] text-[#c2185b] border border-[#f8bbd9]';
  }
  if (statusLower === 'approved') {
    return 'bg-[#e8eaf6] text-[#3949ab] border border-[#c5cae9]';
  }
  if (statusLower === 'on_hold') {
    return 'bg-[#fff8e1] text-[#f9a825] border border-[#ffecb3]';
  }
  if (statusLower === 'rejected') {
    return 'bg-[#ffebee] text-[#c62828] border border-[#ffcdd2]';
  }
  return 'bg-muted text-muted-foreground';
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

// Get health dot color based on target date
const getHealthDotColor = (endDate: string | null): string => {
  if (!endDate) return 'bg-amber-500';
  const target = new Date(endDate);
  const now = new Date();
  const daysUntil = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) return 'bg-red-500'; // Overdue
  if (daysUntil <= 7) return 'bg-amber-500'; // At risk
  return 'bg-emerald-500'; // On track
};

const ITEMS_PER_PAGE = 20;

export default function DemandIntakeCatalyst() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<SmartFilters>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('NONE');
  
  // Modal states
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
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

  // Process and sort data
  const sortedRequests = useMemo(() => {
    if (!requests || requests.length === 0) return [];
    
    let filtered = [...requests];

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

    // Sort only if sortOrder is not NONE
    if (sortOrder !== 'NONE' && sortKey) {
      filtered = filtered.sort((a, b) => {
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
      });
    }
    
    return filtered.map((req, idx) => ({
      ...req,
      displayRank: idx + 1
    }));
  }, [requests, filters, sortKey, sortOrder]);

  const totalPages = Math.ceil(sortedRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Cycle through: NONE → ASC → DESC → NONE
      if (sortOrder === 'NONE') {
        setSortOrder('ASC');
      } else if (sortOrder === 'ASC') {
        setSortOrder('DESC');
      } else {
        setSortOrder('NONE');
        setSortKey(null);
      }
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
        'Department': req.department || '',
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

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey || sortOrder === 'NONE') {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/60" />;
    }
    return sortOrder === 'ASC' 
      ? <ArrowUp className="ml-2 h-4 w-4 text-brand-gold" /> 
      : <ArrowDown className="ml-2 h-4 w-4 text-brand-gold" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#faf9f7]">
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto px-6 py-4">
        {/* Page Header */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-foreground">Demand Intake</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Industry-specific demand requests</p>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search industry requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white border-border"
            />
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between mb-4">
          {/* Left - View Toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === 'list' 
                  ? "bg-brand-gold text-white" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === 'kanban' 
                  ? "bg-brand-gold text-white" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
          </div>

          {/* Right - Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast({ title: 'Saved Filters coming soon' })}
              className="h-8 text-sm border-border bg-white"
            >
              <Bookmark className="h-4 w-4 mr-1.5" />
              Saved Filters
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersDialogOpen(true)}
              className={cn(
                "h-8 text-sm border-border bg-white",
                activeFilterCount > 0 && "border-brand-gold text-brand-gold"
              )}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1.5 bg-brand-gold text-white text-xs px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 text-sm border-border bg-white"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>

            <Button
              onClick={() => setCreateModalOpen(true)}
              size="sm"
              className="h-8 text-sm bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
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
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-brand-gold/10 border-b-2 border-brand-gold/30">
                    <th className="w-12 px-4 py-3 text-left border-r border-border/40">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-brand-gold/20 text-xs font-semibold text-foreground uppercase tracking-wider px-4 py-3 text-left border-r border-border/40 whitespace-nowrap transition-colors"
                      onClick={() => handleSort('request_key')}
                    >
                      <div className="flex items-center">
                        Request ID
                        <SortIcon columnKey="request_key" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-brand-gold/20 text-xs font-semibold text-foreground uppercase tracking-wider min-w-[220px] px-4 py-3 text-left border-r border-border/40 transition-colors"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center">
                        Summary
                        <SortIcon columnKey="title" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-brand-gold/20 text-xs font-semibold text-foreground uppercase tracking-wider px-4 py-3 text-left border-r border-border/40 whitespace-nowrap transition-colors"
                      onClick={() => handleSort('process_step')}
                    >
                      <div className="flex items-center">
                        Process Step
                        <SortIcon columnKey="process_step" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-brand-gold/20 text-xs font-semibold text-foreground uppercase tracking-wider px-4 py-3 text-center border-r border-border/40 whitespace-nowrap transition-colors"
                      onClick={() => handleSort('business_score')}
                    >
                      <div className="flex items-center justify-center">
                        Score
                        <SortIcon columnKey="business_score" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-brand-gold/20 text-xs font-semibold text-foreground uppercase tracking-wider px-4 py-3 text-center border-r border-border/40 whitespace-nowrap transition-colors"
                      onClick={() => handleSort('rank')}
                    >
                      <div className="flex items-center justify-center">
                        Rank
                        <SortIcon columnKey="rank" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-brand-gold/20 text-xs font-semibold text-foreground uppercase tracking-wider px-4 py-3 text-left border-r border-border/40 whitespace-nowrap transition-colors"
                      onClick={() => handleSort('delivery_platform')}
                    >
                      <div className="flex items-center">
                        Delivery Platform
                        <SortIcon columnKey="delivery_platform" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-brand-gold/20 text-xs font-semibold text-foreground uppercase tracking-wider px-4 py-3 text-left border-r border-border/40 whitespace-nowrap transition-colors"
                      onClick={() => handleSort('business_owner')}
                    >
                      <div className="flex items-center">
                        Business Owner
                        <SortIcon columnKey="business_owner" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-brand-gold/20 text-xs font-semibold text-foreground uppercase tracking-wider px-4 py-3 text-left border-r border-border/40 whitespace-nowrap transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Submitted Date
                        <SortIcon columnKey="created_at" />
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-brand-gold/20 text-xs font-semibold text-foreground uppercase tracking-wider px-4 py-3 text-center border-r border-border/40 whitespace-nowrap transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center justify-center">
                        Age
                        <SortIcon columnKey="created_at" />
                      </div>
                    </th>
                    <th className="w-12 px-4 py-3 text-center">
                      <button className="text-muted-foreground hover:text-brand-gold transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((request: any) => (
                    <tr 
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50 border-b border-border/60 transition-colors"
                      onClick={() => setSelectedRequestId(request.id)}
                    >
                      <td className="px-4 py-3 border-r border-border/40" onClick={(e) => e.stopPropagation()}>
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
                      </td>
                      <td className="px-4 py-3 border-r border-border/40">
                        <button 
                          className="text-foreground hover:text-brand-gold font-medium text-sm"
                          onClick={(e) => { e.stopPropagation(); setSelectedRequestId(request.id); }}
                        >
                          {request.request_key || `MIM-${String(request.id).slice(-3)}`}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[280px] truncate border-r border-border/40">
                        {request.title || '-'}
                      </td>
                      <td className="px-4 py-3 border-r border-border/40">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded capitalize",
                          getProcessStepInfo(request.process_step).color
                        )}>
                          {getProcessStepInfo(request.process_step).label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-semibold border-r border-border/40">
                        {request.business_score || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center border-r border-border/40">
                        {request.rank || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm border-r border-border/40">
                        {request.delivery_platform || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm border-r border-border/40">
                        {request.business_owner || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm border-r border-border/40">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center border-r border-border/40">
                        {calculateAgeing(request.created_at)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white z-50">
                            <DropdownMenuItem onClick={() => setSelectedRequestId(request.id)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>Clone</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

        {/* Pagination - Production Style */}
        {viewMode === 'list' && sortedRequests.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
            </p>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
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
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-8 h-8 text-sm rounded transition-colors",
                      currentPage === pageNum 
                        ? "bg-brand-gold text-white font-medium" 
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
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
        columns={[]}
        onColumnsChange={() => {}}
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
