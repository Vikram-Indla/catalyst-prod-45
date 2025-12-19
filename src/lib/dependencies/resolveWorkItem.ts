/**
 * resolveWorkItemRef - Shared helper to resolve work item references
 * 
 * Provides consistent work item resolution across all dependency views
 */

import type { WorkItemDependencyType, ContainerType } from './types';

export interface ResolvedWorkItem {
  id: string;
  type: WorkItemDependencyType;
  displayId: string;
  name: string;
  containerType: ContainerType | null;
  containerId: string | null;
  containerName: string | null;
}

/**
 * Container derivation rules:
 * - Epic belongs to Program (Program container)
 * - Feature belongs to Project (Project container)
 * - Story belongs to Project (Project container)
 */
export function deriveContainerType(workItemType: WorkItemDependencyType): ContainerType {
  return workItemType === 'epic' ? 'program' : 'project';
}

/**
 * Resolve work item from dependency data
 */
export function resolveWorkItemFromDep(
  workItemId: string | null,
  workItemType: WorkItemDependencyType | null,
  epicData: { id: string; name: string; epic_key: string | null; program_id: string | null; program_name?: string } | null,
  featureData: { id: string; name: string; display_id: string | null; project_id: string | null; project_name?: string } | null,
  fallbackId?: string
): ResolvedWorkItem | null {
  if (!workItemId && !fallbackId) return null;

  const id = workItemId || fallbackId || '';
  const type = workItemType || 'feature';

  if (type === 'epic' && epicData && epicData.id === id) {
    return {
      id,
      type: 'epic',
      displayId: epicData.epic_key || id.slice(0, 8).toUpperCase(),
      name: epicData.name,
      containerType: 'program',
      containerId: epicData.program_id,
      containerName: epicData.program_name || null,
    };
  }

  if (type === 'feature' && featureData && featureData.id === id) {
    return {
      id,
      type: 'feature',
      displayId: featureData.display_id || id.slice(0, 8).toUpperCase(),
      name: featureData.name,
      containerType: 'project',
      containerId: featureData.project_id,
      containerName: featureData.project_name || null,
    };
  }

  // Fallback
  return {
    id,
    type,
    displayId: id.slice(0, 8).toUpperCase(),
    name: 'Unknown',
    containerType: deriveContainerType(type),
    containerId: null,
    containerName: null,
  };
}

/**
 * Build a lookup map from epics and features
 */
export interface WorkItemMaps {
  epics: Map<string, { id: string; name: string; epic_key: string | null; program_id: string | null; program_name?: string }>;
  features: Map<string, { id: string; name: string; display_id: string | null; project_id: string | null; project_name?: string }>;
}

export function buildWorkItemMaps(
  epics: Array<{ id: string; name: string; epic_key: string | null; program_id: string | null; programs?: { name: string } }> | null | undefined,
  features: Array<{ id: string; name: string; display_id: string | null; project_id: string | null; projects?: { name: string } }> | null | undefined
): WorkItemMaps {
  const epicsMap = new Map<string, { id: string; name: string; epic_key: string | null; program_id: string | null; program_name?: string }>();
  const featuresMap = new Map<string, { id: string; name: string; display_id: string | null; project_id: string | null; project_name?: string }>();

  (epics || []).forEach(e => {
    epicsMap.set(e.id, {
      id: e.id,
      name: e.name,
      epic_key: e.epic_key,
      program_id: e.program_id,
      program_name: e.programs?.name,
    });
  });

  (features || []).forEach(f => {
    featuresMap.set(f.id, {
      id: f.id,
      name: f.name,
      display_id: f.display_id,
      project_id: f.project_id,
      project_name: f.projects?.name,
    });
  });

  return { epics: epicsMap, features: featuresMap };
}

/**
 * Resolve source and target from a dependency row
 */
export function resolveDependencyWorkItems(
  dep: any,
  maps: WorkItemMaps
): { source: ResolvedWorkItem | null; target: ResolvedWorkItem | null } {
  // Source (requesting)
  const sourceType = dep.requesting_work_item_type || (dep.from_feature_id ? 'feature' : null);
  const sourceId = dep.requesting_work_item_id || dep.from_feature_id;
  
  let sourceEpic = null;
  let sourceFeature = null;
  
  if (sourceType === 'epic' && sourceId) {
    sourceEpic = maps.epics.get(sourceId) || null;
  } else if (sourceId) {
    sourceFeature = maps.features.get(sourceId) || dep.from_feature || null;
  }

  const source = resolveWorkItemFromDep(
    sourceId,
    sourceType,
    sourceEpic,
    sourceFeature,
    dep.from_feature_id
  );

  // Target (depends on)
  const targetType = dep.depends_on_work_item_type || (dep.to_feature_id ? 'feature' : null);
  const targetId = dep.depends_on_work_item_id || dep.to_feature_id;
  
  let targetEpic = null;
  let targetFeature = null;
  
  if (targetType === 'epic' && targetId) {
    targetEpic = maps.epics.get(targetId) || null;
  } else if (targetId) {
    targetFeature = maps.features.get(targetId) || dep.to_feature || null;
  }

  const target = resolveWorkItemFromDep(
    targetId,
    targetType,
    targetEpic,
    targetFeature,
    dep.to_feature_id
  );

  return { source, target };
}

/**
 * Check if a dependency is relevant to a specific program
 * Uses Epic container logic
 */
export function isDependencyRelevantToProgram(
  dep: any,
  programId: string,
  programEpicIds: Set<string>
): boolean {
  // Check derived container fields (preferred)
  if (dep.derived_requesting_container_type === 'program' && 
      dep.derived_requesting_container_id === programId) {
    return true;
  }
  if (dep.derived_respondent_container_type === 'program' && 
      dep.derived_respondent_container_id === programId) {
    return true;
  }

  // Check work item fields for epics in this program
  if (dep.requesting_work_item_type === 'epic' && 
      dep.requesting_work_item_id && 
      programEpicIds.has(dep.requesting_work_item_id)) {
    return true;
  }
  if (dep.depends_on_work_item_type === 'epic' && 
      dep.depends_on_work_item_id && 
      programEpicIds.has(dep.depends_on_work_item_id)) {
    return true;
  }

  // Legacy: check if from/to feature's epic is in this program
  if (dep.from_feature?.epic_id && programEpicIds.has(dep.from_feature.epic_id)) {
    return true;
  }
  if (dep.to_feature?.epic_id && programEpicIds.has(dep.to_feature.epic_id)) {
    return true;
  }

  return false;
}

/**
 * Extract program IDs from dependency for matrix/wheel views
 * Only returns program IDs if the work item is an Epic
 */
export function extractProgramIdsFromDep(
  dep: any,
  maps: WorkItemMaps
): { sourceProgramId: string | null; targetProgramId: string | null } {
  let sourceProgramId: string | null = null;
  let targetProgramId: string | null = null;

  // Source program (only if epic)
  if (dep.requesting_work_item_type === 'epic' && dep.requesting_work_item_id) {
    const epic = maps.epics.get(dep.requesting_work_item_id);
    sourceProgramId = epic?.program_id || null;
  } else if (dep.derived_requesting_container_type === 'program') {
    sourceProgramId = dep.derived_requesting_container_id;
  }

  // Target program (only if epic)
  if (dep.depends_on_work_item_type === 'epic' && dep.depends_on_work_item_id) {
    const epic = maps.epics.get(dep.depends_on_work_item_id);
    targetProgramId = epic?.program_id || null;
  } else if (dep.derived_respondent_container_type === 'program') {
    targetProgramId = dep.derived_respondent_container_id;
  }

  return { sourceProgramId, targetProgramId };
}
