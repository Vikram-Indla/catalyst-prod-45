/**
 * Test Cases Enterprise Grid
 * Dense table with column controls, filters, saved views, bulk selection
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Columns3,
  Save,
  Archive,
  FolderPlus,
  Layers,
  PlayCircle,
  Eye,
  Edit,
  GripVertical,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface TestCaseRow {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  test_type: string;
  component?: string | null;
  folder_id?: string | null;
  labels?: string[] | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  owner_id?: string | null;
  automation_status?: string | null;
  estimated_effort?: number | null;
}

export interface ColumnConfig {
  id: string;
  label: string;
  width?: string;
  visible: boolean;
  sortable?: boolean;
}

export interface SavedView {
  id: string;
  name: string;
  columns: string[];
  filters: Record<string, string | null>;
  sort: { field: string; direction: 'asc' | 'desc' };
}

export interface TestCasesGridProps {
  cases: TestCaseRow[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRefresh: () => void;
  onRowClick: (id: string) => void;
  onCreateNew: () => void;
  onBulkArchive: (ids: string[]) => void;
  onBulkAddToSet: (ids: string[]) => void;
  onBulkAddToCycle: (ids: string[]) => void;
  onBulkMoveFolder: (ids: string[]) => void;
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onAddToSet: (id: string) => void;
  onAddToCycle: (id: string) => void;
  onArchive: (id: string) => void;
  filters: Record<string, string | null>;
  onFiltersChange: (filters: Record<string, string | null>) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'title', label: 'Title', visible: true, sortable: true },
  { id: 'status', label: 'Status', width: 'w-24', visible: true, sortable: true },
  { id: 'priority', label: 'Priority', width: 'w-24', visible: true, sortable: true },
  { id: 'test_type', label: 'Type', width: 'w-24', visible: true, sortable: true },
  { id: 'component', label: 'Component', width: 'w-32', visible: true, sortable: true },
  { id: 'labels', label: 'Labels', width: 'w-32', visible: false },
  { id: 'automation_status', label: 'Automation', width: 'w-28', visible: false },
  { id: 'estimated_effort', label: 'Effort', width: 'w-20', visible: false },
  { id: 'updated_at', label: 'Updated', width: 'w-28', visible: true, sortable: true },
  { id: 'created_at', label: 'Created', width: 'w-28', visible: false, sortable: true },
];

const STORAGE_KEY = 'test-cases-grid-columns';
const VIEWS_KEY = 'test-cases-saved-views';

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
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function TestCasesGrid({
  cases,
  isLoading,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onRowClick,
  onCreateNew,
  onBulkArchive,
  onBulkAddToSet,
  onBulkAddToCycle,
  onBulkMoveFolder,
  onViewDetails,
  onEdit,
  onAddToSet,
  onAddToCycle,
  onArchive,
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
}: TestCasesGridProps) {
  // Column state
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    const saved = localStorage.getItem(VIEWS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [viewsOpen, setViewsOpen] = useState(false);

  // Persist columns
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  // Selection helpers
  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);
  const isAllSelected = cases.length > 0 && cases.every(tc => selectedIds.has(tc.id));
  const hasSelection = selectedIds.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cases.map(tc => tc.id)));
    }
  }, [cases, isAllSelected]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Column reorder
  const handleColumnDragEnd = useCallback((result: any) => {
    if (!result.destination) return;
    const items = Array.from(columns);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setColumns(items);
  }, [columns]);

  const toggleColumnVisibility = useCallback((id: string) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  }, []);

  // Filter helpers
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = useCallback(() => {
    onFiltersChange({ status: null, priority: null, type: null, automation: null });
  }, [onFiltersChange]);

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize);

  // Render cell value
  const renderCellValue = useCallback((tc: TestCaseRow, colId: string) => {
    switch (colId) {
      case 'title':
        return <span className="text-text-primary font-medium truncate max-w-[300px] block">{tc.title}</span>;
      case 'status':
        return (
          <Badge variant="outline" className={cn('text-xs', getStatusColor(tc.status))}>
            {tc.status || 'draft'}
          </Badge>
        );
      case 'priority':
        return (
          <Badge variant="outline" className={cn('text-xs', getPriorityColor(tc.priority))}>
            {tc.priority || 'medium'}
          </Badge>
        );
      case 'test_type':
        return <span className="text-text-secondary text-xs">{tc.test_type || 'manual'}</span>;
      case 'component':
        return <span className="text-text-secondary text-xs truncate max-w-[100px] block">{tc.component || '—'}</span>;
      case 'labels':
        return (
          <div className="flex gap-1 flex-wrap">
            {(tc.labels || []).slice(0, 2).map(l => (
              <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
            ))}
            {(tc.labels?.length || 0) > 2 && <span className="text-text-tertiary text-xs">+{tc.labels!.length - 2}</span>}
          </div>
        );
      case 'automation_status':
        return <span className="text-text-secondary text-xs">{tc.automation_status || '—'}</span>;
      case 'estimated_effort':
        return <span className="text-text-secondary text-xs">{tc.estimated_effort ? `${tc.estimated_effort}m` : '—'}</span>;
      case 'updated_at':
        return <span className="text-text-tertiary text-xs">{tc.updated_at ? format(new Date(tc.updated_at), 'MMM d, yyyy') : '—'}</span>;
      case 'created_at':
        return <span className="text-text-tertiary text-xs">{tc.created_at ? format(new Date(tc.created_at), 'MMM d, yyyy') : '—'}</span>;
      default:
        return null;
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default h-8 text-sm"
            />
          </div>

          {/* Filters */}
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-surface-1 border-border-default p-3" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-primary">Filters</span>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-[10px] px-2">
                      Clear
                    </Button>
                  )}
                </div>
                
                <div className="grid gap-2">
                  <Select value={filters.status || ''} onValueChange={(v) => onFiltersChange({ ...filters, status: v || null })}>
                    <SelectTrigger className="h-7 text-xs bg-surface-2"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent className="bg-surface-1">
                      <SelectItem value="">Any status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filters.priority || ''} onValueChange={(v) => onFiltersChange({ ...filters, priority: v || null })}>
                    <SelectTrigger className="h-7 text-xs bg-surface-2"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent className="bg-surface-1">
                      <SelectItem value="">Any priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filters.type || ''} onValueChange={(v) => onFiltersChange({ ...filters, type: v || null })}>
                    <SelectTrigger className="h-7 text-xs bg-surface-2"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent className="bg-surface-1">
                      <SelectItem value="">Any type</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automated">Automated</SelectItem>
                      <SelectItem value="bdd">BDD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Column controls */}
          <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 bg-surface-1 border-border-default p-2" align="start">
              <div className="text-xs font-medium text-text-primary mb-2 px-1">Show/Hide Columns</div>
              <DragDropContext onDragEnd={handleColumnDragEnd}>
                <Droppable droppableId="columns">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                      {columns.map((col, idx) => (
                        <Draggable key={col.id} draggableId={col.id} index={idx}>
                          {(prov) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className="flex items-center gap-2 px-1 py-1 rounded hover:bg-surface-3"
                            >
                              <div {...prov.dragHandleProps} className="cursor-grab">
                                <GripVertical className="h-3 w-3 text-text-tertiary" />
                              </div>
                              <Checkbox
                                checked={col.visible}
                                onCheckedChange={() => toggleColumnVisibility(col.id)}
                                className="h-3.5 w-3.5"
                              />
                              <span className="text-xs text-text-secondary">{col.label}</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">{totalCount} cases</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-20 text-xs bg-surface-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-1">
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk actions bar */}
      {hasSelection && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-subtle border border-accent-primary/20 rounded-lg">
          <span className="text-xs font-medium text-text-primary">{selectedIds.size} selected</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onBulkArchive(Array.from(selectedIds))}>
            <Archive className="h-3 w-3" /> Archive
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onBulkAddToSet(Array.from(selectedIds))}>
            <Layers className="h-3 w-3" /> Add to Set
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onBulkAddToCycle(Array.from(selectedIds))}>
            <PlayCircle className="h-3 w-3" /> Add to Cycle
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onBulkMoveFolder(Array.from(selectedIds))}>
            <FolderPlus className="h-3 w-3" /> Move Folder
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border-default bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-3 border-b border-border-default sticky top-0">
              <tr>
                <th className="w-8 px-2 py-1.5">
                  <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} className="h-3.5 w-3.5" />
                </th>
                {visibleColumns.map(col => (
                  <th key={col.id} className={cn('px-2 py-1.5 text-left text-text-secondary font-medium text-xs', col.width)}>
                    {col.label}
                  </th>
                ))}
                <th className="w-8 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {isLoading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <tr key={i} className="h-9">
                    <td className="px-2 py-1"><div className="h-3 w-3 bg-surface-3 rounded animate-pulse" /></td>
                    {visibleColumns.map(c => (
                      <td key={c.id} className="px-2 py-1"><div className="h-3 w-16 bg-surface-3 rounded animate-pulse" /></td>
                    ))}
                    <td className="px-2 py-1"><div className="h-4 w-4 bg-surface-3 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="px-4 py-6">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-text-tertiary font-medium">No test cases found</span>
                      <Button size="sm" className="h-7 text-xs font-semibold" onClick={onCreateNew}>
                        Create your first test case
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                cases.map(tc => (
                  <tr
                    key={tc.id}
                    className={cn(
                      'h-9 hover:bg-surface-3 cursor-pointer transition-colors',
                      selectedIds.has(tc.id) && 'bg-accent-subtle/50'
                    )}
                    onClick={() => onRowClick(tc.id)}
                  >
                    <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(tc.id)} onCheckedChange={() => toggleSelect(tc.id)} className="h-3.5 w-3.5" />
                    </td>
                    {visibleColumns.map(col => (
                      <td key={col.id} className="px-2 py-1">
                        {renderCellValue(tc, col.id)}
                      </td>
                    ))}
                    <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-surface-1 border-border-default w-40">
                          <DropdownMenuItem onClick={() => onViewDetails(tc.id)} className="text-xs gap-2">
                            <Eye className="h-3 w-3" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(tc.id)} className="text-xs gap-2">
                            <Edit className="h-3 w-3" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onAddToSet(tc.id)} className="text-xs gap-2">
                            <Layers className="h-3 w-3" /> Add to Set
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAddToCycle(tc.id)} className="text-xs gap-2">
                            <PlayCircle className="h-3 w-3" /> Add to Cycle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onArchive(tc.id)} className="text-xs gap-2 text-status-error">
                            <Archive className="h-3 w-3" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-tertiary">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p > totalPages || p < 1) return null;
              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 text-xs"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
