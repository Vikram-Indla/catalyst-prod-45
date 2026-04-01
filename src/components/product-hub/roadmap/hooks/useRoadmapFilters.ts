/**
 * Product Roadmap — Filter & search state management
 */
import { useState, useMemo, useCallback } from 'react';
import type { RoadmapInitiative, InitiativeType, QuickFilter, GroupBy, ZoomLevel, ViewMode, RoadmapGroup } from '../types/roadmap.types';
import { TYPE_COLORS } from '../constants/roadmap.constants';

export function useRoadmapFilters(allItems: RoadmapInitiative[]) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<InitiativeType | 'all'>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('type');
  const [zoom, setZoom] = useState<ZoomLevel>('Month');
  const [viewMode, setViewMode] = useState<ViewMode>('Timeline');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = allItems;
    if (typeFilter !== 'all') {
      result = result.filter(i => i.type === typeFilter);
    }
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
  }, [allItems, typeFilter, search, quickFilter]);

  const groups = useMemo<RoadmapGroup[]>(() => {
    if (groupBy === 'none') return [{ key: 'all', label: 'All Initiatives', color: '#64748B', items: filtered, isExpanded: true }];

    const map = new Map<string, RoadmapInitiative[]>();
    for (const item of filtered) {
      let key: string;
      if (groupBy === 'type') key = item.type;
      else if (groupBy === 'priority') key = item.priority;
      else key = item.ownerName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: groupBy === 'type' ? (TYPE_COLORS[key]?.label || key) : key,
      color: groupBy === 'type' ? (TYPE_COLORS[key]?.solid || '#94A3B8') : '#64748B',
      items,
      isExpanded: true,
    }));
  }, [filtered, groupBy]);

  const toggleGroup = useCallback((key: string) => {
    // For simplicity groups are always expanded in mock mode
  }, []);

  return {
    search, setSearch,
    typeFilter, setTypeFilter,
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
