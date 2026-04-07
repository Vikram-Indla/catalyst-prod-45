// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST OKR OBJECTIVES TABLE — Modern Strategic Backlog Style
// Matches the new objectives table design with circular icons, outlined badges
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, ChevronUp, Target, Key, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TrendCode, WorkItemKind } from '../lib/okrTypes';
import type { OKRColumn } from './OKRColumnChooser';

// Shared presentational components
import { OkrProgressCell } from './shared/OkrProgressCell';
import { OkrRisksCell } from './shared/OkrRisksCell';
import { OkrLinkedCell } from './shared/OkrLinkedCell';
import { OkrWorkItemBadge } from './shared/OkrWorkItemBadge';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface OkrObjectiveRow {
  id: string;
  name: string;
  themeName: string;
  themeColor: string;
  ownerName?: string;
  status: string;
  progressActual: number | null;
  progressTrend: TrendCode;
  progressVariance: number | null;
  hasBaseline: boolean;
  startDate?: string | null;
  endDate?: string | null;
  highRiskCount: number;
  mediumRiskCount: number;
  blockedWorkCount: number;
  delayedWorkCount: number;
  linkedKrCount: number;
  linkedWorkItemCount: number;
  isExpanded?: boolean;
  hasChildren?: boolean;
  level?: number;
  children?: OkrObjectiveRow[];
  // New fields for hierarchical display
  itemType?: 'objective' | 'keyResult' | 'workItem';
  workItemType?: WorkItemKind;
}

interface OkrObjectivesTableProps {
  rows: OkrObjectiveRow[];
  columns?: OKRColumn[];
  onRowClick: (row: OkrObjectiveRow) => void;
  onToggleExpand?: (rowId: string) => void;
}

// Column configuration with widths and labels
const COLUMN_CONFIG: Record<string, { label: string; width: string }> = {
  type: { label: 'Type', width: '70px' },
  objective: { label: 'OKRs', width: '1fr' },
  theme: { label: 'Theme', width: '180px' },
  owner: { label: 'Owner', width: '120px' },
  status: { label: 'Status', width: '130px' },
  progress: { label: 'Progress vs Plan', width: '200px' },
  startDate: { label: 'Start Date', width: '110px' },
  endDate: { label: 'End Date', width: '110px' },
  risks: { label: 'Risks', width: '80px' },
  krs: { label: 'Linked', width: '80px' },
};

// Status styles for outlined badges with dot indicator
const STATUS_CONFIG: Record<string, { label: string; dotColor: string; borderColor: string; textColor: string }> = {
  'pending': { label: 'PENDING', dotColor: 'bg-muted-foreground', borderColor: 'border-border', textColor: 'text-muted-foreground' },
  'in-progress': { label: 'IN PROGRESS', dotColor: 'bg-brand-primary', borderColor: 'border-brand-primary', textColor: 'text-brand-primary' },
  'on-track': { label: 'ON TRACK', dotColor: 'bg-secondary-green', borderColor: 'border-secondary-green', textColor: 'text-secondary-green' },
  'at-risk': { label: 'AT RISK', dotColor: 'bg-secondary-bronze', borderColor: 'border-secondary-bronze', textColor: 'text-secondary-bronze' },
  'off-track': { label: 'OFF TRACK', dotColor: 'bg-destructive', borderColor: 'border-destructive', textColor: 'text-destructive' },
  'blocked': { label: 'BLOCKED', dotColor: 'bg-destructive', borderColor: 'border-destructive', textColor: 'text-destructive' },
  'completed': { label: 'COMPLETED', dotColor: 'bg-secondary-green', borderColor: 'border-secondary-green', textColor: 'text-secondary-green' },
};

// Status Badge — delegates to shared StatusLozenge (3-colour guardrail)
import { StatusLozenge as SharedStatusLozenge } from '@/components/ui/StatusLozenge';
function StatusBadge({ status }: { status: string }) {
  return <SharedStatusLozenge status={status} />;
}

// Sortable header component
function SortableHeader({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      <span className="flex flex-col -space-y-1 opacity-40">
        <ChevronUp className="h-3 w-3" />
        <ChevronDown className="h-3 w-3" />
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Format date
// ─────────────────────────────────────────────────────────────────────────────────
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TABLE ROW COMPONENT (uses canonical CatalystTableRow)
// ─────────────────────────────────────────────────────────────────────────────────

interface OkrTableRowProps {
  row: OkrObjectiveRow;
  level: number;
  visibleColumnKeys: string[];
  onRowClick: (row: OkrObjectiveRow) => void;
  onToggleExpand?: (rowId: string) => void;
  expandedIds: Set<string>;
}

function OkrTableRowComponent({ row, level, visibleColumnKeys, onRowClick, onToggleExpand, expandedIds }: OkrTableRowProps) {
  const isExpanded = expandedIds.has(row.id);
  const indentPx = level * 24;

  // Get type icon for the item
  const getTypeIcon = () => {
    if (row.itemType === 'objective') return Target;
    if (row.itemType === 'keyResult') return Key;
    if (row.itemType === 'workItem') return Zap;
    return Target;
  };

  const TypeIcon = getTypeIcon();

  // Render a single cell based on column key
  const renderCell = (colKey: string, isLast: boolean) => {
    switch (colKey) {
      case 'type':
        return (
          <td key={colKey} className="py-4 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
              <TypeIcon className="h-4 w-4 text-brand-primary" />
            </div>
          </td>
        );

      case 'objective':
        return (
          <td key={colKey} className="py-4 px-4">
            <div 
              className="flex items-center gap-2 min-w-0"
              style={{ paddingLeft: `${indentPx}px` }}
            >
              {row.hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand?.(row.id);
                  }}
                  className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="w-5 flex-shrink-0" />
              )}
              
              {/* Work items show badge with type icon + name */}
              {row.itemType === 'workItem' ? (
                <OkrWorkItemBadge 
                  type={row.workItemType || 'unknown'}
                  name={row.name}
                  compact
                />
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn(
                        "text-sm truncate",
                        level === 0 && "font-semibold text-foreground",
                        level === 1 && "text-foreground",
                        level === 2 && "italic text-muted-foreground"
                      )}>
                        {row.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md bg-popover border border-border z-[400]">
                      <p>{row.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </td>
        );

      case 'theme':
        return (
          <td key={colKey} className="py-4 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{row.themeName || '—'}</span>
            </div>
          </td>
        );

      case 'owner':
        return (
          <td key={colKey} className="py-4 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground truncate">{row.ownerName || '—'}</span>
          </td>
        );

      case 'status':
        return (
          <td key={colKey} className="py-4 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <StatusBadge status={row.status} />
          </td>
        );

      case 'progress':
        return (
          <td key={colKey} className="py-4 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            {row.progressActual === null || !row.hasBaseline ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              <OkrProgressCell 
                baseline={{
                  actual: row.progressActual,
                  expected: null,
                  variance: row.progressVariance,
                  trend: row.progressTrend,
                }}
                status={row.status}
                compact
              />
            )}
          </td>
        );

      case 'startDate':
        return (
          <td key={colKey} className="py-4 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground">{formatDate(row.startDate)}</span>
          </td>
        );

      case 'endDate':
        return (
          <td key={colKey} className="py-4 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground">{formatDate(row.endDate)}</span>
          </td>
        );

      case 'risks':
        return (
          <td key={colKey} className="py-4 px-4 text-center" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <OkrRisksCell
              summary={{
                highRiskCount: row.highRiskCount,
                mediumRiskCount: row.mediumRiskCount,
                blockedWorkCount: row.blockedWorkCount,
                delayedWorkCount: row.delayedWorkCount,
              }}
              compact
            />
          </td>
        );

      case 'krs':
        return (
          <td key={colKey} className="py-4 px-4 text-center" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <OkrLinkedCell
              krCount={row.linkedKrCount}
              workItemCount={row.linkedWorkItemCount}
              itemType={level === 0 ? 'objective' : level === 1 ? 'keyResult' : 'workItem'}
            />
          </td>
        );

      default:
        return <td key={colKey} className="py-4 px-4">—</td>;
    }
  };

  return (
    <>
      <tr
        className={cn(
          'group cursor-pointer transition-all border-b border-border/30',
          'hover:bg-muted/30',
          level > 0 && 'bg-muted/10'
        )}
        onClick={() => onRowClick(row)}
      >
        {visibleColumnKeys.map((colKey, idx) => 
          renderCell(colKey, idx === visibleColumnKeys.length - 1)
        )}
      </tr>

      {/* Render children if expanded */}
      {isExpanded && row.children?.map((child) => (
        <OkrTableRowComponent
          key={child.id}
          row={child}
          level={level + 1}
          visibleColumnKeys={visibleColumnKeys}
          onRowClick={onRowClick}
          onToggleExpand={onToggleExpand}
          expandedIds={expandedIds}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN TABLE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export function OkrObjectivesTable({ rows, columns = [], onRowClick, onToggleExpand }: OkrObjectivesTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Compute visible column keys from the columns prop
  const visibleColumnKeys = useMemo(() => {
    const visible = columns.filter(c => c.visible).map(c => c.key);
    // If no columns defined or all hidden, show default set (type always first)
    if (visible.length === 0) {
      return ['type', 'objective', 'status', 'progress', 'risks', 'krs'];
    }
    // Ensure type is always included and first
    if (!visible.includes('type')) {
      return ['type', ...visible];
    }
    return visible;
  }, [columns]);

  const handleToggle = (rowId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
    onToggleExpand?.(rowId);
  };

  return (
    <div className="bg-[hsl(var(--surface-0))] border border-[hsl(var(--border-default))] rounded-xl shadow-[var(--shadow-elev-1)] overflow-hidden">
      {/* Header */}
      <div className="bg-[hsl(var(--surface-1))] border-b border-[hsl(var(--border-default))]">
        <table className="w-full">
          <thead>
            <tr>
              {visibleColumnKeys.map((colKey) => (
                <th 
                  key={colKey}
                  className="py-3.5 px-4 text-left"
                  style={{ width: COLUMN_CONFIG[colKey]?.width || '100px' }}
                >
                  <SortableHeader label={COLUMN_CONFIG[colKey]?.label || colKey} />
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Body */}
      <div className="divide-y divide-[hsl(var(--border-subtle))]">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-full mb-4 bg-[hsl(var(--surface-2))] flex items-center justify-center">
              <Target className="h-6 w-6 text-[hsl(var(--text-muted))]" />
            </div>
            <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">No objectives found</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Create an objective to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {rows.map((row) => (
                <OkrTableRowComponent
                  key={row.id}
                  row={row}
                  level={row.level ?? 0}
                  visibleColumnKeys={visibleColumnKeys}
                  onRowClick={onRowClick}
                  onToggleExpand={handleToggle}
                  expandedIds={expandedIds}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
