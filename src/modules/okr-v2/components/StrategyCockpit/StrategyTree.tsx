// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Strategy Tree Component
// Hierarchical tree view of Objectives → KRs → Work Items with smart filters
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { TreeRow } from './TreeRow';
import type { Theme, Objective, TreeItem, StatusCode } from '../../lib/okrTypes';
import type { OKRSmartFilters } from '../OKRSmartFiltersDialog';
import { getObjectiveProgressBaseline, aggregateRisks, getTotalRiskCount } from '../../lib/okrMetrics';

interface StrategyTreeProps {
  themes: Theme[];
  selectedThemeIds: string[];
  expandedIds: string[];
  selectedItem: TreeItem | null;
  searchQuery: string;
  filters?: OKRSmartFilters;
  onToggle: (id: string) => void;
  onSelect: (item: TreeItem) => void;
}

const GRID_COLUMNS = "1fr 120px 160px 100px 100px";

export function StrategyTree({
  themes,
  selectedThemeIds,
  expandedIds,
  selectedItem,
  searchQuery,
  filters = {},
  onToggle,
  onSelect,
}: StrategyTreeProps) {
  // Build flat list of objectives from themes, respecting theme filter and smart filters
  const filteredObjectives = useMemo(() => {
    // Filter themes based on selected theme IDs
    let filteredThemes = themes;
    if (selectedThemeIds.length > 0) {
      filteredThemes = themes.filter((t) => selectedThemeIds.includes(t.id));
    }

    // Flatten objectives from filtered themes, attaching theme info
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
        // Match objective name
        if (objective.name.toLowerCase().includes(query)) return true;
        // Match KR names
        return objective.keyResults?.some((kr) => {
          if (kr.name.toLowerCase().includes(query)) return true;
          // Match work item names
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

    // Date filters
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

  // Build flat list of rows for rendering
  const renderTree = () => {
    const rows: React.ReactNode[] = [];

    filteredObjectives.forEach(({ objective, themeColor, themeName }) => {
      // Objective row (level 0)
      rows.push(
        <TreeRow
          key={objective.id}
          item={objective}
          level={0}
          isExpanded={expandedIds.includes(objective.id)}
          isSelected={selectedItem?.id === objective.id}
          hasChildren={(objective.keyResults?.length || 0) > 0}
          onToggle={onToggle}
          onSelect={onSelect}
          themeColor={themeColor}
          themeName={themeName}
        />
      );

      // Key Result rows (if objective is expanded)
      if (expandedIds.includes(objective.id)) {
        objective.keyResults?.forEach((kr) => {
          rows.push(
            <TreeRow
              key={kr.id}
              item={kr}
              level={1}
              isExpanded={expandedIds.includes(kr.id)}
              isSelected={selectedItem?.id === kr.id}
              hasChildren={(kr.workItems?.length || 0) > 0}
              onToggle={onToggle}
              onSelect={onSelect}
              themeColor={themeColor}
              themeName={themeName}
            />
          );

          // Work Item rows (if KR is expanded)
          if (expandedIds.includes(kr.id)) {
            kr.workItems?.forEach((wi) => {
              rows.push(
                <TreeRow
                  key={wi.id}
                  item={wi}
                  level={2}
                  isExpanded={false}
                  isSelected={selectedItem?.id === wi.id}
                  hasChildren={false}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  themeColor={themeColor}
                  themeName={themeName}
                />
              );
            });
          }
        });
      }
    });

    return rows;
  };

  return (
    <div className="flex-1 flex flex-col bg-card">
      {/* Tree Header */}
      <div
        className="grid items-center px-3 py-2 bg-muted/50 border-b-2 border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <span className="truncate">OKRs</span>
        <span className="truncate">Status</span>
        <span className="truncate">Progress vs Plan</span>
        <span className="truncate">Risks</span>
        <span className="truncate text-right">Linked</span>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredObjectives.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No objectives found
          </div>
        ) : (
          renderTree()
        )}
      </div>
    </div>
  );
}