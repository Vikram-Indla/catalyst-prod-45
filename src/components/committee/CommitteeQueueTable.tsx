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

// Typography tokens
const HEADER_TEXT = 'text-[10px] font-semibold text-[var(--text-2)] uppercase tracking-wider';
const CELL_TEXT = 'text-[12px] leading-4 text-[var(--text-1)]';
const CELL_SECONDARY = 'text-[12px] leading-4 text-[var(--text-2)]';

// Column widths optimized for content
const COLUMN_WIDTHS = {
  key: 85,
  summary: 260,
  severity: 55,
  major: 40,
  status: 90,
  progress: 70,
  approvers: 100,
  lastAction: 150,
  time: 70,
  aging: 55,
};

interface CommitteeQueueTableProps {
  items: CommitteeQueueItem[];
  isLoading?: boolean;
  onRowClick?: (item: CommitteeQueueItem) => void;
  onLoadDemoData?: () => void;
}

// Status badge - compact
function StatusBadge({ status }: { status: CommitteeDecisionStatus }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
    vetoed: { label: 'Vetoed', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400', icon: XCircle },
  };
  const { label, className, icon: Icon } = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// Severity badge - compact
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    SEV1: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    SEV2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    SEV3: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    SEV4: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <span className={cn('inline-flex px-1.5 py-0 rounded text-[10px] font-medium', colors[severity] || 'bg-[var(--surface-subtle)] text-[var(--text-2)]')}>
      {severity}
    </span>
  );
}

// Approvers avatars - compact
function ApproversAvatars({ approvers }: { approvers: CommitteeQueueItem['approvers'] }) {
  const visible = approvers.slice(0, 3);
  const remaining = approvers.length - 3;
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((a) => (
        <Tooltip key={a.id}>
          <TooltipTrigger asChild>
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border border-[var(--surface-elevated)]",
              a.decision === 'approved' && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400",
              a.decision === 'vetoed' && "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-400",
              a.decision === 'pending' && "bg-[var(--surface-subtle)] text-[var(--text-2)]"
            )}>
              {a.userInitials || a.userName.charAt(0)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="font-medium">{a.userName}</div>
            <div className="capitalize text-[var(--text-3)]">{a.decision}</div>
            {a.hasVeto && <div className="text-amber-600">Veto power</div>}
            {a.addedBy && <div className="text-[var(--text-3)]">Added by {a.addedBy}</div>}
          </TooltipContent>
        </Tooltip>
      ))}
      {remaining > 0 && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium bg-[var(--surface-subtle)] text-[var(--text-2)] border border-[var(--surface-elevated)]">
          +{remaining}
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  const gridTemplate = Object.values(COLUMN_WIDTHS).map(w => `${w}px`).join(' ');
  return (
    <div className="rounded-md border border-[var(--border-default)] overflow-hidden bg-[var(--surface-elevated)]">
      <div className="grid items-center h-8 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]" style={{ gridTemplateColumns: gridTemplate }}>
        {Object.keys(COLUMN_WIDTHS).map((col) => (
          <div key={col} className="px-2 flex items-center h-full"><Skeleton className="h-3 w-10" /></div>
        ))}
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="grid items-center h-9 border-b border-[var(--border-default)] last:border-b-0" style={{ gridTemplateColumns: gridTemplate }}>
          {Object.keys(COLUMN_WIDTHS).map((col) => (
            <div key={col} className="px-2 flex items-center h-full"><Skeleton className="h-3 w-full max-w-[80%]" /></div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Empty state - compact
function EmptyState({ onLoadDemoData }: { onLoadDemoData?: () => void }) {
  return (
    <div className="py-8 text-center border-t border-[var(--border-default)]">
      <p className="text-sm text-[var(--text-2)] mb-3">No incidents in committee queue</p>
      {onLoadDemoData && (
        <Button variant="outline" size="sm" onClick={onLoadDemoData} className="gap-2">
          <Database className="h-3.5 w-3.5" />
          Load Demo Data
        </Button>
      )}
    </div>
  );
}

export function CommitteeQueueTable({ items, isLoading, onRowClick, onLoadDemoData }: CommitteeQueueTableProps) {
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

  const gridTemplate = useMemo(() => Object.values(COLUMN_WIDTHS).map(w => `${w}px`).join(' '), []);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full">
        <div className="rounded-md border border-[var(--border-default)] overflow-hidden bg-[var(--surface-elevated)] flex-1 min-h-0">
          <div className="overflow-x-auto w-full h-full">
            <div style={{ minWidth: Object.values(COLUMN_WIDTHS).reduce((a, b) => a + b, 0) }}>
              {/* Header */}
              <div className="grid items-center h-8 sticky top-0 z-20 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]" style={{ gridTemplateColumns: gridTemplate }}>
                <div className="pl-3 pr-1 flex items-center h-full"><span className={HEADER_TEXT}>KEY</span></div>
                <div className="px-1 flex items-center h-full"><span className={HEADER_TEXT}>SUMMARY</span></div>
                <div className="px-1 flex items-center justify-center h-full"><span className={HEADER_TEXT}>SEV</span></div>
                <div className="px-1 flex items-center justify-center h-full"><span className={HEADER_TEXT}>MAJ</span></div>
                <div className="px-1 flex items-center justify-center h-full"><span className={HEADER_TEXT}>STATUS</span></div>
                <div className="px-1 flex items-center justify-center h-full"><span className={HEADER_TEXT}>PROG</span></div>
                <div className="px-1 flex items-center h-full"><span className={HEADER_TEXT}>APPROVERS</span></div>
                <div className="px-1 flex items-center h-full"><span className={HEADER_TEXT}>LAST ACTION</span></div>
                <div className="px-1 flex items-center justify-center h-full"><span className={HEADER_TEXT}>TIME</span></div>
                <div className="px-1 flex items-center justify-center h-full"><span className={HEADER_TEXT}>AGE</span></div>
              </div>

              {/* Rows */}
              {paginatedItems.length === 0 ? (
                <EmptyState onLoadDemoData={onLoadDemoData} />
              ) : (
                paginatedItems.map((item) => (
                  <div
                    key={item.incident.id}
                    className={cn(
                      'grid items-center h-9 cursor-pointer border-b border-[var(--border-default)] last:border-b-0 transition-colors',
                      hoveredId === item.incident.id && 'bg-[var(--surface-subtle)]'
                    )}
                    style={{ gridTemplateColumns: gridTemplate }}
                    onClick={(e) => handleRowClick(item, e)}
                    onMouseEnter={() => setHoveredId(item.incident.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="pl-3 pr-1 flex items-center h-full">
                      <Link to={`/release/incidents/${item.incident.id}`} className={cn(CELL_TEXT, "font-medium text-[var(--brand-primary)] hover:underline truncate")} onClick={(e) => e.stopPropagation()}>
                        {item.incident.incident_key}
                      </Link>
                    </div>
                    <div className="px-1 flex items-center h-full">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn(CELL_TEXT, "truncate")}>{item.incident.title}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm text-xs">{item.incident.title}</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="px-1 flex items-center justify-center h-full">
                      <SeverityBadge severity={item.incident.severity} />
                    </div>
                    <div className="px-1 flex items-center justify-center h-full">
                      {item.incident.is_major_incident ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <span className="text-[var(--text-3)] text-[10px]">—</span>
                      )}
                    </div>
                    <div className="px-1 flex items-center justify-center h-full">
                      <StatusBadge status={item.committeeStatus} />
                    </div>
                    <div className="px-1 flex items-center justify-center h-full">
                      <span className={cn(CELL_SECONDARY, "text-[11px] tabular-nums font-medium")}>
                        {item.approvalsCompletedCount}/{item.approvalsRequiredCount}
                      </span>
                    </div>
                    <div className="px-1 flex items-center h-full">
                      <ApproversAvatars approvers={item.approvers} />
                    </div>
                    <div className="px-1 flex items-center h-full">
                      <span className={cn(CELL_SECONDARY, "truncate text-[11px]")}>
                        {item.lastAction?.type === 'vetoed' && `Veto by ${item.lastAction.by}`}
                        {item.lastAction?.type === 'approved' && `${item.lastAction.by}`}
                        {item.lastAction?.type === 'sent_to_committee' && 'Sent'}
                        {item.lastAction?.type === 'approver_added' && `Added by ${item.lastAction.by}`}
                      </span>
                    </div>
                    <div className="px-1 flex items-center justify-center h-full">
                      {item.lastAction?.at ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] text-[var(--text-3)] tabular-nums">
                              {formatDistanceToNow(new Date(item.lastAction.at), { addSuffix: false })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{format(new Date(item.lastAction.at), 'PPp')}</TooltipContent>
                        </Tooltip>
                      ) : <span className="text-[var(--text-3)] text-[10px]">—</span>}
                    </div>
                    <div className="px-1 flex items-center justify-center h-full">
                      <span className={cn(
                        "text-[11px] tabular-nums font-medium",
                        item.agingDays >= 7 ? "text-orange-600 dark:text-orange-400" : "text-[var(--text-2)]"
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

        {/* Pagination - compact */}
        {items.length > 0 && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-3)]">Rows:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-6 w-14 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-2)]">
                {startIndex + 1}–{Math.min(startIndex + pageSize, items.length)} of {items.length}
              </span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
