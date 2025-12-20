/**
 * IncidentListTable — Enterprise-grade incident tracking table
 * 
 * Design: Jira-quality dense enterprise list view
 * Features:
 * - Fixed row height (44px body, 40px header)
 * - Consistent vertical alignment across all cells
 * - Standardized pill sizing (24px height)
 * - Resizable columns with localStorage persistence
 * - Inline editing with DB persistence (optimistic + rollback)
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
import { StatusPill, SeverityPill, SlaPill, MajorPill, CommitteePill, TablePill } from './TablePill';

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

// Typography tokens - consistent across table
const TABLE_HEADER_CLASS = 'text-xs font-medium text-muted-foreground uppercase tracking-wide';
const TABLE_CELL_TEXT = 'text-[13px] leading-5 text-foreground';
const TABLE_CELL_MUTED = 'text-[13px] leading-5 text-muted-foreground';

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

// Support Level descriptions
const SUPPORT_CONFIG: Record<string, { label: string; description: string }> = {
  L1: { label: 'L1', description: 'Frontline Support' },
  L2: { label: 'L2', description: 'Technical Support' },
  L3: { label: 'L3', description: 'Specialist / CAP' },
};

// Severity descriptions
const SEVERITY_CONFIG: Record<string, { description: string }> = {
  SEV1: { description: 'Critical' },
  SEV2: { description: 'High' },
  SEV3: { description: 'Medium' },
  SEV4: { description: 'Low' },
};

// Default columns
const DEFAULT_VISIBLE_COLUMNS: ColumnConfig[] = [
  { id: 'key', label: 'Key', visible: true, minWidth: '130px', required: true },
  { id: 'summary', label: 'Summary', visible: true, required: true },
  { id: 'severity', label: 'Sev', visible: true, width: '110px' },
  { id: 'level', label: 'Lvl', visible: true, width: '60px' },
  { id: 'status', label: 'Status', visible: true, minWidth: '140px' },
  { id: 'assignee', label: 'Assignee', visible: true, width: '180px' },
  { id: 'age', label: 'Age', visible: true, width: '70px' },
  { id: 'sla', label: 'SLA', visible: true, width: '90px' },
  { id: 'releaseVersion', label: 'Release', visible: false, width: '110px' },
  { id: 'major', label: 'Major', visible: false, width: '110px' },
  { id: 'committee', label: 'Committee', visible: true, width: '120px' },
];

function LoadingSkeleton({ density }: { density: TableDensity }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
      {/* Header - 40px */}
      <div className="flex items-center h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide sticky top-0 z-10 bg-muted/50 border-b border-border">
        <div className="w-[130px] shrink-0 pr-2">Key</div>
        <div className="flex-1 min-w-[320px]">Summary</div>
        <div className="shrink-0 flex items-center">
          <span className="w-[110px] px-2">Sev</span>
          <span className="w-[60px] px-2">Lvl</span>
          <span className="w-[140px] px-2">Status</span>
          <span className="w-[180px] px-2">Assignee</span>
          <span className="w-[70px] px-2">Age</span>
          <span className="w-[90px] px-2">SLA</span>
          <span className="w-[120px] px-2">Committee</span>
        </div>
        <div className="w-10 shrink-0"></div>
      </div>
      {/* Skeleton rows - 44px each */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex items-center h-11 px-4 border-b border-border">
          <div className="w-[130px] shrink-0 pr-2"><Skeleton className="h-4 w-16" /></div>
          <div className="flex-1 min-w-[320px] pr-3"><Skeleton className="h-4 w-full" /></div>
          <div className="shrink-0 flex items-center">
            <div className="w-[110px] px-2"><Skeleton className="h-6 w-14 rounded-full" /></div>
            <div className="w-[60px] px-2"><Skeleton className="h-4 w-6" /></div>
            <div className="w-[140px] px-2"><Skeleton className="h-6 w-20 rounded-full" /></div>
            <div className="w-[180px] px-2"><Skeleton className="h-5 w-24" /></div>
            <div className="w-[70px] px-2"><Skeleton className="h-4 w-8" /></div>
            <div className="w-[90px] px-2"><Skeleton className="h-6 w-16 rounded-full" /></div>
            <div className="w-[120px] px-2"><Skeleton className="h-6 w-16 rounded-full" /></div>
          </div>
          <div className="w-10 shrink-0"><Skeleton className="h-4 w-4 mx-auto" /></div>
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
  
  // Column widths with persistence
  const { columnWidths, handleColumnResize } = useIncidentColumnWidths();
  
  if (isLoading) {
    return <LoadingSkeleton density={density} />;
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
    toast.success(`Link copied`, {
      description: `${incidentKey} link copied to clipboard`,
    });
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

  // Calculate minimum table width based on visible columns
  const getMinTableWidth = () => {
    let width = 32; // Actions column
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
    return Math.max(width + 32, 900); // 32px padding
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Table Card Container - enterprise grid styling */}
        <div className="rounded-lg border border-border overflow-hidden bg-card flex-1 shadow-sm">
          {/* Horizontal scroll wrapper */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${getMinTableWidth()}px` }}>
              {/* Sticky Header - 40px height with resizable columns */}
              <div 
                className="flex items-center h-10 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-20 bg-muted/50 border-b border-border"
              >
                {/* Key - resizable */}
                {isColumnVisible('key') && (
                  <ResizableHeader
                    columnId="key"
                    width={columnWidths.key}
                    minWidth={MIN_COLUMN_WIDTHS.key}
                    onResize={handleColumnResize}
                    className="pl-4 pr-2 text-muted-foreground"
                  >
                    Key
                  </ResizableHeader>
                )}
                {/* Summary - flexible but resizable */}
                {isColumnVisible('summary') && (
                  <ResizableHeader
                    columnId="summary"
                    width={columnWidths.summary}
                    minWidth={MIN_COLUMN_WIDTHS.summary}
                    onResize={handleColumnResize}
                    className="text-muted-foreground"
                    isFlexible
                  >
                    Summary
                  </ResizableHeader>
                )}
                {/* Compact columns */}
                {isColumnVisible('severity') && (
                  <ResizableHeader
                    columnId="severity"
                    width={columnWidths.severity}
                    minWidth={MIN_COLUMN_WIDTHS.severity}
                    onResize={handleColumnResize}
                    className="px-2 text-muted-foreground"
                  >
                    Sev
                  </ResizableHeader>
                )}
                {isColumnVisible('level') && (
                  <ResizableHeader
                    columnId="level"
                    width={columnWidths.level}
                    minWidth={MIN_COLUMN_WIDTHS.level}
                    onResize={handleColumnResize}
                    className="px-2 text-muted-foreground"
                  >
                    Lvl
                  </ResizableHeader>
                )}
                {isColumnVisible('status') && (
                  <ResizableHeader
                    columnId="status"
                    width={columnWidths.status}
                    minWidth={MIN_COLUMN_WIDTHS.status}
                    onResize={handleColumnResize}
                    className="px-2 text-muted-foreground"
                  >
                    Status
                  </ResizableHeader>
                )}
                {isColumnVisible('assignee') && (
                  <ResizableHeader
                    columnId="assignee"
                    width={columnWidths.assignee}
                    minWidth={MIN_COLUMN_WIDTHS.assignee}
                    onResize={handleColumnResize}
                    className="px-2 text-muted-foreground"
                  >
                    Assignee
                  </ResizableHeader>
                )}
                {/* Age + SLA visually grouped */}
                {isColumnVisible('age') && (
                  <ResizableHeader
                    columnId="age"
                    width={columnWidths.age}
                    minWidth={MIN_COLUMN_WIDTHS.age}
                    onResize={handleColumnResize}
                    className="px-2 text-muted-foreground"
                  >
                    Age
                  </ResizableHeader>
                )}
                {isColumnVisible('sla') && (
                  <ResizableHeader
                    columnId="sla"
                    width={columnWidths.sla}
                    minWidth={MIN_COLUMN_WIDTHS.sla}
                    onResize={handleColumnResize}
                    className="px-2 text-muted-foreground"
                  >
                    SLA
                  </ResizableHeader>
                )}
                {isColumnVisible('releaseVersion') && (
                  <ResizableHeader
                    columnId="releaseVersion"
                    width={columnWidths.releaseVersion}
                    minWidth={MIN_COLUMN_WIDTHS.releaseVersion}
                    onResize={handleColumnResize}
                    className="px-2 text-muted-foreground"
                  >
                    Release
                  </ResizableHeader>
                )}
                {isColumnVisible('major') && (
                  <ResizableHeader
                    columnId="major"
                    width={columnWidths.major}
                    minWidth={MIN_COLUMN_WIDTHS.major}
                    onResize={handleColumnResize}
                    className="px-2 text-muted-foreground"
                  >
                    Major
                  </ResizableHeader>
                )}
                {isColumnVisible('committee') && (
                  <ResizableHeader
                    columnId="committee"
                    width={columnWidths.committee}
                    minWidth={MIN_COLUMN_WIDTHS.committee}
                    onResize={handleColumnResize}
                    className="px-2 text-muted-foreground"
                  >
                    Committee
                  </ResizableHeader>
                )}
                {/* Actions spacer */}
                <div className="w-10 shrink-0 pr-4"></div>
              </div>

              {/* Body */}
              {incidents.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-sm text-muted-foreground">No incidents to display</div>
                </div>
              ) : (
                incidents.map((incident) => {
                  const supportConfig = incident.support_level ? SUPPORT_CONFIG[incident.support_level] : null;
                  const age = getAgingTime(incident.created_at);
                  const slaStatus = getSlaStatus(incident);
                  const committeeStatus = getCommitteeDisplayStatus(incident.committee);
                  const isConverted = incident.status === 'converted' || incident.status === 'closed';
                  const isHovered = hoveredId === incident.id;
                  
                  return (
                    <div 
                      key={incident.id} 
                      className={cn(
                        // Fixed row height - 44px for consistent vertical rhythm
                        'flex items-center h-11 transition-colors cursor-pointer border-b border-border',
                        isHovered && 'bg-muted/40'
                      )}
                      onClick={(e) => handleRowClick(incident.id, e)}
                      onMouseEnter={() => setHoveredId(incident.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && incident.id) navigate(`/release/incidents/${incident.id}`);
                      }}
                    >
                      {/* Key - consistent vertical alignment */}
                      {isColumnVisible('key') && (
                        <div 
                          className="shrink-0 pl-4 pr-2 flex items-center h-full gap-1.5"
                          style={{ width: `${columnWidths.key}px` }}
                        >
                          <Link 
                            to={`/release/incidents/${incident.id}`} 
                            className={cn(TABLE_CELL_TEXT, "font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {incident.incident_key}
                          </Link>
                          {incident.is_major_incident && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">Major incident</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                      
                      {/* Summary - flexible, vertically centered */}
                      {isColumnVisible('summary') && (
                        <div 
                          className="flex-1 pr-3 flex items-center h-full" 
                          style={{ minWidth: `${columnWidths.summary}px` }}
                          data-inline-edit
                        >
                          <InlineEditCell
                            type="text"
                            value={incident.title}
                            displayValue={
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(TABLE_CELL_TEXT, "line-clamp-1 cursor-pointer font-medium")}>{incident.title}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-md">{incident.title}</TooltipContent>
                              </Tooltip>
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'title', val)}
                            disabled={isConverted}
                            textSize="text-[13px]"
                          />
                        </div>
                      )}
                      
                      {/* Severity - using TablePill */}
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
                            displayValue={
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-pointer">
                                    <SeverityPill severity={incident.severity} />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {SEVERITY_CONFIG[incident.severity]?.description || incident.severity}
                                </TooltipContent>
                              </Tooltip>
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'severity', val)}
                            disabled={isConverted}
                            textSize="text-[13px]"
                          />
                        </div>
                      )}
                      
                      {/* Level - centered text */}
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
                              supportConfig ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={cn(TABLE_CELL_MUTED, "cursor-pointer")}>{supportConfig.label}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">{supportConfig.description}</TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className={cn(TABLE_CELL_MUTED, "opacity-50")}>—</span>
                              )
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'support_level', val)}
                            disabled={isConverted}
                            textSize="text-[13px]"
                          />
                        </div>
                      )}
                      
                      {/* Status - using TablePill with 24px height */}
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
                            textSize="text-[13px]"
                          />
                        </div>
                      )}
                      
                      {/* Assignee - avatar + name on one row, vertically centered */}
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
                            textSize="text-[13px]"
                          />
                        </div>
                      )}
                      
                      {/* Age - centered */}
                      {isColumnVisible('age') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full"
                          style={{ width: `${columnWidths.age}px` }}
                        >
                          <span className={cn(TABLE_CELL_MUTED, "tabular-nums")}>{age}</span>
                        </div>
                      )}
                      
                      {/* SLA - using TablePill */}
                      {isColumnVisible('sla') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full"
                          style={{ width: `${columnWidths.sla}px` }}
                        >
                          {slaStatus ? (
                            <SlaPill status={slaStatus} />
                          ) : (
                            <span className={cn(TABLE_CELL_MUTED, "opacity-50")}>—</span>
                          )}
                        </div>
                      )}

                      {/* Release - vertically centered */}
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
                            textSize="text-[13px]"
                          />
                        </div>
                      )}

                      {/* Major - using TablePill */}
                      {isColumnVisible('major') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full" 
                          style={{ width: `${columnWidths.major}px` }}
                          data-inline-edit
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <InlineEditCell
                                  type="toggle"
                                  value={incident.is_major_incident || false}
                                  displayValue={<MajorPill isMajor={incident.is_major_incident || false} />}
                                  onSave={(val) => handleInlineUpdate(incident.id, 'is_major_incident', val)}
                                  disabled={isConverted}
                                  textSize="text-[13px]"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[200px]">
                              Major incident — elevated visibility & escalation rules
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}

                      {/* Committee - using TablePill */}
                      {isColumnVisible('committee') && (
                        <div 
                          className="shrink-0 px-2 flex items-center h-full"
                          style={{ width: `${columnWidths.committee}px` }}
                        >
                          <CommitteePill status={committeeStatus.status} label={committeeStatus.label} />
                        </div>
                      )}

                      {/* Actions - with pr-4 to match header */}
                      <div className="w-10 shrink-0 flex items-center justify-end pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button 
                              className={cn(
                                "w-6 h-6 rounded flex items-center justify-center transition-opacity",
                                "hover:bg-muted text-muted-foreground",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isHovered ? "opacity-100" : "opacity-0"
                              )}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-44 bg-popover border-border z-[300]"
                          >
                            <DropdownMenuItem 
                              className="text-sm cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/release/incidents/${incident.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-sm cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/release/incidents/${incident.id}?mode=edit`);
                              }}
                              disabled={isConverted}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-sm cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(incident.id, incident.incident_key);
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-sm text-destructive cursor-pointer focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialog({ open: true, id: incident.id, key: incident.incident_key });
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card flex-shrink-0 mt-2 rounded-lg">
            <span className="text-sm text-muted-foreground">
              {totalCount > pageSize 
                ? `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount} incidents`
                : `${totalCount} incident${totalCount !== 1 ? 's' : ''}`
              }
            </span>
            {totalCount > pageSize && onPageChange && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-sm border-[var(--border-color)]"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-[var(--text-2)] px-3">
                  Page {page} of {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-sm border-[var(--border-color)]"
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

      {/* Delete confirmation dialog */}
      <DeleteIncidentDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        incidentId={deleteDialog.id}
        incidentKey={deleteDialog.key}
      />
    </TooltipProvider>
  );
}
