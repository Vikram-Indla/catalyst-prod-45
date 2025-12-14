// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Tree Row Component
// Expandable row for Objective/KR/WorkItem hierarchy with baseline progress & trend
// Uses shared presentational components for visual parity with V1
// ═══════════════════════════════════════════════════════════════════════════════

import { ChevronDown, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TreeItem, Objective, KeyResult, WorkItem } from '../../lib/okrTypes';
import { 
  getObjectiveProgressBaseline,
  getKeyResultProgressBaseline,
  getObjectiveRiskSummary,
  getKeyResultRiskSummary,
  getWorkItemRiskSummary,
} from '../../lib/okrMetrics';
import { format } from 'date-fns';

// Shared presentational components
import { OkrStatusPill } from '../shared/OkrStatusPill';
import { OkrProgressCell } from '../shared/OkrProgressCell';
import { OkrRisksCell } from '../shared/OkrRisksCell';
import { OkrLinkedCell } from '../shared/OkrLinkedCell';
import { OkrThemeDot } from '../shared/OkrThemeDot';

// Indentation per level (inside first column only)
const INDENT_PX: Record<number, number> = {
  0: 0,   // Objective
  1: 24,  // Key Result
  2: 48,  // Work Item
};

interface TreeRowProps {
  item: TreeItem;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggle: (id: string) => void;
  onSelect: (item: TreeItem) => void;
  themeColor?: string;
  themeName?: string;
  visibleColumns: string[];
  gridTemplateColumns: string;
}

const TYPE_ICONS: Record<string, string> = {
  objective: '▸',
  keyResult: '•',
  workItem: '↳',
};

export function TreeRow({
  item,
  level,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle,
  onSelect,
  themeColor = 'hsl(var(--brand-gold))',
  themeName,
  visibleColumns,
  gridTemplateColumns,
}: TreeRowProps) {
  const indentPx = INDENT_PX[level] ?? level * 24;

  // Get baseline and risk summary based on item type
  const getProgressBaseline = () => {
    if (item.type === 'objective') {
      return getObjectiveProgressBaseline(item as Objective);
    } else if (item.type === 'keyResult') {
      return getKeyResultProgressBaseline(item as KeyResult);
    }
    // Work items: simple progress, no baseline trend
    return {
      actual: item.progress ?? null,
      expected: null,
      variance: null,
      trend: 'none' as const,
    };
  };

  const getRiskSummary = () => {
    if (item.type === 'objective') {
      return getObjectiveRiskSummary(item as Objective);
    } else if (item.type === 'keyResult') {
      return getKeyResultRiskSummary(item as KeyResult);
    }
    return getWorkItemRiskSummary(item as WorkItem);
  };

  const baseline = getProgressBaseline();
  const riskSummary = getRiskSummary();

  // Render a column cell based on column key
  const renderColumn = (colKey: string, isLast: boolean) => {
    switch (colKey) {
      case 'objective':
        return (
          <div
            key={colKey}
            className="flex items-center gap-2 min-w-0 overflow-hidden"
            style={{ paddingLeft: `${indentPx}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(item.id);
                }}
                className="flex items-center justify-center w-5 h-5 flex-shrink-0 text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-5 flex-shrink-0" />
            )}

            {/* Theme color dot for objectives using shared component */}
            {item.type === 'objective' && (
              <OkrThemeDot color={themeColor} themeName={themeName} size="md" />
            )}

            {/* Type icon */}
            <span
              className={cn(
                "text-sm flex-shrink-0",
                item.type === 'workItem' && 'text-muted-foreground italic'
              )}
              style={{ color: item.type !== 'workItem' ? themeColor : undefined }}
            >
              {TYPE_ICONS[item.type] || '•'}
            </span>

            {/* Item name with tooltip for truncated text */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "text-sm truncate",
                      item.type === 'objective' && 'font-medium text-foreground',
                      item.type === 'keyResult' && 'text-foreground',
                      item.type === 'workItem' && 'italic text-muted-foreground'
                    )}
                  >
                    {item.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md">
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );

      case 'theme':
        return (
          <div key={colKey} className="overflow-hidden whitespace-nowrap">
            <span className="text-xs text-muted-foreground truncate">{themeName || '—'}</span>
          </div>
        );

      case 'owner':
        return (
          <div key={colKey} className="overflow-hidden whitespace-nowrap">
            <span className="text-xs text-muted-foreground truncate">
              {(item as any).ownerName || '—'}
            </span>
          </div>
        );

      case 'status':
        return (
          <div key={colKey} className="overflow-hidden whitespace-nowrap">
            <OkrStatusPill status={item.status} size="sm" />
          </div>
        );

      case 'progress':
        return (
          <div key={colKey} className="overflow-hidden">
            <OkrProgressCell baseline={baseline} compact />
          </div>
        );

      case 'startDate':
        const startDate = (item as any).startDate;
        return (
          <div key={colKey} className="overflow-hidden whitespace-nowrap">
            <span className="text-xs text-muted-foreground">
              {startDate ? format(new Date(startDate), 'MMM d, yyyy') : '—'}
            </span>
          </div>
        );

      case 'dueDate':
        const dueDate = (item as any).dueDate;
        return (
          <div key={colKey} className="overflow-hidden whitespace-nowrap">
            <span className="text-xs text-muted-foreground">
              {dueDate ? format(new Date(dueDate), 'MMM d, yyyy') : '—'}
            </span>
          </div>
        );

      case 'risks':
        return (
          <div key={colKey} className="overflow-hidden whitespace-nowrap text-right">
            <OkrRisksCell summary={riskSummary} compact />
          </div>
        );

      case 'krs':
        const krCount = item.type === 'objective' ? ((item as Objective).keyResults?.length || 0) : 0;
        const workItemCount = item.type === 'objective' 
          ? ((item as Objective).keyResults || []).reduce((sum, kr) => sum + (kr.workItems?.length || 0), 0)
          : item.type === 'keyResult'
            ? ((item as KeyResult).workItems?.length || 0)
            : 0;
        
        return (
          <div key={colKey} className={cn("overflow-hidden whitespace-nowrap", isLast && "text-right")}>
            <OkrLinkedCell 
              krCount={krCount} 
              workItemCount={workItemCount}
              itemType={item.type as 'objective' | 'keyResult' | 'workItem'}
            />
          </div>
        );

      default:
        return <div key={colKey} className="overflow-hidden">—</div>;
    }
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className={cn(
        "grid items-center cursor-pointer transition-colors border-b border-border/40",
        isSelected
          ? "bg-brand-gold/5 border-l-[3px]"
          : "border-l-[3px] border-l-transparent hover:bg-muted/50"
      )}
      style={{
        gridTemplateColumns: gridTemplateColumns,
        borderLeftColor: isSelected ? themeColor : 'transparent',
        padding: '8px 12px',
      }}
    >
      {visibleColumns.map((colKey, idx) => 
        renderColumn(colKey, idx === visibleColumns.length - 1)
      )}
    </div>
  );
}
