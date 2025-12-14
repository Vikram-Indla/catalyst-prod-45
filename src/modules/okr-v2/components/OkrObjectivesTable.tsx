// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST OKR OBJECTIVES TABLE — Presentational Component (V1)
// Executive-grade table with Catalyst brand colors matching the OKR design spec
// ═══════════════════════════════════════════════════════════════════════════════

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
  status: string;
  progressActual: number | null;
  progressTrend: TrendCode;
  progressVariance: number | null;
  hasBaseline: boolean;
  highRiskCount: number;
  mediumRiskCount: number;
  blockedWorkCount: number;
  delayedWorkCount: number;
  linkedKrCount: number;
  linkedWorkItemCount: number;
  isExpanded?: boolean;
  hasChildren?: boolean;
}

interface OkrObjectivesTableProps {
  rows: OkrObjectiveRow[];
  onRowClick: (row: OkrObjectiveRow) => void;
  onToggleExpand?: (rowId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN TABLE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

const GRID_COLUMNS = 'minmax(0, 1.8fr) 120px minmax(180px, 1fr) 140px 120px';

export function OkrObjectivesTable({ rows, onRowClick, onToggleExpand }: OkrObjectivesTableProps) {
  return (
    <div className="w-full bg-card rounded-xl border border-border overflow-hidden">
      {/* Header Row */}
      <div
        className="grid items-center px-5 py-3.5 bg-[#faf7f1] border-b border-border"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider">
          OKRs
        </span>
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider text-center">
          Status
        </span>
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider text-right">
          Progress vs Plan
        </span>
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider text-right">
          Risks
        </span>
        <span className="text-[11px] font-semibold text-secondary-bronze uppercase tracking-wider text-right">
          Linked
        </span>
      </div>

      {/* Data Rows */}
      <div>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={cn(
              'grid items-center px-5 py-4 min-h-[64px] bg-card cursor-pointer transition-colors hover:bg-[#fcfaf8]',
              index !== rows.length - 1 && 'border-b border-border/50'
            )}
            style={{ gridTemplateColumns: GRID_COLUMNS }}
          >
            {/* OKRs Column */}
            <div 
              className="flex items-center gap-2.5 min-w-0"
              onClick={() => onRowClick(row)}
            >
              {/* Theme color dot */}
              <OkrThemeDot 
                color={row.themeColor} 
                themeName={row.themeName} 
                size="md"
              />

              {/* Expand/Collapse Chevron */}
              {row.hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand?.(row.id);
                  }}
                  className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  {row.isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}

              {/* Text content */}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm font-semibold text-foreground truncate leading-tight">
                        {row.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
                      <p>{row.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-xs text-muted-foreground truncate">
                  ({row.themeName})
                </span>
              </div>
            </div>

            {/* Status Column */}
            <div className="flex items-center justify-center">
              <OkrStatusPill status={row.status} />
            </div>

            {/* Progress vs Plan Column */}
            <div className="flex items-center justify-end">
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
                />
              )}
            </div>

            {/* Risks Column */}
            <div className="flex items-center justify-end">
              <OkrRisksCell
                summary={{
                  highRiskCount: row.highRiskCount,
                  mediumRiskCount: row.mediumRiskCount,
                  blockedWorkCount: row.blockedWorkCount,
                  delayedWorkCount: row.delayedWorkCount,
                }}
              />
            </div>

            {/* Linked Column */}
            <div className="flex items-center justify-end">
              <OkrLinkedCell
                krCount={row.linkedKrCount}
                workItemCount={row.linkedWorkItemCount}
              />
            </div>
          </div>
        ))}
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
