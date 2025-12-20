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

// Grid + typography (match Incident List table behavior)
const HEADER_TEXT = 'text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider';
const CELL_TEXT = 'text-[12px] leading-4 text-[var(--text-primary)]';
const CELL_SECONDARY = 'text-[12px] leading-4 text-[var(--text-secondary)]';
const CELL_META = 'text-[10px] text-[var(--text-tertiary)] tabular-nums';

// Grid cell base styles - consistent box model + no header overlap
const GRID_CELL_BASE = 'min-w-0 overflow-hidden';

// Column widths optimized for content (Summary is flexible to avoid empty canvas)
const SUMMARY_MIN_WIDTH = 260;
const FIXED_WIDTHS = {
  key: 85,
  severity: 55,
  major: 40,
  status: 96,
  progress: 70,
  approvers: 110,
  lastAction: 160,
  time: 84,
  aging: 64,
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
  return [
    `${FIXED_WIDTHS.key}px`,
    `minmax(${SUMMARY_MIN_WIDTH}px, 1fr)`,
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
  Object.values(FIXED_WIDTHS).reduce((a, b) => a + b, 0) + SUMMARY_MIN_WIDTH;

interface CommitteeQueueTableProps {
  items: CommitteeQueueItem[];
  isLoading?: boolean;
  onRowClick?: (item: CommitteeQueueItem) => void;
  onLoadDemoData?: () => void;
  includeClosedDecisions?: boolean;
}

function StatusBadge({ status }: { status: CommitteeDecisionStatus }) {
  const config = {
    pending: { label: 'Pending', bg: 'var(--status-warning-bg)', fg: 'var(--status-warning)', icon: Clock },
    approved: { label: 'Approved', bg: 'var(--status-success-bg)', fg: 'var(--status-success)', icon: CheckCircle },
    vetoed: { label: 'Vetoed', bg: 'var(--status-danger-bg)', fg: 'var(--status-danger)', icon: XCircle },
  } as const;

  const { label, bg, fg, icon: Icon } = config[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap border"
      style={{ background: bg, color: fg, borderColor: 'var(--border-default)' }}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const dotBySeverity: Record<string, string> = {
    SEV1: 'var(--status-danger)',
    SEV2: 'var(--status-warning)',
    SEV3: 'var(--status-info)',
    SEV4: 'var(--text-tertiary)',
  };

  const dot = dotBySeverity[severity] || 'var(--text-tertiary)';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-1.5 py-0 h-5 rounded-full border bg-[var(--surface-subtle)] text-[10px] font-medium text-[var(--text-secondary)]"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      {severity}
    </span>
  );
}

// Approvers avatars - compact
function ApproversAvatars({ approvers }: { approvers: CommitteeQueueItem['approvers'] }) {
  const visible = approvers.slice(0, 3);
  const remaining = approvers.length - 3;

  const decisionStyles: Record<CommitteeDecisionStatus, { bg: string; fg: string }> = {
    pending: { bg: 'var(--surface-subtle)', fg: 'var(--text-secondary)' },
    approved: { bg: 'var(--status-success-bg)', fg: 'var(--status-success)' },
    vetoed: { bg: 'var(--status-danger-bg)', fg: 'var(--status-danger)' },
  };

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((a) => {
        const s = decisionStyles[a.decision];
        return (
          <Tooltip key={a.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border",
                  "bg-[var(--surface-subtle)]"
                )}
                style={{ background: s.bg, color: s.fg, borderColor: 'var(--surface-elevated)' }}
              >
                {a.userInitials || a.userName.charAt(0)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="font-medium text-[var(--text-primary)]">{a.userName}</div>
              <div className="capitalize text-[var(--text-tertiary)]">{a.decision}</div>
              {a.hasVeto && <div className="text-[var(--text-warning)]">Veto power</div>}
              {a.addedBy && <div className="text-[var(--text-tertiary)]">Added by {a.addedBy}</div>}
            </TooltipContent>
          </Tooltip>
        );
      })}
      {remaining > 0 && (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border"
          style={{ background: 'var(--surface-subtle)', color: 'var(--text-secondary)', borderColor: 'var(--surface-elevated)' }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  const gridTemplate = getGridTemplate();
  return (
    <div className="rounded-md border border-[var(--border-default)] overflow-hidden bg-[var(--surface-elevated)]">
      <div
        className="grid items-center h-8 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {COLUMN_IDS.map((col) => (
          <div key={col} className={cn(GRID_CELL_BASE, "px-2 flex items-center h-full")}>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="grid items-center h-9 border-b border-[var(--border-default)] last:border-b-0"
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
    <div className="py-8 text-center border-t" style={{ borderColor: 'var(--border-default)' }}>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
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
        <div className="rounded-md border border-[var(--border-default)] overflow-hidden bg-[var(--surface-elevated)] flex-1 min-h-0">
          {/* Single scroll container (keeps horizontal + vertical scroll always available) */}
          <div
            className="overflow-auto w-full h-full"
            style={{ scrollbarGutter: 'stable both-edges' }}
          >
            <div style={{ minWidth: `${MIN_TABLE_WIDTH}px`, width: '100%' }}>
              {/* Header */}
              <div
                className="grid items-center h-8 sticky top-0 z-20 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]"
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
                  <span className={cn(HEADER_TEXT, "truncate")}>PROG</span>
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
                      'grid items-center h-9 cursor-pointer border-b border-[var(--border-default)] last:border-b-0 transition-colors',
                      hoveredId === item.incident.id && 'bg-[var(--surface-subtle)]'
                    )}
                    style={{ gridTemplateColumns: gridTemplate }}
                    onClick={(e) => handleRowClick(item, e)}
                    onMouseEnter={() => setHoveredId(item.incident.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className={cn(GRID_CELL_BASE, "pl-3 pr-1 flex items-center h-full")}>
                      <Link
                        to={`/release/incidents/${item.incident.id}`}
                        className={cn(CELL_TEXT, 'font-medium text-[var(--brand-primary)] hover:underline truncate')}
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
                        <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--status-warning)' }} />
                      ) : (
                        <span className={cn(CELL_META, 'text-[11px]')}>—</span>
                      )}
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                      <StatusBadge status={item.committeeStatus} />
                    </div>
                    <div className={cn(GRID_CELL_BASE, "px-1 flex items-center justify-center h-full")}>
                      <span className={cn(CELL_SECONDARY, 'text-[11px] tabular-nums font-medium')}>
                        {item.approvalsCompletedCount}/{item.approvalsRequiredCount}
                      </span>
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
                      <span
                        className={cn('text-[11px] tabular-nums font-medium', item.agingDays >= 7 ? 'text-[var(--text-warning)]' : 'text-[var(--text-secondary)]')}
                      >
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
              <span className="text-[11px] text-[var(--text-tertiary)]">Rows:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-6 w-14 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-secondary)]">
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
