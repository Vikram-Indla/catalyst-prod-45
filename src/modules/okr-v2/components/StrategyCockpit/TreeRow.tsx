// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Tree Row Component
// Expandable row for Theme/Objective/KR/WorkItem hierarchy
// ═══════════════════════════════════════════════════════════════════════════════

import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { TreeItem, StatusCode, OkrRiskSummary } from '../../lib/okrTypes';
import { getStatusLabel, getTotalRiskCount, calculateRiskScore } from '../../lib/okrMetrics';

interface TreeRowProps {
  item: TreeItem;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggle: (id: string) => void;
  onSelect: (item: TreeItem) => void;
  themeColor?: string;
}

const TYPE_ICONS: Record<string, string> = {
  theme: '◉',
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
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const hasHigh = (risks.high || 0) > 0;
  return (
    <Badge
      variant={hasHigh ? 'destructive' : 'secondary'}
      className="text-xs font-medium"
    >
      {total} risk{total !== 1 ? 's' : ''}
    </Badge>
  );
}

function LinkedChip({ item }: { item: TreeItem }) {
  let label: string | null = null;
  if (item.type === 'theme' && 'objectives' in item) {
    label = `${item.objectives?.length || 0} obj`;
  } else if (item.type === 'objective' && 'keyResults' in item) {
    label = `${item.keyResults?.length || 0} KRs`;
  } else if (item.type === 'keyResult' && 'workItems' in item) {
    label = `${item.workItems?.length || 0} epics`;
  }

  if (!label) return null;

  return (
    <Badge variant="outline" className="text-xs font-medium">
      {label}
    </Badge>
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
}: TreeRowProps) {
  const indentPx = level * 24;

  return (
    <div
      onClick={() => onSelect(item)}
      className={cn(
        "grid items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-border/50",
        "grid-cols-[1fr_100px_120px_90px_80px]",
        isSelected
          ? "bg-brand-gold/5 border-l-[3px]"
          : "border-l-[3px] border-l-transparent hover:bg-muted/50"
      )}
      style={{
        borderLeftColor: isSelected ? themeColor : 'transparent',
      }}
    >
      {/* Label Column */}
      <div className="flex items-center gap-2" style={{ paddingLeft: `${indentPx}px` }}>
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.id);
            }}
            className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <span
          className={cn(
            item.type === 'theme' ? 'text-base font-semibold' : 'text-sm'
          )}
          style={{ color: themeColor }}
        >
          {TYPE_ICONS[item.type] || '•'}
        </span>

        <span
          className={cn(
            "text-sm truncate text-foreground",
            item.type === 'theme' && 'font-semibold',
            item.type === 'objective' && 'font-medium'
          )}
        >
          {item.name}
        </span>
      </div>

      {/* Status Column */}
      <div>
        <Badge variant={getStatusVariant(item.status)} className="text-xs capitalize">
          {getStatusLabel(item.status)}
        </Badge>
      </div>

      {/* Progress Column */}
      <div className="flex items-center gap-2">
        <Progress value={Math.min(item.progress, 100)} className="h-2 flex-1" />
        <span className="text-xs font-semibold text-muted-foreground w-8 text-right">
          {item.progress}%
        </span>
      </div>

      {/* Risks Column */}
      <div>
        <RiskChip risks={item.risks} />
      </div>

      {/* Linked Column */}
      <div>
        <LinkedChip item={item} />
      </div>
    </div>
  );
}
