/**
 * HierarchyConfigContext — live hierarchy config from wh_config.
 *
 * Reads the saved `hierarchy_levels` admin config and exposes it as a React
 * context so production components (WorkItemTree, DetailPanel, etc.) use
 * the admin-configured rules instead of the hardcoded constant.
 *
 * Falls back to DEFAULT_HIERARCHY_LEVELS when config is not yet saved or
 * still loading — so nothing breaks in a fresh environment.
 */
import React, { createContext, useContext, useMemo } from 'react';
import type { HierarchyLevel } from '@/modules/workhub/admin/types/admin-config.types';
import { useHierarchyLevels } from '@/modules/workhub/admin/hooks/useAdminConfig';

// ---------------------------------------------------------------------------
// Default — mirrors the canonical Catalyst hierarchy (CLAUDE.md)
// ---------------------------------------------------------------------------
export const DEFAULT_HIERARCHY_LEVELS: HierarchyLevel[] = [
  {
    level: 1,
    name: 'Business Request',
    jiraTypes: ['Business Request'],
    color: 'var(--ds-background-warning-bold)',
    parentLevels: [],
  },
  {
    level: 2,
    name: 'Epic',
    jiraTypes: ['Epic'],
    color: 'var(--ds-background-discovery-bold)',
    parentLevels: [1],
  },
  {
    level: 3,
    name: 'Feature',
    jiraTypes: ['Feature'],
    color: 'var(--ds-chart-teal-bold)',
    parentLevels: [2],
  },
  {
    level: 4,
    name: 'Story',
    jiraTypes: ['Story'],
    color: 'var(--ds-background-success-bold)',
    parentLevels: [2, 3],
  },
  {
    level: 5,
    name: 'Task',
    jiraTypes: ['Task'],
    color: 'var(--ds-link)',
    parentLevels: [3, 4],
  },
  {
    level: 6,
    name: 'Subtask',
    jiraTypes: ['Sub-task', 'Backend', 'Frontend', 'Integration'],
    color: 'var(--ds-text-disabled)',
    parentLevels: [4, 5],
  },
  {
    level: 7,
    name: 'QA Bug',
    jiraTypes: ['QA Bug', 'Defect'],
    color: 'var(--ds-background-danger-bold)',
    parentLevels: [3, 4, 5],
  },
  {
    level: 8,
    name: 'Change Request',
    jiraTypes: ['Change Request'],
    color: 'var(--ds-background-warning-bold)',
    parentLevels: [3, 4, 1],
  },
  {
    level: 9,
    name: 'Production Incident',
    jiraTypes: ['Production Incident'],
    color: 'var(--ds-background-danger-bold)',
    parentLevels: [1, 2, 3],
  },
  {
    level: 10,
    name: 'Business Gap',
    jiraTypes: ['Business Gap'],
    color: 'var(--ds-background-discovery-bold)',
    parentLevels: [1, 2, 3],
  },
  {
    level: 11,
    name: 'Idea',
    jiraTypes: ['Idea'],
    color: 'var(--ds-background-warning-bold)',
    parentLevels: [],
  },
];

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
export interface HierarchyConfigContextValue {
  /** All configured levels in display order. */
  levels: HierarchyLevel[];
  /** True while the config is loading from DB. */
  isLoading: boolean;
  /**
   * Returns the configured level number for a given Jira issue type string.
   * Case-insensitive. Returns null if unmapped.
   */
  getLevelForType(issueType: string): number | null;
  /**
   * Returns the HierarchyLevel entry for a level number, or undefined.
   */
  getLevel(level: number): HierarchyLevel | undefined;
  /**
   * Returns true if parentLevel is a valid parent for childLevel per config.
   * Replaces the hardcoded canBeParentOf() from src/types/hierarchy.ts.
   */
  canBeParentOf(parentLevel: number, childLevel: number): boolean;
  /**
   * Resolved parent rules: childLevel → valid parent levels[].
   * Derived from HierarchyLevel.parentLevels, falling back to sequential rule.
   */
  parentRules: Record<number, number[]>;
}

const HierarchyConfigContext = createContext<HierarchyConfigContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function HierarchyConfigProvider({ children }: { children: React.ReactNode }) {
  const { data: dbLevels, isLoading } = useHierarchyLevels();

  const value = useMemo<HierarchyConfigContextValue>(() => {
    const levels: HierarchyLevel[] =
      dbLevels && dbLevels.length > 0 ? dbLevels : DEFAULT_HIERARCHY_LEVELS;

    // Build type → level lookup (lowercase for case-insensitive match)
    const typeToLevel: Record<string, number> = {};
    for (const l of levels) {
      for (const t of l.jiraTypes) {
        typeToLevel[t.toLowerCase()] = l.level;
      }
    }

    // Build parent rules: childLevel → valid parent levels
    // Uses HierarchyLevel.parentLevels if defined; otherwise sequential fallback.
    const parentRules: Record<number, number[]> = {};
    for (const l of levels) {
      if (l.parentLevels !== undefined) {
        parentRules[l.level] = l.parentLevels;
      } else {
        // Sequential default: parent is level - 1 (if it exists)
        const parentLevel = l.level - 1;
        parentRules[l.level] = levels.some(x => x.level === parentLevel)
          ? [parentLevel]
          : [];
      }
    }

    function getLevelForType(issueType: string): number | null {
      return typeToLevel[issueType.toLowerCase()] ?? null;
    }

    function getLevel(level: number): HierarchyLevel | undefined {
      return levels.find(l => l.level === level);
    }

    function canBeParentOf(parentLevel: number, childLevel: number): boolean {
      return (parentRules[childLevel] ?? []).includes(parentLevel);
    }

    return { levels, isLoading, getLevelForType, getLevel, canBeParentOf, parentRules };
  }, [dbLevels, isLoading]);

  return (
    <HierarchyConfigContext.Provider value={value}>
      {children}
    </HierarchyConfigContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useHierarchyConfig(): HierarchyConfigContextValue {
  const ctx = useContext(HierarchyConfigContext);
  if (!ctx) {
    // Graceful fallback — never throw in production; just use defaults.
    const levels = DEFAULT_HIERARCHY_LEVELS;
    const parentRules: Record<number, number[]> = {};
    for (const l of levels) {
      parentRules[l.level] = l.parentLevels ?? [];
    }
    return {
      levels,
      isLoading: false,
      getLevelForType: (t) => {
        for (const l of levels) {
          if (l.jiraTypes.some(x => x.toLowerCase() === t.toLowerCase())) return l.level;
        }
        return null;
      },
      getLevel: (n) => levels.find(l => l.level === n),
      canBeParentOf: (p, c) => (parentRules[c] ?? []).includes(p),
      parentRules,
    };
  }
  return ctx;
}
