import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, MoreHorizontal, Eye, Pencil, Trash2, AlertTriangle, Copy } from 'lucide-react';
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
import type { Incident } from '@/types/incident';
import { cn } from '@/lib/utils';
import { getAgingTime } from '@/components/incidents/badges/IncidentBadges';
import { toast } from 'sonner';

interface IncidentListTableProps {
  incidents: Incident[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}

// Enterprise-grade MUTED badge configs — text-first, color-secondary
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-muted text-foreground border-border' },
  triage: { label: 'Triage', className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  to_committee: { label: 'Committee', className: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800' },
  in_progress: { label: 'In Progress', className: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
  resolved: { label: 'Resolved', className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  converted: { label: 'Converted', className: 'bg-muted text-muted-foreground border-border' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
};

// Severity: Calm, not alarming. Use subtle tints.
const SEVERITY_CONFIG: Record<string, { label: string; className: string; tooltip: string }> = {
  SEV1: { label: 'SEV1', className: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800', tooltip: 'Critical' },
  SEV2: { label: 'SEV2', className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', tooltip: 'High' },
  SEV3: { label: 'SEV3', className: 'bg-muted text-muted-foreground border-border', tooltip: 'Medium' },
  SEV4: { label: 'SEV4', className: 'bg-muted text-muted-foreground border-border', tooltip: 'Low' },
};

// Priority: Minimal visual weight
const PRIORITY_CONFIG: Record<string, { label: string; className: string; tooltip: string }> = {
  P1: { label: 'P1', className: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800', tooltip: 'Highest' },
  P2: { label: 'P2', className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', tooltip: 'High' },
  P3: { label: 'P3', className: 'bg-muted text-muted-foreground border-border', tooltip: 'Medium' },
  P4: { label: 'P4', className: 'bg-muted text-muted-foreground border-border', tooltip: 'Low' },
};

// Support Level: Purely informational
const SUPPORT_CONFIG: Record<string, { label: string; tooltip: string }> = {
  L1: { label: 'L1', tooltip: 'Frontline Support' },
  L2: { label: 'L2', tooltip: 'Technical Support' },
  L3: { label: 'L3', tooltip: 'Specialist / CAP' },
};

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10 border-b">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[80px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Key</TableHead>
          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Summary</TableHead>
          <TableHead className="w-[48px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Sev</TableHead>
          <TableHead className="w-[40px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Pri</TableHead>
          <TableHead className="w-[36px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Lvl</TableHead>
          <TableHead className="w-[80px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Status</TableHead>
          <TableHead className="w-[100px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Assignee</TableHead>
          <TableHead className="w-[48px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Age</TableHead>
          <TableHead className="w-[56px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">SLA</TableHead>
          <TableHead className="w-[32px] h-8"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(12)].map((_, i) => (
          <TableRow key={i} className="border-b border-border/40">
            <TableCell className="py-2 px-3"><Skeleton className="h-3.5 w-12" /></TableCell>
            <TableCell className="py-2 px-3"><Skeleton className="h-3.5 w-full max-w-sm" /></TableCell>
            <TableCell className="py-2 px-3"><Skeleton className="h-4 w-9" /></TableCell>
            <TableCell className="py-2 px-3"><Skeleton className="h-4 w-6" /></TableCell>
            <TableCell className="py-2 px-3"><Skeleton className="h-3.5 w-5" /></TableCell>
            <TableCell className="py-2 px-3"><Skeleton className="h-4 w-14" /></TableCell>
            <TableCell className="py-2 px-3"><Skeleton className="h-3.5 w-16" /></TableCell>
            <TableCell className="py-2 px-3"><Skeleton className="h-3.5 w-6" /></TableCell>
            <TableCell className="py-2 px-3"><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell className="py-2 px-3"><Skeleton className="h-3.5 w-3.5" /></TableCell>
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
}: IncidentListTableProps) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const handleRowClick = (incidentId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="menu"]')) {
      return;
    }
    navigate(`/release/incidents/${incidentId}`);
  };

  const handleCopyLink = (incidentId: string, incidentKey: string) => {
    const url = `${window.location.origin}/release/incidents/${incidentId}`;
    navigator.clipboard.writeText(url);
    toast.success(`Link copied for ${incidentKey}`);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Key</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Summary</TableHead>
                <TableHead className="w-[48px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Sev</TableHead>
                <TableHead className="w-[40px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Pri</TableHead>
                <TableHead className="w-[36px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Lvl</TableHead>
                <TableHead className="w-[80px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Status</TableHead>
                <TableHead className="w-[100px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Assignee</TableHead>
                <TableHead className="w-[48px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">Age</TableHead>
                <TableHead className="w-[56px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-8 px-3">SLA</TableHead>
                <TableHead className="w-[32px] h-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => {
                const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG.open;
                const severityConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.SEV3;
                const priorityConfig = incident.priority ? PRIORITY_CONFIG[incident.priority] : null;
                const supportConfig = incident.support_level ? SUPPORT_CONFIG[incident.support_level] : null;
                const age = getAgingTime(incident.created_at);
                const slaBreached = incident.sla?.response_breached || incident.sla?.resolution_breached;
                const isSelected = selectedId === incident.id;
                
                return (
                  <TableRow 
                    key={incident.id} 
                    className={cn(
                      'group cursor-pointer border-b border-border/40 transition-colors',
                      'hover:bg-muted/40',
                      isSelected && 'bg-muted/60'
                    )}
                    onClick={(e) => handleRowClick(incident.id, e)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/release/incidents/${incident.id}`);
                    }}
                  >
                    {/* Key */}
                    <TableCell className="py-1.5 px-3">
                      <div className="flex items-center gap-1">
                        <Link 
                          to={`/release/incidents/${incident.id}`} 
                          className="text-[11px] font-medium text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {incident.incident_key}
                        </Link>
                        {incident.is_major_incident && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-[10px]">
                              Major Incident
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Summary */}
                    <TableCell className="py-1.5 px-3">
                      <span className="text-[11px] text-foreground line-clamp-1">{incident.title}</span>
                    </TableCell>
                    
                    {/* Severity */}
                    <TableCell className="py-1.5 px-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className={cn('text-[9px] px-1 py-0 h-4 font-medium border', severityConfig.className)}
                          >
                            {severityConfig.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px]">{severityConfig.tooltip}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    
                    {/* Priority */}
                    <TableCell className="py-1.5 px-3">
                      {priorityConfig ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className={cn('text-[9px] px-1 py-0 h-4 font-medium border', priorityConfig.className)}
                            >
                              {priorityConfig.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px]">{priorityConfig.tooltip}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    
                    {/* Support Level - Text only, no badge */}
                    <TableCell className="py-1.5 px-3">
                      {supportConfig ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-medium text-muted-foreground cursor-default">
                              {supportConfig.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px]">{supportConfig.tooltip}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    
                    {/* Status - Primary badge */}
                    <TableCell className="py-1.5 px-3">
                      <Badge 
                        variant="outline" 
                        className={cn('text-[9px] px-1.5 py-0 h-4 font-medium border', statusConfig.className)}
                      >
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    
                    {/* Assignee */}
                    <TableCell className="py-1.5 px-3">
                      {incident.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-[8px] font-medium text-muted-foreground">
                              {incident.assignee.avatar_initials || incident.assignee.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <span className="text-[10px] text-foreground truncate max-w-[60px]">
                            {incident.assignee.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    
                    {/* Age */}
                    <TableCell className="py-1.5 px-3">
                      <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {age}
                      </div>
                    </TableCell>
                    
                    {/* SLA */}
                    <TableCell className="py-1.5 px-3">
                      {slaBreached ? (
                        <span className="text-[9px] font-medium text-rose-600 dark:text-rose-400">Breach</span>
                      ) : incident.sla ? (
                        <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">OK</span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-1.5 px-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem 
                            className="text-[11px] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/release/incidents/${incident.id}`);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-[11px] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(incident.id, incident.incident_key);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-2" />
                            Copy link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem 
                                className="text-[11px] cursor-not-allowed opacity-50"
                                disabled
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Pencil className="h-3 w-3 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-[10px]">
                              Insufficient permissions
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem 
                                className="text-[11px] text-destructive cursor-not-allowed opacity-50"
                                disabled
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-[10px]">
                              Insufficient permissions
                            </TooltipContent>
                          </Tooltip>
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
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/30 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground">
              {totalCount > pageSize 
                ? `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`
                : `${totalCount} incident${totalCount !== 1 ? 's' : ''}`
              }
            </span>
            {totalCount > pageSize && onPageChange && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Prev
                </Button>
                <span className="text-[10px] text-muted-foreground px-1">
                  {page}/{Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
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
    </TooltipProvider>
  );
}
