/**
 * IncidentListTable — Enterprise-grade incident tracking table
 * 
 * Design: Jira-quality dense enterprise list view
 * - Compact row height (36px body, 32px header)
 * - Perfect vertical alignment across all cells
 * - Consistent text baseline alignment
 * - Single-line summary with ellipsis/tooltip
 * - No visual noise, calm enterprise aesthetic
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Pencil, Trash2, AlertTriangle, Copy } from 'lucide-react';
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
import { InlineEditCell } from './InlineEditCell';
import { InlineUserPicker } from './InlineUserPicker';
import { InlineReleasePicker } from './InlineReleasePicker';
import { DeleteIncidentDialog } from './DeleteIncidentDialog';
import { ResizableHeader } from './ResizableHeader';
import { useIncidentColumnWidths, MIN_COLUMN_WIDTHS } from './useIncidentColumnWidths';
import { toast } from '@/components/ui/catalyst-toast';
import { getCommitteeDisplayStatus } from '@/utils/committeeStatus';
import { useUpdateIncident } from '@/hooks/useIncidents';
import type { Incident } from '@/types/incident';
import type { ColumnConfig, TableDensity } from '@/hooks/useIncidentColumns';
import { cn } from '@/lib/utils';
import { getAgingTime } from '@/components/incidents/badges/IncidentBadges';
import { StatusPill, SeverityPill, SlaPill, MajorPill, CommitteePill } from './TablePill';

interface IncidentListTableProps {
  incidents: Incident[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  visibleColumns?: ColumnConfig[];
  density?: TableDensity;
}

// Enterprise typography - consistent across table
const HEADER_TEXT = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wider';
const CELL_TEXT = 'text-[12px] leading-4 text-foreground';
const CELL_MUTED = 'text-[12px] leading-4 text-muted-foreground';

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

function LoadingSkeleton() {
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      {/* Header - 32px */}
      <div className="flex items-center h-8 px-3 bg-muted/30 border-b border-border">
        <div className="w-[110px] shrink-0"><span className={HEADER_TEXT}>Key</span></div>
        <div className="flex-1 min-w-[180px]"><span className={HEADER_TEXT}>Summary</span></div>
        <div className="shrink-0 flex items-center gap-0">
          <span className={cn(HEADER_TEXT, 'w-[80px] px-2')}>Sev</span>
          <span className={cn(HEADER_TEXT, 'w-[50px] px-2')}>Lvl</span>
          <span className={cn(HEADER_TEXT, 'w-[110px] px-2')}>Status</span>
          <span className={cn(HEADER_TEXT, 'w-[160px] px-2')}>Assignee</span>
          <span className={cn(HEADER_TEXT, 'w-[55px] px-2')}>Age</span>
          <span className={cn(HEADER_TEXT, 'w-[70px] px-2')}>SLA</span>
          <span className={cn(HEADER_TEXT, 'w-[90px] px-2')}>Committee</span>
        </div>
        <div className="w-8 shrink-0"></div>
      </div>
      {/* Skeleton rows - 36px each */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex items-center h-9 px-3 border-b border-border last:border-b-0">
          <div className="w-[110px] shrink-0"><Skeleton className="h-3.5 w-14" /></div>
          <div className="flex-1 min-w-[180px] pr-2"><Skeleton className="h-3.5 w-full" /></div>
          <div className="shrink-0 flex items-center gap-0">
            <div className="w-[80px] px-2"><Skeleton className="h-5 w-12 rounded-full" /></div>
            <div className="w-[50px] px-2"><Skeleton className="h-3.5 w-5" /></div>
            <div className="w-[110px] px-2"><Skeleton className="h-5 w-16 rounded-full" /></div>
            <div className="w-[160px] px-2"><Skeleton className="h-4 w-20" /></div>
            <div className="w-[55px] px-2"><Skeleton className="h-3.5 w-6" /></div>
            <div className="w-[70px] px-2"><Skeleton className="h-3.5 w-12" /></div>
            <div className="w-[90px] px-2"><Skeleton className="h-3.5 w-12" /></div>
          </div>
          <div className="w-8 shrink-0"></div>
        </div>
      ))}
    </div>
  );
}

export function IncidentListTable({ 
  incidents, 
  isLoading,
  page = 1,
  pageSize = 40,
  totalCount,
  onPageChange,
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
  
  const { columnWidths, handleColumnResize } = useIncidentColumnWidths();
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const isColumnVisible = (colId: string) => visibleColumns.some(c => c.id === colId && c.visible !== false);

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

  // Calculate minimum table width
  const getMinTableWidth = () => {
    let width = 32;
    if (isColumnVisible('key')) width += columnWidths.key;
    if (isColumnVisible('summary')) width += columnWidths.summary;
    if (isColumnVisible('severity')) width += columnWidths.severity;
    if (isColumnVisible('level')) width += columnWidths.level;
    if (isColumnVisible('status')) width += columnWidths.status;
    if (isColumnVisible('assignee')) width += columnWidths.assignee;
    if (isColumnVisible('age')) width += columnWidths.age;
    if (isColumnVisible('sla')) width += columnWidths.sla;
    if (isColumnVisible('releaseVersion')) width += columnWidths.releaseVersion;
    if (isColumnVisible('major')) width += columnWidths.major;
    if (isColumnVisible('committee')) width += columnWidths.committee;
    return Math.max(width + 32, 800);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full">
        {/* Table container */}
        <div className="rounded-md border border-border overflow-hidden bg-card flex-1">
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${getMinTableWidth()}px` }}>
              {/* Header - 32px height, perfect alignment */}
              <div className="flex items-center h-8 sticky top-0 z-20 bg-muted/40 border-b border-border">
                {/* Key */}
                {isColumnVisible('key') && (
                  <ResizableHeader
                    columnId="key"
                    width={columnWidths.key}
                    minWidth={MIN_COLUMN_WIDTHS.key}
                    onResize={handleColumnResize}
                    className="pl-3 pr-2"
                  >
                    <span className={HEADER_TEXT}>KEY</span>
                  </ResizableHeader>
                )}
                {/* Summary */}
                {isColumnVisible('summary') && (
                  <ResizableHeader
                    columnId="summary"
                    width={columnWidths.summary}
                    minWidth={MIN_COLUMN_WIDTHS.summary}
                    onResize={handleColumnResize}
                    className="pr-2"
                    isFlexible
                  >
                    <span className={HEADER_TEXT}>SUMMARY</span>
                  </ResizableHeader>
                )}
                {/* Sev */}
                {isColumnVisible('severity') && (
                  <ResizableHeader
                    columnId="severity"
                    width={columnWidths.severity}
                    minWidth={MIN_COLUMN_WIDTHS.severity}
                    onResize={handleColumnResize}
                    className="px-2"
                  >
                    <span className={HEADER_TEXT}>SEV</span>
                  </ResizableHeader>
                )}
                {/* Lvl */}
                {isColumnVisible('level') && (
                  <ResizableHeader
                    columnId="level"
                    width={columnWidths.level}
                    minWidth={MIN_COLUMN_WIDTHS.level}
                    onResize={handleColumnResize}
                    className="px-2"
                  >
                    <span className={HEADER_TEXT}>LVL</span>
                  </ResizableHeader>
                )}
                {/* Status */}
                {isColumnVisible('status') && (
                  <ResizableHeader
                    columnId="status"
                    width={columnWidths.status}
                    minWidth={MIN_COLUMN_WIDTHS.status}
                    onResize={handleColumnResize}
                    className="px-2"
                  >
                    <span className={HEADER_TEXT}>STATUS</span>
                  </ResizableHeader>
                )}
                {/* Assignee */}
                {isColumnVisible('assignee') && (
                  <ResizableHeader
                    columnId="assignee"
                    width={columnWidths.assignee}
                    minWidth={MIN_COLUMN_WIDTHS.assignee}
                    onResize={handleColumnResize}
                    className="px-2"
                  >
                    <span className={HEADER_TEXT}>ASSIGNEE</span>
                  </ResizableHeader>
                )}
                {/* Age */}
                {isColumnVisible('age') && (
                  <ResizableHeader
                    columnId="age"
                    width={columnWidths.age}
                    minWidth={MIN_COLUMN_WIDTHS.age}
                    onResize={handleColumnResize}
                    className="px-2"
                  >
                    <span className={HEADER_TEXT}>AGE</span>
                  </ResizableHeader>
                )}
                {/* SLA */}
                {isColumnVisible('sla') && (
                  <ResizableHeader
                    columnId="sla"
                    width={columnWidths.sla}
                    minWidth={MIN_COLUMN_WIDTHS.sla}
                    onResize={handleColumnResize}
                    className="px-2"
                  >
                    <span className={HEADER_TEXT}>SLA</span>
                  </ResizableHeader>
                )}
                {/* Release */}
                {isColumnVisible('releaseVersion') && (
                  <ResizableHeader
                    columnId="releaseVersion"
                    width={columnWidths.releaseVersion}
                    minWidth={MIN_COLUMN_WIDTHS.releaseVersion}
                    onResize={handleColumnResize}
                    className="px-2"
                  >
                    <span className={HEADER_TEXT}>RELEASE</span>
                  </ResizableHeader>
                )}
                {/* Major */}
                {isColumnVisible('major') && (
                  <ResizableHeader
                    columnId="major"
                    width={columnWidths.major}
                    minWidth={MIN_COLUMN_WIDTHS.major}
                    onResize={handleColumnResize}
                    className="px-2"
                  >
                    <span className={HEADER_TEXT}>MAJOR</span>
                  </ResizableHeader>
                )}
                {/* Committee */}
                {isColumnVisible('committee') && (
                  <ResizableHeader
                    columnId="committee"
                    width={columnWidths.committee}
                    minWidth={MIN_COLUMN_WIDTHS.committee}
                    onResize={handleColumnResize}
                    className="px-2"
                  >
                    <span className={HEADER_TEXT}>COMMITTEE</span>
                  </ResizableHeader>
                )}
                {/* Actions spacer */}
                <div className="w-8 shrink-0 pr-3"></div>
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
                        // Fixed 36px row height for compact enterprise density
                        'flex items-center h-9 transition-colors cursor-pointer border-b border-border last:border-b-0',
                        isHovered && 'bg-muted/30'
                      )}
                      onClick={(e) => handleRowClick(incident.id, e)}
                      onMouseEnter={() => setHoveredId(incident.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && incident.id) navigate(`/release/incidents/${incident.id}`);
                      }}
                    >
                      {/* Key - aligned with header */}
                      {isColumnVisible('key') && (
                        <div 
                          className="shrink-0 pl-3 pr-2 flex items-center h-full"
                          style={{ width: `${columnWidths.key}px` }}
                        >
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
                      
                      {/* Summary - single line, ellipsis, tooltip on hover */}
                      {isColumnVisible('summary') && (
                        <div 
                          className="flex-1 pr-2 flex items-center h-full overflow-hidden" 
                          style={{ minWidth: `${columnWidths.summary}px` }}
                          data-inline-edit
                        >
                          <InlineEditCell
                            type="text"
                            value={incident.title}
                            displayValue={
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(CELL_TEXT, "truncate font-medium cursor-pointer block")}>{incident.title}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-sm">{incident.title}</TooltipContent>
                              </Tooltip>
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'title', val)}
                            disabled={isConverted}
                            textSize="text-[12px]"
                          />
                        </div>
                      )}
                      
                      {/* Severity - small neutral pill with colored dot */}
                      {isColumnVisible('severity') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full" 
                          style={{ width: `${columnWidths.severity}px` }}
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
                      
                      {/* Level - plain text only, no pill */}
                      {isColumnVisible('level') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full" 
                          style={{ width: `${columnWidths.level}px` }}
                          data-inline-edit
                        >
                          <InlineEditCell
                            type="select"
                            value={incident.support_level || ''}
                            options={SUPPORT_OPTIONS}
                            displayValue={
                              incident.support_level ? (
                                <span className={CELL_MUTED}>{incident.support_level}</span>
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
                      
                      {/* Status - compact pill */}
                      {isColumnVisible('status') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full" 
                          style={{ width: `${columnWidths.status}px` }}
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
                      
                      {/* Assignee - avatar + name inline, consistent height */}
                      {isColumnVisible('assignee') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full"
                          style={{ width: `${columnWidths.assignee}px` }}
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
                      
                      {/* Age - numeric text */}
                      {isColumnVisible('age') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full"
                          style={{ width: `${columnWidths.age}px` }}
                        >
                          <span className={cn(CELL_MUTED, "tabular-nums text-[11px]")}>{age}</span>
                        </div>
                      )}
                      
                      {/* SLA - subtle text color only */}
                      {isColumnVisible('sla') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full"
                          style={{ width: `${columnWidths.sla}px` }}
                        >
                          {slaStatus ? (
                            <SlaPill status={slaStatus} />
                          ) : (
                            <span className={cn(CELL_MUTED, "opacity-50 text-[11px]")}>—</span>
                          )}
                        </div>
                      )}

                      {/* Release - plain text */}
                      {isColumnVisible('releaseVersion') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full"
                          style={{ width: `${columnWidths.releaseVersion}px` }}
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

                      {/* Major - small badge or "—" */}
                      {isColumnVisible('major') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full" 
                          style={{ width: `${columnWidths.major}px` }}
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

                      {/* Committee - text only */}
                      {isColumnVisible('committee') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full"
                          style={{ width: `${columnWidths.committee}px` }}
                        >
                          <CommitteePill status={committeeStatus.status} label={committeeStatus.label} />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="w-8 shrink-0 flex items-center justify-end pr-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button 
                              className={cn(
                                "w-5 h-5 rounded flex items-center justify-center transition-opacity",
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

        {/* Pagination */}
        {totalCount !== undefined && totalCount > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-card flex-shrink-0 mt-2 rounded-md">
            <span className="text-xs text-muted-foreground">
              {totalCount > pageSize 
                ? `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`
                : `${totalCount} incident${totalCount !== 1 ? 's' : ''}`
              }
            </span>
            {totalCount > pageSize && onPageChange && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page} / {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={page * pageSize >= totalCount}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
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