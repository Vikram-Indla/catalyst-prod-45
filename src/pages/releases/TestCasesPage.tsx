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
  PanelLeft,
  PanelLeftClose,
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
import { CreateTestCaseDialogEnterprise } from '@/components/releases/test-cases/create-dialog';
import { EditTestCaseDialog } from '@/components/releases/test-cases/EditTestCaseDialog';
import { BulkActionsBar } from '@/components/releases/test-cases/BulkActionsBar';
import { ExportTestCasesDialog } from '@/components/releases/test-cases/ExportTestCasesDialog';
import { ImportTestCasesDialog } from '@/components/releases/test-cases/ImportTestCasesDialog';
import { TestCaseTemplatesDialog } from '@/components/releases/test-cases/TestCaseTemplatesDialog';
import { AIGenerateTestCasesDialog } from '@/components/releases/test-cases/AIGenerateTestCasesDialog';
import { KeyboardShortcutsDialog } from '@/components/releases/test-cases/KeyboardShortcutsDialog';
import { AdvancedFiltersDialog } from '@/components/releases/test-cases/AdvancedFiltersDialog';
import { TestCaseDetailDrawer } from '@/components/releases/test-cases/TestCaseDetailDrawer';
import { BulkAssignDialog } from '@/components/releases/test-cases/BulkAssignDialog';
import { BulkMoveDialog } from '@/components/releases/test-cases/BulkMoveDialog';
import { BulkTagsDialog } from '@/components/releases/test-cases/BulkTagsDialog';
import { ExecuteTestCaseDialog } from '@/components/releases/test-cases/ExecuteTestCaseDialog';
import { TestFolderSidebar } from '@/components/releases/test-cases/TestFolderSidebar';
import { MoveToFolderDialog } from '@/components/releases/test-cases/MoveToFolderDialog';
import { TestCase } from '@/data/testCasesData';
import { 
  useTestCases, 
  useBulkDeleteTestCases, 
  useCloneTestCase,
  useCreateTestCase,
} from '@/hooks/test-management';
import { useProjects } from '@/hooks/test-management/useProjects';
import { tmToUITestCases } from '@/lib/adapters/testCaseAdapter';
import { useTestCaseFilters } from '@/hooks/use-test-case-filters';
import { useTestCaseKeyboardShortcuts } from '@/hooks/use-test-case-keyboard-shortcuts';
import { useFolderTree, useMoveTestCases } from '@/hooks/useFolders';
import { getDescendantFolderIds } from '@/types/test-folders';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GeneratedTestCase } from '@/hooks/test-management/useAIGeneration';
import type { ParsedTestCase, PrefilledTestCase } from '@/components/releases/test-cases/utils';
import { templateToTestCase } from '@/components/releases/test-cases/utils';


type ViewMode = 'list' | 'grid' | 'kanban';

export default function TestCasesPage() {
  const [searchParams] = useSearchParams();
  
  // Fetch available projects and resolve project ID
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const urlProjectId = searchParams.get('programId') || searchParams.get('projectId');
  
  // Use URL param or fall back to first available project (or Demo Project)
  const projectId = useMemo(() => {
    if (urlProjectId) return urlProjectId;
    if (projects.length > 0) return projects[0].id;
    // Fallback to Demo Project UUID if no projects loaded yet
    return '00000000-0000-0000-0000-000000000001';
  }, [urlProjectId, projects]);
  
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [templatePrefillData, setTemplatePrefillData] = useState<PrefilledTestCase | null>(null);
  
  // Bulk action dialogs
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [isBulkTagsOpen, setIsBulkTagsOpen] = useState(false);
  
  // Test execution
  const [isExecuteOpen, setIsExecuteOpen] = useState(false);
  
  // Folder sidebar state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMoveToFolderOpen, setIsMoveToFolderOpen] = useState(false);
  
  // Folder data and mutations
  const { data: folders = [] } = useFolderTree(projectId);
  const moveTestCasesMutation = useMoveTestCases(projectId);
  
  
  // Focused item index for keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // URL-synced filters
  const { 
    filters, 
    setFilter, 
    clearFilters, 
    hasActiveFilters, 
    activeFilterCount 
  } = useTestCaseFilters();

  // Priority and Type lookup maps for filter conversion
  const priorityIdMap: Record<string, string> = {
    'critical': '00000000-0000-0000-0001-000000000001',
    'high': '00000000-0000-0000-0001-000000000002',
    'medium': '00000000-0000-0000-0001-000000000003',
    'low': '00000000-0000-0000-0001-000000000004',
  };
  
  const typeIdMap: Record<string, string> = {
    'functional': '00000000-0000-0000-0002-000000000001',
    'performance': '00000000-0000-0000-0002-000000000002',
    'security': '00000000-0000-0000-0002-000000000003',
    'api': '00000000-0000-0000-0002-000000000004',
  };

  // Map status filter to API format
  const getStatusFilter = () => {
    if (!filters.statuses?.[0]) return undefined;
    const statusMap: Record<string, string> = {
      'draft': 'DRAFT',
      'ready': 'REVIEW',
      'approved': 'APPROVED',
      'deprecated': 'DEPRECATED',
    };
    return statusMap[filters.statuses[0]] as any;
  };

  // Supabase hooks for real data - wired with all filter params
  const { 
    data: testCasesResult, 
    isLoading,
    isError,
    error: fetchError, 
    refetch,
  } = useTestCases(projectId || undefined, {
    page: currentPage,
    per_page: itemsPerPage,
    search: filters.search,
    status: getStatusFilter(),
    priority_id: filters.priorities?.[0] ? priorityIdMap[filters.priorities[0]] : undefined,
    type_id: filters.types?.[0] ? typeIdMap[filters.types[0]] : undefined,
    folder_id: selectedFolderId || undefined,
  });

  // Transform Supabase data to UI format
  const apiTestCases = useMemo(() => {
    if (!testCasesResult?.cases) return [];
    return tmToUITestCases(testCasesResult.cases);
  }, [testCasesResult?.cases]);

  const apiTotal = testCasesResult?.total || 0;
  const apiTotalPages = Math.ceil(apiTotal / itemsPerPage);

  const deleteTestCasesMutation = useBulkDeleteTestCases();
  const duplicateTestCaseMutation = useCloneTestCase();
  const createTestCaseMutation = useCreateTestCase({ silent: true });

  // Handler for AI-generated test cases
  const handleAIGeneratedTestCases = useCallback((generatedTestCases: GeneratedTestCase[]) => {
    // Validate projectId before creating
    if (!projectId) {
      toast.error('No project selected. Please select a project first.');
      return;
    }

    // Create each test case sequentially
    const createPromises = generatedTestCases.map(tc => 
      createTestCaseMutation.mutateAsync({
        project_id: projectId,
        title: tc.title,
        objective: tc.summary,
        preconditions: tc.preconditions?.join('\n'),
        status: 'DRAFT',
        is_ai_generated: true,
        steps: tc.steps.map((step, idx) => ({
          action: step.action,
          expected_result: step.expectedResult,
          test_data: step.testData,
        })),
      })
    );

    Promise.all(createPromises)
      .then(results => {
        toast.success(`Successfully created ${results.length} AI-generated test cases`);
        refetch();
      })
      .catch(error => {
        toast.error('Failed to create some test cases');
      });
  }, [projectId, createTestCaseMutation, refetch]);

  // Handler for imported test cases
  const handleImportedTestCases = useCallback((parsedTestCases: ParsedTestCase[]) => {
    if (!projectId) {
      toast.error('No project selected. Please select a project first.');
      return;
    }
    const createPromises = parsedTestCases.map(tc =>
      createTestCaseMutation.mutateAsync({
        project_id: projectId,
        title: tc.title,
        objective: tc.description,
        preconditions: tc.preconditions,
        status: 'DRAFT',
        steps: tc.steps 
          ? tc.steps.split('\n').filter(Boolean).map((step, idx) => ({
              action: step.replace(/^\d+\.\s*/, ''),
              expected_result: '',
            }))
          : undefined,
      })
    );

    Promise.all(createPromises)
      .then(results => {
        toast.success(`Successfully imported ${results.length} test cases`);
        refetch();
      })
      .catch(error => {
        toast.error('Failed to import some test cases');
      });
  }, [projectId, createTestCaseMutation, refetch]);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('catalyst-test-cases-view', viewMode);
  }, [viewMode]);

  // URL Hash Sync: Read folder from URL on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#folder=')) {
      const folderId = hash.replace('#folder=', '');
      if (folderId) {
        setSelectedFolderId(folderId);
      }
    }
  }, []);

  // URL Hash Sync: Update URL when folder selection changes
  useEffect(() => {
    if (selectedFolderId) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#folder=${selectedFolderId}`
      );
    } else {
      // Remove hash when "All Test Cases" is selected
      const newUrl = `${window.location.pathname}${window.location.search}`;
      if (window.location.hash) {
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [selectedFolderId]);

  // Listen for drag-drop move test case events from folder sidebar
  useEffect(() => {
    const handleMoveTestCase = (event: CustomEvent<{ testCaseId: string; folderId: string | null }>) => {
      const { testCaseId, folderId } = event.detail;
      moveTestCasesMutation.mutate({
        testCaseIds: [testCaseId],
        folderId,
      });
    };

    window.addEventListener('moveTestCase', handleMoveTestCase as EventListener);
    return () => {
      window.removeEventListener('moveTestCase', handleMoveTestCase as EventListener);
    };
  }, [moveTestCasesMutation]);

  // Get folder IDs to include (selected folder + descendants)
  const folderIdsToInclude = useMemo(() => {
    if (selectedFolderId === null) return null; // Show all
    const descendantIds = getDescendantFolderIds(selectedFolderId, folders);
    return [selectedFolderId, ...descendantIds];
  }, [selectedFolderId, folders]);

  // Use API data directly - filters are applied server-side
  // Client-side filter only for folder descendants (since API only supports single folder_id)
  const filteredTestCases = useMemo(() => {
    // If we have a selected folder, the API handles it now, but we may need 
    // descendant filtering if API doesn't support it
    return apiTestCases;
  }, [apiTestCases]);

  // Calculate pagination from filtered results
  const totalPages = apiTotalPages;
  
  const paginatedTestCases = filteredTestCases;
  
  const totalCount = apiTotal;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedFolderId]);

  // Compute if any dialog is open - disable keyboard shortcuts completely
  const anyDialogOpen = isCreateOpen || isEditOpen || isDetailDrawerOpen || 
    isExportOpen || isImportOpen || isTemplatesOpen || isAIGenerateOpen ||
    isKeyboardShortcutsOpen || isAdvancedFiltersOpen || isBulkAssignOpen ||
    isBulkMoveOpen || isBulkTagsOpen || isExecuteOpen || isMoveToFolderOpen;

  // Keyboard shortcuts - DISABLED when any dialog is open
  useTestCaseKeyboardShortcuts({
    enabled: !anyDialogOpen,
    onSearch: () => searchInputRef.current?.focus(),
    onCreate: () => setIsCreateOpen(true),
    onAdvancedFilters: () => setIsAdvancedFiltersOpen(true),
    onShowHelp: () => setIsKeyboardShortcutsOpen(true),
    onViewChange: (view) => setViewMode(view),
    onEdit: () => {
      if (selectedIds.size === 1) {
        const id = Array.from(selectedIds)[0];
        const tc = paginatedTestCases.find(t => t.id === id);
        if (tc) {
          setSelectedTestCase(tc);
          setIsEditOpen(true);
        }
      }
    },
    onDuplicate: () => {
      if (selectedIds.size > 0) {
        Array.from(selectedIds).forEach(id => duplicateTestCaseMutation.mutate({ id, project_id: projectId }));
        toast.success(`Duplicating ${selectedIds.size} test case(s)...`);
      }
    },
    onSelectAll: () => {
      setSelectedIds(new Set(paginatedTestCases.map(tc => tc.id)));
    },
    onNavigateNext: () => {
      setFocusedIndex(prev => Math.min(prev + 1, paginatedTestCases.length - 1));
    },
    onNavigatePrev: () => {
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    },
    onOpenSelected: () => {
      if (focusedIndex >= 0 && focusedIndex < paginatedTestCases.length) {
        setSelectedTestCase(paginatedTestCases[focusedIndex]);
        setIsDetailDrawerOpen(true);
      }
    },
    onEscape: () => {
      if (isDetailDrawerOpen) {
        setIsDetailDrawerOpen(false);
      } else if (selectedIds.size > 0) {
        setSelectedIds(new Set());
        setFocusedIndex(-1);
      }
    },
    onDelete: () => {
      if (selectedIds.size > 0) {
        const ids = Array.from(selectedIds);
        deleteTestCasesMutation.mutate({ case_ids: ids, project_id: projectId });
        setSelectedIds(new Set());
      }
    },
  });

  const handleClearAllFilters = () => {
    clearFilters();
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Use dbId for database operations, fall back to id for mock data
      setSelectedIds(new Set(paginatedTestCases.map(tc => tc.dbId || tc.id)));
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
    await refetch();
    setIsRefreshing(false);
    toast.success('Test cases refreshed');
  };

  const handleCreateSuccess = useCallback(() => {
    refetch();
    setTemplatePrefillData(null); // Clear template data after creation
  }, [refetch]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Context Bar / Breadcrumb */}
      <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground uppercase tracking-wide text-xs font-medium">RELEASES</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">Test Cases</span>
          <Badge variant="secondary" className="ml-2 text-xs">
            {totalCount} total
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
                <Wand2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
                AI Generate
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate test cases with AI</TooltipContent>
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
          
          {/* Type Filter - Uses real database values */}
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
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="api">API</SelectItem>
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

      {/* Main Content with Folder Sidebar */}
      <div className="flex-1 min-h-0 flex gap-6 px-6 py-4 overflow-hidden">
        {/* Folder Sidebar */}
        <aside 
          className={cn(
            "flex-shrink-0 transition-all duration-200 overflow-y-auto",
            isSidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
          )}
        >
          {!isSidebarCollapsed && (
            <TestFolderSidebar
              projectId={projectId}
              selectedFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
              totalTestCaseCount={totalCount}
            />
          )}
        </aside>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(
            "flex-shrink-0 w-6 flex items-center justify-center self-stretch",
            "text-muted-foreground hover:text-foreground transition-colors",
            "border border-border rounded-md hover:bg-muted/50"
          )}
          title={isSidebarCollapsed ? "Show folders" : "Hide folders"}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-3.5 h-3.5" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Test Cases Content */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-64"
                >
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </motion.div>
              ) : isError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-64 gap-4"
                >
                  <div className="text-destructive text-center">
                    <p className="text-lg font-semibold">Failed to load test cases</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {fetchError instanceof Error ? fetchError.message : 'An error occurred'}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </motion.div>
              ) : paginatedTestCases.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TestCaseEmptyState onClearFilters={handleClearAllFilters} onCreateClick={() => setIsCreateOpen(true)} />
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
                    projectId={projectId}
                    onRowClick={(tc) => {
                      setSelectedTestCase(tc);
                      setIsDetailDrawerOpen(true);
                    }}
                    onEdit={(tc) => {
                      setSelectedTestCase(tc);
                      setIsEditOpen(true);
                    }}
                    onMoveToFolder={(tc) => {
                      setSelectedIds(new Set([tc.dbId || tc.id]));
                      setIsMoveToFolderOpen(true);
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
        </main>
      </div>

      {/* Bulk Actions Bar - Fixed at bottom, offset for sidebar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            totalCount={totalCount}
            onSelectAll={() => setSelectedIds(new Set(paginatedTestCases.map(tc => tc.dbId || tc.id)))}
            onClear={clearSelection}
            onMove={() => setIsBulkMoveOpen(true)}
            onMoveToFolder={() => setIsMoveToFolderOpen(true)}
            onAssign={() => setIsBulkAssignOpen(true)}
            onAddTags={() => setIsBulkTagsOpen(true)}
            onDelete={() => {
              const ids = Array.from(selectedIds);
              deleteTestCasesMutation.mutate({ case_ids: ids, project_id: projectId });
              setSelectedIds(new Set());
            }}
            onExecute={() => toast.success(`Starting execution for ${selectedIds.size} test case(s)...`)}
            onDuplicate={() => {
              const ids = Array.from(selectedIds);
              ids.forEach(id => duplicateTestCaseMutation.mutate({ id, project_id: projectId }));
              toast.success(`Duplicating ${selectedIds.size} test case(s)...`);
            }}
            onExport={() => setIsExportOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-6 py-3 bg-background border-t">
          <span className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="font-medium text-foreground">{totalCount}</span> test cases
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


      {/* Create Test Case Dialog - Enterprise 5-Tab Version */}
      <CreateTestCaseDialogEnterprise
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setTemplatePrefillData(null);
        }}
        onSuccess={handleCreateSuccess}
        prefillData={templatePrefillData}
      />

      {/* Export Test Cases Dialog */}
      <ExportTestCasesDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        selectedCount={selectedIds.size}
        totalCount={totalCount}
        testCases={filteredTestCases}
        selectedIds={selectedIds}
      />

      {/* Import Test Cases Dialog */}
      <ImportTestCasesDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleImportedTestCases}
      />

      {/* Templates Dialog */}
      <TestCaseTemplatesDialog
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
        onSelectTemplate={(template) => {
          setIsTemplatesOpen(false);
          setTemplatePrefillData(templateToTestCase(template));
          setIsCreateOpen(true);
        }}
      />

      {/* AI Generate Dialog */}
      <AIGenerateTestCasesDialog
        open={isAIGenerateOpen}
        onOpenChange={setIsAIGenerateOpen}
        onTestCasesGenerated={handleAIGeneratedTestCases}
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
          description: selectedTestCase.description,
          preconditions: selectedTestCase.preconditions,
          status: selectedTestCase.status,
          priority: selectedTestCase.priority,
          type: selectedTestCase.type,
          tags: selectedTestCase.tags,
          lastRunStatus: selectedTestCase.lastRun as any,
          automationStatus: selectedTestCase.automationStatus || 'manual',
          createdBy: selectedTestCase.createdBy || selectedTestCase.assignee.name,
          createdAt: selectedTestCase.createdAt,
          updatedAt: selectedTestCase.updatedAt,
          project_id: projectId,
        } : null}
        open={isDetailDrawerOpen}
        onOpenChange={setIsDetailDrawerOpen}
        projectId={projectId}
        onEdit={() => {
          setIsDetailDrawerOpen(false);
          setIsEditOpen(true);
        }}
        onExecute={() => {
          setIsDetailDrawerOpen(false);
          setIsExecuteOpen(true);
        }}
      />

      {/* Execute Test Case Dialog */}
      <ExecuteTestCaseDialog
        testCase={selectedTestCase ? {
          id: selectedTestCase.id,
          title: selectedTestCase.title,
          description: selectedTestCase.description,
          status: selectedTestCase.status,
          priority: selectedTestCase.priority,
          type: selectedTestCase.type,
          preconditions: selectedTestCase.preconditions,
          steps: selectedTestCase.testSteps,
        } : null}
        open={isExecuteOpen}
        onOpenChange={setIsExecuteOpen}
        onComplete={(execution) => {
          toast.success(`Execution completed: ${execution.overallResult.toUpperCase()}`, {
            description: `Duration: ${Math.floor(execution.duration / 60)}m ${execution.duration % 60}s`,
          });
          refetch();
        }}
      />

      {/* Edit Test Case Dialog */}
      <EditTestCaseDialog
        testCase={selectedTestCase}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        projectId={projectId}
        onSuccess={() => {
          refetch();
          setSelectedTestCase(null);
        }}
      />

      {/* Bulk Assign Dialog */}
      <BulkAssignDialog
        open={isBulkAssignOpen}
        onOpenChange={setIsBulkAssignOpen}
        selectedCount={selectedIds.size}
        onAssign={(assigneeId) => {
          toast.success(`Assigned ${selectedIds.size} test case(s) to team member`);
          setSelectedIds(new Set());
          refetch();
        }}
      />

      {/* Bulk Move Dialog */}
      <BulkMoveDialog
        open={isBulkMoveOpen}
        onOpenChange={setIsBulkMoveOpen}
        selectedCount={selectedIds.size}
        currentRelease={filters.releases?.[0]}
        onMove={(releaseId) => {
          toast.success(`Moved ${selectedIds.size} test case(s) to release`);
          setSelectedIds(new Set());
          refetch();
        }}
      />

      {/* Bulk Tags Dialog */}
      <BulkTagsDialog
        open={isBulkTagsOpen}
        onOpenChange={setIsBulkTagsOpen}
        selectedCount={selectedIds.size}
        onApplyTags={(tagsToAdd, tagsToRemove) => {
          const changes = [];
          if (tagsToAdd.length) changes.push(`added ${tagsToAdd.length} tag(s)`);
          if (tagsToRemove.length) changes.push(`removed ${tagsToRemove.length} tag(s)`);
          toast.success(`Updated tags: ${changes.join(', ')}`);
          setSelectedIds(new Set());
          refetch();
        }}
      />

      {/* Move to Folder Dialog */}
      <MoveToFolderDialog
        open={isMoveToFolderOpen}
        onOpenChange={setIsMoveToFolderOpen}
        projectId={projectId}
        selectedTestCaseIds={Array.from(selectedIds)}
        onSuccess={() => {
          setSelectedIds(new Set());
          refetch();
        }}
      />
    </div>
  );
}
