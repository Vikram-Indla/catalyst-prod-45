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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InlineEditCell } from './InlineEditCell';
import { InlineUserPicker } from './InlineUserPicker';
import { InlineReleasePicker } from './InlineReleasePicker';
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
import { toast } from '@/components/ui/catalyst-toast';
import { getCommitteeDisplayStatus } from '@/utils/committeeStatus';
import { useUpdateIncident } from '@/hooks/useIncidents';
import type { Incident } from '@/types/incident';
import type { ColumnConfig, TableDensity } from '@/hooks/useIncidentColumns';
import { cn } from '@/lib/utils';
import { getAgingTime } from '@/components/incidents/badges/IncidentBadges';
import { StatusPill, SeverityPill, SlaPill, MajorPill, CommitteePill } from './TablePill';

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

// Enterprise typography - consistent across table
const HEADER_TEXT = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wider';
const CELL_TEXT = 'text-[12px] leading-4 text-foreground';
const CELL_MUTED = 'text-[12px] leading-4 text-muted-foreground';

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

// Default columns configuration
const DEFAULT_VISIBLE_COLUMNS: ColumnConfig[] = [
  { id: 'key', label: 'Key', visible: true, required: true },
  { id: 'summary', label: 'Summary', visible: true, required: true },
  { id: 'severity', label: 'Sev', visible: true },
  { id: 'level', label: 'Lvl', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'age', label: 'Age', visible: true },
  { id: 'sla', label: 'SLA', visible: true },
  { id: 'releaseVersion', label: 'Release', visible: false },
  { id: 'major', label: 'Major', visible: false },
  { id: 'committee', label: 'Committee', visible: true },
];

function LoadingSkeleton({ 
  gridTemplate, 
  visibleColumns 
}: { 
  gridTemplate: string; 
  visibleColumns: ColumnConfig[];
}) {
  const isColumnVisible = (colId: string) => visibleColumns.some(c => c.id === colId && c.visible !== false);
  const isCentered = (colId: string) => CENTER_ALIGNED_COLUMNS.includes(colId);

  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      {/* Header - exactly 32px */}
      <div 
        className="grid items-center h-8 bg-muted/40 border-b border-border"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {isColumnVisible('key') && (
          <div className={cn(GRID_CELL_BASE, "pl-3 pr-2 flex items-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>KEY</span>
          </div>
        )}
        {isColumnVisible('summary') && (
          <div className={cn(GRID_CELL_BASE, "pr-2 flex items-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>SUMMARY</span>
          </div>
        )}
        {isColumnVisible('severity') && (
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>SEV</span>
          </div>
        )}
        {isColumnVisible('level') && (
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>LVL</span>
          </div>
        )}
        {isColumnVisible('status') && (
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>STATUS</span>
          </div>
        )}
        {isColumnVisible('assignee') && (
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>ASSIGNEE</span>
          </div>
        )}
        {isColumnVisible('age') && (
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>AGE</span>
          </div>
        )}
        {isColumnVisible('sla') && (
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>SLA</span>
          </div>
        )}
        {isColumnVisible('releaseVersion') && (
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>RELEASE</span>
          </div>
        )}
        {isColumnVisible('major') && (
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>MAJOR</span>
          </div>
        )}
        {isColumnVisible('committee') && (
          <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
            <span className={cn(HEADER_TEXT, "truncate")}>COMMITTEE</span>
          </div>
        )}
        <div className={cn(GRID_CELL_BASE, "flex items-center h-full")}></div>
      </div>
      {/* Skeleton rows - exactly 36px each */}
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="grid items-center h-9 border-b border-border last:border-b-0"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {isColumnVisible('key') && (
            <div className={cn(GRID_CELL_BASE, "pl-3 pr-2 flex items-center h-full")}>
              <Skeleton className="h-3.5 w-14" />
            </div>
          )}
          {isColumnVisible('summary') && (
            <div className={cn(GRID_CELL_BASE, "pr-2 flex items-center h-full")}>
              <Skeleton className="h-3.5 w-full max-w-[90%]" />
            </div>
          )}
          {isColumnVisible('severity') && (
            <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          )}
          {isColumnVisible('level') && (
            <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
              <Skeleton className="h-3.5 w-6" />
            </div>
          )}
          {isColumnVisible('status') && (
            <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          )}
          {isColumnVisible('assignee') && (
            <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
              <Skeleton className="h-4 w-24" />
            </div>
          )}
          {isColumnVisible('age') && (
            <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
              <Skeleton className="h-3.5 w-8" />
            </div>
          )}
          {isColumnVisible('sla') && (
            <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
              <Skeleton className="h-3.5 w-14" />
            </div>
          )}
          {isColumnVisible('releaseVersion') && (
            <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
              <Skeleton className="h-3.5 w-16" />
            </div>
          )}
          {isColumnVisible('major') && (
            <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
              <Skeleton className="h-3.5 w-10" />
            </div>
          )}
          {isColumnVisible('committee') && (
            <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
              <Skeleton className="h-3.5 w-16" />
            </div>
          )}
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
    navigate(`/release/incidents/${incidentId}`);
  };

  const handleCopyLink = (incidentId: string, incidentKey: string) => {
    const url = `${window.location.origin}/release/incidents/${incidentId}`;
    navigator.clipboard.writeText(url);
    toast.success(`Link copied`, { description: `${incidentKey} link copied to clipboard` });
  };

  const handleInlineUpdate = async (incidentId: string, field: string, value: string | boolean) => {
    try {
      await updateIncident.mutateAsync({ id: incidentId, data: { [field]: value } });
      toast.success('Saved', { description: `${field} updated` });
    } catch (error: any) {
      toast.error('Update failed', { description: error.message || 'Please try again' });
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
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full">
        {/* Table container - horizontal scroll when content exceeds viewport */}
        <div 
          ref={containerRef}
          className="rounded-md border border-border overflow-hidden bg-card flex-1"
        >
          <div className="overflow-x-auto w-full h-full">
            {/* Grid table - min-width ensures it can grow for horizontal scroll */}
            <div style={{ minWidth: `${totalTableWidth}px`, width: '100%' }}>
              {/* Header row - exactly 32px height, CSS Grid layout */}
              <div 
                className="grid items-center h-8 sticky top-0 z-20 bg-muted/40 border-b border-border"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {/* Key - left aligned */}
                {isColumnVisible('key') && (
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
                )}
                {/* Summary - left aligned */}
                {isColumnVisible('summary') && (
                  <ResizableHeader
                    columnId="summary"
                    width={columnWidths.summary}
                    minWidth={MIN_COLUMN_WIDTHS.summary}
                    maxWidth={MAX_COLUMN_WIDTHS.summary}
                    onResize={handleColumnResize}
                    className={cn(GRID_CELL_BASE, "pr-2")}
                  >
                    <span className={HEADER_TEXT}>SUMMARY</span>
                  </ResizableHeader>
                )}
                {/* Sev - center aligned */}
                {isColumnVisible('severity') && (
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
                )}
                {/* Lvl - center aligned */}
                {isColumnVisible('level') && (
                  <ResizableHeader
                    columnId="level"
                    width={columnWidths.level}
                    minWidth={MIN_COLUMN_WIDTHS.level}
                    maxWidth={MAX_COLUMN_WIDTHS.level}
                    onResize={handleColumnResize}
                    className={cn(GRID_CELL_BASE, "px-2")}
                    centered
                  >
                    <span className={HEADER_TEXT}>LVL</span>
                  </ResizableHeader>
                )}
                {/* Status - center aligned */}
                {isColumnVisible('status') && (
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
                )}
                {/* Assignee - center aligned */}
                {isColumnVisible('assignee') && (
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
                )}
                {/* Age - center aligned */}
                {isColumnVisible('age') && (
                  <ResizableHeader
                    columnId="age"
                    width={columnWidths.age}
                    minWidth={MIN_COLUMN_WIDTHS.age}
                    maxWidth={MAX_COLUMN_WIDTHS.age}
                    onResize={handleColumnResize}
                    className={cn(GRID_CELL_BASE, "px-2")}
                    centered
                  >
                    <span className={HEADER_TEXT}>AGE</span>
                  </ResizableHeader>
                )}
                {/* SLA - center aligned */}
                {isColumnVisible('sla') && (
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
                )}
                {/* Release - center aligned */}
                {isColumnVisible('releaseVersion') && (
                  <ResizableHeader
                    columnId="releaseVersion"
                    width={columnWidths.releaseVersion}
                    minWidth={MIN_COLUMN_WIDTHS.releaseVersion}
                    maxWidth={MAX_COLUMN_WIDTHS.releaseVersion}
                    onResize={handleColumnResize}
                    className={cn(GRID_CELL_BASE, "px-2")}
                    centered
                  >
                    <span className={HEADER_TEXT}>RELEASE</span>
                  </ResizableHeader>
                )}
                {/* Major - center aligned */}
                {isColumnVisible('major') && (
                  <ResizableHeader
                    columnId="major"
                    width={columnWidths.major}
                    minWidth={MIN_COLUMN_WIDTHS.major}
                    maxWidth={MAX_COLUMN_WIDTHS.major}
                    onResize={handleColumnResize}
                    className={cn(GRID_CELL_BASE, "px-2")}
                    centered
                  >
                    <span className={HEADER_TEXT}>MAJOR</span>
                  </ResizableHeader>
                )}
                {/* Committee - center aligned */}
                {isColumnVisible('committee') && (
                  <ResizableHeader
                    columnId="committee"
                    width={columnWidths.committee}
                    minWidth={MIN_COLUMN_WIDTHS.committee}
                    maxWidth={MAX_COLUMN_WIDTHS.committee}
                    onResize={handleColumnResize}
                    className={cn(GRID_CELL_BASE, "px-2")}
                    centered
                  >
                    <span className={HEADER_TEXT}>COMMITTEE</span>
                  </ResizableHeader>
                )}
                {/* Actions header - fixed 40px */}
                <div className={cn(GRID_CELL_BASE, "flex items-center h-full")}></div>
              </div>

              {/* Body */}
              {incidents.length === 0 ? (
                <div className="py-10 text-center">
                  <span className="text-sm text-muted-foreground">No incidents to display</span>
                </div>
              ) : (
                incidents.map((incident) => {
                  const age = getAgingTime(incident.created_at);
                  const slaStatus = getSlaStatus(incident);
                  const committeeStatus = getCommitteeDisplayStatus(incident.committee);
                  const isConverted = incident.status === 'converted' || incident.status === 'closed';
                  const isHovered = hoveredId === incident.id;
                  
                  return (
                    <div 
                      key={incident.id} 
                      className={cn(
                        // CSS Grid row - exactly 36px height
                        'grid items-center h-9 transition-colors cursor-pointer border-b border-border last:border-b-0',
                        isHovered && 'bg-muted/30'
                      )}
                      style={{ gridTemplateColumns: gridTemplate }}
                      onClick={(e) => handleRowClick(incident.id, e)}
                      onMouseEnter={() => setHoveredId(incident.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && incident.id) navigate(`/release/incidents/${incident.id}`);
                      }}
                    >
                      {/* Key - left aligned */}
                      {isColumnVisible('key') && (
                        <div className={cn(GRID_CELL_BASE, "pl-3 pr-2 flex items-center h-full")}>
                          <Link 
                            to={`/release/incidents/${incident.id}`} 
                            className={cn(CELL_TEXT, "font-medium text-primary hover:underline truncate")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {incident.incident_key}
                          </Link>
                          {incident.is_major_incident && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-3 w-3 ml-1 text-amber-500 shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">Major incident</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                      
                      {/* Summary - left aligned */}
                      {isColumnVisible('summary') && (
                        <div 
                          className={cn(GRID_CELL_BASE, "pr-2 flex items-center h-full")} 
                          data-inline-edit
                        >
                          <InlineEditCell
                            type="text"
                            value={incident.title}
                            displayValue={
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(CELL_TEXT, "truncate font-medium cursor-pointer block w-full")}>{incident.title}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-md break-words">{incident.title}</TooltipContent>
                              </Tooltip>
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'title', val)}
                            disabled={isConverted}
                            textSize="text-[12px]"
                          />
                        </div>
                      )}
                      
                      {/* Severity - center aligned */}
                      {isColumnVisible('severity') && (
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
                      )}
                      
                      {/* Level - center aligned */}
                      {isColumnVisible('level') && (
                        <div 
                          className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")} 
                          data-inline-edit
                        >
                          <InlineEditCell
                            type="select"
                            value={incident.support_level || ''}
                            options={SUPPORT_OPTIONS}
                            displayValue={
                              incident.support_level ? (
                                <span className={cn(CELL_MUTED, "tabular-nums truncate")}>{incident.support_level}</span>
                              ) : (
                                <span className={cn(CELL_MUTED, "opacity-50")}>—</span>
                              )
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'support_level', val)}
                            disabled={isConverted}
                            textSize="text-[12px]"
                          />
                        </div>
                      )}
                      
                      {/* Status - center aligned */}
                      {isColumnVisible('status') && (
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
                      )}
                      
                      {/* Assignee - center aligned */}
                      {isColumnVisible('assignee') && (
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
                      )}
                      
                      {/* Age - center aligned */}
                      {isColumnVisible('age') && (
                        <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                          <span className={cn(CELL_MUTED, "tabular-nums text-[11px] truncate")}>{age}</span>
                        </div>
                      )}
                      
                      {/* SLA - center aligned */}
                      {isColumnVisible('sla') && (
                        <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                          {slaStatus ? (
                            <SlaPill status={slaStatus} />
                          ) : (
                            <span className={cn(CELL_MUTED, "opacity-50 text-[11px]")}>—</span>
                          )}
                        </div>
                      )}

                      {/* Release - center aligned */}
                      {isColumnVisible('releaseVersion') && (
                        <div 
                          className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}
                          data-inline-edit
                        >
                          <InlineReleasePicker
                            value={incident.release_version}
                            onSave={(releaseId) => handleInlineUpdate(incident.id, 'release_version_id', releaseId || '')}
                            disabled={isConverted}
                            textSize="text-[12px]"
                          />
                        </div>
                      )}

                      {/* Major - center aligned */}
                      {isColumnVisible('major') && (
                        <div 
                          className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")} 
                          data-inline-edit
                        >
                          <InlineEditCell
                            type="toggle"
                            value={incident.is_major_incident || false}
                            displayValue={<MajorPill isMajor={incident.is_major_incident || false} />}
                            onSave={(val) => handleInlineUpdate(incident.id, 'is_major_incident', val)}
                            disabled={isConverted}
                            textSize="text-[12px]"
                          />
                        </div>
                      )}

                      {/* Committee - center aligned */}
                      {isColumnVisible('committee') && (
                        <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                          <CommitteePill status={committeeStatus.status} label={committeeStatus.label} />
                        </div>
                      )}

                      {/* Actions */}
                      <div className={cn(GRID_CELL_BASE, "flex items-center justify-center h-full")}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button 
                              className={cn(
                                "w-6 h-6 rounded flex items-center justify-center transition-opacity",
                                "hover:bg-muted text-muted-foreground",
                                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
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
                                navigate(`/release/incidents/${incident.id}`);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/release/incidents/${incident.id}?mode=edit`);
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

        {/* Pagination Footer */}
        {totalCount !== undefined && totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-card flex-shrink-0 mt-2 rounded-md">
            {/* Left side: Range text */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                Showing {startItem}–{endItem} of {totalCount} incident{totalCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Center: Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page:</span>
              <Select 
                value={effectivePageSize.toString()} 
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <SelectItem key={size} value={size.toString()} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right side: Page navigation */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page <= 1}
                  onClick={() => onPageChange?.(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange?.(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
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
    </TooltipProvider>
  );
}
