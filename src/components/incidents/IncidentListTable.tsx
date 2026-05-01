/**
 * IncidentListTable — Enterprise-grade incident tracking table
 * 
 * Design: Jira-quality dense enterprise list view using CSS Grid
 * - CSS Grid layout with shared template between header and body rows
 * - Compact row height (36px body, 32px header)
 * - Auto-fit column widths on first load, with weighted stretch to fill container
 * - Resize + persist + restore pattern
 * - Perfect vertical alignment across all cells
 * - Center alignment for SEV onward columns
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Pencil, Trash2, AlertTriangle, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ads';
import { InlineEditCell } from './InlineEditCell';
import { JiraSyncChip } from '@/components/shared/JiraSyncChip';
import { InlineUserPicker } from './InlineUserPicker';
import { DeleteIncidentDialog } from './DeleteIncidentDialog';
import { ResizableHeader } from './ResizableHeader';
import { 
  useIncidentColumnWidths, 
  MIN_COLUMN_WIDTHS, 
  MAX_COLUMN_WIDTHS, 
  COLUMN_ORDER,
  CENTER_ALIGNED_COLUMNS,
  getGridTemplate,
} from './useIncidentColumnWidths';
import { catalystToast as toast } from '@/lib/catalystToast';
import { useUpdateIncident } from '@/hooks/useIncidents';
import type { Incident } from '@/types/incident';
import type { ColumnConfig, TableDensity } from '@/hooks/useIncidentColumns';
import { cn } from '@/lib/utils';
import { StatusPill, SeverityPill, SlaPill } from './TablePill';

// Page size storage key
const PAGE_SIZE_STORAGE_KEY = 'catalyst.incidentList.pageSize';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface IncidentListTableProps {
  incidents: Incident[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  visibleColumns?: ColumnConfig[];
  density?: TableDensity;
}

// Enterprise typography - consistent across table (matches For-You table styling)
const HEADER_TEXT = 'text-xs font-semibold text-text-muted uppercase tracking-wide';
const CELL_TEXT = 'text-sm leading-5 text-text-primary';
const CELL_MUTED = 'text-[13px] leading-5 text-text-muted';

// Grid cell base styles - ensure consistent box model
const GRID_CELL_BASE = 'min-w-0 overflow-hidden';

// Status options for inline editing
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'triage', label: 'Triage' },
  { value: 'to_committee', label: 'Committee' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
];

// Severity options for inline editing
const SEVERITY_OPTIONS = [
  { value: 'SEV1', label: 'SEV1' },
  { value: 'SEV2', label: 'SEV2' },
  { value: 'SEV3', label: 'SEV3' },
  { value: 'SEV4', label: 'SEV4' },
];

// Support Level options
const SUPPORT_OPTIONS = [
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
];

// EXECUTIVE 6-COLUMN STRUCTURE ONLY - no hidden columns available
const DEFAULT_VISIBLE_COLUMNS: ColumnConfig[] = [
  { id: 'key', label: 'Key', visible: true, required: true },
  { id: 'summary', label: 'Summary', visible: true, required: true },
  { id: 'severity', label: 'Severity', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'sla', label: 'SLA', visible: true },
];

function LoadingSkeleton({ 
  gridTemplate, 
  visibleColumns 
}: { 
  gridTemplate: string; 
  visibleColumns: ColumnConfig[];
}) {
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      {/* Header - exactly 32px */}
      <div 
        className="grid items-center h-8 bg-muted/60 border-b border-border"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className={cn(GRID_CELL_BASE, "pl-3 pr-2 flex items-center h-full")}>
          <span className={cn(HEADER_TEXT, "truncate")}>KEY</span>
        </div>
        <div className={cn(GRID_CELL_BASE, "pr-2 flex items-center h-full")}>
          <span className={cn(HEADER_TEXT, "truncate")}>SUMMARY</span>
        </div>
        <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
          <span className={cn(HEADER_TEXT, "truncate")}>SEV</span>
        </div>
        <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
          <span className={cn(HEADER_TEXT, "truncate")}>STATUS</span>
        </div>
        <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
          <span className={cn(HEADER_TEXT, "truncate")}>ASSIGNEE</span>
        </div>
        <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
          <span className={cn(HEADER_TEXT, "truncate")}>SLA</span>
        </div>
        <div className={cn(GRID_CELL_BASE, "flex items-center h-full")}></div>
      </div>
      {/* Skeleton rows - exactly 36px each */}
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="grid items-center h-9 border-b border-border last:border-b-0"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div className={cn(GRID_CELL_BASE, "pl-3 pr-2 flex items-center h-full")}>
            <Skeleton className="h-3.5 w-14" />
          </div>
          <div className={cn(GRID_CELL_BASE, "pr-2 flex items-center h-full")}>
            <Skeleton className="h-3.5 w-full max-w-[90%]" />
          </div>
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <Skeleton className="h-4 w-24" />
          </div>
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className={cn(GRID_CELL_BASE, "flex items-center h-full")}></div>
        </div>
      ))}
    </div>
  );
}

export function IncidentListTable({ 
  incidents, 
  isLoading,
  page = 1,
  pageSize: externalPageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  density = 'compact',
}: IncidentListTableProps) {
  const navigate = useNavigate();
  const updateIncident = useUpdateIncident();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; key: string }>({ 
    open: false, 
    id: '', 
    key: '' 
  });
  
  // Local page size state with localStorage persistence
  const [localPageSize, setLocalPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (PAGE_SIZE_OPTIONS.includes(parsed)) return parsed;
      }
    } catch (e) {
      // Ignore
    }
    return externalPageSize || 25;
  });
  
  // Use external page size if provided, otherwise use local
  const effectivePageSize = externalPageSize || localPageSize;
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get visible column IDs for the hook
  const visibleColumnIds = useMemo(() => 
    visibleColumns.filter(c => c.visible !== false).map(c => c.id),
    [visibleColumns]
  );
  
  const { columnWidths, handleColumnResize, recalculateWidths } = useIncidentColumnWidths({
    containerRef,
    visibleColumns: visibleColumnIds,
  });

  // Recalculate widths when container resizes (only if no saved widths)
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        recalculateWidths(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [recalculateWidths]);

  const isColumnVisible = useCallback((colId: string) => 
    visibleColumns.some(c => c.id === colId && c.visible !== false),
    [visibleColumns]
  );
  
  // Build CSS Grid template string using the shared function - SINGLE SOURCE OF TRUTH
  const gridTemplate = useMemo(() => 
    getGridTemplate(columnWidths, isColumnVisible),
    [columnWidths, isColumnVisible]
  );

  // Calculate total table width
  const totalTableWidth = useMemo(() => {
    let width = 40; // Actions column
    COLUMN_ORDER.forEach(colId => {
      if (colId !== 'actions' && isColumnVisible(colId)) {
        width += columnWidths[colId] || MIN_COLUMN_WIDTHS[colId] || 60;
      }
    });
    return width;
  }, [columnWidths, isColumnVisible]);
  
  // Pagination calculations
  const totalPages = totalCount ? Math.ceil(totalCount / effectivePageSize) : 1;
  const startItem = ((page - 1) * effectivePageSize) + 1;
  const endItem = Math.min(page * effectivePageSize, totalCount || 0);
  
  // Handle page size change
  const handlePageSizeChange = useCallback((newSize: string) => {
    const size = parseInt(newSize, 10);
    setLocalPageSize(size);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, newSize);
    } catch (e) {
      // Ignore
    }
    onPageSizeChange?.(size);
    // Reset to page 1 when page size changes
    onPageChange?.(1);
  }, [onPageSizeChange, onPageChange]);
  
  if (isLoading) {
    return <LoadingSkeleton gridTemplate={gridTemplate} visibleColumns={visibleColumns} />;
  }

  const handleRowClick = (incidentId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="menu"]') || target.closest('input') || target.closest('[data-inline-edit]') || target.closest('select')) {
      return;
    }
    if (!incidentId) {
      toast.error('Cannot open incident: missing identifier');
      return;
    }
    navigate(`/incident-hub/view/${incidentId}`);
  };

  const handleCopyLink = (incidentId: string, incidentKey: string) => {
    const url = `${window.location.origin}/incident-hub/view/${incidentId}`;
    navigator.clipboard.writeText(url);
    toast.success(`Link copied`, `${incidentKey} link copied to clipboard`);
  };

  const handleInlineUpdate = async (incidentId: string, field: string, value: string | boolean) => {
    try {
      await updateIncident.mutateAsync({ id: incidentId, data: { [field]: value } });
      toast.success('Saved', `${field} updated`);
    } catch (error: any) {
      toast.error('Update failed', error.message || 'Please try again');
      throw error;
    }
  };

  const getSlaStatus = (incident: Incident) => {
    const breached = incident.sla?.response_breached || incident.sla?.resolution_breached;
    if (breached) return 'breached';
    if (incident.sla) return 'on_track';
    return null;
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Table container - horizontal scroll when content exceeds viewport */}
        <div 
          ref={containerRef}
          className="rounded-md border border-border overflow-hidden bg-card flex-1"
        >
          <div className="overflow-x-auto w-full h-full">
            {/* Grid table - min-width ensures it can grow for horizontal scroll */}
            <div style={{ minWidth: '100%', width: '100%' }}>
              {/* Header row - matches For-You table styling */}
              <div 
                className="grid items-center py-3 sticky top-0 z-20 bg-surface-1 border-b border-border"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {/* Key - left aligned */}
                <ResizableHeader
                  columnId="key"
                  width={columnWidths.key}
                  minWidth={MIN_COLUMN_WIDTHS.key}
                  maxWidth={MAX_COLUMN_WIDTHS.key}
                  onResize={handleColumnResize}
                  className={cn(GRID_CELL_BASE, "pl-3 pr-2")}
                >
                  <span className={HEADER_TEXT}>KEY</span>
                </ResizableHeader>
                {/* Summary - left aligned, takes remaining space */}
                <div className={cn(GRID_CELL_BASE, "pr-2 flex items-center h-full")}>
                  <span className={HEADER_TEXT}>SUMMARY</span>
                </div>
                {/* Sev - center aligned */}
                <ResizableHeader
                  columnId="severity"
                  width={columnWidths.severity}
                  minWidth={MIN_COLUMN_WIDTHS.severity}
                  maxWidth={MAX_COLUMN_WIDTHS.severity}
                  onResize={handleColumnResize}
                  className={cn(GRID_CELL_BASE, "px-2")}
                  centered
                >
                  <span className={HEADER_TEXT}>SEV</span>
                </ResizableHeader>
                {/* Status - center aligned */}
                <ResizableHeader
                  columnId="status"
                  width={columnWidths.status}
                  minWidth={MIN_COLUMN_WIDTHS.status}
                  maxWidth={MAX_COLUMN_WIDTHS.status}
                  onResize={handleColumnResize}
                  className={cn(GRID_CELL_BASE, "px-2")}
                  centered
                >
                  <span className={HEADER_TEXT}>STATUS</span>
                </ResizableHeader>
                {/* Assignee - center aligned */}
                <ResizableHeader
                  columnId="assignee"
                  width={columnWidths.assignee}
                  minWidth={MIN_COLUMN_WIDTHS.assignee}
                  maxWidth={MAX_COLUMN_WIDTHS.assignee}
                  onResize={handleColumnResize}
                  className={cn(GRID_CELL_BASE, "px-2")}
                  centered
                >
                  <span className={HEADER_TEXT}>ASSIGNEE</span>
                </ResizableHeader>
                {/* SLA - center aligned */}
                <ResizableHeader
                  columnId="sla"
                  width={columnWidths.sla}
                  minWidth={MIN_COLUMN_WIDTHS.sla}
                  maxWidth={MAX_COLUMN_WIDTHS.sla}
                  onResize={handleColumnResize}
                  className={cn(GRID_CELL_BASE, "px-2")}
                  centered
                >
                  <span className={HEADER_TEXT}>SLA</span>
                </ResizableHeader>
                {/* Actions header - fixed 40px */}
                <div className={cn(GRID_CELL_BASE, "flex items-center h-full")}></div>
              </div>

              {/* Body */}
              {incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No incidents found</p>
                  <p className="text-xs text-muted-foreground">Try adjusting your filters or search query</p>
                </div>
              ) : (
                incidents.map((incident) => {
                  const slaStatus = getSlaStatus(incident);
                  const isConverted = incident.status === 'converted' || incident.status === 'closed';
                  const isHovered = hoveredId === incident.id;
                  const isCritical = incident.severity === 'SEV1';
                  const isBreached = slaStatus === 'breached';
                  
                  return (
                    <div 
                      key={incident.id} 
                      className={cn(
                        // CSS Grid row - matches For-You table row styling
                        'grid items-center py-3 transition-colors cursor-pointer border-b border-border-subtle last:border-b-0',
                        // Default rows with hover
                        !isCritical && !isBreached && 'bg-surface-0 hover:bg-surface-hover',
                        // Hover override for non-highlighted rows
                        isHovered && !isCritical && !isBreached && 'bg-surface-hover'
                      )}
                      style={{
                        gridTemplateColumns: gridTemplate,
                        // Warning rows only (SEV1 or breached SLA) — champagne tint at 14% opacity
                        backgroundColor: (isCritical || isBreached)
                          ? 'hsl(var(--catalyst-champagne) / 0.14)'
                          : undefined,
                      }}
                      onClick={(e) => handleRowClick(incident.id, e)}
                      onMouseEnter={() => setHoveredId(incident.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && incident.id) navigate(`/incident-hub/view/${incident.id}`);
                      }}
                    >
                      {/* Key - left aligned */}
                      <div className={cn(GRID_CELL_BASE, "pl-4 pr-2 flex items-center gap-2.5")}>
                        <Link 
                          to={`/incident-hub/view/${incident.id}`} 
                          className="font-mono text-[13px] font-medium text-brand-primary hover:underline truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {incident.incident_key}
                        </Link>
                        {incident.jira_key && (
                          <JiraSyncChip jiraKey={incident.jira_key} size="sm" />
                        )}
                        {(incident.is_major_incident || isCritical || isBreached) && (
                          <Tooltip
                            position="right"
                            delay={200}
                            content={
                              <p className="font-medium">
                                {incident.is_major_incident ? 'Major Incident' : isBreached ? 'SLA Breached' : 'SEV1 Warning'}
                              </p>
                            }
                          >
                            <AlertTriangle className="h-3.5 w-3.5 ml-1 text-[var(--ds-text-warning,var(--ds-text-warning, #f59e0b))] shrink-0" />
                          </Tooltip>
                        )}
                      </div>
                      
                      {/* Summary - left aligned, takes remaining space */}
                      <div 
                        className={cn(GRID_CELL_BASE, "pr-2 flex items-center h-full")} 
                        data-inline-edit
                      >
                        <InlineEditCell
                          type="text"
                          value={incident.title}
                          displayValue={
                            <Tooltip content={incident.title} position="top" delay={200}>
                              <span className={cn(CELL_TEXT, "truncate font-medium cursor-pointer block w-full")}>{incident.title}</span>
                            </Tooltip>
                          }
                          onSave={(val) => handleInlineUpdate(incident.id, 'title', val)}
                          disabled={isConverted}
                          textSize="text-[12px]"
                        />
                      </div>
                      
                      {/* Severity - center aligned */}
                      <div 
                        className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")} 
                        data-inline-edit
                      >
                        <InlineEditCell
                          type="select"
                          value={incident.severity}
                          options={SEVERITY_OPTIONS}
                          displayValue={<SeverityPill severity={incident.severity} />}
                          onSave={(val) => handleInlineUpdate(incident.id, 'severity', val)}
                          disabled={isConverted}
                          textSize="text-[12px]"
                        />
                      </div>
                      
                      {/* Status - center aligned */}
                      <div 
                        className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")} 
                        data-inline-edit
                      >
                        <InlineEditCell
                          type="select"
                          value={incident.status}
                          options={STATUS_OPTIONS}
                          displayValue={<StatusPill status={incident.status} />}
                          onSave={(val) => handleInlineUpdate(incident.id, 'status', val)}
                          disabled={isConverted}
                          textSize="text-[12px]"
                        />
                      </div>
                      
                      {/* Assignee - center aligned with proper flex alignment */}
                      <div 
                        className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}
                        data-inline-edit
                      >
                        <InlineUserPicker
                          value={incident.assignee}
                          onSave={(userId) => handleInlineUpdate(incident.id, 'assignee_id', userId || '')}
                          disabled={isConverted}
                          textSize="text-[12px]"
                        />
                      </div>
                      
                      {/* SLA - center aligned */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                        {slaStatus ? (
                          <SlaPill status={slaStatus} />
                        ) : (
                          <span className={cn(CELL_MUTED, "opacity-50 text-[11px]")}>—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className={cn(GRID_CELL_BASE, "flex items-center justify-center h-full")}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button 
                              aria-label="Row actions"
                              className={cn(
                                "w-6 h-6 rounded flex items-center justify-center transition-opacity",
                                "hover:bg-surface-hover text-text-muted",
                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[hsl(var(--brand-primary))]",
                                isHovered ? "opacity-100" : "opacity-0"
                              )}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-40 bg-popover border-border z-[300]"
                          >
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/incident-hub/view/${incident.id}`);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/incident-hub/view/${incident.id}?mode=edit`);
                              }}
                              disabled={isConverted}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(incident.id, incident.incident_key);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              Copy link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-xs text-destructive cursor-pointer focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialog({ open: true, id: incident.id, key: incident.incident_key });
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pagination Footer - matches For-You table pagination styling */}
        {totalCount !== undefined && totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 mt-4 border border-border rounded-lg bg-surface-0">
            {/* Left side: Item count */}
            <div className="text-sm text-text-muted">
              Showing <span className="font-medium text-text-secondary">{startItem}-{endItem}</span> of{' '}
              <span className="font-medium text-text-secondary">{totalCount}</span> incident{totalCount !== 1 ? 's' : ''}
            </div>

            {/* Center: Page navigation with numbered pages */}
            <div className="flex items-center gap-1">
              {/* Previous page */}
              <button
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
                className={cn(
                  "p-1.5 rounded hover:bg-surface-hover transition-colors",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-text-muted" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange?.(pageNum)}
                      className={cn(
                        "min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-all duration-150",
                        page === pageNum
                          ? "text-white shadow-[0_2px_8px_rgba(37,99,235,0.18)]"
                          : "text-text-secondary hover:bg-surface-hover"
                      )}
                      style={page === pageNum ? {
                        background: 'linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-hover)))',
                      } : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next page */}
              <button
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
                className={cn(
                  "p-1.5 rounded hover:bg-surface-hover transition-colors",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                )}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            {/* Right side: Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">Per page:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-2 py-1 text-sm border border-border rounded bg-surface-0 text-text-secondary hover:bg-surface-hover transition-colors min-w-[48px] text-center">
                    {effectivePageSize}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-24 bg-popover border-border">
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <DropdownMenuItem
                      key={size}
                      className="text-sm cursor-pointer justify-center"
                      onClick={() => handlePageSizeChange(String(size))}
                    >
                      {size}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>

      <DeleteIncidentDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        incidentId={deleteDialog.id}
        incidentKey={deleteDialog.key}
      />
    </>
  );
}
