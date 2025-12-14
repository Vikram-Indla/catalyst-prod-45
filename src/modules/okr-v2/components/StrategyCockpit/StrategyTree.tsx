// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Strategy Tree Component
// Hierarchical tree view of Objectives → KRs → Work Items (themes are filters only)
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { TreeRow } from './TreeRow';
import type { Theme, Objective, TreeItem } from '../../lib/okrTypes';

interface StrategyTreeProps {
  themes: Theme[];
  selectedThemeIds: string[];
  expandedIds: string[];
  selectedItem: TreeItem | null;
  searchQuery: string;
  onToggle: (id: string) => void;
  onSelect: (item: TreeItem) => void;
}

export function StrategyTree({
  themes,
  selectedThemeIds,
  expandedIds,
  selectedItem,
  searchQuery,
  onToggle,
  onSelect,
}: StrategyTreeProps) {
  // Build flat list of objectives from themes, respecting theme filter
  const filteredObjectives = useMemo(() => {
    // Filter themes based on selected theme IDs
    let filteredThemes = themes;
    if (selectedThemeIds.length > 0) {
      filteredThemes = themes.filter((t) => selectedThemeIds.includes(t.id));
    }

    // Flatten objectives from filtered themes, attaching theme info
    const objectivesWithTheme: Array<{
      objective: Objective;
      themeColor: string;
      themeName: string;
    }> = [];

    filteredThemes.forEach((theme) => {
      theme.objectives?.forEach((obj) => {
        objectivesWithTheme.push({
          objective: obj,
          themeColor: theme.color || 'hsl(var(--brand-gold))',
          themeName: theme.name,
        });
      });
    });

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return objectivesWithTheme.filter(({ objective }) => {
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

    return objectivesWithTheme;
  }, [themes, selectedThemeIds, searchQuery]);

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
      <div className="grid grid-cols-[1fr_100px_120px_90px_80px] items-center gap-3 px-4 py-3 bg-muted/50 border-b-2 border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Strategy Item</span>
        <span>Status</span>
        <span>Progress</span>
        <span>Risks</span>
        <span>Linked</span>
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
