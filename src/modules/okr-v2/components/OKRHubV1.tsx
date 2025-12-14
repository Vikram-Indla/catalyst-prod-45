// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V1 — Objectives List View with Baseline Progress & Smart Filters
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, User, Filter, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useOKRStrategicData } from '../hooks/useOKRStrategicData';
import {
  getStatusLabel,
  getStatusColor,
  getObjectiveProgressBaseline,
  getKeyResultProgressBaseline,
  getTotalRiskCount,
  aggregateRisks,
} from '../lib/okrMetrics';
import type { Objective, KeyResult, Theme, StatusCode, OkrRiskSummary } from '../lib/okrTypes';
import { ObjectiveDrawerV2 } from './ObjectiveDrawerV2';
import { TrendIcon } from './TrendIcon';
import { OKRColumnChooser, DEFAULT_OKR_COLUMNS, type OKRColumn } from './OKRColumnChooser';
import { OKRSmartFiltersDialog, OKRSmartFilters, countActiveFilters } from './OKRSmartFiltersDialog';
import { format } from 'date-fns';

interface OKRHubV1Props {
  snapshotId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// GRID COLUMN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────────

function buildGridColumns(columns: OKRColumn[]): string {
  const visible = columns.filter(c => c.visible);
  const widths: Record<string, string> = {
    objective: '1.5fr',
    theme: '0.8fr',
    owner: '0.8fr',
    status: '0.7fr',
    progress: '1fr',
    startDate: '0.7fr',
    dueDate: '0.7fr',
    risks: '0.6fr',
    krs: '0.5fr',
  };
  return visible.map(col => widths[col.key] || '0.8fr').join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusCode }) {
  const color = getStatusColor(status);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap"
      style={{
        backgroundColor: `${color}10`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      {getStatusLabel(status)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// RISKS DISPLAY
// ─────────────────────────────────────────────────────────────────────────────────

function RisksDisplay({ risks }: { risks: OkrRiskSummary }) {
  const total = getTotalRiskCount(risks);
  
  if (total === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  
  const parts: string[] = [];
  if (risks.high > 0) parts.push(`${risks.high}H`);
  if (risks.medium > 0) parts.push(`${risks.medium}M`);
  if (risks.low > 0) parts.push(`${risks.low}L`);
  
  const hasHigh = risks.high > 0;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            'text-xs font-medium',
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

// ─────────────────────────────────────────────────────────────────────────────────
// PROGRESS WITH TREND
// ─────────────────────────────────────────────────────────────────────────────────

function ProgressWithTrend({ actual, trend, variance }: { 
  actual: number; 
  trend: 'ahead' | 'on-plan' | 'behind' | 'none';
  variance: number | null;
}) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <Progress value={Math.min(actual, 100)} className="h-1.5 flex-1 max-w-16" />
      <span className="text-xs font-medium text-foreground w-8 text-right">
        {Math.round(actual)}%
      </span>
      {trend !== 'none' && <TrendIcon trend={trend} variance={variance} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// KEY RESULT ROW
// ─────────────────────────────────────────────────────────────────────────────────

interface KeyResultRowProps {
  kr: KeyResult;
  columns: OKRColumn[];
  gridColumns: string;
}

function KeyResultRow({ kr, columns, gridColumns }: KeyResultRowProps) {
  const baseline = getKeyResultProgressBaseline(kr);
  const visibleCols = columns.filter(c => c.visible);

  const renderCell = (key: string) => {
    switch (key) {
      case 'objective':
        return (
          <div className="flex items-center gap-2 min-w-0 overflow-hidden pl-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold flex-shrink-0" />
            <span className="truncate text-sm text-muted-foreground">{kr.name}</span>
          </div>
        );
      case 'theme':
        return <span className="text-xs text-muted-foreground">—</span>;
      case 'owner':
        return kr.ownerName ? (
          <div className="flex items-center gap-1.5 overflow-hidden">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-xs text-muted-foreground">{kr.ownerName}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case 'status':
        return <StatusBadge status={kr.status} />;
      case 'progress':
        return (
          <ProgressWithTrend 
            actual={baseline.actual} 
            trend={baseline.trend} 
            variance={baseline.variance} 
          />
        );
      case 'startDate':
        return <span className="text-xs text-muted-foreground">—</span>;
      case 'dueDate':
        return kr.dueDate ? (
          <span className="text-xs text-muted-foreground">
            {format(new Date(kr.dueDate), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case 'risks':
        return <RisksDisplay risks={kr.risks} />;
      case 'krs':
        return (
          <span className="text-xs text-muted-foreground text-center">
            {kr.workItems?.length || 0} items
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="grid items-center bg-muted/30 border-b border-border/50 hover:bg-muted/50 transition-colors py-2 px-3"
      style={{ gridTemplateColumns: gridColumns }}
    >
      {visibleCols.map(col => (
        <div key={col.key} className="overflow-hidden">
          {renderCell(col.key)}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// OBJECTIVE ROW
// ─────────────────────────────────────────────────────────────────────────────────

interface ObjectiveRowProps {
  objective: Objective;
  theme?: Theme;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  columns: OKRColumn[];
  gridColumns: string;
}

function ObjectiveRow({
  objective,
  theme,
  isExpanded,
  onToggle,
  onSelect,
  columns,
  gridColumns,
}: ObjectiveRowProps) {
  const themeColor = theme?.color || 'hsl(var(--brand-gold))';
  const krCount = objective.keyResults?.length || 0;
  const baseline = getObjectiveProgressBaseline(objective);
  const aggregatedRisks = aggregateRisks(objective.keyResults || []);
  const visibleCols = columns.filter(c => c.visible);

  const renderCell = (key: string) => {
    switch (key) {
      case 'objective':
        return (
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="p-0.5 hover:bg-muted rounded flex-shrink-0"
            >
              {krCount > 0 ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: themeColor }}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate text-sm font-medium text-foreground">
                    {objective.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md">
                  <p>{objective.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      case 'theme':
        return theme ? (
          <span
            className="text-xs px-1.5 py-0.5 rounded truncate inline-block max-w-full"
            style={{
              backgroundColor: `${themeColor}15`,
              color: themeColor,
            }}
          >
            {theme.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case 'owner':
        return objective.ownerName ? (
          <div className="flex items-center gap-1.5 overflow-hidden">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-xs text-foreground">{objective.ownerName}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case 'status':
        return <StatusBadge status={objective.status} />;
      case 'progress':
        return (
          <ProgressWithTrend 
            actual={baseline.actual} 
            trend={baseline.trend} 
            variance={baseline.variance} 
          />
        );
      case 'startDate':
        return objective.startDate ? (
          <span className="text-xs text-muted-foreground">
            {format(new Date(objective.startDate), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case 'dueDate':
        return objective.dueDate ? (
          <span className="text-xs text-muted-foreground">
            {format(new Date(objective.dueDate), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case 'risks':
        return <RisksDisplay risks={aggregatedRisks} />;
      case 'krs':
        return (
          <Badge variant="outline" className="text-xs">
            {krCount} KRs
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="grid items-center bg-card border-b border-border hover:bg-muted/30 transition-colors cursor-pointer py-2 px-3"
        style={{ gridTemplateColumns: gridColumns }}
        onClick={onSelect}
      >
        {visibleCols.map(col => (
          <div key={col.key} className="overflow-hidden">
            {renderCell(col.key)}
          </div>
        ))}
      </div>

      {/* Expanded Key Results */}
      {isExpanded &&
        objective.keyResults?.map((kr) => (
          <KeyResultRow key={kr.id} kr={kr} columns={columns} gridColumns={gridColumns} />
        ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export function OKRHubV1({ snapshotId }: OKRHubV1Props) {
  const { data, isLoading, error } = useOKRStrategicData(snapshotId);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [columns, setColumns] = useState<OKRColumn[]>(DEFAULT_OKR_COLUMNS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<OKRSmartFilters>({});

  const gridColumns = buildGridColumns(columns);
  const visibleCols = columns.filter(c => c.visible);
  const activeFilterCount = countActiveFilters(filters);

  // Flatten objectives from all themes
  const objectivesWithThemes = useMemo(() => {
    if (!data?.themes) return [];
    const result: { objective: Objective; theme: Theme }[] = [];
    data.themes.forEach((theme) => {
      theme.objectives?.forEach((obj) => {
        result.push({ objective: obj, theme });
      });
    });
    return result;
  }, [data?.themes]);

  // Apply search and filters
  const filteredObjectives = useMemo(() => {
    let items = objectivesWithThemes;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(({ objective, theme }) =>
        objective.name.toLowerCase().includes(query) ||
        theme.name.toLowerCase().includes(query)
      );
    }

    // Theme filter
    if (filters.themeIds && filters.themeIds.length > 0) {
      items = items.filter(({ theme }) => filters.themeIds!.includes(theme.id));
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      items = items.filter(({ objective }) =>
        filters.status!.includes(objective.status as any)
      );
    }

    // Owner filter
    if (filters.ownerIds && filters.ownerIds.length > 0) {
      items = items.filter(({ objective }) =>
        objective.ownerId && filters.ownerIds!.includes(objective.ownerId)
      );
    }

    // Progress filter
    if (filters.progressMin !== undefined) {
      items = items.filter(({ objective }) => objective.progress >= filters.progressMin!);
    }
    if (filters.progressMax !== undefined) {
      items = items.filter(({ objective }) => objective.progress <= filters.progressMax!);
    }

    // Date filters
    if (filters.startDateFrom) {
      items = items.filter(({ objective }) =>
        objective.startDate && new Date(objective.startDate) >= filters.startDateFrom!
      );
    }
    if (filters.startDateTo) {
      items = items.filter(({ objective }) =>
        objective.startDate && new Date(objective.startDate) <= filters.startDateTo!
      );
    }
    if (filters.dueDateFrom) {
      items = items.filter(({ objective }) =>
        objective.dueDate && new Date(objective.dueDate) >= filters.dueDateFrom!
      );
    }
    if (filters.dueDateTo) {
      items = items.filter(({ objective }) =>
        objective.dueDate && new Date(objective.dueDate) <= filters.dueDateTo!
      );
    }

    return items;
  }, [objectivesWithThemes, searchQuery, filters]);

  const toggleExpanded = (objectiveId: string) => {
    setExpandedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(objectiveId)) {
        next.delete(objectiveId);
      } else {
        next.add(objectiveId);
      }
      return next;
    });
  };

  const handleSelectObjective = (objectiveId: string) => {
    setSelectedObjectiveId(objectiveId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedObjectiveId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading objectives...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-destructive">
        Failed to load objectives
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setFiltersOpen(true)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-brand-gold/20 text-brand-gold">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        <OKRColumnChooser columns={columns} onColumnsChange={setColumns} />
      </div>

      {/* Table */}
      {filteredObjectives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-card rounded-lg border border-border">
          <p className="text-lg font-medium mb-2">No objectives found</p>
          <p className="text-sm">
            {objectivesWithThemes.length > 0
              ? 'Try adjusting your search or filters'
              : 'Create objectives to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div
            className="grid items-center bg-muted/50 border-b border-border font-semibold text-muted-foreground text-xs uppercase tracking-wider py-3 px-3"
            style={{ gridTemplateColumns: gridColumns }}
          >
            {visibleCols.map(col => (
              <div
                key={col.key}
                className={cn(
                  'truncate',
                  col.key === 'krs' && 'text-center',
                  col.key === 'risks' && 'text-right',
                  col.key === 'progress' && 'text-right'
                )}
              >
                {col.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div>
            {filteredObjectives.map(({ objective, theme }) => (
              <ObjectiveRow
                key={objective.id}
                objective={objective}
                theme={theme}
                isExpanded={expandedObjectives.has(objective.id)}
                onToggle={() => toggleExpanded(objective.id)}
                onSelect={() => handleSelectObjective(objective.id)}
                columns={columns}
                gridColumns={gridColumns}
              />
            ))}
          </div>
        </div>
      )}

      {/* Smart Filters Dialog */}
      <OKRSmartFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Objective Drawer V2 */}
      <ObjectiveDrawerV2
        objectiveId={selectedObjectiveId}
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </>
  );
}