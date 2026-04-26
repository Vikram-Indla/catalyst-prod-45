/**
 * Product Roadmap — Filter & search state management
 * Type system removed (single Business Request type) — no typeFilter, no group-by-type.
 */
import { useState, useMemo, useCallback } from 'react';
import type { RoadmapInitiative, QuickFilter, GroupBy, ZoomLevel, ViewMode, RoadmapGroup } from '../types/roadmap.types';

export function useRoadmapFilters(allItems: RoadmapInitiative[]) {
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('priority');
  const [zoom, setZoom] = useState<ZoomLevel>('Month');
  const [viewMode, setViewMode] = useState<ViewMode>('Timeline');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = allItems;
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(i =>
        i.titleEn.toLowerCase().includes(s) ||
        i.titleAr.includes(s) ||
        i.initiativeKey.toLowerCase().includes(s)
      );
    }
    if (quickFilter === 'starred') result = result.filter(i => i.starred);
    if (quickFilter === 'high') result = result.filter(i => i.priority === 'P0' || i.priority === 'P1');
    if (quickFilter === 'overdue') {
      const now = new Date();
      result = result.filter(i => i.status !== 'Completed' && new Date(i.endDate) < now);
    }
    return result;
  }, [allItems, search, quickFilter]);

  const groups = useMemo<RoadmapGroup[]>(() => {
    if (groupBy === 'none') return [{ key: 'all', label: 'All Business Requests', color: '#64748B', items: filtered, isExpanded: true }];

    const map = new Map<string, RoadmapInitiative[]>();
    for (const item of filtered) {
      const key = groupBy === 'priority' ? item.priority : item.ownerName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: key,
      color: '#64748B',
      items,
      isExpanded: true,
    }));
  }, [filtered, groupBy]);

  const toggleGroup = useCallback((_key: string) => {
    // Groups are always expanded in current mode
  }, []);

  return {
    search, setSearch,
    quickFilter, setQuickFilter,
    groupBy, setGroupBy,
    zoom, setZoom,
    viewMode, setViewMode,
    hoveredId, setHoveredId,
    filtered,
    groups,
    toggleGroup,
  };
}
