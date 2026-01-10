import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RANavigationTabs } from './components/RANavigationTabs';
import {
  HistoryStatsBar,
  HistoryFiltersBar,
  HistoryBulkActionsBar,
  HistoryTable,
  HistoryPagination,
  HistoryEmptyState,
  HistoryDetailPanel,
  HistoryDeleteModal,
  GenerationHistoryItem,
  StatusFilter,
  SortOption,
  mapGenerationToHistoryItem,
} from './components/history';
import {
  useRAGenerations,
  useRAGenerationStats,
  useDeleteRAGeneration,
  useDuplicateRAGeneration,
  useRAGenerationsRealtime,
} from '@/hooks/requirement-assist';
import type { GenerationStatus } from '@/types/requirement-assist';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchRAGeneratedItemsForExport,
  exportRequirementAssistPdf,
  exportRequirementAssistExcel,
} from './utils/exports';

const ITEMS_PER_PAGE = 10;

export default function RequirementAssistHistory() {
  const navigate = useNavigate();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Panel state
  const [detailItem, setDetailItem] = useState<GenerationHistoryItem | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item?: GenerationHistoryItem;
    isBulk: boolean;
  }>({ isOpen: false, isBulk: false });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Fetch data from Supabase
  const { data: generations, isLoading, error } = useRAGenerations({
    status: statusFilter === 'all' ? undefined : statusFilter as GenerationStatus,
    search: debouncedSearch || undefined,
  });
  
  const { data: stats, isLoading: statsLoading } = useRAGenerationStats();
  
  // Enable realtime subscriptions for live updates
  useRAGenerationsRealtime();
  
  // Mutations
  const deleteMutation = useDeleteRAGeneration();
  const duplicateMutation = useDuplicateRAGeneration();

  // Map database records to UI format
  const historyItems = useMemo(() => {
    if (!generations) return [];
    return generations.map(g => mapGenerationToHistoryItem(g));
  }, [generations]);

  // Sort data
  const sortedData = useMemo(() => {
    let data = [...historyItems];
    
    switch (sortOption) {
      case 'oldest':
        data.sort((a, b) => a.dateSort - b.dateSort);
        break;
      case 'items':
        data.sort((a, b) => {
          const aTotal = a.items.prd + a.items.epics + a.items.features + a.items.stories;
          const bTotal = b.items.prd + b.items.epics + b.items.features + b.items.stories;
          return bTotal - aTotal;
        });
        break;
      case 'title':
        data.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // newest
        data.sort((a, b) => b.dateSort - a.dateSort);
    }
    
    return data;
  }, [historyItems, sortOption]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  // Check if filters are active
  const hasFilters = Boolean(debouncedSearch || dateFrom || dateTo || statusFilter !== 'all');

  // Handlers
  const handleStatusFilterChange = useCallback((filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setSortOption('newest');
    setCurrentPage(1);
    toast.success('Filters cleared');
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((i) => i.id)));
    }
  }, [selectedIds.size, paginatedData]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleViewDetails = useCallback((item: GenerationHistoryItem) => {
    setDetailItem(item);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setTimeout(() => setDetailItem(null), 300);
  }, []);

  const handleDuplicate = useCallback((item: GenerationHistoryItem) => {
    if (item._originalId) {
      duplicateMutation.mutate(item._originalId);
    }
    handleClosePanel();
  }, [duplicateMutation, handleClosePanel]);

  const handleExportPdf = useCallback(async (item: GenerationHistoryItem) => {
    if (!item._originalId) {
      toast.error('Cannot export: missing generation ID');
      return;
    }
    
    const loadingToast = toast.loading(`Exporting "${item.title}" as PDF...`);
    try {
      const items = await fetchRAGeneratedItemsForExport(item._originalId);
      await exportRequirementAssistPdf(items, {
        title: item.title,
        generationDisplayId: item.id,
      });
      toast.dismiss(loadingToast);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to export PDF');
    }
  }, []);

  const handleExportExcel = useCallback(async (item: GenerationHistoryItem) => {
    if (!item._originalId) {
      toast.error('Cannot export: missing generation ID');
      return;
    }
    
    const loadingToast = toast.loading(`Exporting "${item.title}" as Excel...`);
    try {
      const items = await fetchRAGeneratedItemsForExport(item._originalId);
      await exportRequirementAssistExcel(items, {
        title: item.title,
        generationDisplayId: item.id,
      });
      toast.dismiss(loadingToast);
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to export Excel');
    }
  }, []);

  const handleDeleteItem = useCallback((item: GenerationHistoryItem) => {
    setDeleteModal({ isOpen: true, item, isBulk: false });
  }, []);

  const handleBulkExport = useCallback(() => {
    toast.success(`Exporting ${selectedIds.size} generations...`);
    setSelectedIds(new Set());
  }, [selectedIds.size]);

  const handleBulkDelete = useCallback(() => {
    setDeleteModal({ isOpen: true, isBulk: true });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.isBulk) {
      // Bulk delete - find original IDs from historyItems
      const idsToDelete = historyItems
        .filter(item => selectedIds.has(item.id) && item._originalId)
        .map(item => item._originalId!);
      
      idsToDelete.forEach(id => deleteMutation.mutate(id));
      setSelectedIds(new Set());
    } else if (deleteModal.item?._originalId) {
      deleteMutation.mutate(deleteModal.item._originalId);
    }
    setDeleteModal({ isOpen: false, isBulk: false });
    handleClosePanel();
  }, [deleteModal, selectedIds, historyItems, deleteMutation, handleClosePanel]);

  const handleOpenInWizard = useCallback((item: GenerationHistoryItem) => {
    handleClosePanel();
    navigate('/product/requirement-assist', { 
      state: { generationId: item._originalId || item.id } 
    });
  }, [navigate, handleClosePanel]);

  const handleNewGeneration = useCallback(() => {
    navigate('/product/requirement-assist');
  }, [navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col">
        <div className="bg-white border-b border-[#e2e8f0] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[#94a3b8]">Product</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span className="text-[#94a3b8]">Requirement Assist™</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span className="font-semibold text-[#0f172a]">History</span>
          </div>
        </div>
        <RANavigationTabs />
        <div className="grid grid-cols-4 gap-4 p-5">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="px-5 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error loading generations</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Page Header with Breadcrumb */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-[#94a3b8]">Product</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" />
          <span className="text-[#94a3b8]">Requirement Assist™</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" />
          <span className="font-semibold text-[#0f172a]">History</span>
        </div>
        <Button
          onClick={handleNewGeneration}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Generation
        </Button>
      </div>

      {/* Navigation Tabs */}
      <RANavigationTabs />

      {/* Stats Bar */}
      <HistoryStatsBar
        totalCount={stats?.total ?? 0}
        publishedCount={stats?.published ?? 0}
        draftCount={stats?.draft ?? 0}
        failedCount={stats?.failed ?? 0}
        activeFilter={statusFilter}
        onFilterChange={handleStatusFilterChange}
      />

      {/* Filters Bar */}
      <HistoryFiltersBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onClearFilters={handleClearFilters}
      />

      {/* Bulk Actions Bar */}
      <HistoryBulkActionsBar
        selectedCount={selectedIds.size}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
        onClear={handleClearSelection}
      />

      {/* Table or Empty State */}
      {paginatedData.length > 0 ? (
        <>
          <HistoryTable
            data={paginatedData}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onViewDetails={handleViewDetails}
            onDuplicate={handleDuplicate}
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            onDelete={handleDeleteItem}
          />
          <HistoryPagination
            currentPage={currentPage}
            totalItems={sortedData.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <HistoryEmptyState hasFilters={hasFilters} onNewGeneration={handleNewGeneration} />
      )}

      {/* Detail Panel */}
      <HistoryDetailPanel
        item={detailItem}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        onOpenInWizard={handleOpenInWizard}
        onDuplicate={handleDuplicate}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onDelete={handleDeleteItem}
      />

      {/* Delete Confirmation Modal */}
      <HistoryDeleteModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.item?.title || ''}
        isBulk={deleteModal.isBulk}
        count={selectedIds.size}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, isBulk: false })}
      />
    </div>
  );
}
