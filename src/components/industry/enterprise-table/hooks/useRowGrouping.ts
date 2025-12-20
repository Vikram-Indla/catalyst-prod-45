// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE — ROW GROUPING HOOK
// Manages row grouping, aggregation, and group expansion
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react';
import type { CatalystColumn, AggregationType } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GroupedRow<T> {
  id: string;
  isGroup: true;
  groupKey: string;
  groupValue: string;
  depth: number;
  rows: T[];
  aggregates: Record<string, any>;
  isExpanded: boolean;
}

export interface DataRow<T> {
  id: string;
  isGroup: false;
  data: T;
  groupKey?: string;
  depth: number;
}

export type ProcessedRow<T> = GroupedRow<T> | DataRow<T>;

export interface UseRowGroupingOptions<T> {
  data: T[];
  columns: CatalystColumn<T>[];
  groupBy?: keyof T | ((row: T) => string);
  aggregations?: Record<string, AggregationType>;
  defaultExpandedGroups?: string[];
  onGroupToggle?: (groupId: string, isExpanded: boolean) => void;
}

export interface RowGroupingResult<T> {
  processedRows: ProcessedRow<T>[];
  groupedData: Map<string, T[]>;
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  collapseGroup: (groupId: string) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
  isGroupExpanded: (groupId: string) => boolean;
  getGroupRows: (groupId: string) => T[];
  getAggregateValue: (groupId: string, columnId: string) => any;
  groupCount: number;
  totalRowCount: number;
}

// ─── Aggregation Functions ──────────────────────────────────────────────────

function calculateAggregate<T>(
  rows: T[],
  column: CatalystColumn<T>,
  aggregationType: AggregationType
): any {
  const values = rows.map(row => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor as keyof T];
  }).filter(v => v !== null && v !== undefined);

  if (typeof aggregationType === 'function') {
    return aggregationType(values);
  }

  switch (aggregationType) {
    case 'sum':
      return values.reduce((sum: number, v) => sum + (Number(v) || 0), 0);
    
    case 'avg':
      if (values.length === 0) return 0;
      return values.reduce((sum: number, v) => sum + (Number(v) || 0), 0) / values.length;
    
    case 'count':
      return values.length;
    
    case 'min':
      return values.length > 0 ? Math.min(...values.map(v => Number(v) || Infinity)) : null;
    
    case 'max':
      return values.length > 0 ? Math.max(...values.map(v => Number(v) || -Infinity)) : null;
    
    case 'unique':
      return new Set(values).size;
    
    default:
      return null;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useRowGrouping<T extends { id: string }>({
  data,
  columns,
  groupBy,
  aggregations = {},
  defaultExpandedGroups = [],
  onGroupToggle,
}: UseRowGroupingOptions<T>): RowGroupingResult<T> {
  // ─── State ────────────────────────────────────────────────────────────────

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(defaultExpandedGroups)
  );

  // ─── Group Data ───────────────────────────────────────────────────────────

  const groupedData = useMemo(() => {
    if (!groupBy) return new Map<string, T[]>();

    const groups = new Map<string, T[]>();
    
    data.forEach(row => {
      const groupValue = typeof groupBy === 'function' 
        ? groupBy(row) 
        : String(row[groupBy]);
      
      if (!groups.has(groupValue)) {
        groups.set(groupValue, []);
      }
      groups.get(groupValue)!.push(row);
    });

    return groups;
  }, [data, groupBy]);

  // ─── Aggregates ───────────────────────────────────────────────────────────

  const groupAggregates = useMemo(() => {
    const aggregateMap = new Map<string, Record<string, any>>();
    
    groupedData.forEach((rows, groupKey) => {
      const aggregateValues: Record<string, any> = {};
      
      columns.forEach(column => {
        const aggType = aggregations[column.id] ?? column.aggregationFn;
        if (aggType) {
          aggregateValues[column.id] = calculateAggregate(rows, column, aggType);
        }
      });
      
      aggregateMap.set(groupKey, aggregateValues);
    });

    return aggregateMap;
  }, [groupedData, columns, aggregations]);

  // ─── Processed Rows ───────────────────────────────────────────────────────

  const processedRows = useMemo((): ProcessedRow<T>[] => {
    // No grouping - return flat data
    if (!groupBy) {
      return data.map(row => ({
        id: row.id,
        isGroup: false as const,
        data: row,
        depth: 0,
      }));
    }

    const result: ProcessedRow<T>[] = [];
    
    groupedData.forEach((rows, groupKey) => {
      const isExpanded = expandedGroups.has(groupKey);
      
      // Add group header row
      result.push({
        id: `group-${groupKey}`,
        isGroup: true as const,
        groupKey,
        groupValue: groupKey,
        depth: 0,
        rows,
        aggregates: groupAggregates.get(groupKey) ?? {},
        isExpanded,
      });

      // Add data rows if group is expanded
      if (isExpanded) {
        rows.forEach(row => {
          result.push({
            id: row.id,
            isGroup: false as const,
            data: row,
            groupKey,
            depth: 1,
          });
        });
      }
    });

    return result;
  }, [data, groupBy, groupedData, expandedGroups, groupAggregates]);

  // ─── Group Toggle Methods ─────────────────────────────────────────────────

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      const willExpand = !next.has(groupId);
      
      if (willExpand) {
        next.add(groupId);
      } else {
        next.delete(groupId);
      }
      
      onGroupToggle?.(groupId, willExpand);
      return next;
    });
  }, [onGroupToggle]);

  const expandGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      if (prev.has(groupId)) return prev;
      const next = new Set(prev);
      next.add(groupId);
      onGroupToggle?.(groupId, true);
      return next;
    });
  }, [onGroupToggle]);

  const collapseGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      if (!prev.has(groupId)) return prev;
      const next = new Set(prev);
      next.delete(groupId);
      onGroupToggle?.(groupId, false);
      return next;
    });
  }, [onGroupToggle]);

  const expandAllGroups = useCallback(() => {
    const allGroupKeys = Array.from(groupedData.keys());
    setExpandedGroups(new Set(allGroupKeys));
  }, [groupedData]);

  const collapseAllGroups = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const isGroupExpanded = useCallback((groupId: string) => {
    return expandedGroups.has(groupId);
  }, [expandedGroups]);

  // ─── Helper Methods ───────────────────────────────────────────────────────

  const getGroupRows = useCallback((groupId: string): T[] => {
    return groupedData.get(groupId) ?? [];
  }, [groupedData]);

  const getAggregateValue = useCallback((groupId: string, columnId: string): any => {
    return groupAggregates.get(groupId)?.[columnId] ?? null;
  }, [groupAggregates]);

  return {
    processedRows,
    groupedData,
    expandedGroups,
    toggleGroup,
    expandGroup,
    collapseGroup,
    expandAllGroups,
    collapseAllGroups,
    isGroupExpanded,
    getGroupRows,
    getAggregateValue,
    groupCount: groupedData.size,
    totalRowCount: data.length,
  };
}
