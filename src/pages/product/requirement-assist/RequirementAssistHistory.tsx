import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
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
  mockGenerations,
  GenerationHistoryItem,
  StatusFilter,
  SortOption,
} from './components/history';

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
  
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let data = [...mockGenerations];
    
    // Status filter
    if (statusFilter !== 'all') {
      data = data.filter((item) => item.status === statusFilter);
    }
    
    // Search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      data = data.filter(
        (item) =>
          item.title.toLowerCase().includes(search) ||
          item.id.toLowerCase().includes(search) ||
          item.author.name.toLowerCase().includes(search)
      );
    }
    
    // Sort
    switch (sortOption) {
      case 'oldest':
        data.sort((a, b) => b.dateSort - a.dateSort);
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
        data.sort((a, b) => a.dateSort - b.dateSort);
    }
    
    return data;
  }, [statusFilter, debouncedSearch, sortOption]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // Stats counts
  const stats = useMemo(() => ({
    total: mockGenerations.length,
    published: mockGenerations.filter((i) => i.status === 'published').length,
    draft: mockGenerations.filter((i) => i.status === 'draft').length,
    failed: mockGenerations.filter((i) => i.status === 'failed').length,
  }), []);

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
    toast.success(`Duplicating "${item.title}"...`);
    handleClosePanel();
  }, [handleClosePanel]);

  const handleExportPdf = useCallback((item: GenerationHistoryItem) => {
    toast.success(`Exporting "${item.title}" as PDF...`);
  }, []);

  const handleExportExcel = useCallback((item: GenerationHistoryItem) => {
    toast.success(`Exporting "${item.title}" as Excel...`);
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
      toast.success(`Deleted ${selectedIds.size} generations`);
      setSelectedIds(new Set());
    } else if (deleteModal.item) {
      toast.success(`Deleted "${deleteModal.item.title}"`);
      selectedIds.delete(deleteModal.item.id);
      setSelectedIds(new Set(selectedIds));
    }
    setDeleteModal({ isOpen: false, isBulk: false });
    handleClosePanel();
  }, [deleteModal, selectedIds, handleClosePanel]);

  const handleOpenInWizard = useCallback((item: GenerationHistoryItem) => {
    toast.success(`Opening "${item.title}" in Wizard...`);
    handleClosePanel();
    // Pass generation ID to wizard via navigation state
    navigate('/product/requirement-assist', { state: { generationId: item.id } });
  }, [navigate, handleClosePanel]);

  const handleNewGeneration = useCallback(() => {
    navigate('/product/requirement-assist');
  }, [navigate]);

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
        totalCount={stats.total}
        publishedCount={stats.published}
        draftCount={stats.draft}
        failedCount={stats.failed}
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
            totalItems={filteredData.length}
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
