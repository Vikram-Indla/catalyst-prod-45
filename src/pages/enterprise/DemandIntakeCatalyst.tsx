import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';

// Catalyst/shadcn imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertTriangle,
} from 'lucide-react';

// EnterpriseTable component
import { EnterpriseTable, Column } from '@/components/industry/EnterpriseTable';

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

// Business Request type for EnterpriseTable
interface BusinessRequest {
  id: string;
  request_key: string | null;
  title: string | null;
  process_step: string | null;
  business_score: number | null;
  rank: number | null;
  delivery_platform: string | null;
  business_owner: string | null;
  created_at: string | null;
  end_date: string | null;
  department: string | null;
  planned_quarter: string | null;
  [key: string]: any;
}

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

  // Process and filter data
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
    
    return filtered.map((req, idx) => ({
      ...req,
      displayRank: idx + 1
    }));
  }, [requests, filters]);

  const totalPages = Math.ceil(sortedRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

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

  // Handle row update from EnterpriseTable inline editing
  const handleRowUpdate = async (rowId: string, columnId: string, newValue: any) => {
    const { error } = await supabase
      .from('business_requests')
      .update({ [columnId]: newValue })
      .eq('id', rowId);
    
    if (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    toast({ title: 'Updated successfully' });
  };

  // Handle row delete from EnterpriseTable
  const handleRowDelete = async (rowId: string) => {
    const { error } = await supabase
      .from('business_requests')
      .delete()
      .eq('id', rowId);
    
    if (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    toast({ title: 'Deleted successfully' });
  };

  // Define columns for EnterpriseTable
  const tableColumns: Column<BusinessRequest>[] = useMemo(() => [
    {
      id: 'request_key',
      header: 'Request ID',
      accessor: 'request_key',
      width: '100px',
      sortable: true,
      renderCell: (value, row) => (
        <span className="text-foreground hover:text-brand-gold font-medium text-sm">
          {value || `MIM-${String(row.id).slice(-3)}`}
        </span>
      ),
    },
    {
      id: 'title',
      header: 'Summary',
      accessor: 'title',
      width: '280px',
      sortable: true,
      editable: true,
      editType: 'text',
      renderCell: (value) => (
        <span className="max-w-[280px] truncate block">{value || '-'}</span>
      ),
    },
    {
      id: 'process_step',
      header: 'Process Step',
      accessor: 'process_step',
      sortable: true,
      filterable: true,
      filterOptions: PROCESS_STEPS.map(step => ({
        value: step.value,
        label: step.label,
      })),
      renderCell: (value) => (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded bg-muted/50 text-foreground border border-border">
          {getProcessStepInfo(value).label}
        </span>
      ),
    },
    {
      id: 'business_score',
      header: 'Score',
      accessor: 'business_score',
      width: '80px',
      sortable: true,
      editable: true,
      editType: 'number',
      renderCell: (value) => (
        <span className="text-center font-semibold block">{value || '—'}</span>
      ),
    },
    {
      id: 'rank',
      header: 'Rank',
      accessor: 'rank',
      width: '80px',
      sortable: true,
      renderCell: (value) => (
        <span className="text-center block">{value || '-'}</span>
      ),
    },
    {
      id: 'delivery_platform',
      header: 'Delivery Platform',
      accessor: 'delivery_platform',
      sortable: true,
      editable: true,
      editType: 'text',
      renderCell: (value) => value || '-',
    },
    {
      id: 'business_owner',
      header: 'Business Owner',
      accessor: 'business_owner',
      sortable: true,
      renderCell: (value) => value || '-',
    },
    {
      id: 'created_at',
      header: 'Submitted Date',
      accessor: 'created_at',
      sortable: true,
      renderCell: (value) => (
        <span className="text-muted-foreground">{formatDate(value)}</span>
      ),
    },
    {
      id: 'age',
      header: 'Age',
      accessor: (row) => calculateAgeing(row.created_at),
      width: '60px',
      sortable: true,
      renderCell: (value) => (
        <span className="text-center text-muted-foreground block">{value}</span>
      ),
    },
  ], []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header aligned with sidebar - h-12 to match sidebar header */}
      <header className="h-12 px-6 border-b border-border flex items-center shrink-0">
        <h1 className="text-xl font-semibold text-foreground">Product Backlog</h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col px-6 py-4">

        {/* Controls Bar */}
        <div className="flex items-center justify-between mb-4">
          {/* Left - Search */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white border-border"
            />
          </div>

          {/* Right - View Toggle and Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View Toggle */}
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

            <Button
              variant="outline"
              size="icon"
              onClick={() => setFiltersDialogOpen(true)}
              className={cn(
                "h-8 w-8 border-border bg-white",
                activeFilterCount > 0 && "border-brand-gold text-brand-gold"
              )}
              title="Filters"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-gold text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              className="h-8 w-8 border-border bg-white"
              title="Export"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setCreateModalOpen(true)}
              size="icon"
              className="h-8 w-8 bg-brand-gold hover:bg-brand-gold-hover text-white"
              title="Create"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table Content - auto height to fit content */}
        <div className="flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="bg-white border border-border rounded-lg shadow-sm p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : viewMode === 'kanban' ? (
            <div className="bg-white border border-border rounded-lg shadow-sm flex-1 overflow-auto">
              <StatusSummaryKanbanView 
                requests={sortedRequests}
                onRequestSelect={(id) => setSelectedRequestId(id)}
              />
            </div>
          ) : sortedRequests.length > 0 ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* EnterpriseTable with inline editing */}
              <div className="flex-1 overflow-auto">
                <EnterpriseTable
                  data={paginatedRequests as BusinessRequest[]}
                  columns={tableColumns}
                  onRowClick={(row) => setSelectedRequestId(row.id)}
                  onRowUpdate={handleRowUpdate}
                  onRowDelete={handleRowDelete}
                  editMode="cell"
                  enableUndo={true}
                  showCheckboxes={true}
                  showActionsColumn={true}
                  selectedRows={selectedRows}
                  onSelectionChange={setSelectedRows}
                />
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-white">
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md transition-colors whitespace-nowrap",
                      currentPage === 1 
                        ? "text-muted-foreground/50 cursor-not-allowed" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 text-sm rounded-md transition-colors",
                        currentPage === pageNum 
                          ? "bg-brand-gold text-white font-medium" 
                          : "text-muted-foreground hover:bg-muted border border-border"
                      )}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md transition-colors whitespace-nowrap",
                      currentPage >= totalPages 
                        ? "text-muted-foreground/50 cursor-not-allowed" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-lg shadow-sm flex flex-col items-center justify-center py-16 text-center">
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
