// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Strategy Tree Component (Proper Tabular View)
// HTML table structure with aligned columns and expandable hierarchy
// Respects column visibility from OKRColumnChooser
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import type { Theme, Objective, KeyResult, WorkItem, TreeItem } from '../../lib/okrTypes';
import type { OKRSmartFilters } from '../OKRSmartFiltersDialog';
import type { OKRColumn } from '../OKRColumnChooser';
import { 
  getObjectiveProgressBaseline, 
  getKeyResultProgressBaseline,
  getObjectiveRiskSummary,
  getKeyResultRiskSummary,
  getWorkItemRiskSummary,
} from '../../lib/okrMetrics';

// Shared presentational components
import { OkrStatusPill } from '../shared/OkrStatusPill';
import { OkrProgressCell } from '../shared/OkrProgressCell';
import { OkrRisksCell } from '../shared/OkrRisksCell';
import { OkrLinkedCell } from '../shared/OkrLinkedCell';
import { OkrThemeDot } from '../shared/OkrThemeDot';

interface StrategyTreeProps {
  themes: Theme[];
  selectedThemeIds: string[];
  expandedIds: string[];
  selectedItem: TreeItem | null;
  searchQuery: string;
  filters?: OKRSmartFilters;
  columns?: OKRColumn[];
  onToggle: (id: string) => void;
  onSelect: (item: TreeItem) => void;
}

// Column configuration with widths and labels
const COLUMN_CONFIG: Record<string, { label: string; width: string }> = {
  objective: { label: 'Theme', width: '320px' },
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
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// TABLE ROW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

interface TableRowProps {
  item: TreeItem;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  themeColor: string;
  themeName: string;
  expandedIds: string[];
  selectedItem: TreeItem | null;
  visibleColumnKeys: string[];
  onToggle: (id: string) => void;
  onSelect: (item: TreeItem) => void;
}

function TableRow({
  item,
  level,
  isExpanded,
  isSelected,
  hasChildren,
  themeColor,
  themeName,
  expandedIds,
  selectedItem,
  visibleColumnKeys,
  onToggle,
  onSelect,
}: TableRowProps) {
  const indentPx = level * 24;

  // Get progress baseline based on item type
  const getProgressBaseline = () => {
    if (item.type === 'objective') {
      return getObjectiveProgressBaseline(item as Objective);
    } else if (item.type === 'keyResult') {
      return getKeyResultProgressBaseline(item as KeyResult);
    }
    return {
      actual: item.progress ?? null,
      expected: null,
      variance: null,
      trend: 'none' as const,
    };
  };

  // Get risk summary based on item type
  const getRiskSummary = () => {
    if (item.type === 'objective') {
      return getObjectiveRiskSummary(item as Objective);
    } else if (item.type === 'keyResult') {
      return getKeyResultRiskSummary(item as KeyResult);
    }
    return getWorkItemRiskSummary(item as WorkItem);
  };

  // Calculate linked counts
  const getLinkedCounts = () => {
    if (item.type === 'objective') {
      const obj = item as Objective;
      const krCount = obj.keyResults?.length || 0;
      const workItemCount = (obj.keyResults || []).reduce(
        (sum, kr) => sum + (kr.workItems?.length || 0), 
        0
      );
      return { krCount, workItemCount };
    } else if (item.type === 'keyResult') {
      const kr = item as KeyResult;
      return { krCount: 0, workItemCount: kr.workItems?.length || 0 };
    }
    return { krCount: 0, workItemCount: 0 };
  };

  const baseline = getProgressBaseline();
  const riskSummary = getRiskSummary();
  const { krCount, workItemCount } = getLinkedCounts();

  // Get children for recursive rendering
  const getChildren = (): { item: TreeItem; hasChildren: boolean }[] => {
    if (item.type === 'objective') {
      const obj = item as Objective;
      return (obj.keyResults || []).map(kr => ({
        item: kr,
        hasChildren: (kr.workItems?.length || 0) > 0,
      }));
    } else if (item.type === 'keyResult') {
      const kr = item as KeyResult;
      return (kr.workItems || []).map(wi => ({
        item: wi,
        hasChildren: false,
      }));
    }
    return [];
  };

  const children = getChildren();

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
                <OkrThemeDot color={themeColor} themeName={themeName} size="md" />
              )}
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(item.id);
                  }}
                  className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="w-5 flex-shrink-0" />
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      "text-sm truncate max-w-[240px]",
                      level === 0 && "font-semibold text-foreground",
                      level === 1 && "text-foreground",
                      level === 2 && "italic text-muted-foreground"
                    )}>
                      {item.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-md">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {level === 0 && (
                <span className="text-xs text-muted-foreground ml-1 truncate hidden lg:inline">
                  {themeName}
                </span>
              )}
            </div>
          </td>
        );

      case 'theme':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground truncate">{themeName || '—'}</span>
          </td>
        );

      case 'owner':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground truncate">
              {(item as any).ownerName || '—'}
            </span>
          </td>
        );

      case 'status':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <OkrStatusPill status={item.status} size="sm" />
          </td>
        );

      case 'progress':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            {baseline.actual === null ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              <OkrProgressCell baseline={baseline} status={item.status} compact />
            )}
          </td>
        );

      case 'startDate':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground">
              {formatDate((item as any).startDate)}
            </span>
          </td>
        );

      case 'dueDate':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <span className="text-sm text-muted-foreground">
              {formatDate((item as any).dueDate)}
            </span>
          </td>
        );

      case 'risks':
        return (
          <td key={colKey} className="py-3 px-4" style={{ width: COLUMN_CONFIG[colKey].width }}>
            <OkrRisksCell summary={riskSummary} compact />
          </td>
        );

      case 'krs':
        return (
          <td key={colKey} className={cn("py-3 px-4", isLast && "text-right")} style={{ width: COLUMN_CONFIG[colKey].width }}>
            <OkrLinkedCell
              krCount={krCount}
              workItemCount={workItemCount}
              itemType={item.type as 'objective' | 'keyResult' | 'workItem'}
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
        onClick={() => onSelect(item)}
        className={cn(
          'group cursor-pointer transition-colors border-b border-border/40',
          isSelected ? 'bg-brand-gold/5' : 'hover:bg-[#fcfaf8]',
          level > 0 && 'bg-muted/20'
        )}
        style={{
          borderLeft: isSelected ? `3px solid ${themeColor}` : '3px solid transparent',
        }}
      >
        {visibleColumnKeys.map((colKey, idx) => 
          renderCell(colKey, idx === visibleColumnKeys.length - 1)
        )}
      </tr>

      {/* Render children if expanded */}
      {isExpanded && children.map(({ item: childItem, hasChildren: childHasChildren }) => (
        <TableRow
          key={childItem.id}
          item={childItem}
          level={level + 1}
          isExpanded={expandedIds.includes(childItem.id)}
          isSelected={selectedItem?.id === childItem.id}
          hasChildren={childHasChildren}
          themeColor={themeColor}
          themeName={themeName}
          expandedIds={expandedIds}
          selectedItem={selectedItem}
          visibleColumnKeys={visibleColumnKeys}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN STRATEGY TREE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export function StrategyTree({
  themes,
  selectedThemeIds,
  expandedIds,
  selectedItem,
  searchQuery,
  filters = {},
  columns = [],
  onToggle,
  onSelect,
}: StrategyTreeProps) {
  // Compute visible column keys from the columns prop
  const visibleColumnKeys = useMemo(() => {
    const visible = columns.filter(c => c.visible).map(c => c.key);
    // If no columns defined or all hidden, show default set
    if (visible.length === 0) {
      return ['objective', 'status', 'progress', 'risks', 'krs'];
    }
    return visible;
  }, [columns]);

  // Build flat list of objectives from themes, respecting theme filter and smart filters
  const filteredObjectives = useMemo(() => {
    let filteredThemes = themes;
    if (selectedThemeIds.length > 0) {
      filteredThemes = themes.filter((t) => selectedThemeIds.includes(t.id));
    }

    let objectivesWithTheme: Array<{
      objective: Objective;
      themeColor: string;
      themeName: string;
      themeId: string;
    }> = [];

    filteredThemes.forEach((theme) => {
      theme.objectives?.forEach((obj) => {
        objectivesWithTheme.push({
          objective: obj,
          themeColor: theme.color || 'hsl(var(--brand-gold))',
          themeName: theme.name,
          themeId: theme.id,
        });
      });
    });

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      objectivesWithTheme = objectivesWithTheme.filter(({ objective }) => {
        if (objective.name.toLowerCase().includes(query)) return true;
        return objective.keyResults?.some((kr) => {
          if (kr.name.toLowerCase().includes(query)) return true;
          return kr.workItems?.some((wi) => wi.name.toLowerCase().includes(query));
        });
      });
    }

    // Apply smart filters
    if (filters.themeIds && filters.themeIds.length > 0) {
      objectivesWithTheme = objectivesWithTheme.filter(({ themeId }) =>
        filters.themeIds!.includes(themeId)
      );
    }

    if (filters.status && filters.status.length > 0) {
      objectivesWithTheme = objectivesWithTheme.filter(({ objective }) =>
        filters.status!.includes(objective.status as any)
      );
    }

    if (filters.ownerIds && filters.ownerIds.length > 0) {
      objectivesWithTheme = objectivesWithTheme.filter(({ objective }) =>
        objective.ownerId && filters.ownerIds!.includes(objective.ownerId)
      );
    }

    if (filters.progressMin !== undefined) {
      objectivesWithTheme = objectivesWithTheme.filter(({ objective }) =>
        objective.progress >= filters.progressMin!
      );
    }

    if (filters.progressMax !== undefined) {
      objectivesWithTheme = objectivesWithTheme.filter(({ objective }) =>
        objective.progress <= filters.progressMax!
      );
    }

    if (filters.startDateFrom) {
      objectivesWithTheme = objectivesWithTheme.filter(({ objective }) =>
        objective.startDate && new Date(objective.startDate) >= filters.startDateFrom!
      );
    }

    if (filters.startDateTo) {
      objectivesWithTheme = objectivesWithTheme.filter(({ objective }) =>
        objective.startDate && new Date(objective.startDate) <= filters.startDateTo!
      );
    }

    if (filters.dueDateFrom) {
      objectivesWithTheme = objectivesWithTheme.filter(({ objective }) =>
        objective.dueDate && new Date(objective.dueDate) >= filters.dueDateFrom!
      );
    }

    if (filters.dueDateTo) {
      objectivesWithTheme = objectivesWithTheme.filter(({ objective }) =>
        objective.dueDate && new Date(objective.dueDate) <= filters.dueDateTo!
      );
    }

    return objectivesWithTheme;
  }, [themes, selectedThemeIds, searchQuery, filters]);

  return (
    <div className="flex-1 flex flex-col bg-card overflow-hidden">
      <div className="overflow-x-auto flex-1">
        <table className="w-full min-w-[800px]">
          {/* Table Header - Dynamic based on visible columns */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#faf7f1] border-b-2 border-border">
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
            {filteredObjectives.map(({ objective, themeColor, themeName }) => (
              <TableRow
                key={objective.id}
                item={objective}
                level={0}
                isExpanded={expandedIds.includes(objective.id)}
                isSelected={selectedItem?.id === objective.id}
                hasChildren={(objective.keyResults?.length || 0) > 0}
                themeColor={themeColor}
                themeName={themeName}
                expandedIds={expandedIds}
                selectedItem={selectedItem}
                visibleColumnKeys={visibleColumnKeys}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredObjectives.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No objectives found
          </div>
        )}
      </div>
    </div>
  );
}
