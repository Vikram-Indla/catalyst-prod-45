/**
 * IncidentListTable — Enterprise-grade incident tracking table
 * 
 * Features:
 * - Sortable, resizable columns
 * - Inline editing with DB persistence
 * - Kebab menu actions (View, Edit, Copy, Delete)
 * - Committee computed status
 * - Density toggle (compact/comfortable)
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, MoreHorizontal, Eye, Pencil, Trash2, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { DeleteIncidentDialog } from './DeleteIncidentDialog';
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

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-muted text-foreground border-border' },
  triage: { label: 'Triage', className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  to_committee: { label: 'Committee', className: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800' },
  in_progress: { label: 'In Progress', className: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
  resolved: { label: 'Resolved', className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  converted: { label: 'Converted', className: 'bg-muted text-muted-foreground border-border' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ value, label }));

// Severity configuration
const SEVERITY_CONFIG: Record<string, { label: string; dotClass: string; tooltip: string }> = {
  SEV1: { label: 'SEV1', dotClass: 'bg-rose-500', tooltip: 'Critical' },
  SEV2: { label: 'SEV2', dotClass: 'bg-amber-500', tooltip: 'High' },
  SEV3: { label: 'SEV3', dotClass: 'bg-muted-foreground', tooltip: 'Medium' },
  SEV4: { label: 'SEV4', dotClass: 'bg-muted-foreground/50', tooltip: 'Low' },
};

const SEVERITY_OPTIONS = Object.entries(SEVERITY_CONFIG).map(([value, { label }]) => ({ value, label }));

// Priority configuration
const PRIORITY_CONFIG: Record<string, { label: string; className: string; tooltip: string }> = {
  P1: { label: 'P1', className: 'text-rose-600 dark:text-rose-400 font-semibold', tooltip: 'Highest' },
  P2: { label: 'P2', className: 'text-amber-600 dark:text-amber-400 font-medium', tooltip: 'High' },
  P3: { label: 'P3', className: 'text-muted-foreground', tooltip: 'Medium' },
  P4: { label: 'P4', className: 'text-muted-foreground/70', tooltip: 'Low' },
};

// Support Level configuration
const SUPPORT_CONFIG: Record<string, { label: string; tooltip: string }> = {
  L1: { label: 'L1', tooltip: 'Frontline Support' },
  L2: { label: 'L2', tooltip: 'Technical Support' },
  L3: { label: 'L3', tooltip: 'Specialist / CAP' },
};

const SUPPORT_OPTIONS = Object.entries(SUPPORT_CONFIG).map(([value, { label }]) => ({ value, label }));

// SLA states
const SLA_CONFIG = {
  breached: { label: 'Breached', className: 'text-rose-600 dark:text-rose-400 font-medium', tooltip: 'SLA breached' },
  at_risk: { label: 'At risk', className: 'text-amber-600 dark:text-amber-400', tooltip: 'SLA at risk' },
  on_track: { label: 'On track', className: 'text-emerald-600 dark:text-emerald-400', tooltip: 'SLA on track' },
};

// Default columns config
const DEFAULT_VISIBLE_COLUMNS: ColumnConfig[] = [
  { id: 'key', label: 'Key', visible: true, minWidth: '110px', required: true },
  { id: 'summary', label: 'Summary', visible: true, required: true },
  { id: 'severity', label: 'Sev', visible: true, width: '90px' },
  { id: 'level', label: 'Lvl', visible: true, width: '70px' },
  { id: 'status', label: 'Status', visible: true, minWidth: '120px' },
  { id: 'assignee', label: 'Assignee', visible: true, width: '150px' },
  { id: 'age', label: 'Age', visible: true, width: '64px' },
  { id: 'sla', label: 'SLA', visible: true, width: '80px' },
  { id: 'releaseVersion', label: 'Release', visible: false, width: '100px' },
  { id: 'major', label: 'Major', visible: false, width: '70px' },
  { id: 'committee', label: 'Committee', visible: true, width: '100px' },
];

function LoadingSkeleton({ density }: { density: TableDensity }) {
  const rowHeight = density === 'compact' ? 'h-10' : 'h-12';
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10 border-b">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[110px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Key</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Summary</TableHead>
          <TableHead className="w-[90px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Sev</TableHead>
          <TableHead className="w-[70px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Lvl</TableHead>
          <TableHead className="w-[120px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Status</TableHead>
          <TableHead className="w-[150px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Assignee</TableHead>
          <TableHead className="w-[64px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Age</TableHead>
          <TableHead className="w-[80px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">SLA</TableHead>
          <TableHead className="w-[100px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Committee</TableHead>
          <TableHead className="w-[44px] h-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(12)].map((_, i) => (
          <TableRow key={i} className={cn("border-b border-border/50", rowHeight)}>
            <TableCell className="px-4"><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell className="px-4"><Skeleton className="h-4 w-full max-w-lg" /></TableCell>
            <TableCell className="px-4"><Skeleton className="h-4 w-14" /></TableCell>
            <TableCell className="px-4"><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell className="px-4"><Skeleton className="h-6 w-20" /></TableCell>
            <TableCell className="px-4"><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell className="px-4"><Skeleton className="h-4 w-10" /></TableCell>
            <TableCell className="px-4"><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell className="px-4"><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell className="px-4"><Skeleton className="h-4 w-4" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
  density = 'comfortable',
}: IncidentListTableProps) {
  const navigate = useNavigate();
  const updateIncident = useUpdateIncident();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; key: string }>({ 
    open: false, 
    id: '', 
    key: '' 
  });
  
  const cellPadding = density === 'compact' ? 'py-2 px-4' : 'py-3 px-4';
  const textSize = density === 'compact' ? 'text-xs' : 'text-sm';
  const rowHeight = density === 'compact' ? 'h-10' : 'h-12';
  
  if (isLoading) {
    return <LoadingSkeleton density={density} />;
  }

  const isColumnVisible = (colId: string) => visibleColumns.some(c => c.id === colId && c.visible !== false);

  const handleRowClick = (incidentId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="menu"]') || target.closest('input') || target.closest('[data-inline-edit]')) {
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
    toast.success(`Link copied for ${incidentKey}`, {
      description: 'Deep link copied to clipboard',
    });
  };

  const handleInlineUpdate = async (incidentId: string, field: string, value: string | boolean) => {
    try {
      await updateIncident.mutateAsync({ id: incidentId, data: { [field]: value } });
      toast.success('Updated', { description: `${field} saved successfully` });
    } catch (error: any) {
      toast.error('Update failed', { description: error.message || 'Please try again' });
      throw error; // Re-throw so InlineEditCell can rollback
    }
  };

  const getSlaStatus = (incident: Incident) => {
    const breached = incident.sla?.response_breached || incident.sla?.resolution_breached;
    if (breached) return 'breached';
    if (incident.sla) return 'on_track';
    return null;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 border-b">
              <TableRow className="hover:bg-transparent">
                {isColumnVisible('key') && (
                  <TableHead className="w-[110px] min-w-[110px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Key</TableHead>
                )}
                {isColumnVisible('summary') && (
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4 min-w-[200px]">Summary</TableHead>
                )}
                {isColumnVisible('severity') && (
                  <TableHead className="w-[90px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Sev</TableHead>
                )}
                {isColumnVisible('level') && (
                  <TableHead className="w-[70px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Lvl</TableHead>
                )}
                {isColumnVisible('status') && (
                  <TableHead className="w-[120px] min-w-[120px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Status</TableHead>
                )}
                {isColumnVisible('assignee') && (
                  <TableHead className="w-[150px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Assignee</TableHead>
                )}
                {isColumnVisible('age') && (
                  <TableHead className="w-[64px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4 text-right">Age</TableHead>
                )}
                {isColumnVisible('sla') && (
                  <TableHead className="w-[80px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">SLA</TableHead>
                )}
                {isColumnVisible('releaseVersion') && (
                  <TableHead className="w-[100px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Release</TableHead>
                )}
                {isColumnVisible('major') && (
                  <TableHead className="w-[70px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Major</TableHead>
                )}
                {isColumnVisible('committee') && (
                  <TableHead className="w-[100px] text-xs font-medium uppercase tracking-wide text-muted-foreground h-10 px-4">Committee</TableHead>
                )}
                <TableHead className="w-[44px] h-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => {
                const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG.open;
                const severityConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.SEV3;
                const supportConfig = incident.support_level ? SUPPORT_CONFIG[incident.support_level] : null;
                const age = getAgingTime(incident.created_at);
                const slaStatus = getSlaStatus(incident);
                const slaConfig = slaStatus ? SLA_CONFIG[slaStatus] : null;
                const isSelected = selectedId === incident.id;
                const committeeStatus = getCommitteeDisplayStatus(incident.committee);
                const isConverted = incident.status === 'converted' || incident.status === 'closed';
                
                return (
                  <TableRow 
                    key={incident.id} 
                    className={cn(
                      'group cursor-pointer border-b border-border/50 transition-colors',
                      rowHeight,
                      'hover:bg-muted/50',
                      isSelected && 'bg-muted/70'
                    )}
                    onClick={(e) => handleRowClick(incident.id, e)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && incident.id) navigate(`/release/incidents/${incident.id}`);
                    }}
                  >
                    {/* Key - Primary clickable link */}
                    {isColumnVisible('key') && (
                      <TableCell className={cn(cellPadding, "whitespace-nowrap")}>
                        <div className="flex items-center gap-1.5">
                          <Link 
                            to={`/release/incidents/${incident.id}`} 
                            className={cn(textSize, "font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {incident.incident_key}
                          </Link>
                          {incident.is_major_incident && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">Major Incident</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    )}
                    
                    {/* Summary - Inline editable */}
                    {isColumnVisible('summary') && (
                      <TableCell className={cellPadding} data-inline-edit>
                        <InlineEditCell
                          type="text"
                          value={incident.title}
                          displayValue={
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(textSize, "text-foreground line-clamp-1")}>{incident.title}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-md">{incident.title}</TooltipContent>
                            </Tooltip>
                          }
                          onSave={(val) => handleInlineUpdate(incident.id, 'title', val)}
                          disabled={isConverted}
                          textSize={textSize}
                        />
                      </TableCell>
                    )}
                    
                    {/* Severity - Inline editable dropdown */}
                    {isColumnVisible('severity') && (
                      <TableCell className={cellPadding} data-inline-edit>
                        <InlineEditCell
                          type="select"
                          value={incident.severity}
                          options={SEVERITY_OPTIONS}
                          displayValue={
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 cursor-default">
                                  <span className={cn('h-2 w-2 rounded-full flex-shrink-0', severityConfig.dotClass)} />
                                  <span className={cn(textSize, "text-muted-foreground")}>{severityConfig.label}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Severity: {severityConfig.tooltip}</TooltipContent>
                            </Tooltip>
                          }
                          onSave={(val) => handleInlineUpdate(incident.id, 'severity', val)}
                          disabled={isConverted}
                          textSize={textSize}
                        />
                      </TableCell>
                    )}
                    
                    {/* Support Level - Inline editable */}
                    {isColumnVisible('level') && (
                      <TableCell className={cellPadding} data-inline-edit>
                        <InlineEditCell
                          type="select"
                          value={incident.support_level || ''}
                          options={SUPPORT_OPTIONS}
                          displayValue={
                            supportConfig ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(textSize, "text-muted-foreground cursor-default")}>{supportConfig.label}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">Support Level: {supportConfig.tooltip}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className={cn(textSize, "text-muted-foreground/50")}>—</span>
                            )
                          }
                          onSave={(val) => handleInlineUpdate(incident.id, 'support_level', val)}
                          disabled={isConverted}
                          textSize={textSize}
                        />
                      </TableCell>
                    )}
                    
                    {/* Status - Inline editable */}
                    {isColumnVisible('status') && (
                      <TableCell className={cn(cellPadding, "whitespace-nowrap")} data-inline-edit>
                        <InlineEditCell
                          type="select"
                          value={incident.status}
                          options={STATUS_OPTIONS}
                          displayValue={
                            <Badge 
                              variant="outline" 
                              className={cn('text-xs px-2 py-0.5 font-medium border', statusConfig.className)}
                            >
                              {statusConfig.label}
                            </Badge>
                          }
                          onSave={(val) => handleInlineUpdate(incident.id, 'status', val)}
                          disabled={isConverted}
                          textSize={textSize}
                        />
                      </TableCell>
                    )}
                    
                    {/* Assignee */}
                    {isColumnVisible('assignee') && (
                      <TableCell className={cellPadding}>
                        {incident.assignee ? (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {incident.assignee.avatar_initials || incident.assignee.full_name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <span className={cn(textSize, "text-foreground truncate max-w-[100px]")}>
                              {incident.assignee.full_name}
                            </span>
                          </div>
                        ) : (
                          <span className={cn(textSize, "text-muted-foreground/70")}>Unassigned</span>
                        )}
                      </TableCell>
                    )}
                    
                    {/* Age */}
                    {isColumnVisible('age') && (
                      <TableCell className={cn(cellPadding, "text-right")}>
                        <div className={cn("flex items-center justify-end gap-1 text-muted-foreground", textSize)}>
                          <Clock className="h-3.5 w-3.5" />
                          {age}
                        </div>
                      </TableCell>
                    )}
                    
                    {/* SLA */}
                    {isColumnVisible('sla') && (
                      <TableCell className={cellPadding}>
                        {slaConfig ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(textSize, 'cursor-default', slaConfig.className)}>{slaConfig.label}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-xs">{slaConfig.tooltip}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className={cn(textSize, "text-muted-foreground/50")}>—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Release Version */}
                    {isColumnVisible('releaseVersion') && (
                      <TableCell className={cellPadding}>
                        <span className={cn(textSize, "text-muted-foreground truncate")}>
                          {incident.release_version?.version || '—'}
                        </span>
                      </TableCell>
                    )}

                    {/* Major - Inline toggle */}
                    {isColumnVisible('major') && (
                      <TableCell className={cellPadding} data-inline-edit>
                        <InlineEditCell
                          type="toggle"
                          value={incident.is_major_incident || false}
                          onSave={(val) => handleInlineUpdate(incident.id, 'is_major_incident', val)}
                          disabled={isConverted}
                          textSize={textSize}
                        />
                      </TableCell>
                    )}

                    {/* Committee - Computed status */}
                    {isColumnVisible('committee') && (
                      <TableCell className={cellPadding}>
                        <span className={cn(textSize, committeeStatus.className)}>
                          {committeeStatus.label}
                        </span>
                      </TableCell>
                    )}

                    {/* Actions */}
                    <TableCell className={cn(cellPadding, "pr-2")}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {totalCount !== undefined && totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 flex-shrink-0">
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
                  className="h-8 px-3 text-sm"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  Page {page} of {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-sm"
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
