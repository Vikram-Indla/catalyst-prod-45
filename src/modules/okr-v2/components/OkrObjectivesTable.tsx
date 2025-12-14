// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST OKR OBJECTIVES TABLE — Proper Tabular View (V1)
// HTML table structure with aligned columns and expandable hierarchy
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TrendCode } from '../lib/okrTypes';

// Shared presentational components
import { OkrStatusPill } from './shared/OkrStatusPill';
import { OkrProgressCell } from './shared/OkrProgressCell';
import { OkrRisksCell } from './shared/OkrRisksCell';
import { OkrLinkedCell } from './shared/OkrLinkedCell';
import { OkrThemeDot } from './shared/OkrThemeDot';

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
  level?: number; // 0=objective, 1=KR, 2=work item
  children?: OkrObjectiveRow[];
}

interface OkrObjectivesTableProps {
  rows: OkrObjectiveRow[];
  onRowClick: (row: OkrObjectiveRow) => void;
  onToggleExpand?: (rowId: string) => void;
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
// TABLE ROW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

interface TableRowProps {
  row: OkrObjectiveRow;
  level: number;
  onRowClick: (row: OkrObjectiveRow) => void;
  onToggleExpand?: (rowId: string) => void;
  expandedIds: Set<string>;
}

function TableRow({ row, level, onRowClick, onToggleExpand, expandedIds }: TableRowProps) {
  const isExpanded = expandedIds.has(row.id);
  const indentPx = level * 24;

  return (
    <>
      <tr
        className={cn(
          'group cursor-pointer transition-colors hover:bg-[#fcfaf8] border-b border-border/40',
          level > 0 && 'bg-muted/20'
        )}
        onClick={() => onRowClick(row)}
      >
        {/* THEME/OKR Column */}
        <td className="py-3 px-4">
          <div 
            className="flex items-center gap-2 min-w-0"
            style={{ paddingLeft: `${indentPx}px` }}
          >
            {/* Theme dot for objectives */}
            {level === 0 && (
              <OkrThemeDot 
                color={row.themeColor} 
                themeName={row.themeName} 
                size="md"
              />
            )}

            {/* Expand/Collapse Chevron */}
            {row.hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand?.(row.id);
                }}
                className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-5 flex-shrink-0" />
            )}

            {/* Name */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "text-sm truncate max-w-[280px]",
                    level === 0 && "font-semibold text-foreground",
                    level === 1 && "text-foreground",
                    level === 2 && "italic text-muted-foreground"
                  )}>
                    {row.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md">
                  <p>{row.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Theme name for objectives */}
            {level === 0 && (
              <span className="text-xs text-muted-foreground ml-1 truncate hidden lg:inline">
                {row.themeName}
              </span>
            )}
          </div>
        </td>

        {/* OWNER Column */}
        <td className="py-3 px-4">
          <span className="text-sm text-muted-foreground truncate">
            {row.ownerName || '—'}
          </span>
        </td>

        {/* STATUS Column */}
        <td className="py-3 px-4">
          <OkrStatusPill status={row.status} size="sm" />
        </td>

        {/* PROGRESS VS PLAN Column */}
        <td className="py-3 px-4">
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

        {/* START DATE Column */}
        <td className="py-3 px-4">
          <span className="text-sm text-muted-foreground">
            {formatDate(row.startDate)}
          </span>
        </td>

        {/* DUE DATE Column */}
        <td className="py-3 px-4">
          <span className="text-sm text-muted-foreground">
            {formatDate(row.dueDate)}
          </span>
        </td>

        {/* RISKS Column */}
        <td className="py-3 px-4">
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

        {/* LINKED Column */}
        <td className="py-3 px-4 text-right">
          <OkrLinkedCell
            krCount={row.linkedKrCount}
            workItemCount={row.linkedWorkItemCount}
            itemType={level === 0 ? 'objective' : level === 1 ? 'keyResult' : 'workItem'}
          />
        </td>
      </tr>

      {/* Render children if expanded */}
      {isExpanded && row.children?.map((child) => (
        <TableRow
          key={child.id}
          row={child}
          level={level + 1}
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

export function OkrObjectivesTable({ rows, onRowClick, onToggleExpand }: OkrObjectivesTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
        <table className="w-full min-w-[900px]">
          {/* Table Header */}
          <thead>
            <tr className="bg-[#faf7f1] border-b border-border">
              <th className="py-3.5 px-4 text-left text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider w-[320px]">
                Theme
              </th>
              <th className="py-3.5 px-4 text-left text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider w-[120px]">
                Owner
              </th>
              <th className="py-3.5 px-4 text-left text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider w-[100px]">
                Status
              </th>
              <th className="py-3.5 px-4 text-left text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider w-[180px]">
                Progress vs Plan
              </th>
              <th className="py-3.5 px-4 text-left text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider w-[110px]">
                Start Date
              </th>
              <th className="py-3.5 px-4 text-left text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider w-[110px]">
                Due Date
              </th>
              <th className="py-3.5 px-4 text-left text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider w-[100px]">
                Risks
              </th>
              <th className="py-3.5 px-4 text-right text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider w-[120px]">
                Linked
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                row={row}
                level={row.level ?? 0}
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
