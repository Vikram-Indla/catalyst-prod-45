// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST OKR OBJECTIVES TABLE — Proper Tabular View (V1)
// HTML table structure with aligned columns and expandable hierarchy
// Respects column visibility from OKRColumnChooser
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TrendCode, WorkItemKind } from '../lib/okrTypes';
import type { OKRColumn } from './OKRColumnChooser';

// Shared presentational components
import { OkrStatusPill } from './shared/OkrStatusPill';
import { OkrProgressCell } from './shared/OkrProgressCell';
import { OkrRisksCell } from './shared/OkrRisksCell';
import { OkrLinkedCell } from './shared/OkrLinkedCell';
import { OkrThemeDot } from './shared/OkrThemeDot';
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
  dueDate?: string | null;
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
  objective: { label: 'OKRs', width: '320px' },
  theme: { label: 'Theme Name', width: '120px' },
  owner: { label: 'Owner', width: '120px' },
  status: { label: 'Status', width: '100px' },
  progress: { label: 'Progress vs Plan', width: '180px' },
  startDate: { label: 'Start Date', width: '110px' },
  dueDate: { label: 'Due Date', width: '110px' },
  risks: { label: 'Risks', width: '100px' },
  krs: { label: 'Linked', width: '120px' },
};

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
// TABLE ROW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

interface TableRowProps {
  row: OkrObjectiveRow;
  level: number;
  visibleColumnKeys: string[];
  onRowClick: (row: OkrObjectiveRow) => void;
  onToggleExpand?: (rowId: string) => void;
  expandedIds: Set<string>;
}

function TableRow({ row, level, visibleColumnKeys, onRowClick, onToggleExpand, expandedIds }: TableRowProps) {
  const isExpanded = expandedIds.has(row.id);
  const indentPx = level * 24;

  // Render a single cell based on column key
  const renderCell = (colKey: string, isLast: boolean) => {
    switch (colKey) {
      case 'objective':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <div 
              className="flex items-center gap-2 min-w-0"
              style={{ paddingLeft: `${indentPx}px` }}
            >
              {level === 0 && (
                <OkrThemeDot color={row.themeColor} themeName={row.themeName} size="md" />
              )}
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
                        "text-sm truncate max-w-[240px]",
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
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground truncate">{row.themeName || '—'}</span>
          </td>
        );

      case 'owner':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground truncate">{row.ownerName || '—'}</span>
          </td>
        );

      case 'status':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <OkrStatusPill status={row.status} size="sm" />
          </td>
        );

      case 'progress':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
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
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground">{formatDate(row.startDate)}</span>
          </td>
        );

      case 'dueDate':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground">{formatDate(row.dueDate)}</span>
          </td>
        );

      case 'risks':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
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
          <td key={colKey} className={cn("py-3 px-4", isLast && "text-right")} style={{ width: COLUMN_CONFIG[colKey].width }}>
            <OkrLinkedCell
              krCount={row.linkedKrCount}
              workItemCount={row.linkedWorkItemCount}
              itemType={level === 0 ? 'objective' : level === 1 ? 'keyResult' : 'workItem'}
            />
          </td>
        );

      default:
        return <td key={colKey} className="py-3 px-4">—</td>;
    }
  };

  return (
    <>
      <tr
        className={cn(
          'group cursor-pointer transition-colors hover:bg-[#fcfaf8] border-b border-border/40',
          level > 0 && 'bg-muted/20'
        )}
        onClick={() => onRowClick(row)}
      >
        {visibleColumnKeys.map((colKey, idx) => 
          renderCell(colKey, idx === visibleColumnKeys.length - 1)
        )}
      </tr>

      {/* Render children if expanded */}
      {isExpanded && row.children?.map((child) => (
        <TableRow
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
    // If no columns defined or all hidden, show default set
    if (visible.length === 0) {
      return ['objective', 'status', 'progress', 'risks', 'krs'];
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
    <div className="w-full bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          {/* Table Header - Dynamic based on visible columns */}
          <thead>
            <tr className="bg-[#faf7f1] border-b border-border">
              {visibleColumnKeys.map((colKey, idx) => (
                <th 
                  key={colKey}
                  className={cn(
                    "py-3.5 px-4 text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider",
                    idx === visibleColumnKeys.length - 1 ? "text-right" : "text-left"
                  )}
                  style={{ width: COLUMN_CONFIG[colKey]?.width || '100px' }}
                >
                  {COLUMN_CONFIG[colKey]?.label || colKey}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {rows.map((row) => (
              <TableRow
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
      </div>

      {/* Empty State */}
      {rows.length === 0 && (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          No objectives found
        </div>
      )}
    </div>
  );
}
