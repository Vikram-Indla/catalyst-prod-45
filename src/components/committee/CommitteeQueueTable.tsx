/**
 * CommitteeQueueTable — Enterprise-grade committee governance table
 * 
 * Compact density, governance-focused columns, proper alignment.
 * Matches IncidentListTable styling patterns.
 */

import { useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
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
import { ResizableHeader } from '@/components/incidents/ResizableHeader';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import type { CommitteeQueueItem, CommitteeDecisionStatus } from '@/hooks/useCommitteeQueue';

// Page size options
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const PAGE_SIZE_STORAGE_KEY = 'catalyst.committeeQueue.pageSize';
const COLUMN_WIDTHS_STORAGE_KEY = 'catalyst.committeeQueue.columnWidths.v2';

// Enterprise typography - consistent with IncidentListTable
const HEADER_TEXT = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wider';
const CELL_TEXT = 'text-[12px] leading-4 text-foreground';
const CELL_SECONDARY = 'text-[12px] leading-4 text-muted-foreground';
const CELL_META = 'text-[10px] text-muted-foreground tabular-nums';

// Grid cell base styles
const GRID_CELL_BASE = 'min-w-0 overflow-hidden';

// Column configuration
type ColumnId = 'key' | 'summary' | 'severity' | 'major' | 'status' | 'progress' | 'approvers' | 'lastAction' | 'time' | 'aging';

const COLUMN_ORDER: ColumnId[] = ['key', 'summary', 'severity', 'major', 'status', 'progress', 'approvers', 'lastAction', 'time', 'aging'];

const COLUMN_LABELS: Record<ColumnId, string> = {
  key: 'KEY',
  summary: 'SUMMARY',
  severity: 'SEV',
  major: 'MAJ',
  status: 'STATUS',
  progress: 'PROGRESS',
  approvers: 'APPROVERS',
  lastAction: 'LAST ACTION',
  time: 'TIME',
  aging: 'AGE',
};

// Center-aligned columns (everything except key, summary, and lastAction)
const CENTER_ALIGNED_COLUMNS: ColumnId[] = ['severity', 'major', 'status', 'progress', 'approvers', 'time', 'aging'];

// Column width constraints
const MIN_COLUMN_WIDTHS: Record<ColumnId, number> = {
  key: 75,
  summary: 200,
  severity: 55,
  major: 45,
  status: 85,
  progress: 70,
  approvers: 90,
  lastAction: 110,
  time: 75,
  aging: 45,
};

const MAX_COLUMN_WIDTHS: Record<ColumnId, number> = {
  key: 120,
  summary: 500,
  severity: 80,
  major: 60,
  status: 120,
  progress: 100,
  approvers: 160,
  lastAction: 200,
  time: 120,
  aging: 70,
};

const DEFAULT_COLUMN_WIDTHS: Record<ColumnId, number> = {
  key: 85,
  summary: 300,
  severity: 62,
  major: 50,
  status: 100,
  progress: 80,
  approvers: 110,
  lastAction: 140,
  time: 90,
  aging: 55,
};

// Flexible column weights for distributing extra space
const FLEXIBLE_WEIGHTS: Partial<Record<ColumnId, number>> = {
  summary: 4,
  status: 1,
  approvers: 1.5,
  lastAction: 2,
};

function getGridTemplate(widths: Record<ColumnId, number>): string {
  return COLUMN_ORDER.map(col => `${Math.round(widths[col])}px`).join(' ');
}

function calculateAutoFitWidths(containerWidth: number): Record<ColumnId, number> {
  const widths = { ...DEFAULT_COLUMN_WIDTHS };
  
  // Calculate total default width
  let totalDefault = Object.values(widths).reduce((a, b) => a + b, 0);
  
  // If container is wider, distribute extra space
  if (containerWidth > totalDefault) {
    const extra = containerWidth - totalDefault;
    let totalWeight = 0;
    
    COLUMN_ORDER.forEach(col => {
      totalWeight += FLEXIBLE_WEIGHTS[col] || 0;
    });
    
    if (totalWeight > 0) {
      COLUMN_ORDER.forEach(col => {
        const weight = FLEXIBLE_WEIGHTS[col] || 0;
        if (weight > 0) {
          const bonus = (extra * weight) / totalWeight;
          widths[col] = Math.min(MAX_COLUMN_WIDTHS[col], widths[col] + bonus);
        }
      });
    }
  }
  
  return widths;
}

interface CommitteeQueueTableProps {
  items: CommitteeQueueItem[];
  isLoading?: boolean;
  onRowClick?: (item: CommitteeQueueItem) => void;
  onLoadDemoData?: () => void;
  includeClosedDecisions?: boolean;
}

function StatusBadge({ status }: { status: CommitteeDecisionStatus }) {
  const config = {
    pending: { 
      label: 'Pending', 
      className: 'bg-amber-100 text-amber-700 border-amber-200', 
      icon: Clock 
    },
    approved: { 
      label: 'Approved', 
      className: 'bg-teal-100 text-teal-700 border-teal-200', 
      icon: CheckCircle 
    },
    vetoed: { 
      label: 'Vetoed', 
      className: 'bg-rose-100 text-rose-700 border-rose-200', 
      icon: XCircle 
    },
  } as const;

  const { label, className, icon: Icon } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap border", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    SEV1: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
    SEV2: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    SEV3: { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
    SEV4: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  };

  const { bg, text, dot } = config[severity] || config.SEV4;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", bg, text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {severity}
    </span>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = completed >= total;
  
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all",
            isComplete ? "bg-teal-500" : "bg-teal-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
        {completed}/{total}
      </span>
    </div>
  );
}

function ApproversAvatars({ approvers }: { approvers: CommitteeQueueItem['approvers'] }) {
  const visible = approvers.slice(0, 3);
  const remaining = approvers.length - 3;

  const decisionStyles: Record<CommitteeDecisionStatus, string> = {
    pending: 'bg-slate-200 text-slate-600',
    approved: 'bg-teal-100 text-teal-700',
    vetoed: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((a) => {
        const styleClass = decisionStyles[a.decision];
        return (
          <Tooltip key={a.id}>
            <TooltipTrigger asChild>
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold border-2 border-white", styleClass)}>
                {a.userInitials || a.userName.charAt(0)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="font-medium">{a.userName}</div>
              <div className="capitalize text-muted-foreground">{a.decision}</div>
              {a.hasVeto && <div className="text-amber-600">Veto power</div>}
            </TooltipContent>
          </Tooltip>
        );
      })}
      {remaining > 0 && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border-2 border-white bg-slate-100 text-slate-500">
          +{remaining}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton({ gridTemplate }: { gridTemplate: string }) {
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card flex-1">
      <div
        className="grid items-center h-8 bg-muted border-b border-border"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {COLUMN_ORDER.map((col) => (
          <div key={col} className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full", CENTER_ALIGNED_COLUMNS.includes(col) && "justify-center")}>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "grid items-center h-9 border-b border-border last:border-b-0",
            i % 2 === 0 ? "bg-card" : "bg-muted/30"
          )}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {COLUMN_ORDER.map((col) => (
            <div key={col} className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full", CENTER_ALIGNED_COLUMNS.includes(col) && "justify-center")}>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasSavedWidths, setHasSavedWidths] = useState(false);
  
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      if (saved) { const p = parseInt(saved, 10); if (PAGE_SIZE_OPTIONS.includes(p)) return p; }
    } catch {}
    return 25;
  });

  // Column widths with localStorage persistence
  const [columnWidths, setColumnWidths] = useState<Record<ColumnId, number>>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) {
          return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
        }
      }
    } catch {}
    return { ...DEFAULT_COLUMN_WIDTHS };
  });

  // Auto-fit columns on first load if no saved widths
  useLayoutEffect(() => {
    if (hasInitialized.current) return;
    
    try {
      const saved = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
      if (saved) {
        setHasSavedWidths(true);
        hasInitialized.current = true;
        return;
      }
    } catch {}
    
    const container = containerRef.current;
    const containerWidth = container?.clientWidth || window.innerWidth - 300;
    
    if (containerWidth > 0) {
      const autoFitWidths = calculateAutoFitWidths(containerWidth);
      setColumnWidths(autoFitWidths);
    }
    
    hasInitialized.current = true;
  }, []);

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    const col = columnId as ColumnId;
    const minWidth = MIN_COLUMN_WIDTHS[col] || 40;
    const maxWidth = MAX_COLUMN_WIDTHS[col] || 500;
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));
    
    setColumnWidths(prev => {
      const newWidths = { ...prev, [col]: clampedWidth };
      try {
        localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(newWidths));
        setHasSavedWidths(true);
      } catch {}
      return newWidths;
    });
  }, []);

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

  const gridTemplate = useMemo(() => getGridTemplate(columnWidths), [columnWidths]);
  
  const totalTableWidth = useMemo(() => {
    return Object.values(columnWidths).reduce((a, b) => a + b, 0);
  }, [columnWidths]);

  if (isLoading) return <LoadingSkeleton gridTemplate={gridTemplate} />;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full">
        <div ref={containerRef} className="rounded-lg border border-border overflow-hidden bg-card flex-1 min-h-0">
          <div className="overflow-x-auto w-full h-full">
            <div style={{ minWidth: `${totalTableWidth}px`, width: '100%' }}>
              {/* Header row - 32px height */}
              <div
                className="grid items-center h-8 sticky top-0 z-20 bg-muted border-b border-border"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {COLUMN_ORDER.map((col, idx) => {
                  const isCentered = CENTER_ALIGNED_COLUMNS.includes(col);
                  const isFirst = idx === 0;
                  
                  return (
                    <ResizableHeader
                      key={col}
                      columnId={col}
                      width={columnWidths[col]}
                      minWidth={MIN_COLUMN_WIDTHS[col]}
                      maxWidth={MAX_COLUMN_WIDTHS[col]}
                      onResize={handleColumnResize}
                      centered={isCentered}
                      className={cn(GRID_CELL_BASE, isFirst ? "pl-3 pr-2" : "px-2")}
                    >
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{COLUMN_LABELS[col]}</span>
                    </ResizableHeader>
                  );
                })}
              </div>

              {/* Rows - 36px height */}
              {paginatedItems.length === 0 ? (
                <EmptyState onLoadDemoData={onLoadDemoData} includeClosedDecisions={includeClosedDecisions} />
              ) : (
                paginatedItems.map((item, index) => (
                  <div
                    key={item.incident.id}
                    className={cn(
                      'grid items-center h-9 cursor-pointer border-b border-border last:border-b-0 transition-colors',
                      index % 2 === 0 ? 'bg-card' : 'bg-muted/30',
                      hoveredId === item.incident.id && 'bg-muted'
                    )}
                    style={{ gridTemplateColumns: gridTemplate }}
                    onClick={(e) => handleRowClick(item, e)}
                    onMouseEnter={() => setHoveredId(item.incident.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* KEY */}
                    <div className={cn(GRID_CELL_BASE, "pl-3 pr-2 flex items-center h-full")}>
                      <Link
                        to={`/release/incidents/${item.incident.id}`}
                        className="font-medium text-blue-600 hover:underline truncate text-[12px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.incident.incident_key}
                      </Link>
                    </div>
                    {/* SUMMARY */}
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[12px] text-foreground truncate">{item.incident.title}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm text-xs">
                          {item.incident.title}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {/* SEVERITY */}
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                      <SeverityBadge severity={item.incident.severity || 'SEV4'} />
                    </div>
                    {/* MAJOR */}
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                      {item.incident.severity === 'SEV1' ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>Major Incident</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    {/* STATUS */}
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                      <StatusBadge status={item.committeeStatus} />
                    </div>
                    {/* PROGRESS */}
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                      <ProgressBar completed={item.approvalsCompletedCount} total={item.approvalsTotalCount} />
                    </div>
                    {/* APPROVERS */}
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                      <ApproversAvatars approvers={item.approvers} />
                    </div>
                    {/* LAST ACTION */}
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
                      <span className="text-[11px] text-muted-foreground truncate capitalize">
                        {item.lastAction?.type || 'Sent'}
                      </span>
                    </div>
                    {/* TIME */}
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                            {item.committeeSentAt ? formatDistanceToNow(new Date(item.committeeSentAt), { addSuffix: false }) : '—'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.committeeSentAt ? format(new Date(item.committeeSentAt), 'PPpp') : 'N/A'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {/* AGING */}
                    <div className={cn(GRID_CELL_BASE, "px-2 flex items-center justify-center h-full")}>
                      <span className={cn(
                        "text-[11px] font-medium tabular-nums",
                        item.agingDays > 7 ? "text-rose-600" : 
                        item.agingDays > 3 ? "text-amber-600" : 
                        "text-muted-foreground"
                      )}>
                        {item.agingDays}d
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pagination footer */}
        {items.length > PAGE_SIZE_OPTIONS[0] && (
          <div className="flex items-center justify-between py-2 px-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Show</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-16 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {startIndex + 1}–{Math.min(startIndex + pageSize, items.length)} of {items.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
