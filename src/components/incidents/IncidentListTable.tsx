import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, User, MoreHorizontal, Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react';
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

interface IncidentListTableProps {
  incidents: Incident[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}

// Enterprise-grade compact badge configs - NO redundant labels
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  triage: { label: 'Triage', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  to_committee: { label: 'Committee', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  in_progress: { label: 'In Progress', className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30' },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  converted: { label: 'Converted', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' },
  closed: { label: 'Closed', className: 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30' },
};

const SEVERITY_CONFIG: Record<string, { label: string; className: string; tooltip: string }> = {
  SEV1: { label: 'SEV1', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30', tooltip: 'Critical - Immediate attention required' },
  SEV2: { label: 'SEV2', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', tooltip: 'High - Significant impact' },
  SEV3: { label: 'SEV3', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30', tooltip: 'Medium - Moderate impact' },
  SEV4: { label: 'SEV4', className: 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30', tooltip: 'Low - Minor impact' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string; tooltip: string }> = {
  P1: { label: 'P1', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30', tooltip: 'Priority 1 - Highest' },
  P2: { label: 'P2', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', tooltip: 'Priority 2 - High' },
  P3: { label: 'P3', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30', tooltip: 'Priority 3 - Medium' },
  P4: { label: 'P4', className: 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30', tooltip: 'Priority 4 - Low' },
};

const SUPPORT_CONFIG: Record<string, { label: string; className: string; tooltip: string }> = {
  L1: { label: 'L1', className: 'bg-slate-400/10 text-slate-600 dark:text-slate-400 border-slate-400/30', tooltip: 'Level 1 - Frontline Support' },
  L2: { label: 'L2', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30', tooltip: 'Level 2 - Technical Support' },
  L3: { label: 'L3', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30', tooltip: 'Level 3 - Specialist (Committee required)' },
};

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow className="hover:bg-transparent border-b border-border">
          <TableHead className="w-[90px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Key</TableHead>
          <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Summary</TableHead>
          <TableHead className="w-[60px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sev</TableHead>
          <TableHead className="w-[50px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pri</TableHead>
          <TableHead className="w-[50px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lvl</TableHead>
          <TableHead className="w-[90px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
          <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assignee</TableHead>
          <TableHead className="w-[55px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Age</TableHead>
          <TableHead className="w-[75px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">SLA</TableHead>
          <TableHead className="w-[40px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(10)].map((_, i) => (
          <TableRow key={i} className="border-b border-border/50">
            <TableCell className="py-2"><Skeleton className="h-4 w-14" /></TableCell>
            <TableCell className="py-2"><Skeleton className="h-4 w-full max-w-md" /></TableCell>
            <TableCell className="py-2"><Skeleton className="h-5 w-11" /></TableCell>
            <TableCell className="py-2"><Skeleton className="h-5 w-8" /></TableCell>
            <TableCell className="py-2"><Skeleton className="h-5 w-8" /></TableCell>
            <TableCell className="py-2"><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell className="py-2"><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell className="py-2"><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell className="py-2"><Skeleton className="h-5 w-14" /></TableCell>
            <TableCell className="py-2"><Skeleton className="h-4 w-4" /></TableCell>
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
  pageSize = 25,
  totalCount,
  onPageChange,
}: IncidentListTableProps) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const handleRowClick = (incidentId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on action menu or link
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="menu"]')) {
      return;
    }
    navigate(`/release/incidents/${incidentId}`);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[90px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground h-9">Key</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground h-9">Summary</TableHead>
                <TableHead className="w-[60px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground h-9">Sev</TableHead>
                <TableHead className="w-[50px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground h-9">Pri</TableHead>
                <TableHead className="w-[50px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground h-9">Lvl</TableHead>
                <TableHead className="w-[90px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground h-9">Status</TableHead>
                <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground h-9">Assignee</TableHead>
                <TableHead className="w-[55px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground h-9">Age</TableHead>
                <TableHead className="w-[75px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground h-9">SLA</TableHead>
                <TableHead className="w-[40px] h-9"></TableHead>
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
                      'cursor-pointer border-b border-border/50 transition-colors',
                      'hover:bg-muted/50',
                      isSelected && 'bg-muted/70'
                    )}
                    onClick={(e) => handleRowClick(incident.id, e)}
                  >
                    {/* Key */}
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1">
                        <Link 
                          to={`/release/incidents/${incident.id}`} 
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {incident.incident_key}
                        </Link>
                        {incident.is_major_incident && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              Major Incident
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Summary */}
                    <TableCell className="py-1.5">
                      <span className="text-xs text-foreground line-clamp-1">{incident.title}</span>
                    </TableCell>
                    
                    {/* Severity - Compact, no label prefix */}
                    <TableCell className="py-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-[10px] px-1.5 py-0 h-5 font-medium border',
                              severityConfig.className
                            )}
                          >
                            {severityConfig.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {severityConfig.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    
                    {/* Priority - Compact, no label prefix */}
                    <TableCell className="py-1.5">
                      {priorityConfig ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                'text-[10px] px-1.5 py-0 h-5 font-medium border',
                                priorityConfig.className
                              )}
                            >
                              {priorityConfig.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {priorityConfig.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    
                    {/* Support Level - Compact */}
                    <TableCell className="py-1.5">
                      {supportConfig ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                'text-[10px] px-1.5 py-0 h-5 font-medium border',
                                supportConfig.className
                              )}
                            >
                              {supportConfig.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {supportConfig.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    
                    {/* Status */}
                    <TableCell className="py-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-[10px] px-1.5 py-0 h-5 font-medium border',
                              statusConfig.className
                            )}
                          >
                            {statusConfig.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Status: {statusConfig.label}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    
                    {/* Assignee */}
                    <TableCell className="py-1.5">
                      {incident.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-medium text-muted-foreground">
                              {incident.assignee.avatar_initials || incident.assignee.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <span className="text-xs text-foreground truncate max-w-[80px]">
                            {incident.assignee.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    
                    {/* Age */}
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {age}
                      </div>
                    </TableCell>
                    
                    {/* SLA */}
                    <TableCell className="py-1.5">
                      {slaBreached ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-1.5 py-0 h-5 font-medium border bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                            >
                              Breached
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            SLA has been breached
                          </TooltipContent>
                        </Tooltip>
                      ) : incident.sla ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-1.5 py-0 h-5 font-medium border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            >
                              On Track
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            SLA is on track
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-1.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/release/incidents/${incident.id}`);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-xs"
                            disabled
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-xs text-destructive focus:text-destructive"
                            disabled
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
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
        {totalCount !== undefined && totalCount > pageSize && onPageChange && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
            <div className="text-xs text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
            </div>
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
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
