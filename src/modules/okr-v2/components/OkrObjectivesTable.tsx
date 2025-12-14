// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST OKR OBJECTIVES TABLE — Presentational Component (V1)
// Enterprise-grade table with brand tokens, baseline progress, and risk indicators
// Uses shared components for visual parity with V2 Strategy Cockpit
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
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
}

interface OkrObjectivesTableProps {
  rows: OkrObjectiveRow[];
  onRowClick: (row: OkrObjectiveRow) => void;
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN TABLE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

const GRID_COLUMNS = 'minmax(0, 1.7fr) 0.9fr 1.1fr 0.9fr 0.9fr';

export function OkrObjectivesTable({ rows, onRowClick }: OkrObjectivesTableProps) {
  return (
    <div className="w-full bg-card rounded-xl border border-border overflow-hidden">
      {/* Header Row */}
      <div
        className="grid items-center px-4 py-3 bg-muted/50 border-b-2 border-border"
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
            onClick={() => onRowClick(row)}
            className={cn(
              'grid items-center px-4 py-3 min-h-[48px] bg-card cursor-pointer transition-colors hover:bg-muted/30',
              index !== rows.length - 1 && 'border-b border-border/50'
            )}
            style={{ gridTemplateColumns: GRID_COLUMNS }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick(row);
              }
            }}
          >
            {/* OKRs Column */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Theme color dot using shared component */}
              <OkrThemeDot 
                color={row.themeColor} 
                themeName={row.themeName} 
                size="md" 
                showGlow 
              />

              {/* Chevron */}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

              {/* Text content */}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm font-medium text-foreground truncate leading-tight">
                        {row.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
                      <p>{row.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-[11px] text-muted-foreground truncate">
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
