/**
 * Enterprise Grid Component
 * Bloomberg-grade data grid with column customization, saved views, and server-side operations
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  Columns3,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Check,
  X,
  Save,
  Trash2,
  Edit3,
  Share2,
  ExternalLink,
  Download,
  RotateCcw,
  GripVertical,
  Eye,
  EyeOff,
  Loader2,
  Rows3,
  Rows2,
  Rows4,
  Plus,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useEnterpriseGrid,
  EnterpriseGridConfig,
  ColumnConfig,
  SortDirection,
  FilterOperator,
  RowHeight,
  GridView,
} from '@/hooks/useEnterpriseGrid';

// ==================== TYPES ====================

interface EnterpriseGridProps<T> {
  config: EnterpriseGridConfig;
  data: T[];
  totalCount?: number;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  renderCell?: (row: T, column: ColumnConfig) => React.ReactNode;
  renderActions?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  onBulkAction?: (action: string, selectedIds: string[]) => void;
  bulkActions?: { id: string; label: string; icon?: React.ReactNode; destructive?: boolean }[];
  onExport?: (format: 'csv' | 'json', data: T[]) => void;
  className?: string;
}

// ==================== ROW HEIGHT CONFIG ====================

const ROW_HEIGHTS: Record<RowHeight, number> = {
  compact: 32,
  normal: 40,
  comfortable: 52,
};

const ROW_HEIGHT_ICONS = {
  compact: Rows3,
  normal: Rows2,
  comfortable: Rows4,
};

// ==================== FILTER OPERATORS ====================

const FILTER_OPERATORS: { value: FilterOperator; label: string; types: string[] }[] = [
  { value: 'eq', label: 'Equals', types: ['text', 'number', 'date', 'select', 'boolean'] },
  { value: 'neq', label: 'Not equals', types: ['text', 'number', 'date', 'select', 'boolean'] },
  { value: 'contains', label: 'Contains', types: ['text'] },
  { value: 'startsWith', label: 'Starts with', types: ['text'] },
  { value: 'endsWith', label: 'Ends with', types: ['text'] },
  { value: 'gt', label: 'Greater than', types: ['number', 'date'] },
  { value: 'gte', label: 'Greater or equal', types: ['number', 'date'] },
  { value: 'lt', label: 'Less than', types: ['number', 'date'] },
  { value: 'lte', label: 'Less or equal', types: ['number', 'date'] },
  { value: 'in', label: 'In list', types: ['select'] },
  { value: 'isNull', label: 'Is empty', types: ['text', 'number', 'date', 'select'] },
  { value: 'isNotNull', label: 'Is not empty', types: ['text', 'number', 'date', 'select'] },
];

// ==================== SUBCOMPONENTS ====================

function ColumnHeader({
  column,
  sortConfig,
  onToggleSort,
  onResize,
}: {
  column: ColumnConfig;
  sortConfig: { column: string; direction: SortDirection }[];
  onToggleSort: (columnId: string) => void;
  onResize: (columnId: string, width: number) => void;
}) {
  const resizeRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const sort = sortConfig.find(s => s.column === column.id);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = column.width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(column.minWidth || 50, Math.min(column.maxWidth || 500, startWidth + diff));
      onResize(column.id, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column, onResize]);

  return (
    <div
      className={cn(
        'group relative flex items-center h-full px-3 text-xs font-medium text-text-tertiary select-none',
        column.sortable !== false && 'cursor-pointer hover:text-text-primary hover:bg-surface-hover',
        column.align === 'center' && 'justify-center',
        column.align === 'right' && 'justify-end',
      )}
      style={{ width: column.width }}
      onClick={() => column.sortable !== false && onToggleSort(column.id)}
    >
      <span className="truncate">{column.label}</span>
      {sort && (
        <span className="ml-1.5 text-accent-primary">
          {sort.direction === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      )}

      {/* Resize handle */}
      {column.resizable !== false && (
        <div
          ref={resizeRef}
          className={cn(
            'absolute right-0 top-0 h-full w-1 cursor-col-resize',
            'opacity-0 group-hover:opacity-100 hover:bg-accent-primary transition-opacity',
            isResizing && 'opacity-100 bg-accent-primary'
          )}
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}

function SaveViewDialog({
  open,
  onOpenChange,
  onSave,
  existingViews,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, isDefault: boolean, isShared: boolean) => void;
  existingViews: GridView[];
}) {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), isDefault, isShared);
    setName('');
    setIsDefault(false);
    setIsShared(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Save View</DialogTitle>
          <DialogDescription>
            Save your current column configuration, filters, and sort settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">View Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom View"
              className="bg-surface-2"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              />
              <span>Set as default</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isShared}
                onCheckedChange={(checked) => setIsShared(checked as boolean)}
              />
              <span>Share with team</span>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            <Save className="h-4 w-4 mr-1.5" />
            Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== MAIN COMPONENT ====================

export function EnterpriseGrid<T extends Record<string, unknown>>({
  config,
  data,
  totalCount,
  isLoading = false,
  onRowClick,
  onRowDoubleClick,
  renderCell,
  renderActions,
  emptyState,
  toolbarActions,
  onBulkAction,
  bulkActions = [],
  onExport,
  className,
}: EnterpriseGridProps<T>) {
  const grid = useEnterpriseGrid(config);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [columnsPopoverOpen, setColumnsPopoverOpen] = useState(false);
  const [filtersPopoverOpen, setFiltersPopoverOpen] = useState(false);

  const rowIdField = config.rowIdField || 'id';
  const visibleColumns = useMemo(() => grid.columns.filter(c => c.visible), [grid.columns]);

  // Calculate grid template
  const gridTemplate = useMemo(() => {
    let template = config.enableBulkSelection ? '40px ' : '';
    template += visibleColumns.map(c => `${c.width}px`).join(' ');
    if (renderActions) template += ' 80px';
    return template;
  }, [visibleColumns, config.enableBulkSelection, renderActions]);

  const rowHeight = ROW_HEIGHTS[grid.rowHeight];

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (grid.selectedRowIds.size === data.length) {
      grid.clearSelection();
    } else {
      grid.selectAllRows(data.map(row => String(row[rowIdField])));
    }
  }, [data, grid, rowIdField]);

  // Default cell renderer
  const defaultRenderCell = useCallback((row: T, column: ColumnConfig) => {
    const value = row[column.id];
    
    if (value === null || value === undefined) {
      return <span className="text-text-quaternary">—</span>;
    }

    switch (column.type) {
      case 'boolean':
        return value ? <Check className="h-4 w-4 text-status-success" /> : <X className="h-4 w-4 text-text-quaternary" />;
      case 'date':
        return new Date(value as string).toLocaleDateString();
      case 'badge':
        return <Badge variant="outline" className="text-xs">{String(value)}</Badge>;
      default:
        return <span className="truncate">{String(value)}</span>;
    }
  }, []);

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full bg-surface-1', className)}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-1 gap-3">
          {/* Left side - Search & Filters */}
          <div className="flex items-center gap-2 flex-1">
            {config.enableSearch && (
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
                <Input
                  value={grid.searchQuery}
                  onChange={(e) => grid.setSearchQuery(e.target.value)}
                  placeholder={config.searchPlaceholder || 'Search...'}
                  className="pl-8 h-8 bg-surface-2 border-border-default text-sm"
                />
              </div>
            )}

            {config.enableFilters && (
              <Popover open={filtersPopoverOpen} onOpenChange={setFiltersPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-8',
                      grid.filterConfig.length > 0 && 'text-accent-primary border-accent-primary'
                    )}
                  >
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    Filters
                    {grid.filterConfig.length > 0 && (
                      <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-accent-primary text-white">
                        {grid.filterConfig.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[400px] p-0">
                  <div className="p-3 border-b border-border-default">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Filters</span>
                      {grid.filterConfig.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={grid.clearFilters} className="h-6 text-xs">
                          Clear all
                        </Button>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="max-h-[300px]">
                    <div className="p-3 space-y-2">
                      {grid.filterConfig.length === 0 ? (
                        <div className="text-center py-6 text-sm text-text-tertiary">
                          No filters applied
                        </div>
                      ) : (
                        grid.filterConfig.map(filter => (
                          <div key={filter.id} className="flex items-center gap-2 p-2 bg-surface-2 rounded-md">
                            <Select
                              value={filter.column}
                              onValueChange={(val) => grid.updateFilter(filter.id, { column: val })}
                            >
                              <SelectTrigger className="w-28 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {grid.columns.filter(c => c.filterable !== false).map(col => (
                                  <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={filter.operator}
                              onValueChange={(val) => grid.updateFilter(filter.id, { operator: val as FilterOperator })}
                            >
                              <SelectTrigger className="w-28 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FILTER_OPERATORS.map(op => (
                                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={String(filter.value || '')}
                              onChange={(e) => grid.updateFilter(filter.id, { value: e.target.value })}
                              className="flex-1 h-7 text-xs"
                              placeholder="Value"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => grid.removeFilter(filter.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t border-border-default">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => grid.addFilter({ column: grid.columns[0]?.id || '', operator: 'eq', value: '' })}
                      className="w-full"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Filter
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Bulk actions */}
            {config.enableBulkSelection && grid.selectedRowIds.size > 0 && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border-default">
                <span className="text-sm text-text-secondary">
                  {grid.selectedRowIds.size} selected
                </span>
                {bulkActions.map(action => (
                  <Button
                    key={action.id}
                    variant={action.destructive ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-7"
                    onClick={() => onBulkAction?.(action.id, Array.from(grid.selectedRowIds))}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" className="h-7" onClick={grid.clearSelection}>
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Right side - Views & Display */}
          <div className="flex items-center gap-2">
            {toolbarActions}

            {/* Saved Views */}
            {config.enableSavedViews && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Star className="h-3.5 w-3.5 mr-1.5" />
                    {grid.activeView?.name || 'Views'}
                    <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {grid.views.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-text-tertiary text-center">
                      No saved views
                    </div>
                  ) : (
                    grid.views.map(view => (
                      <DropdownMenuItem
                        key={view.id}
                        onClick={() => grid.loadView(view.id)}
                        className="flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          {view.isDefault && <Star className="h-3 w-3 text-status-warning fill-status-warning" />}
                          {view.name}
                        </span>
                        {view.isShared && <Share2 className="h-3 w-3 text-text-quaternary" />}
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSaveViewOpen(true)}>
                    <Save className="h-3.5 w-3.5 mr-2" />
                    Save Current View
                  </DropdownMenuItem>
                  {grid.activeView && (
                    <DropdownMenuItem
                      onClick={() => grid.deleteView(grid.activeView!.id)}
                      className="text-status-error"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete View
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Column Visibility */}
            <Popover open={columnsPopoverOpen} onOpenChange={setColumnsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Columns3 className="h-3.5 w-3.5 mr-1.5" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-0">
                <div className="p-3 border-b border-border-default flex items-center justify-between">
                  <span className="text-sm font-medium">Toggle Columns</span>
                  <Button variant="ghost" size="sm" onClick={grid.resetColumns} className="h-6 text-xs">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="p-2">
                    {grid.columns.map(column => (
                      <label
                        key={column.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-hover cursor-pointer"
                      >
                        <Checkbox
                          checked={column.visible}
                          onCheckedChange={(checked) => grid.setColumnVisible(column.id, checked as boolean)}
                        />
                        <span className="text-sm">{column.label}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Row Height */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  {React.createElement(ROW_HEIGHT_ICONS[grid.rowHeight], { className: 'h-3.5 w-3.5' })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={grid.rowHeight} onValueChange={(v) => grid.setRowHeight(v as RowHeight)}>
                  <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="normal">Normal</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {config.enableOpenInNewWindow && (
                  <DropdownMenuItem onClick={grid.openInNewWindow}>
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Open in New Window
                  </DropdownMenuItem>
                )}
                {onExport && (
                  <>
                    <DropdownMenuItem onClick={() => onExport('csv', data)}>
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExport('json', data)}>
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Export JSON
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={grid.clearSort}>
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />
                  Reset Sort
                </DropdownMenuItem>
                <DropdownMenuItem onClick={grid.clearFilters}>
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />
                  Reset Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div
            className="sticky top-0 z-10 flex items-center bg-surface-2 border-b border-border-default"
            style={{ height: 36 }}
          >
            <div className="flex items-center" style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
              {config.enableBulkSelection && (
                <div className="flex items-center justify-center h-full px-2">
                  <Checkbox
                    checked={data.length > 0 && grid.selectedRowIds.size === data.length}
                    onCheckedChange={handleSelectAll}
                  />
                </div>
              )}
              {visibleColumns.map(column => (
                <ColumnHeader
                  key={column.id}
                  column={column}
                  sortConfig={grid.sortConfig}
                  onToggleSort={grid.toggleSort}
                  onResize={grid.setColumnWidth}
                />
              ))}
              {renderActions && (
                <div className="flex items-center justify-center h-full px-2 text-xs font-medium text-text-tertiary">
                  Actions
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
            </div>
          ) : data.length === 0 ? (
            emptyState || (
              <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
                <Search className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">No data found</p>
              </div>
            )
          ) : (
            <div>
              {data.map((row, index) => {
                const rowId = String(row[rowIdField]);
                const isSelected = grid.isRowSelected(rowId);

                return (
                  <div
                    key={rowId}
                    className={cn(
                      'flex items-center border-b border-border-default transition-colors',
                      'hover:bg-surface-hover cursor-pointer',
                      isSelected && 'bg-accent-subtle/50',
                      index % 2 === 0 ? 'bg-surface-1' : 'bg-surface-2/30'
                    )}
                    style={{ height: rowHeight, display: 'grid', gridTemplateColumns: gridTemplate }}
                    onClick={() => onRowClick?.(row)}
                    onDoubleClick={() => onRowDoubleClick?.(row)}
                  >
                    {config.enableBulkSelection && (
                      <div
                        className="flex items-center justify-center h-full px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          grid.toggleRowSelection(rowId);
                        }}
                      >
                        <Checkbox checked={isSelected} />
                      </div>
                    )}
                    {visibleColumns.map(column => (
                      <div
                        key={column.id}
                        className={cn(
                          'flex items-center h-full px-3 text-sm text-text-primary overflow-hidden',
                          column.align === 'center' && 'justify-center',
                          column.align === 'right' && 'justify-end',
                        )}
                        style={{ width: column.width }}
                      >
                        {renderCell ? renderCell(row, column) : defaultRenderCell(row, column)}
                      </div>
                    ))}
                    {renderActions && (
                      <div
                        className="flex items-center justify-center h-full px-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderActions(row)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {totalCount !== undefined && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border-default bg-surface-2 text-sm text-text-tertiary">
            <span>
              Showing {data.length} of {totalCount} items
            </span>
            {grid.selectedRowIds.size > 0 && (
              <span>{grid.selectedRowIds.size} selected</span>
            )}
          </div>
        )}

        {/* Save View Dialog */}
        <SaveViewDialog
          open={saveViewOpen}
          onOpenChange={setSaveViewOpen}
          onSave={grid.saveView}
          existingViews={grid.views}
        />
      </div>
    </TooltipProvider>
  );
}

export type { EnterpriseGridProps, ColumnConfig };
