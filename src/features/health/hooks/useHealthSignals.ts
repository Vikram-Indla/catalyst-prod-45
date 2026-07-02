/**
 * useHealthSignals — facade hook, one call site per module.
 *
 * Phase 0 wires 'board' only. Adding a module = adding a case here + an
 * adapter file; this signature does not change shape as modules are added.
 */
import { useBoardHealthAdapter } from '../adapters/board';
import { useBacklogHealthAdapter } from '../adapters/backlog';
import { useFiltersHealthAdapter } from '../adapters/filters';
import { useEntityHealthAdapter } from '../adapters/entity';
import { useDependenciesHealthAdapter, type DependencyIssueMeta } from '../adapters/dependencies';
import type { HealthKPI, HealthResult, HealthScope } from '../types';
import type { Board } from '@/types/board';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';
import type { EntityConfig } from '@/lib/entity-hub/config';
import type { RawDependencyRow } from '@/components/shared/Timeline/dependencies/normalize';

interface UseHealthSignalsResult {
  health: HealthResult;
  kpis: HealthKPI[];
  isLoading: boolean;
  error: unknown;
}

const EMPTY_RESULT: HealthResult = {
  items: [],
  summary: {
    totalAnalyzed: 0,
    attentionCount: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    overdueCount: 0,
    flaggedCount: 0,
    staleCount: 0,
    unassignedHighPriorityCount: 0,
    moduleLevelInsights: [],
    capabilityGaps: [],
  },
  engineUsed: 'score',
};

/**
 * `entity` carries the module-specific data object the adapter needs
 * (e.g. the `Board` row for `moduleKey: 'board'`). Later phases add their
 * own entity shape per module without touching this facade's signature.
 */
export function useHealthSignals(
  scope: HealthScope,
  entity: {
    board?: Board | null;
    rows?: JqlResultRow[];
    resultCap?: number;
    entityConfig?: EntityConfig;
    entityName?: string | null;
    dependencies?: RawDependencyRow[];
    issueMeta?: Record<string, DependencyIssueMeta>;
  },
): UseHealthSignalsResult {
  switch (scope.moduleKey) {
    case 'board': {
      const { health, kpis, isLoading, error } = useBoardHealthAdapter(entity.board ?? null);
      return { health, kpis, isLoading, error };
    }
    case 'backlog': {
      const { health, kpis, isLoading, error } = useBacklogHealthAdapter(scope.projectKey ?? null);
      return { health, kpis, isLoading, error };
    }
    case 'filters': {
      const { health, kpis } = useFiltersHealthAdapter(entity.rows, entity.resultCap ?? 100);
      return { health, kpis, isLoading: false, error: null };
    }
    case 'sprint': {
      const { health, kpis, isLoading, error } = useEntityHealthAdapter(
        entity.entityConfig!, scope.sprintId ?? null, entity.entityName ?? null,
      );
      return { health, kpis, isLoading, error };
    }
    case 'timeline': {
      const { health, kpis, isLoading, error } = useEntityHealthAdapter(
        entity.entityConfig!, scope.releaseId ?? null, entity.entityName ?? null,
      );
      return { health, kpis, isLoading, error };
    }
    case 'dependencies': {
      const { health, kpis } = useDependenciesHealthAdapter(entity.dependencies, entity.issueMeta);
      return { health, kpis, isLoading: false, error: null };
    }
    default: {
      console.warn(`useHealthSignals: moduleKey "${scope.moduleKey}" is not wired yet (Phase 0 only implements 'board').`);
      return { health: EMPTY_RESULT, kpis: [], isLoading: false, error: null };
    }
  }
}
