/**
 * TEST CASES PAGE - Complete Test Management
 * Left sidebar: Folder tree for organization
 * Center: Dense enterprise table with bulk select, filters, sort, pagination
 * Right: Detail panel with steps editor
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  ListChecks,
  AlertCircle,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Archive,
  FolderInput,
  SortAsc,
  SortDesc,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useProjectTestCases } from '@/hooks/useProjectTestMetrics';
import { usePermission } from '@/hooks/usePermission';
import { CreateTestCaseModal } from '@/modules/in-jira/components/tests/CreateTestCaseModal';
import { TestFolderTree } from '@/modules/tests/components/TestFolderTree';
import { TestCaseDetailPanel } from '@/modules/tests/components/TestCaseDetailPanel';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type SortField = 'title' | 'priority' | 'status' | 'test_type' | 'created_at' | 'updated_at';
type SortOrder = 'asc' | 'desc';

interface FilterState {
  status: string | null;
  priority: string | null;
  type: string | null;
  component: string | null;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

// ═══════════════════════════════════════════════════════════════════
// HELPERS
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
    case 'published': return 'text-status-success bg-status-success/10 border-status-success/20';
    case 'approved': return 'text-accent-primary bg-accent-subtle border-accent-primary/20';
    case 'under_review': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
    case 'draft': return 'text-text-tertiary bg-surface-3 border-border-default';
    case 'deprecated': return 'text-status-error bg-status-error/10 border-status-error/20';
    default: return 'text-text-tertiary bg-surface-3 border-border-default';
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function TestsCasesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { programId } = useProjectContext();
  
  // Permissions
  const { hasPermission: canCreate } = usePermission('test_cases', 'create', 'program', projectId);
  const { hasPermission: canEdit } = usePermission('test_cases', 'edit', 'program', projectId);
  const { hasPermission: canDelete } = usePermission('test_cases', 'delete', 'program', projectId);
  
  // Panel state
  const [showFolderTree, setShowFolderTree] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Sort & Filter State
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<FilterState>({
    status: searchParams.get('status'),
    priority: searchParams.get('priority'),
    type: searchParams.get('type'),
    component: null,
  });
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Data
  const {
    testCases,
    isLoading,
    error,
    refetch,
    createTestCase,
    updateTestCase,
    deleteTestCase,
    isCreating,
    isUpdating,
    isDeleting,
  } = useProjectTestCases(projectId || '');

  // Extract unique components for filter dropdown
  const uniqueComponents = useMemo(() => {
    const components = new Set<string>();
    testCases?.forEach(tc => {
      if (tc.component) components.add(tc.component);
    });
    return Array.from(components).sort();
  }, [testCases]);

  // Filter and sort test cases
  const processedCases = useMemo(() => {
    let result = [...(testCases || [])];
    
    // Filter by folder
    if (selectedFolderId) {
      result = result.filter(tc => tc.folder_id === selectedFolderId);
    }
    
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(tc =>
        tc.title?.toLowerCase().includes(q) ||
        tc.description?.toLowerCase().includes(q) ||
        tc.component?.toLowerCase().includes(q)
      );
    }
    
    // Apply filters
    if (filters.status) {
      result = result.filter(tc => tc.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter(tc => tc.priority === filters.priority);
    }
    if (filters.type) {
      result = result.filter(tc => tc.test_type === filters.type);
    }
    if (filters.component) {
      result = result.filter(tc => tc.component === filters.component);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      if (sortField === 'created_at' || sortField === 'updated_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [testCases, selectedFolderId, searchQuery, filters, sortField, sortOrder]);

  // Paginate
  const totalCount = processedCases.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedCases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedCases.slice(start, start + pageSize);
  }, [processedCases, page, pageSize]);

  // Selection handlers
  const isAllSelected = paginatedCases.length > 0 && paginatedCases.every(tc => selectedIds.has(tc.id));
  const isSomeSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCases.map(tc => tc.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk actions
  const handleBulkStatusChange = async (newStatus: string) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => updateTestCase({ id, status: newStatus })));
      toast.success(`Updated ${ids.length} test cases to ${newStatus}`);
      clearSelection();
    } catch (err) {
      toast.error('Failed to update some test cases');
    }
  };

  const handleBulkArchive = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Archive ${ids.length} test cases?`)) return;
    try {
      await Promise.all(ids.map(id => deleteTestCase(id)));
      toast.success(`Archived ${ids.length} test cases`);
      clearSelection();
    } catch (err) {
      toast.error('Failed to archive some test cases');
    }
  };

  // Move to folder
  const handleMoveToFolder = async (folderId: string | null) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => updateTestCase({ id, folder_id: folderId })));
      toast.success(`Moved ${ids.length} test cases`);
      clearSelection();
    } catch (err) {
      toast.error('Failed to move some test cases');
    }
  };

  // Row handlers
  const handleRowClick = (tc: any) => {
    setSelectedTestCaseId(tc.id);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setFilters({ status: null, priority: null, type: null, component: null });
    setSearchParams({});
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Handle update from detail panel
  const handleUpdateTestCase = async (data: any) => {
    await updateTestCase(data);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load test cases: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Folder Tree */}
        {showFolderTree && (
          <>
            <ResizablePanel defaultSize={18} minSize={15} maxSize={30}>
              <div className="h-full bg-surface-2 border-r border-border-default">
                <TestFolderTree
                  programId={programId}
                  entityType="test_case"
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={setSelectedFolderId}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle className="w-1 bg-border-default hover:bg-accent-primary/50 transition-colors" />
          </>
        )}

        {/* Center Panel - Test Cases Table */}
        <ResizablePanel defaultSize={selectedTestCaseId ? 50 : 82}>
          <div className="h-full flex flex-col p-4 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Toggle folder tree */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowFolderTree(!showFolderTree)}
                >
                  {showFolderTree ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </Button>

                {/* Search */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    placeholder="Search test cases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-surface-2 border-border-default h-9"
                  />
                </div>
                
                {/* Filters Popover */}
                <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-9">
                      <Filter className="h-4 w-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 bg-surface-1 border-border-default" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">Filters</span>
                        {activeFilterCount > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                            Clear all
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-text-tertiary">Status</label>
                        <Select value={filters.status || ''} onValueChange={(v) => setFilters(f => ({ ...f, status: v || null }))}>
                          <SelectTrigger className="h-8 bg-surface-2 border-border-default">
                            <SelectValue placeholder="Any status" />
                          </SelectTrigger>
                          <SelectContent className="bg-surface-1 border-border-default">
                            <SelectItem value="">Any status</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="deprecated">Deprecated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-text-tertiary">Priority</label>
                        <Select value={filters.priority || ''} onValueChange={(v) => setFilters(f => ({ ...f, priority: v || null }))}>
                          <SelectTrigger className="h-8 bg-surface-2 border-border-default">
                            <SelectValue placeholder="Any priority" />
                          </SelectTrigger>
                          <SelectContent className="bg-surface-1 border-border-default">
                            <SelectItem value="">Any priority</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-text-tertiary">Type</label>
                        <Select value={filters.type || ''} onValueChange={(v) => setFilters(f => ({ ...f, type: v || null }))}>
                          <SelectTrigger className="h-8 bg-surface-2 border-border-default">
                            <SelectValue placeholder="Any type" />
                          </SelectTrigger>
                          <SelectContent className="bg-surface-1 border-border-default">
                            <SelectItem value="">Any type</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="automated">Automated</SelectItem>
                            <SelectItem value="bdd">BDD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {uniqueComponents.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs text-text-tertiary">Component</label>
                          <Select value={filters.component || ''} onValueChange={(v) => setFilters(f => ({ ...f, component: v || null }))}>
                            <SelectTrigger className="h-8 bg-surface-2 border-border-default">
                              <SelectValue placeholder="Any component" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface-1 border-border-default">
                              <SelectItem value="">Any component</SelectItem>
                              {uniqueComponents.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Active filter chips */}
                {activeFilterCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    {filters.status && (
                      <Badge variant="secondary" className="gap-1 h-6">
                        {filters.status}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, status: null }))} />
                      </Badge>
                    )}
                    {filters.priority && (
                      <Badge variant="secondary" className="gap-1 h-6">
                        {filters.priority}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, priority: null }))} />
                      </Badge>
                    )}
                    {filters.type && (
                      <Badge variant="secondary" className="gap-1 h-6">
                        {filters.type}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, type: null }))} />
                      </Badge>
                    )}
                  </div>
                )}
                
                <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-9 w-9">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Bulk Actions (when selected) */}
              {isSomeSelected && canEdit && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-subtle rounded-lg border border-accent-primary/20">
                  <span className="text-sm text-accent-primary font-medium">
                    {selectedIds.size} selected
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 gap-1">
                        Set Status <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-surface-1 border-border-default">
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('draft')}>Draft</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('under_review')}>Under Review</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('approved')}>Approved</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('published')}>Published</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" variant="ghost" className="h-7 gap-1">
                    <FolderInput className="h-3.5 w-3.5" />
                    Move
                  </Button>
                  {canDelete && (
                    <Button size="sm" variant="ghost" onClick={handleBulkArchive} className="h-7 text-status-error hover:text-status-error">
                      <Archive className="h-3.5 w-3.5 mr-1" />
                      Archive
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={clearSelection} className="h-7">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              
              {/* Create Button */}
              {canCreate && (
                <Button onClick={() => setCreateModalOpen(true)} size="sm" className="h-9" data-cta="create-case">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Test Case
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : paginatedCases.length === 0 ? (
                <Card className="bg-surface-2 border-border-default p-8 text-center">
                  <ListChecks className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">No Test Cases</h3>
                  <p className="text-text-secondary mb-4">
                    {searchQuery || activeFilterCount > 0 || selectedFolderId
                      ? 'No test cases match your filters.' 
                      : 'Create your first test case to get started.'}
                  </p>
                  {searchQuery || activeFilterCount > 0 ? (
                    <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                  ) : canCreate && (
                    <Button onClick={() => setCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Create Test Case
                    </Button>
                  )}
                </Card>
              ) : (
                <>
                  <div className="border border-border-default rounded-lg overflow-hidden bg-surface-1">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-2 border-b border-border-default">
                        <tr className="text-left text-xs text-text-tertiary uppercase tracking-wide">
                          <th className="w-10 px-3 py-2.5">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={toggleSelectAll}
                              className="border-border-default"
                            />
                          </th>
                          <th 
                            className="px-3 py-2.5 font-medium cursor-pointer hover:text-text-primary transition-colors"
                            onClick={() => handleSort('title')}
                          >
                            <span className="flex items-center gap-1">
                              Title
                              {sortField === 'title' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                            </span>
                          </th>
                          <th 
                            className="w-24 px-3 py-2.5 font-medium cursor-pointer hover:text-text-primary"
                            onClick={() => handleSort('priority')}
                          >
                            <span className="flex items-center gap-1">
                              Priority
                              {sortField === 'priority' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                            </span>
                          </th>
                          <th 
                            className="w-28 px-3 py-2.5 font-medium cursor-pointer hover:text-text-primary"
                            onClick={() => handleSort('status')}
                          >
                            <span className="flex items-center gap-1">
                              Status
                              {sortField === 'status' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                            </span>
                          </th>
                          <th className="w-24 px-3 py-2.5 font-medium">Type</th>
                          <th className="w-32 px-3 py-2.5 font-medium">Component</th>
                          <th 
                            className="w-28 px-3 py-2.5 font-medium cursor-pointer hover:text-text-primary"
                            onClick={() => handleSort('updated_at')}
                          >
                            <span className="flex items-center gap-1">
                              Updated
                              {sortField === 'updated_at' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                            </span>
                          </th>
                          <th className="w-10 px-3 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {paginatedCases.map(tc => (
                          <tr
                            key={tc.id}
                            className={cn(
                              "hover:bg-surface-hover cursor-pointer transition-colors",
                              selectedIds.has(tc.id) && "bg-accent-subtle/50",
                              selectedTestCaseId === tc.id && "bg-accent-subtle"
                            )}
                          >
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(tc.id)}
                                onCheckedChange={() => toggleSelect(tc.id)}
                                className="border-border-default"
                              />
                            </td>
                            <td className="px-3 py-2.5" onClick={() => handleRowClick(tc)}>
                              <p className="font-medium text-text-primary truncate max-w-[280px]">
                                {tc.title}
                              </p>
                            </td>
                            <td className="px-3 py-2.5" onClick={() => handleRowClick(tc)}>
                              <Badge className={cn('capitalize text-xs border', getPriorityColor(tc.priority))}>
                                {tc.priority}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5" onClick={() => handleRowClick(tc)}>
                              <Badge className={cn('text-xs border', getStatusColor(tc.status))}>
                                {tc.status?.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-text-secondary capitalize" onClick={() => handleRowClick(tc)}>
                              {tc.test_type}
                            </td>
                            <td className="px-3 py-2.5 text-text-secondary truncate max-w-[120px]" onClick={() => handleRowClick(tc)}>
                              {tc.component || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-text-tertiary text-xs" onClick={() => handleRowClick(tc)}>
                              {tc.updated_at ? format(new Date(tc.updated_at), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
                                  <DropdownMenuItem onClick={() => handleRowClick(tc)}>
                                    View Details
                                  </DropdownMenuItem>
                                  {canEdit && (
                                    <DropdownMenuItem onClick={() => handleRowClick(tc)}>
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  {canDelete && (
                                    <DropdownMenuItem
                                      className="text-status-error focus:text-status-error"
                                      onClick={() => {
                                        if (confirm('Archive this test case?')) {
                                          deleteTestCase(tc.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between text-sm mt-4">
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}</span>
                      <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="h-8 w-20 bg-surface-2 border-border-default">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-1 border-border-default">
                          {PAGE_SIZE_OPTIONS.map(size => (
                            <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>per page</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-3 text-text-secondary">
                        Page {page} of {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </ResizablePanel>

        {/* Right Panel - Test Case Detail */}
        {selectedTestCaseId && (
          <>
            <ResizableHandle className="w-1 bg-border-default hover:bg-accent-primary/50 transition-colors" />
            <ResizablePanel defaultSize={32} minSize={25} maxSize={50}>
              <TestCaseDetailPanel
                testCaseId={selectedTestCaseId}
                onClose={() => setSelectedTestCaseId(null)}
                onUpdate={handleUpdateTestCase}
                isUpdating={isUpdating}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Create Modal */}
      <CreateTestCaseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={projectId || ''}
        programId={programId || ''}
        onSubmit={async (data) => {
          await createTestCase({
            title: data.title,
            description: data.description,
            preconditions: data.preconditions,
            test_type: data.test_type,
            priority: data.priority,
            status: data.status,
            linked_work_item_id: data.linked_work_item_id,
            component: data.component,
            objective: data.objective,
          });
        }}
        isSubmitting={isCreating}
      />
    </div>
  );
}

export default TestsCasesPage;
