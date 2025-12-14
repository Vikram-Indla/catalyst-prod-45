// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Tree Row Component
// Expandable row for Objective/KR/WorkItem hierarchy with baseline progress & trend
// ═══════════════════════════════════════════════════════════════════════════════

import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TreeItem, StatusCode, OkrRiskSummary, Objective, KeyResult } from '../../lib/okrTypes';
import { 
  getStatusLabel, 
  getTotalRiskCount,
  getObjectiveProgressBaseline,
  getKeyResultProgressBaseline,
} from '../../lib/okrMetrics';
import { TrendIcon } from '../TrendIcon';

// Shared grid columns constant - must match StrategyTree header
const GRID_COLUMNS = "1fr 120px 160px 100px 100px";

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
}

const TYPE_ICONS: Record<string, string> = {
  objective: '▸',
  keyResult: '•',
  workItem: '↳',
};

function getStatusVariant(status: StatusCode): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'on-track':
    case 'in-progress':
      return 'secondary';
    case 'at-risk':
    case 'off-track':
    case 'blocked':
      return 'destructive';
    default:
      return 'outline';
  }
}

function RiskChip({ risks }: { risks: OkrRiskSummary }) {
  const total = getTotalRiskCount(risks);
  if (total === 0) {
    return <span className="text-xs text-muted-foreground text-right">—</span>;
  }

  // Compact format: "2H / 1M" or just "3H"
  const parts: string[] = [];
  if (risks.high > 0) parts.push(`${risks.high}H`);
  if (risks.medium > 0) parts.push(`${risks.medium}M`);
  if (risks.low > 0) parts.push(`${risks.low}L`);

  const hasHigh = (risks.high || 0) > 0;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            'text-xs font-medium whitespace-nowrap text-right block',
            hasHigh ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {parts.join(' / ')}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>High: {risks.high}, Medium: {risks.medium}, Low: {risks.low}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function LinkedChip({ item }: { item: TreeItem }) {
  let label: string | null = null;
  if (item.type === 'objective' && 'keyResults' in item) {
    label = `${item.keyResults?.length || 0} KRs`;
  } else if (item.type === 'keyResult' && 'workItems' in item) {
    label = `${item.workItems?.length || 0} items`;
  }

  if (!label) return null;

  return (
    <Badge variant="outline" className="text-xs font-medium whitespace-nowrap">
      {label}
    </Badge>
  );
}

function ProgressWithTrend({ item }: { item: TreeItem }) {
  // Calculate baseline and trend based on item type
  let actual = item.progress;
  let trend: 'ahead' | 'on-plan' | 'behind' | 'none' = 'none';
  let variance: number | null = null;

  if (item.type === 'objective') {
    const baseline = getObjectiveProgressBaseline(item as Objective);
    actual = baseline.actual;
    trend = baseline.trend;
    variance = baseline.variance;
  } else if (item.type === 'keyResult') {
    const baseline = getKeyResultProgressBaseline(item as KeyResult);
    actual = baseline.actual;
    trend = baseline.trend;
    variance = baseline.variance;
  }

  // Only show dash if actual is null/undefined (not just 0)
  if (actual == null) {
    return <span className="text-xs text-muted-foreground text-right block">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-2 overflow-hidden">
      <Progress value={Math.min(actual, 100)} className="h-2 flex-1 min-w-0 max-w-20" />
      <span className="text-xs font-semibold text-foreground flex-shrink-0 w-8 text-right">
        {Math.round(actual)}%
      </span>
      {trend !== 'none' && <TrendIcon trend={trend} variance={variance} size="sm" />}
    </div>
  );
}

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
}: TreeRowProps) {
  const indentPx = INDENT_PX[level] ?? level * 24;

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
        gridTemplateColumns: GRID_COLUMNS,
        borderLeftColor: isSelected ? themeColor : 'transparent',
        padding: '8px 12px',
      }}
    >
      {/* Label Column - indentation applied inside this column only */}
      <div
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

        {/* Theme color dot for objectives */}
        {item.type === 'objective' && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: themeColor }}
            title={themeName}
          />
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

      {/* Status Column */}
      <div className="overflow-hidden whitespace-nowrap">
        <Badge variant="outline" className="text-xs capitalize">
          {getStatusLabel(item.status)}
        </Badge>
      </div>

      {/* Progress Column with Trend - right-aligned */}
      <div className="overflow-hidden">
        <ProgressWithTrend item={item} />
      </div>

      {/* Risks Column - right-aligned */}
      <div className="overflow-hidden whitespace-nowrap text-right">
        <RiskChip risks={item.risks} />
      </div>

      {/* Linked Column */}
      <div className="overflow-hidden whitespace-nowrap text-right">
        <LinkedChip item={item} />
      </div>
    </div>
  );
}