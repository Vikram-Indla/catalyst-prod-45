/**
 * IncidentListTable — Enterprise-grade incident tracking table
 * 
 * Design: Matches Home "Your Work" table quality with operational enhancements
 * Features:
 * - Resizable columns with localStorage persistence
 * - Horizontal scroll with future scaling (15+ columns)
 * - Inline editing with DB persistence (optimistic + rollback)
 * - Committee computed status
 * - Premium hover/focus states
 * - Kebab menu actions
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, MoreHorizontal, Eye, Pencil, Trash2, AlertTriangle, Copy, ExternalLink, Star, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

// Status configuration with token-based styling
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot?: string }> = {
  open: { label: 'Open', bg: 'bg-[var(--surface-3)]', text: 'text-[var(--text-1)]' },
  triage: { label: 'Triage', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  to_committee: { label: 'Committee', bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
  in_progress: { label: 'In Progress', bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
  resolved: { label: 'Resolved', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  converted: { label: 'Converted', bg: 'bg-[var(--surface-2)]', text: 'text-[var(--text-3)]' },
  closed: { label: 'Closed', bg: 'bg-[var(--surface-2)]', text: 'text-[var(--text-3)]' },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ value, label }));

// Severity - small colored dot + label (no loud pill)
const SEVERITY_CONFIG: Record<string, { label: string; dot: string; description: string }> = {
  SEV1: { label: 'SEV1', dot: 'bg-rose-500', description: 'Critical' },
  SEV2: { label: 'SEV2', dot: 'bg-amber-500', description: 'High' },
  SEV3: { label: 'SEV3', dot: 'bg-[var(--text-3)]', description: 'Medium' },
  SEV4: { label: 'SEV4', dot: 'bg-[var(--text-3)]/50', description: 'Low' },
};

const SEVERITY_OPTIONS = Object.entries(SEVERITY_CONFIG).map(([value, { label }]) => ({ value, label }));

// Support Level
const SUPPORT_CONFIG: Record<string, { label: string; description: string }> = {
  L1: { label: 'L1', description: 'Frontline Support' },
  L2: { label: 'L2', description: 'Technical Support' },
  L3: { label: 'L3', description: 'Specialist / CAP' },
};

const SUPPORT_OPTIONS = Object.entries(SUPPORT_CONFIG).map(([value, { label }]) => ({ value, label }));

// SLA states - compact text/chip
const SLA_CONFIG = {
  breached: { label: 'Breached', className: 'text-rose-600 dark:text-rose-400 font-medium' },
  at_risk: { label: 'At risk', className: 'text-amber-600 dark:text-amber-400' },
  on_track: { label: 'On track', className: 'text-emerald-600 dark:text-emerald-400' },
};

// Committee status styling
const COMMITTEE_STATUS_STYLES: Record<string, string> = {
  not_applicable: 'text-[var(--text-3)]',
  in_progress: 'text-amber-600 dark:text-amber-400',
  approved: 'text-emerald-600 dark:text-emerald-400',
  rejected: 'text-rose-600 dark:text-rose-400',
};

// Default columns
const DEFAULT_VISIBLE_COLUMNS: ColumnConfig[] = [
  { id: 'key', label: 'Key', visible: true, minWidth: '100px', required: true },
  { id: 'summary', label: 'Summary', visible: true, required: true },
  { id: 'severity', label: 'Sev', visible: true, width: '80px' },
  { id: 'level', label: 'Lvl', visible: true, width: '60px' },
  { id: 'status', label: 'Status', visible: true, minWidth: '110px' },
  { id: 'assignee', label: 'Assignee', visible: true, width: '140px' },
  { id: 'age', label: 'Age', visible: true, width: '56px' },
  { id: 'sla', label: 'SLA', visible: true, width: '72px' },
  { id: 'releaseVersion', label: 'Release', visible: false, width: '90px' },
  { id: 'major', label: 'Major', visible: false, width: '56px' },
  { id: 'committee', label: 'Committee', visible: true, width: '100px' },
];

function LoadingSkeleton({ density }: { density: TableDensity }) {
  const rowH = density === 'compact' ? 'h-[44px]' : 'h-[52px]';
  return (
    <div className="rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--surface-1)] shadow-sm">
      {/* Header - 40px */}
      <div 
        className="flex items-center h-10 px-4 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-10"
        style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--divider)' }}
      >
        <div className="w-[80px] shrink-0 pr-2">Key</div>
        <div className="flex-1 min-w-[220px]">Summary</div>
        <div className="shrink-0 flex items-center">
          <span className="w-[68px] px-2">Sev</span>
          <span className="w-[48px] px-2">Lvl</span>
          <span className="w-[96px] px-2">Status</span>
          <span className="w-[120px] px-2">Assignee</span>
          <span className="w-[48px] px-1 text-right">Age</span>
          <span className="w-[56px] px-1">SLA</span>
          <span className="w-[88px] px-2">Committee</span>
        </div>
        <div className="w-8 shrink-0"></div>
      </div>
      {/* Skeleton rows - 44px each */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className={cn("flex items-center px-4", rowH)} style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="w-[80px] shrink-0 pr-2"><Skeleton className="h-4 w-14" /></div>
          <div className="flex-1 min-w-[220px] pr-2"><Skeleton className="h-4 w-full" /></div>
          <div className="shrink-0 flex items-center">
            <div className="w-[68px] px-2"><Skeleton className="h-4 w-10" /></div>
            <div className="w-[48px] px-2"><Skeleton className="h-4 w-6" /></div>
            <div className="w-[96px] px-2"><Skeleton className="h-5 w-14" /></div>
            <div className="w-[120px] px-2"><Skeleton className="h-5 w-20" /></div>
            <div className="w-[48px] px-1"><Skeleton className="h-4 w-7" /></div>
            <div className="w-[56px] px-1"><Skeleton className="h-4 w-10" /></div>
            <div className="w-[88px] px-2"><Skeleton className="h-4 w-14" /></div>
          </div>
          <div className="w-8 shrink-0"><Skeleton className="h-4 w-4 mx-auto" /></div>
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
  
  // Row height: 44px compact, 52px comfortable
  const rowHeight = density === 'compact' ? 'h-[44px]' : 'h-[52px]';
  const textBase = density === 'compact' ? 'text-[13px]' : 'text-sm';
  const textSmall = 'text-[12px]';
  
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
        <div className="rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--surface-1)] flex-1 shadow-sm">
          {/* Horizontal scroll wrapper with sticky column support */}
          <div className="overflow-x-auto relative">
            <div style={{ minWidth: `${getMinTableWidth()}px` }}>
              {/* Sticky Header - 40px height with resizable columns */}
              <div 
                className="flex items-center h-10 px-0 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-20"
                style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--divider)' }}
              >
                {/* Key - resizable */}
                {isColumnVisible('key') && (
                  <ResizableHeader
                    columnId="key"
                    width={columnWidths.key}
                    minWidth={MIN_COLUMN_WIDTHS.key}
                    onResize={handleColumnResize}
                    className="pr-2 text-[var(--text-2)]"
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
                    className="text-[var(--text-2)]"
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
                    className="px-2 text-[var(--text-2)]"
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
                    className="px-2 text-[var(--text-2)]"
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
                    className="px-2 text-[var(--text-2)]"
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
                    className="px-2 text-[var(--text-2)]"
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
                    className="px-1 text-right text-[var(--text-2)]"
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
                    className="px-1 text-[var(--text-2)]"
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
                    className="px-2 text-[var(--text-2)]"
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
                    className="px-2 text-[var(--text-2)]"
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
                    className="px-2 text-[var(--text-2)]"
                  >
                    Committee
                  </ResizableHeader>
                )}
                {/* Actions spacer */}
                <div className="w-8 shrink-0"></div>
              </div>

              {/* Body */}
              {incidents.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-sm text-[var(--text-3)]">No incidents to display</div>
                </div>
              ) : (
                incidents.map((incident) => {
                  const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG.open;
                  const severityConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.SEV3;
                  const supportConfig = incident.support_level ? SUPPORT_CONFIG[incident.support_level] : null;
                  const age = getAgingTime(incident.created_at);
                  const slaStatus = getSlaStatus(incident);
                  const slaConfig = slaStatus ? SLA_CONFIG[slaStatus] : null;
                  const committeeStatus = getCommitteeDisplayStatus(incident.committee);
                  const committeeStyle = COMMITTEE_STATUS_STYLES[committeeStatus.status] || 'text-[var(--text-3)]';
                  const isConverted = incident.status === 'converted' || incident.status === 'closed';
                  const isHovered = hoveredId === incident.id;
                  
                  return (
                    <div 
                      key={incident.id} 
                      className={cn(
                        'flex items-center px-4 transition-colors cursor-pointer',
                        rowHeight,
                        isHovered && 'bg-[var(--row-hover)]'
                      )}
                      style={{ borderBottom: '1px solid var(--divider)' }}
                      onClick={(e) => handleRowClick(incident.id, e)}
                      onMouseEnter={() => setHoveredId(incident.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && incident.id) navigate(`/release/incidents/${incident.id}`);
                      }}
                    >
                      {/* Key - matches header width */}
                      {isColumnVisible('key') && (
                        <div 
                          className="shrink-0 pr-2 flex items-center gap-1"
                          style={{ width: `${columnWidths.key}px` }}
                        >
                          <Link 
                            to={`/release/incidents/${incident.id}`} 
                            className={cn(textSmall, "font-medium text-[var(--brand-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] rounded-sm")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {incident.incident_key}
                          </Link>
                          {incident.is_major_incident && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">Major incident</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                      
                      {/* Summary - flexible, matches header */}
                      {isColumnVisible('summary') && (
                        <div 
                          className="flex-1 pr-2" 
                          style={{ minWidth: `${columnWidths.summary}px` }}
                          data-inline-edit
                        >
                          <InlineEditCell
                            type="text"
                            value={incident.title}
                            displayValue={
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(textBase, "leading-5 text-[var(--text-1)] line-clamp-1 cursor-pointer font-medium")}>{incident.title}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-md">{incident.title}</TooltipContent>
                              </Tooltip>
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'title', val)}
                            disabled={isConverted}
                            textSize={textBase}
                          />
                        </div>
                      )}
                      
                      {/* Severity - matches header width */}
                      {isColumnVisible('severity') && (
                        <div 
                          className="shrink-0 px-2" 
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
                                  <div className="flex items-center gap-1.5 cursor-pointer">
                                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', severityConfig.dot)} />
                                    <span className={cn(textSmall, "text-[var(--text-2)]")}>{severityConfig.label}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">{severityConfig.description}</TooltipContent>
                              </Tooltip>
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'severity', val)}
                            disabled={isConverted}
                            textSize={textSmall}
                          />
                        </div>
                      )}
                      
                      {/* Level */}
                      {isColumnVisible('level') && (
                        <div 
                          className="shrink-0 px-2" 
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
                                    <span className={cn(textSmall, "text-[var(--text-2)] cursor-pointer")}>{supportConfig.label}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">{supportConfig.description}</TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className={cn(textSmall, "text-[var(--text-3)]")}>—</span>
                              )
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'support_level', val)}
                            disabled={isConverted}
                            textSize={textSmall}
                          />
                        </div>
                      )}
                      
                      {/* Status - compact chip */}
                      {isColumnVisible('status') && (
                        <div 
                          className="shrink-0 px-2" 
                          style={{ width: `${columnWidths.status}px` }}
                          data-inline-edit
                        >
                          <InlineEditCell
                            type="select"
                            value={incident.status}
                            options={STATUS_OPTIONS}
                            displayValue={
                              <span 
                                className={cn(
                                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium',
                                  statusConfig.bg, statusConfig.text
                                )}
                              >
                                {statusConfig.dot && <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />}
                                {statusConfig.label}
                              </span>
                            }
                            onSave={(val) => handleInlineUpdate(incident.id, 'status', val)}
                            disabled={isConverted}
                            textSize={textSmall}
                          />
                        </div>
                      )}
                      
                      {/* Assignee - inline user picker for direct editing */}
                      {isColumnVisible('assignee') && (
                        <div 
                          className="shrink-0 px-2"
                          style={{ width: `${columnWidths.assignee}px` }}
                          data-inline-edit
                        >
                          <InlineUserPicker
                            value={incident.assignee}
                            onSave={(userId) => handleInlineUpdate(incident.id, 'assignee_id', userId || '')}
                            disabled={isConverted}
                            textSize={textSmall}
                          />
                        </div>
                      )}
                      
                      {/* Age */}
                      {isColumnVisible('age') && (
                        <div 
                          className="shrink-0 px-1 text-right"
                          style={{ width: `${columnWidths.age}px` }}
                        >
                          <span className={cn(textSmall, "tabular-nums text-[var(--text-2)]")}>{age}</span>
                        </div>
                      )}
                      
                      {/* SLA */}
                      {isColumnVisible('sla') && (
                        <div 
                          className="shrink-0 px-1"
                          style={{ width: `${columnWidths.sla}px` }}
                        >
                          {slaConfig ? (
                            <span className={cn(textSmall, slaConfig.className)}>{slaConfig.label}</span>
                          ) : (
                            <span className={cn(textSmall, "text-[var(--text-3)]")}>—</span>
                          )}
                        </div>
                      )}

                      {/* Release - inline release picker for direct editing */}
                      {isColumnVisible('releaseVersion') && (
                        <div 
                          className="shrink-0 px-2 group"
                          style={{ width: `${columnWidths.releaseVersion}px` }}
                          data-inline-edit
                        >
                          <InlineReleasePicker
                            value={incident.release_version}
                            onSave={(releaseId) => handleInlineUpdate(incident.id, 'release_version_id', releaseId || '')}
                            disabled={isConverted}
                            textSize={textSmall}
                          />
                        </div>
                      )}

                      {/* Major - state display only, toggle on edit */}
                      {isColumnVisible('major') && (
                        <div 
                          className="shrink-0 px-2" 
                          style={{ width: `${columnWidths.major}px` }}
                          data-inline-edit
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <InlineEditCell
                                  type="toggle"
                                  value={incident.is_major_incident || false}
                                  displayValue={
                                    incident.is_major_incident ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                                        Major
                                      </span>
                                    ) : (
                                      <span className={cn(textSmall, "text-[var(--text-3)]")}>Normal</span>
                                    )
                                  }
                                  onSave={(val) => handleInlineUpdate(incident.id, 'is_major_incident', val)}
                                  disabled={isConverted}
                                  textSize={textSmall}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[200px]">Major incident — elevated visibility & escalation rules</TooltipContent>
                          </Tooltip>
                        </div>
                      )}

                      {/* Committee - state only */}
                      {isColumnVisible('committee') && (
                        <div 
                          className="shrink-0 px-2"
                          style={{ width: `${columnWidths.committee}px` }}
                        >
                          <span className={cn(textSmall, 'font-medium', committeeStyle)}>
                            {committeeStatus.label}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="w-8 shrink-0 flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button 
                              className={cn(
                                "w-6 h-6 rounded flex items-center justify-center transition-opacity",
                                "hover:bg-[var(--surface-3)] text-[var(--icon-muted)]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                                isHovered ? "opacity-100" : "opacity-0"
                              )}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-44 bg-[var(--surface-1)] border-[var(--border-color)] z-[300]"
                          >
                            <DropdownMenuItem 
                              className="text-sm cursor-pointer text-[var(--text-1)]"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/release/incidents/${incident.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-sm cursor-pointer text-[var(--text-1)]"
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
                              className="text-sm cursor-pointer text-[var(--text-1)]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(incident.id, incident.incident_key);
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[var(--divider)]" />
                            <DropdownMenuItem 
                              className="text-sm text-rose-600 cursor-pointer focus:text-rose-600"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)] bg-[var(--surface-1)] flex-shrink-0 mt-2 rounded-lg">
            <span className="text-sm text-[var(--text-2)]">
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
