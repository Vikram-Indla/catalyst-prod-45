/**
 * CommitteeQueueTable — Enterprise-grade committee governance table
 * 
 * Compact density, governance-focused columns, proper alignment.
 * Uses demo data when real data is empty.
 */

import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, CheckCircle, XCircle, Database } from 'lucide-react';
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
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const PAGE_SIZE_STORAGE_KEY = 'catalyst.committeeQueue.pageSize';

// Grid + typography (match Incident List table - Tailwind tokens)
const HEADER_TEXT = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wider';
const CELL_TEXT = 'text-[12px] leading-4 text-foreground';
const CELL_SECONDARY = 'text-[12px] leading-4 text-muted-foreground';
const CELL_META = 'text-[10px] text-muted-foreground tabular-nums';

// Grid cell base styles - consistent box model + no header overlap
const GRID_CELL_BASE = 'min-w-0 overflow-hidden';

// Column widths - Summary is flexible, right columns are fixed
const FIXED_WIDTHS = {
  key: 85,
  summary: 320,  // min width for summary
  severity: 60,
  major: 45,
  status: 100,
  progress: 75,
  approvers: 115,
  lastAction: 140,
  time: 90,
  aging: 50,
} as const;

type ColumnId =
  | 'key'
  | 'summary'
  | 'severity'
  | 'major'
  | 'status'
  | 'progress'
  | 'approvers'
  | 'lastAction'
  | 'time'
  | 'aging';

const COLUMN_IDS: ColumnId[] = [
  'key',
  'summary',
  'severity',
  'major',
  'status',
  'progress',
  'approvers',
  'lastAction',
  'time',
  'aging',
];

function getGridTemplate() {
  // All columns fixed width - no flexible columns to prevent whitespace
  return [
    `${FIXED_WIDTHS.key}px`,
    `minmax(${FIXED_WIDTHS.summary}px, auto)`,  // Summary grows with content, min 320px
    `${FIXED_WIDTHS.severity}px`,
    `${FIXED_WIDTHS.major}px`,
    `${FIXED_WIDTHS.status}px`,
    `${FIXED_WIDTHS.progress}px`,
    `${FIXED_WIDTHS.approvers}px`,
    `${FIXED_WIDTHS.lastAction}px`,
    `${FIXED_WIDTHS.time}px`,
    `${FIXED_WIDTHS.aging}px`,
  ].join(' ');
}

const MIN_TABLE_WIDTH =
  Object.values(FIXED_WIDTHS).reduce((a, b) => a + b, 0);

interface CommitteeQueueTableProps {
  items: CommitteeQueueItem[];
  isLoading?: boolean;
  onRowClick?: (item: CommitteeQueueItem) => void;
  onLoadDemoData?: () => void;
  includeClosedDecisions?: boolean;
}

function StatusBadge({ status }: { status: CommitteeDecisionStatus }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: Clock },
    approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle },
    vetoed: { label: 'Vetoed', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: XCircle },
  } as const;

  const { label, className, icon: Icon } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap border", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const dotColors: Record<string, string> = {
    SEV1: 'bg-rose-500',
    SEV2: 'bg-amber-500',
    SEV3: 'bg-sky-500',
    SEV4: 'bg-slate-400',
  };

  const dotClass = dotColors[severity] || 'bg-slate-400';

  return (
    <span className="inline-flex items-center gap-1.5 px-1.5 py-0 h-5 rounded-full border border-border bg-muted text-[10px] font-medium text-muted-foreground">
      <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
      {severity}
    </span>
  );
}

// Visual progress bar component
function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = completed >= total;
  
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all",
            isComplete ? "bg-emerald-500" : pct > 50 ? "bg-amber-500" : "bg-rose-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
        {completed}/{total}
      </span>
    </div>
  );
}

// Approvers avatars - compact
function ApproversAvatars({ approvers }: { approvers: CommitteeQueueItem['approvers'] }) {
  const visible = approvers.slice(0, 3);
  const remaining = approvers.length - 3;

  const decisionStyles: Record<CommitteeDecisionStatus, string> = {
    pending: 'bg-muted text-muted-foreground',
    approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    vetoed: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  };

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((a) => {
        const styleClass = decisionStyles[a.decision];
        return (
          <Tooltip key={a.id}>
            <TooltipTrigger asChild>
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border border-background", styleClass)}>
                {a.userInitials || a.userName.charAt(0)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="font-medium">{a.userName}</div>
              <div className="capitalize text-muted-foreground">{a.decision}</div>
              {a.hasVeto && <div className="text-amber-500">Veto power</div>}
              {a.addedBy && <div className="text-muted-foreground">Added by {a.addedBy}</div>}
            </TooltipContent>
          </Tooltip>
        );
      })}
      {remaining > 0 && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border border-background bg-muted text-muted-foreground">
          +{remaining}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  const gridTemplate = getGridTemplate();
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card flex-1">
      <div
        className="grid items-center h-8 bg-muted border-b border-border"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {COLUMN_IDS.map((col) => (
          <div key={col} className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="grid items-center h-9 border-b border-border last:border-b-0"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {COLUMN_IDS.map((col) => (
            <div key={col} className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
              <Skeleton className="h-3 w-full max-w-[80%]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onLoadDemoData, includeClosedDecisions }: { onLoadDemoData?: () => void; includeClosedDecisions?: boolean }) {
  const message = includeClosedDecisions ? 'No committee items found.' : 'No open committee approvals.';
  return (
    <div className="py-8 text-center border-t border-border">
      <p className="text-sm text-muted-foreground">{message}</p>
      {onLoadDemoData && (
        <Button variant="outline" size="sm" onClick={onLoadDemoData} className="gap-2 mt-3">
          <Database className="h-3.5 w-3.5" />
          Load Demo Data
        </Button>
      )}
    </div>
  );
}

export function CommitteeQueueTable({ items, isLoading, onRowClick, onLoadDemoData, includeClosedDecisions }: CommitteeQueueTableProps) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      if (saved) { const p = parseInt(saved, 10); if (PAGE_SIZE_OPTIONS.includes(p)) return p; }
    } catch {}
    return 25;
  });

  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  const handlePageSizeChange = useCallback((v: string) => {
    const s = parseInt(v, 10);
    setPageSize(s);
    setPage(1);
    try { localStorage.setItem(PAGE_SIZE_STORAGE_KEY, v); } catch {}
  }, []);

  const handleRowClick = useCallback((item: CommitteeQueueItem, e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('a') || t.closest('button')) return;
    onRowClick ? onRowClick(item) : navigate(`/release/incidents/${item.incident.id}`);
  }, [navigate, onRowClick]);

  const gridTemplate = useMemo(() => getGridTemplate(), []);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full">
        <div className="rounded-md border border-border overflow-hidden bg-card flex-1 min-h-0">
          {/* Single scroll container - table is content-sized, scrolls horizontally if needed */}
          <div className="overflow-auto h-full">
            <div className="w-fit min-w-full">
              {/* Header */}
              <div
                className="grid items-center h-8 sticky top-0 z-20 bg-muted border-b border-border"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div className={cn(GRID_CELL_BASE, "pl-3 pr-1 flex items-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>KEY</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-1 flex items-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>SUMMARY</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>SEV</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>MAJ</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>STATUS</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>PROGRESS</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-1 flex items-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>APPROVERS</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-1 flex items-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>LAST ACTION</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>TIME</span>
                </div>
                <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                  <span className={cn(HEADER_TEXT, "truncate")}>AGE</span>
                </div>
              </div>

              {/* Rows */}
              {paginatedItems.length === 0 ? (
                <EmptyState onLoadDemoData={onLoadDemoData} includeClosedDecisions={includeClosedDecisions} />
              ) : (
                paginatedItems.map((item) => (
                  <div
                    key={item.incident.id}
                    className={cn(
                      'grid items-center h-9 cursor-pointer border-b border-border last:border-b-0 transition-colors',
                      hoveredId === item.incident.id && 'bg-muted/50'
                    )}
                    style={{ gridTemplateColumns: gridTemplate }}
                    onClick={(e) => handleRowClick(item, e)}
                    onMouseEnter={() => setHoveredId(item.incident.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className={cn(GRID_CELL_BASE, "pl-3 pr-1 flex items-center h-full")}>
                      <Link
                        to={`/release/incidents/${item.incident.id}`}
                        className={cn(CELL_TEXT, 'font-medium text-primary hover:underline truncate')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.incident.incident_key}
                      </Link>
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center h-full")}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn(CELL_TEXT, 'truncate')}>{item.incident.title}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm text-xs">
                          {item.incident.title}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                      <SeverityBadge severity={item.incident.severity} />
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                      {item.incident.is_major_incident ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <span className={cn(CELL_META, 'text-[11px]')}>—</span>
                      )}
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                      <StatusBadge status={item.committeeStatus} />
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                      <ProgressBar completed={item.approvalsCompletedCount} total={item.approvalsRequiredCount} />
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center h-full")}>
                      <ApproversAvatars approvers={item.approvers} />
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center h-full")}>
                      <span className={cn(CELL_SECONDARY, 'truncate text-[11px]')}>
                        {item.lastAction?.type === 'vetoed' && `Veto by ${item.lastAction.by}`}
                        {item.lastAction?.type === 'approved' && `${item.lastAction.by}`}
                        {item.lastAction?.type === 'sent_to_committee' && 'Sent'}
                        {item.lastAction?.type === 'approver_added' && `Added by ${item.lastAction.by}`}
                      </span>
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                      {item.lastAction?.at ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={CELL_META}>
                              {formatDistanceToNow(new Date(item.lastAction.at), { addSuffix: false })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{format(new Date(item.lastAction.at), 'PPp')}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className={CELL_META}>—</span>
                      )}
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                      <span className={cn('text-[11px] tabular-nums font-medium', item.agingDays >= 7 ? 'text-amber-500' : 'text-muted-foreground')}>
                        {item.agingDays}d
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {items.length > 0 && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {startIndex + 1}–{Math.min(startIndex + pageSize, items.length)} of {items.length}
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
