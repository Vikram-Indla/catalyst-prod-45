/**
 * Test Cases Page — Catalyst Release & Test Management Module
 * Route: /releases/test-cases
 * Quality Target: 9.8/10 (GOD-TIER)
 * 
 * Features:
 * - List View (default) with sortable data table
 * - Grid View with responsive card layout
 * - URL-synced filters for shareable views
 * - Bulk actions bar
 * - Pagination
 * - Row actions menu
 * - Keyboard shortcuts (⌘K search, ⌘N create, Esc clear)
 * - Create Test Case dialog with validation
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Upload, 
  Download, 
  Plus, 
  Filter,
  List,
  Grid3x3,
  Columns,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  X,
  FolderInput,
  UserPlus,
  Tags,
  Trash2,
  Command,
  Keyboard,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TestCasesTable } from '@/components/releases/test-cases/TestCasesTable';
import { TestCasesGrid } from '@/components/releases/test-cases/TestCasesGrid';
import { TestCasesKanban } from '@/components/releases/test-cases/TestCasesKanban';
import { TestCaseEmptyState } from '@/components/releases/test-cases/TestCaseEmptyState';
import { CreateTestCaseDialog } from '@/components/releases/test-cases/CreateTestCaseDialog';
import { BulkActionsBar } from '@/components/releases/test-cases/BulkActionsBar';
import { ExportTestCasesDialog } from '@/components/releases/test-cases/ExportTestCasesDialog';
import { ImportTestCasesDialog } from '@/components/releases/test-cases/ImportTestCasesDialog';
import { TestCaseTemplatesDialog } from '@/components/releases/test-cases/TestCaseTemplatesDialog';
import { AIGenerateTestCasesDialog } from '@/components/releases/test-cases/AIGenerateTestCasesDialog';
import { KeyboardShortcutsDialog } from '@/components/releases/test-cases/KeyboardShortcutsDialog';
import { AdvancedFiltersDialog } from '@/components/releases/test-cases/AdvancedFiltersDialog';
import { TestCaseDetailDrawer } from '@/components/releases/test-cases/TestCaseDetailDrawer';
import { testCasesData, TestCase } from '@/data/testCasesData';
import { useTestCaseFilters } from '@/hooks/use-test-case-filters';
import { useTestCaseKeyboardShortcuts } from '@/hooks/use-test-case-keyboard-shortcuts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ViewMode = 'list' | 'grid' | 'kanban';

export default function TestCasesPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('catalyst-test-cases-view') as ViewMode) || 'list';
    }
    return 'list';
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isAIGenerateOpen, setIsAIGenerateOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // URL-synced filters
  const { 
    filters, 
    setFilter, 
    clearFilters, 
    hasActiveFilters, 
    activeFilterCount 
  } = useTestCaseFilters();

  // Keyboard shortcuts
  useTestCaseKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onCreate: () => setIsCreateOpen(true),
    onEscape: () => {
      if (selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    },
    onDelete: () => {
      if (selectedIds.size > 0) {
        toast.error(`${selectedIds.size} test case(s) deleted`);
        setSelectedIds(new Set());
      }
    },
  });

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('catalyst-test-cases-view', viewMode);
  }, [viewMode]);

  // Apply filters
  const filteredTestCases = useMemo(() => {
    return testCasesData.filter(tc => {
      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        if (!tc.id.toLowerCase().includes(query) && !tc.title.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Release filter
      if (filters.releases?.length && !filters.releases.includes(tc.release)) return false;
      // Status filter
      if (filters.statuses?.length && !filters.statuses.includes(tc.status)) return false;
      // Priority filter
      if (filters.priorities?.length && !filters.priorities.includes(tc.priority)) return false;
      // Type filter
      if (filters.types?.length && !filters.types.includes(tc.type)) return false;
      
      return true;
    });
  }, [filters]);

  // Pagination
  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage);
  const paginatedTestCases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTestCases.slice(start, start + itemsPerPage);
  }, [filteredTestCases, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleClearAllFilters = () => {
    clearFilters();
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedTestCases.map(tc => tc.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsRefreshing(false);
    toast.success('Test cases refreshed');
  };

  const handleCreateSuccess = useCallback(() => {
    // Could trigger a refetch here in a real app
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Context Bar / Breadcrumb */}
      <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground uppercase tracking-wide text-xs font-medium">RELEASES</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">Test Cases</span>
          <Badge variant="secondary" className="ml-2 text-xs">
            {filteredTestCases.length} total
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh test cases</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setIsExportOpen(true)}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setIsAIGenerateOpen(true)}>
                <Wand2 className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                AI Generate
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate test cases with AI</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setIsTemplatesOpen(true)}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                From Template
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create from template</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="h-8" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Test Case
                <kbd className="ml-2 text-[10px] bg-primary-foreground/20 px-1 py-0.5 rounded">⌘N</kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create new test case (⌘N)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-background border-b">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              ref={searchInputRef}
              id="test-case-search"
              placeholder="Search test cases..." 
              className="pl-10 pr-16 w-72 h-9"
              value={filters.search || ''}
              onChange={(e) => setFilter('search', e.target.value || undefined)}
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
              ⌘K
            </kbd>
          </div>
          
          {/* Release Filter */}
          <Select 
            value={filters.releases?.[0] || 'all'} 
            onValueChange={(v) => setFilter('releases', v === 'all' ? undefined : [v])}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Release" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Releases</SelectItem>
              <SelectItem value="REL-26.01.01">REL-26.01.01 - Investment Portal</SelectItem>
              <SelectItem value="REL-26.01.02">REL-26.01.02 - Licensing Module</SelectItem>
              <SelectItem value="REL-25.12.01">REL-25.12.01 - Security Patch</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Status Filter */}
          <Select 
            value={filters.statuses?.[0] || 'all'} 
            onValueChange={(v) => setFilter('statuses', v === 'all' ? undefined : [v])}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Priority Filter */}
          <Select 
            value={filters.priorities?.[0] || 'all'} 
            onValueChange={(v) => setFilter('priorities', v === 'all' ? undefined : [v])}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Type Filter */}
          <Select 
            value={filters.types?.[0] || 'all'} 
            onValueChange={(v) => setFilter('types', v === 'all' ? undefined : [v])}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="functional">Functional</SelectItem>
              <SelectItem value="regression">Regression</SelectItem>
              <SelectItem value="smoke">Smoke</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
              <SelectItem value="e2e">End-to-End</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="sm" className="h-9" onClick={() => setIsAdvancedFiltersOpen(true)}>
            <Filter className="w-4 h-4 mr-1.5" />
            More Filters
          </Button>
          
          {activeFilterCount > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 text-muted-foreground hover:text-foreground"
                onClick={handleClearAllFilters}
              >
                Clear all
              </Button>
            </>
          )}
        </div>
        
        {/* View Toggle & Keyboard Hint */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => setIsKeyboardShortcutsOpen(true)}>
                <Keyboard className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium text-xs">Keyboard Shortcuts</p>
              <p className="text-xs text-muted-foreground">Press ? to view all</p>
            </TooltipContent>
          </Tooltip>
          
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2",
                viewMode === 'list' && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2",
                viewMode === 'grid' && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2",
                viewMode === 'kanban' && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode('kanban')}
            >
              <Columns className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {filteredTestCases.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TestCaseEmptyState onClearFilters={handleClearAllFilters} />
            </motion.div>
          ) : viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TestCasesTable 
                testCases={paginatedTestCases}
                selectedIds={selectedIds}
                onSelectAll={handleSelectAll}
                onSelectRow={handleSelectRow}
                allSelected={selectedIds.size === paginatedTestCases.length && paginatedTestCases.length > 0}
                onRowClick={(tc) => {
                  setSelectedTestCase(tc);
                  setIsDetailDrawerOpen(true);
                }}
              />
            </motion.div>
          ) : viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TestCasesGrid 
                testCases={paginatedTestCases}
                selectedIds={selectedIds}
                onSelectRow={handleSelectRow}
                onCardClick={(tc) => {
                  setSelectedTestCase(tc);
                  setIsDetailDrawerOpen(true);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="kanban"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TestCasesKanban 
                testCases={filteredTestCases}
                onCardClick={(tc) => {
                  setSelectedTestCase(tc);
                  setIsDetailDrawerOpen(true);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {filteredTestCases.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 bg-background border-t">
          <span className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTestCases.length)}</span> of <span className="font-medium text-foreground">{filteredTestCases.length}</span> test cases
          </span>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Page Numbers */}
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
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2 text-muted-foreground">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
              
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            totalCount={filteredTestCases.length}
            onSelectAll={() => setSelectedIds(new Set(filteredTestCases.map(tc => tc.id)))}
            onClear={clearSelection}
            onMove={() => toast.info('Move to Release dialog coming soon')}
            onAssign={() => toast.info('Assign dialog coming soon')}
            onAddTags={() => toast.info('Add Tags dialog coming soon')}
            onDelete={() => {
              toast.error(`${selectedIds.size} test case(s) deleted`);
              setSelectedIds(new Set());
            }}
            onExecute={() => toast.success(`Starting execution for ${selectedIds.size} test case(s)...`)}
            onDuplicate={() => toast.success(`${selectedIds.size} test case(s) duplicated`)}
            onExport={() => setIsExportOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Create Test Case Dialog */}
      <CreateTestCaseDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Export Test Cases Dialog */}
      <ExportTestCasesDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        selectedCount={selectedIds.size}
        totalCount={filteredTestCases.length}
      />

      {/* Import Test Cases Dialog */}
      <ImportTestCasesDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={(count) => toast.success(`Imported ${count} test cases`)}
      />

      {/* Templates Dialog */}
      <TestCaseTemplatesDialog
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
        onSelectTemplate={(template) => {
          setIsTemplatesOpen(false);
          setIsCreateOpen(true);
          toast.info(`Template "${template.name}" loaded`);
        }}
      />

      {/* AI Generate Dialog */}
      <AIGenerateTestCasesDialog
        open={isAIGenerateOpen}
        onOpenChange={setIsAIGenerateOpen}
        onTestCasesGenerated={(testCases) => {
          toast.success(`Added ${testCases.length} AI-generated test cases`);
        }}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={isKeyboardShortcutsOpen}
        onOpenChange={setIsKeyboardShortcutsOpen}
      />

      {/* Advanced Filters Dialog */}
      <AdvancedFiltersDialog
        open={isAdvancedFiltersOpen}
        onOpenChange={setIsAdvancedFiltersOpen}
        onApplyFilters={(advFilters) => {
          // Map advanced filters to URL-synced filters
          if (advFilters.statuses.length) setFilter('statuses', advFilters.statuses);
          if (advFilters.priorities.length) setFilter('priorities', advFilters.priorities);
          if (advFilters.types.length) setFilter('types', advFilters.types);
          toast.success('Filters applied');
        }}
      />

      {/* Test Case Detail Drawer */}
      <TestCaseDetailDrawer
        testCase={selectedTestCase ? {
          id: selectedTestCase.id,
          title: selectedTestCase.title,
          status: selectedTestCase.status,
          priority: selectedTestCase.priority,
          type: selectedTestCase.type,
          lastRunStatus: selectedTestCase.lastRun as any,
          automationStatus: 'manual',
        } : null}
        open={isDetailDrawerOpen}
        onOpenChange={setIsDetailDrawerOpen}
        onEdit={() => {
          setIsDetailDrawerOpen(false);
          toast.info('Edit mode coming soon');
        }}
        onExecute={() => {
          toast.success(`Starting execution for ${selectedTestCase?.id}...`);
        }}
      />
    </div>
  );
}
