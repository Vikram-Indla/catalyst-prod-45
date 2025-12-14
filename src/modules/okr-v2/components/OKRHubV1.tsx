// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V1 — Objectives List View with Baseline Progress & Smart Filters
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useOKRStrategicData } from '../hooks/useOKRStrategicData';
import {
  getStatusLabel,
  getObjectiveProgressBaseline,
  aggregateRisks,
  getBlockedWorkCountForObjective,
  getDelayedWorkCountForObjective,
  getLinkedWorkItemCountForObjective,
} from '../lib/okrMetrics';
import type { Objective, Theme } from '../lib/okrTypes';
import { ObjectiveDrawerV2 } from './ObjectiveDrawerV2';
import { OKRColumnChooser, DEFAULT_OKR_COLUMNS, type OKRColumn } from './OKRColumnChooser';
import { OKRSmartFiltersDialog, OKRSmartFilters, countActiveFilters } from './OKRSmartFiltersDialog';
import { OkrObjectivesTable, type OkrObjectiveRow } from './OkrObjectivesTable';

interface OKRHubV1Props {
  snapshotId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export function OKRHubV1({ snapshotId }: OKRHubV1Props) {
  const { data, isLoading, error } = useOKRStrategicData(snapshotId);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [columns, setColumns] = useState<OKRColumn[]>(DEFAULT_OKR_COLUMNS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<OKRSmartFilters>({});

  const activeFilterCount = countActiveFilters(filters);

  // Flatten objectives from all themes and transform to table rows
  const tableRows = useMemo(() => {
    if (!data?.themes) return [];
    
    let items: { objective: Objective; theme: Theme }[] = [];
    data.themes.forEach((theme) => {
      theme.objectives?.forEach((obj) => {
        items.push({ objective: obj, theme });
      });
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(({ objective, theme }) =>
        objective.name.toLowerCase().includes(query) ||
        theme.name.toLowerCase().includes(query)
      );
    }

    // Apply smart filters
    if (filters.themeIds && filters.themeIds.length > 0) {
      items = items.filter(({ theme }) => filters.themeIds!.includes(theme.id));
    }
    if (filters.status && filters.status.length > 0) {
      items = items.filter(({ objective }) =>
        filters.status!.includes(objective.status as any)
      );
    }
    if (filters.ownerIds && filters.ownerIds.length > 0) {
      items = items.filter(({ objective }) =>
        objective.ownerId && filters.ownerIds!.includes(objective.ownerId)
      );
    }
    if (filters.progressMin !== undefined) {
      items = items.filter(({ objective }) => objective.progress >= filters.progressMin!);
    }
    if (filters.progressMax !== undefined) {
      items = items.filter(({ objective }) => objective.progress <= filters.progressMax!);
    }
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

    // Transform to OkrObjectiveRow format
    return items.map(({ objective, theme }): OkrObjectiveRow => {
      const baseline = getObjectiveProgressBaseline(objective);
      const aggregatedRisks = aggregateRisks(objective.keyResults || []);
      const hasBaseline = baseline.expected !== null;

      return {
        id: objective.id,
        name: objective.name,
        themeName: theme.name,
        themeColor: theme.color || 'hsl(var(--brand-gold))',
        status: getStatusLabel(objective.status),
        progressActual: baseline.actual,
        progressTrend: baseline.trend,
        progressVariance: baseline.variance,
        hasBaseline,
        highRiskCount: aggregatedRisks.high,
        mediumRiskCount: aggregatedRisks.medium,
        blockedWorkCount: getBlockedWorkCountForObjective(objective),
        delayedWorkCount: getDelayedWorkCountForObjective(objective),
        linkedKrCount: objective.keyResults?.length || 0,
        linkedWorkItemCount: getLinkedWorkItemCountForObjective(objective),
      };
    });
  }, [data?.themes, searchQuery, filters]);

  const handleRowClick = (row: OkrObjectiveRow) => {
    setSelectedObjectiveId(row.id);
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

      {/* Table - Using new OkrObjectivesTable */}
      <OkrObjectivesTable 
        rows={tableRows} 
        onRowClick={handleRowClick}
      />

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