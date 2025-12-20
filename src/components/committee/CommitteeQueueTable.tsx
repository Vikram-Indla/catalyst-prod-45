/**
 * CommitteeQueueTable — Enterprise-grade committee governance table
 * 
 * Uses same CSS Grid pattern as IncidentListTable for consistency.
 * Governance-focused columns: Committee Status, Approval Progress, Approvers, etc.
 */

import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, AlertTriangle, Users, Clock, CheckCircle, XCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatDistanceToNow, format } from 'date-fns';
import type { CommitteeQueueItem, CommitteeDecisionStatus } from '@/hooks/useCommitteeQueue';

// Page size options
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const PAGE_SIZE_STORAGE_KEY = 'catalyst.committeeQueue.pageSize';

// Enterprise typography tokens
const HEADER_TEXT = 'text-[10px] font-semibold text-[var(--text-2)] uppercase tracking-wider';
const CELL_TEXT = 'text-[12px] leading-4 text-[var(--text-1)]';
const CELL_SECONDARY = 'text-[12px] leading-4 text-[var(--text-2)]';
const CELL_META = 'text-[11px] leading-4 text-[var(--text-3)]';

// Grid cell base
const GRID_CELL_BASE = 'min-w-0 overflow-hidden';

// Column widths (px)
const COLUMN_WIDTHS = {
  key: 90,
  summary: 280,
  severity: 60,
  major: 50,
  committeeStatus: 100,
  approvalProgress: 100,
  approvers: 120,
  lastAction: 160,
  lastActionTime: 90,
  aging: 70,
  actions: 40,
};

interface CommitteeQueueTableProps {
  items: CommitteeQueueItem[];
  isLoading?: boolean;
  onRowClick?: (item: CommitteeQueueItem) => void;
}

// Status badge component
function CommitteeStatusBadge({ status }: { status: CommitteeDecisionStatus }) {
  const config = {
    pending: {
      label: 'Pending',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      icon: Clock,
    },
    approved: {
      label: 'Approved',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: CheckCircle,
    },
    vetoed: {
      label: 'Vetoed',
      className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
      icon: XCircle,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
      className
    )}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// Severity badge
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    SEV1: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    SEV2: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    SEV3: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    SEV4: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  };
  
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium border',
      colors[severity] || 'bg-gray-100 text-gray-700'
    )}>
      {severity}
    </span>
  );
}

// Approval progress component
function ApprovalProgress({ 
  completed, 
  total, 
  required 
}: { 
  completed: number; 
  total: number; 
  required: number;
}) {
  const percentage = total > 0 ? (completed / required) * 100 : 0;
  const isComplete = completed >= required;

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all",
            isComplete ? "bg-emerald-500" : "bg-amber-500"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className={cn(CELL_SECONDARY, "text-[10px] whitespace-nowrap tabular-nums")}>
        {completed}/{required}
      </span>
    </div>
  );
}

// Approvers avatars
function ApproversAvatars({ 
  approvers, 
  maxVisible = 3 
}: { 
  approvers: CommitteeQueueItem['approvers']; 
  maxVisible?: number;
}) {
  const visible = approvers.slice(0, maxVisible);
  const remaining = approvers.length - maxVisible;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((approver) => (
        <Tooltip key={approver.id}>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium border-2 border-[var(--surface-elevated)]",
                approver.decision === 'approved' && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400",
                approver.decision === 'vetoed' && "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-400",
                approver.decision === 'pending' && "bg-[var(--surface-subtle)] text-[var(--text-2)]"
              )}
            >
              {approver.userInitials || approver.userName.charAt(0)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="font-medium">{approver.userName}</div>
            <div className="text-[var(--text-3)] capitalize">{approver.decision}</div>
            {approver.hasVeto && <div className="text-amber-600">Has veto power</div>}
          </TooltipContent>
        </Tooltip>
      ))}
      {remaining > 0 && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium bg-[var(--surface-subtle)] text-[var(--text-2)] border-2 border-[var(--surface-elevated)]">
          +{remaining}
        </div>
      )}
    </div>
  );
}

// Last action display
function LastActionCell({ action }: { action?: CommitteeQueueItem['lastAction'] }) {
  if (!action) return <span className={CELL_META}>—</span>;

  const actionLabels: Record<string, string> = {
    approved: 'Approved by',
    vetoed: 'Vetoed by',
    approver_added: 'Approver added',
    sent_to_committee: 'Sent to committee',
  };

  return (
    <div className="flex flex-col">
      <span className={cn(CELL_SECONDARY, "truncate")}>
        {actionLabels[action.type] || action.type}
        {action.by && ` ${action.by}`}
      </span>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  const gridTemplate = Object.values(COLUMN_WIDTHS).map(w => `${w}px`).join(' ');
  
  return (
    <div className="rounded-md border border-[var(--border-default)] overflow-hidden bg-[var(--surface-elevated)]">
      <div 
        className="grid items-center h-8 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {Object.keys(COLUMN_WIDTHS).map((col) => (
          <div key={col} className={cn(GRID_CELL_BASE, "px-3 flex items-center h-full")}>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      {[...Array(8)].map((_, i) => (
        <div 
          key={i}
          className="grid items-center h-9 border-b border-[var(--border-default)] last:border-b-0"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {Object.keys(COLUMN_WIDTHS).map((col) => (
            <div key={col} className={cn(GRID_CELL_BASE, "px-3 flex items-center h-full")}>
              <Skeleton className="h-3.5 w-full max-w-[80%]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CommitteeQueueTable({ 
  items, 
  isLoading,
  onRowClick,
}: CommitteeQueueTableProps) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (PAGE_SIZE_OPTIONS.includes(parsed)) return parsed;
      }
    } catch (e) {}
    return 25;
  });

  // Pagination
  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  const handlePageSizeChange = useCallback((newSize: string) => {
    const size = parseInt(newSize, 10);
    setPageSize(size);
    setPage(1);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, newSize);
    } catch (e) {}
  }, []);

  const handleRowClick = useCallback((item: CommitteeQueueItem, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) return;
    
    if (onRowClick) {
      onRowClick(item);
    } else {
      navigate(`/release/incidents/${item.incident.id}`);
    }
  }, [navigate, onRowClick]);

  // Build grid template
  const gridTemplate = useMemo(() => 
    Object.values(COLUMN_WIDTHS).map(w => `${w}px`).join(' '),
    []
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full">
        {/* Table */}
        <div className="rounded-md border border-[var(--border-default)] overflow-hidden bg-[var(--surface-elevated)] flex-1">
          <div className="overflow-x-auto w-full h-full">
            <div style={{ minWidth: Object.values(COLUMN_WIDTHS).reduce((a, b) => a + b, 0) }}>
              {/* Header */}
              <div 
                className="grid items-center h-8 sticky top-0 z-20 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div className={cn(GRID_CELL_BASE, "pl-3 pr-2 flex items-center h-full")}>
                  <span className={HEADER_TEXT}>KEY</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                  <span className={HEADER_TEXT}>SUMMARY</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                  <span className={HEADER_TEXT}>SEV</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                  <span className={HEADER_TEXT}>MAJ</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                  <span className={HEADER_TEXT}>STATUS</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                  <span className={HEADER_TEXT}>PROGRESS</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                  <span className={HEADER_TEXT}>APPROVERS</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                  <span className={HEADER_TEXT}>LAST ACTION</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                  <span className={HEADER_TEXT}>TIME</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                  <span className={HEADER_TEXT}>AGING</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "flex items-center h-full")}></div>
              </div>

              {/* Body */}
              {paginatedItems.length === 0 ? (
                <div className="py-16 text-center">
                  <Shield className="h-10 w-10 mx-auto text-[var(--text-3)] mb-3" />
                  <span className="text-sm text-[var(--text-2)]">No incidents in committee queue</span>
                </div>
              ) : (
                paginatedItems.map((item) => {
                  const isHovered = hoveredId === item.incident.id;
                  
                  return (
                    <div
                      key={item.incident.id}
                      className={cn(
                        'grid items-center h-9 transition-colors cursor-pointer border-b border-[var(--border-default)] last:border-b-0',
                        isHovered && 'bg-[var(--surface-subtle)]'
                      )}
                      style={{ gridTemplateColumns: gridTemplate }}
                      onClick={(e) => handleRowClick(item, e)}
                      onMouseEnter={() => setHoveredId(item.incident.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Key */}
                      <div className={cn(GRID_CELL_BASE, "pl-3 pr-2 flex items-center h-full")}>
                        <Link 
                          to={`/release/incidents/${item.incident.id}`}
                          className={cn(CELL_TEXT, "font-medium text-[var(--brand-primary)] hover:underline truncate")}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.incident.incident_key}
                        </Link>
                      </div>

                      {/* Summary */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn(CELL_TEXT, "truncate")}>{item.incident.title}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md text-xs">
                            {item.incident.title}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Severity */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                        <SeverityBadge severity={item.incident.severity} />
                      </div>

                      {/* Major */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                        {item.incident.is_major_incident ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>Major Incident</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className={CELL_META}>—</span>
                        )}
                      </div>

                      {/* Committee Status */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                        <CommitteeStatusBadge status={item.committeeStatus} />
                      </div>

                      {/* Approval Progress */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                        <ApprovalProgress 
                          completed={item.approvalsCompletedCount} 
                          total={item.approvalsTotalCount} 
                          required={item.approvalsRequiredCount}
                        />
                      </div>

                      {/* Approvers */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                        <ApproversAvatars approvers={item.approvers} />
                      </div>

                      {/* Last Action */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                        <LastActionCell action={item.lastAction} />
                      </div>

                      {/* Last Action Time */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                        {item.lastAction?.at ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(CELL_META, "tabular-nums")}>
                                {formatDistanceToNow(new Date(item.lastAction.at), { addSuffix: false })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(item.lastAction.at), 'PPp')}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className={CELL_META}>—</span>
                        )}
                      </div>

                      {/* Aging */}
                      <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                        <span className={cn(
                          CELL_SECONDARY,
                          "tabular-nums",
                          item.agingDays >= 7 && "text-rose-600 dark:text-rose-400 font-medium"
                        )}>
                          {item.agingDays}d
                        </span>
                      </div>

                      {/* Actions placeholder */}
                      <div className={cn(GRID_CELL_BASE, "flex items-center h-full")}></div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-3)]">Rows per page:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(size => (
                  <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-2)]">
              {items.length > 0 
                ? `${startIndex + 1}–${Math.min(startIndex + pageSize, items.length)} of ${items.length}`
                : '0 items'
              }
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
