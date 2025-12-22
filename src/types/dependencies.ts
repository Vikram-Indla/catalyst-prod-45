// =====================================================
// DEPENDENCIES TYPE DEFINITIONS
// =====================================================

import { WorkItemType, DependencyType } from './views';

export interface Dependency {
  id: string;
  dependent_type: WorkItemType;
  dependent_id: string;
  blocker_type: WorkItemType;
  blocker_id: string;
  dependency_type: DependencyType;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DependencyWithDetails extends Dependency {
  dependent_item?: {
    id: string;
    identifier: string;
    title: string;
    status: string;
  };
  blocker_item?: {
    id: string;
    identifier: string;
    title: string;
    status: string;
  };
}

export interface CreateDependencyInput {
  dependent_type: WorkItemType;
  dependent_id: string;
  blocker_type: WorkItemType;
  blocker_id: string;
  dependency_type?: DependencyType;
  notes?: string;
}

export interface UpdateDependencyInput {
  is_resolved?: boolean;
  notes?: string;
}

export interface DependencyNode {
  type: WorkItemType;
  id: string;
  identifier: string;
  title: string;
  status: string;
  depth: number;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: Array<{
    from: { type: WorkItemType; id: string };
    to: { type: WorkItemType; id: string };
    is_resolved: boolean;
  }>;
}

export interface DependencyCounts {
  blocks: number;
  blocked_by: number;
  total: number;
}
