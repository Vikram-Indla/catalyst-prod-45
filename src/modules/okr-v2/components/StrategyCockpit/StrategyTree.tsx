// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Strategy Tree Component
// Hierarchical tree view of Themes → Objectives → KRs → Work Items
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { TreeRow } from './TreeRow';
import { matchesSearch } from '../../lib/okrMetrics';
import type { Theme, TreeItem } from '../../lib/okrTypes';

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
  // Filter themes based on selected theme IDs and search query
  const filteredThemes = useMemo(() => {
    let result = themes;

    // Filter by selected theme IDs
    if (selectedThemeIds.length > 0) {
      result = result.filter((t) => selectedThemeIds.includes(t.id));
    }

    // Filter by search query (deep search through hierarchy)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((theme) => {
        if (theme.name.toLowerCase().includes(query)) return true;
        return theme.objectives?.some((obj) => {
          if (obj.name.toLowerCase().includes(query)) return true;
          return obj.keyResults?.some((kr) => {
            if (kr.name.toLowerCase().includes(query)) return true;
            return kr.workItems?.some((wi) => wi.name.toLowerCase().includes(query));
          });
        });
      });
    }

    return result;
  }, [themes, selectedThemeIds, searchQuery]);

  // Build flat list of rows for rendering
  const renderTree = () => {
    const rows: React.ReactNode[] = [];

    filteredThemes.forEach((theme) => {
      // Theme row
      rows.push(
        <TreeRow
          key={theme.id}
          item={theme}
          level={0}
          isExpanded={expandedIds.includes(theme.id)}
          isSelected={selectedItem?.id === theme.id}
          hasChildren={(theme.objectives?.length || 0) > 0}
          onToggle={onToggle}
          onSelect={onSelect}
          themeColor={theme.color}
        />
      );

      // Objective rows (if theme is expanded)
      if (expandedIds.includes(theme.id)) {
        theme.objectives?.forEach((obj) => {
          rows.push(
            <TreeRow
              key={obj.id}
              item={obj}
              level={1}
              isExpanded={expandedIds.includes(obj.id)}
              isSelected={selectedItem?.id === obj.id}
              hasChildren={(obj.keyResults?.length || 0) > 0}
              onToggle={onToggle}
              onSelect={onSelect}
              themeColor={theme.color}
            />
          );

          // Key Result rows (if objective is expanded)
          if (expandedIds.includes(obj.id)) {
            obj.keyResults?.forEach((kr) => {
              rows.push(
                <TreeRow
                  key={kr.id}
                  item={kr}
                  level={2}
                  isExpanded={expandedIds.includes(kr.id)}
                  isSelected={selectedItem?.id === kr.id}
                  hasChildren={(kr.workItems?.length || 0) > 0}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  themeColor={theme.color}
                />
              );

              // Work Item rows (if KR is expanded)
              if (expandedIds.includes(kr.id)) {
                kr.workItems?.forEach((wi) => {
                  rows.push(
                    <TreeRow
                      key={wi.id}
                      item={wi}
                      level={3}
                      isExpanded={false}
                      isSelected={selectedItem?.id === wi.id}
                      hasChildren={false}
                      onToggle={onToggle}
                      onSelect={onSelect}
                      themeColor={theme.color}
                    />
                  );
                });
              }
            });
          }
        });
      }
    });

    return rows;
  };

  return (
    <div className="flex-1 flex flex-col bg-card border-r border-border min-w-[580px]">
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
        {filteredThemes.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No themes found
          </div>
        ) : (
          renderTree()
        )}
      </div>
    </div>
  );
}
