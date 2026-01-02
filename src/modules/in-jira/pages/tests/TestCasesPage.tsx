/**
 * Test Cases Page - CIO-Grade Enterprise Grid
 * Dense table with 40+ rows, bulk actions, filters, search
 */

import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreHorizontal,
  ChevronDown,
  Folder,
  FileText,
  Copy,
  Archive,
  Trash2,
  FolderPlus,
  ListPlus,
  CheckSquare,
  X,
  Loader2,
  Link2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { CatalystTable, CatalystColumnDef } from '@/components/ui/catalyst-table';
import { useTestCases, TestCase, TestCasePriority, TestCaseStatus } from '../../hooks/useTestCases';
import { CreateTestCaseModal } from '../../components/tests/CreateTestCaseModal';
import { TestCaseDrawer } from '../../components/tests/TestCaseDrawer';
import { AITestGeneratorPanel } from '../../components/tests/AITestGeneratorPanel';
import { FolderTree } from '../../components/tests/FolderTree';
import { usePermission } from '@/hooks/usePermission';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

// ═══════════════════════════════════════════════════════════════════
// FILTER TYPES
// ═══════════════════════════════════════════════════════════════════

interface Filters {
  status: string[];
  priority: string[];
  testType: string[];
  component: string;
  folder: string;
}

const INITIAL_FILTERS: Filters = {
  status: [],
  priority: [],
  testType: [],
  component: '',
  folder: '',
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'text-status-error bg-status-error/10 border-status-error/20';
    case 'high': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
    case 'medium': return 'text-accent-primary bg-accent-subtle border-accent-primary/20';
    case 'low': return 'text-text-tertiary bg-surface-3 border-border-default';
    default: return 'text-text-tertiary bg-surface-3 border-border-default';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'published': return 'text-status-success bg-status-success/10';
    case 'approved': return 'text-accent-primary bg-accent-subtle';
    case 'under_review': return 'text-status-warning bg-status-warning/10';
    case 'draft': return 'text-text-tertiary bg-surface-3';
    case 'deprecated': return 'text-status-error bg-status-error/10';
    default: return 'text-text-tertiary bg-surface-3';
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'manual': return 'Manual';
    case 'automated': return 'Automated';
    case 'bdd': return 'BDD';
    default: return type;
  }
}

// ═══════════════════════════════════════════════════════════════════
// FILTER PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════

function FilterPanel({
  filters,
  setFilters,
  onClear,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onClear: () => void;
}) {
  const toggleArrayFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => {
      const arr = prev[key] as string[];
      const newArr = arr.includes(value)
        ? arr.filter(v => v !== value)
        : [...arr, value];
      return { ...prev, [key]: newArr };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">Filters</span>
        <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs">
          Clear all
        </Button>
      </div>

      {/* Status */}
      <div>
        <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          Status
        </label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {['draft', 'under_review', 'approved', 'published', 'deprecated'].map(s => (
            <button
              key={s}
              onClick={() => toggleArrayFilter('status', s)}
              className={cn(
                'px-2 py-1 text-xs rounded-md border transition-colors',
                filters.status.includes(s)
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'bg-surface-2 text-text-secondary border-border-default hover:bg-surface-3'
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          Priority
        </label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {['critical', 'high', 'medium', 'low'].map(p => (
            <button
              key={p}
              onClick={() => toggleArrayFilter('priority', p)}
              className={cn(
                'px-2 py-1 text-xs rounded-md border transition-colors capitalize',
                filters.priority.includes(p)
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'bg-surface-2 text-text-secondary border-border-default hover:bg-surface-3'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          Type
        </label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {['manual', 'automated', 'bdd'].map(t => (
            <button
              key={t}
              onClick={() => toggleArrayFilter('testType', t)}
              className={cn(
                'px-2 py-1 text-xs rounded-md border transition-colors',
                filters.testType.includes(t)
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'bg-surface-2 text-text-secondary border-border-default hover:bg-surface-3'
              )}
            >
              {getTypeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Component */}
      <div>
        <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          Component
        </label>
        <Input
          value={filters.component}
          onChange={(e) => setFilters(prev => ({ ...prev, component: e.target.value }))}
          placeholder="Filter by component..."
          className="mt-1.5 h-8 text-sm bg-surface-2 border-border-default"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BULK ACTIONS BAR
// ═══════════════════════════════════════════════════════════════════

function BulkActionsBar({
  selectedCount,
  onClear,
  onStatusChange,
  onAddToSet,
  onArchive,
  onDelete,
  onExport,
  canDelete,
}: {
  selectedCount: number;
  onClear: () => void;
  onStatusChange: (status: TestCaseStatus) => void;
  onAddToSet: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onExport: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-accent-subtle border-y border-border-default">
      <span className="text-sm font-medium text-accent-primary">
        {selectedCount} selected
      </span>
      <Button variant="ghost" size="sm" onClick={onClear} className="h-7">
        <X className="h-3.5 w-3.5 mr-1" />
        Clear
      </Button>
      
      <div className="w-px h-4 bg-border-default mx-2" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7">
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
            Change Status
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onStatusChange('draft')}>Draft</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange('under_review')}>Under Review</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange('approved')}>Approved</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange('published')}>Published</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange('deprecated')}>Deprecated</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" className="h-7" onClick={onAddToSet}>
        <ListPlus className="h-3.5 w-3.5 mr-1.5" />
        Add to Set
      </Button>

      <Button variant="outline" size="sm" className="h-7" onClick={onArchive}>
        <Archive className="h-3.5 w-3.5 mr-1.5" />
        Archive
      </Button>

      <Button variant="outline" size="sm" className="h-7" onClick={onExport}>
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Export CSV
      </Button>

      {canDelete && (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-status-error border-status-error hover:bg-status-error/10"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function TestCasesPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchParams] = useSearchParams();
  
  // Get program ID from URL or project context
  const programId = searchParams.get('programId') || null;
  const projectId = searchParams.get('projectId') || projectKey || null;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery); // Debounced for performance
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);

  // Data hooks
  const {
    testCases,
    isLoading,
    canCreate,
    canEdit,
    canDelete,
    createTestCase,
    updateTestCase,
    deleteTestCase,
    bulkDeleteTestCases,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTestCases(programId);

  // Filter + search logic
  const filteredData = useMemo(() => {
    let result = testCases;

    // Folder filter
    if (selectedFolderId) {
      result = result.filter(tc => tc.folder_id === selectedFolderId);
    }

    // Text search (using deferred value for performance)
    if (deferredSearchQuery) {
      const q = deferredSearchQuery.toLowerCase();
      result = result.filter(tc =>
        tc.title.toLowerCase().includes(q) ||
        tc.description?.toLowerCase().includes(q) ||
        tc.component?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter(tc => filters.status.includes(tc.status));
    }

    // Priority filter
    if (filters.priority.length > 0) {
      result = result.filter(tc => filters.priority.includes(tc.priority));
    }

    // Type filter
    if (filters.testType.length > 0) {
      result = result.filter(tc => filters.testType.includes(tc.test_type));
    }

    // Component filter
    if (filters.component) {
      result = result.filter(tc =>
        tc.component?.toLowerCase().includes(filters.component.toLowerCase())
      );
    }

    return result;
  }, [testCases, selectedFolderId, deferredSearchQuery, filters]);

  // Active filter count
  const activeFilterCount = 
    filters.status.length + 
    filters.priority.length + 
    filters.testType.length + 
    (filters.component ? 1 : 0) +
    (filters.folder ? 1 : 0);

  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredData.map(tc => tc.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [filteredData]);

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleRowClick = useCallback((tc: TestCase) => {
    setSelectedTestCase(tc);
    setDrawerOpen(true);
  }, []);

  // Bulk actions
  const handleBulkStatusChange = async (status: TestCaseStatus) => {
    const ids = Array.from(selectedIds);
    let successCount = 0;
    for (const id of ids) {
      try {
        await updateTestCase({ id, status });
        successCount++;
      } catch (e) {
        console.error(e);
      }
    }
    toast.success(`Updated ${successCount} test cases to ${status}`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} test cases? This cannot be undone.`)) return;
    try {
      await bulkDeleteTestCases(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    const ids = Array.from(selectedIds);
    const toExport = ids.length > 0 
      ? testCases.filter(tc => ids.includes(tc.id))
      : filteredData;
    
    const headers = ['ID', 'Title', 'Status', 'Priority', 'Type', 'Component', 'Created'];
    const rows = toExport.map(tc => [
      tc.id,
      tc.title,
      tc.status,
      tc.priority,
      tc.test_type,
      tc.component || '',
      tc.created_at,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-cases-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${toExport.length} test cases`);
  };

  const handleArchive = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await updateTestCase({ id, status: 'deprecated' });
      } catch (e) {
        console.error(e);
      }
    }
    toast.success(`Archived ${ids.length} test cases`);
    setSelectedIds(new Set());
  };

  const handleAddToSet = () => {
    // TODO: Implement Add to Set modal
    toast.info('Add to Set - select a test set to add these cases');
  };

  const handleDuplicate = async (tc: TestCase) => {
    try {
      await createTestCase({
        title: `${tc.title} (Copy)`,
        description: tc.description || undefined,
        preconditions: tc.preconditions || undefined,
        priority: tc.priority,
        test_type: tc.test_type,
        status: 'draft',
        linked_work_item_type: 'story',
        linked_work_item_id: tc.linked_work_item_id || '',
        program_id: tc.program_id || '',
        component: tc.component || undefined,
        objective: tc.objective || undefined,
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Column definitions for CatalystTable
  const columns: CatalystColumnDef<TestCase>[] = useMemo(() => [
    {
      key: 'select',
      label: '',
      minWidth: 40,
      render: (tc) => (
        <Checkbox
          checked={selectedIds.has(tc.id)}
          onCheckedChange={(checked) => handleSelectRow(tc.id, !!checked)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'title',
      label: 'Title',
      minWidth: 300,
      canGrow: true,
      render: (tc) => (
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-3.5 w-3.5 text-text-quaternary flex-shrink-0" />
          <span className="truncate font-medium">{tc.title}</span>
          {tc.linked_work_item_id && (
            <Link2 className="h-3 w-3 text-accent-primary flex-shrink-0" />
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 100,
      render: (tc) => (
        <Badge className={cn('text-[10px] capitalize', getStatusColor(tc.status))}>
          {tc.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      minWidth: 80,
      render: (tc) => (
        <Badge className={cn('text-[10px] capitalize border', getPriorityColor(tc.priority))}>
          {tc.priority}
        </Badge>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      minWidth: 90,
      render: (tc) => (
        <span className="text-text-secondary text-xs">
          {getTypeLabel(tc.test_type)}
        </span>
      ),
    },
    {
      key: 'component',
      label: 'Component',
      minWidth: 120,
      render: (tc) => (
        <span className="text-text-tertiary text-xs truncate">
          {tc.component || '—'}
        </span>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      minWidth: 90,
      render: (tc) => (
        <span className="text-text-quaternary text-[10px]">
          {format(new Date(tc.created_at), 'MMM d, yy')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      minWidth: 44,
      align: 'right',
      render: (tc) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(tc); }}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(tc); }}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info('Archive coming soon'); }}>
              <Archive className="h-3.5 w-3.5 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canDelete && (
              <DropdownMenuItem 
                className="text-status-error"
                onClick={async (e) => { 
                  e.stopPropagation(); 
                  if (confirm('Delete this test case?')) {
                    await deleteTestCase(tc.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [selectedIds, handleSelectRow, handleRowClick, handleDuplicate, canDelete, deleteTestCase]);

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span>
          <span>/</span>
          <span>Tests</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Test Cases</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Test Case Library</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info('Import dialog coming soon')}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
            {canCreate && (
              <>
                <Button variant="outline" size="sm" onClick={() => setAiGeneratorOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  AI Generate
                </Button>
                <Button size="sm" onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Test Case
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
          <Input
            placeholder="Search test cases..."
            className="pl-9 bg-surface-2 border-border-default"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 px-1.5 bg-accent-primary text-white">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-4 bg-surface-1 border-border-default">
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              onClear={() => setFilters(INITIAL_FILTERS)}
            />
          </PopoverContent>
        </Popover>

        <div className="ml-auto text-sm text-text-tertiary">
          {filteredData.length} of {testCases.length} cases
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onStatusChange={handleBulkStatusChange}
          onAddToSet={handleAddToSet}
          onArchive={handleArchive}
          onDelete={handleBulkDelete}
          onExport={handleExportCSV}
          canDelete={canDelete}
        />
      )}

      {/* Main Content with Folder Sidebar */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Folder Tree Sidebar */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full border-r border-border-default bg-surface-2">
            <FolderTree
              programId={programId}
              entityType="test_case"
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              className="h-full"
            />
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Table Panel */}
        <ResizablePanel defaultSize={80}>
          <div className="h-full overflow-auto px-4 py-4">
            <CatalystTable
              data={filteredData}
              columns={columns}
              getRowId={(tc) => tc.id}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              emptyMessage={selectedFolderId 
                ? "No test cases in this folder."
                : "No test cases found. Create your first test case to get started."
              }
              pageSize={40}
              loadMoreIncrement={40}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Create Modal */}
      <CreateTestCaseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={projectId || ''}
        programId={programId || ''}
        onSubmit={async (data) => { await createTestCase(data); }}
        isSubmitting={isCreating}
      />

      {/* Drawer */}
      <TestCaseDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        testCase={selectedTestCase}
        onUpdate={async (input) => { await updateTestCase(input); }}
        onDelete={async (id) => { await deleteTestCase(id); }}
        isUpdating={isUpdating}
      />

      {/* AI Generator Dialog */}
      <Dialog open={aiGeneratorOpen} onOpenChange={setAiGeneratorOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="p-4 border-b border-border-default">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent-primary" />
              AI Test Generator
            </DialogTitle>
          </DialogHeader>
          <AITestGeneratorPanel
            programId={programId || undefined}
            onTestsGenerated={() => setAiGeneratorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TestCasesPage;
