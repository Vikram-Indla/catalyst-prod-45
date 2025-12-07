// Bulk Operations - Generic types for reusable bulk operations across entities

export type BulkOperationType = 'edit' | 'transition' | 'move' | 'delete';

export interface BulkOperationField {
  id: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'number' | 'user';
  options?: { value: string; label: string }[];
  dbColumn: string;
}

export interface BulkOperationConfig {
  entityType: 'demand' | 'epic' | 'feature' | 'story';
  entityLabel: string;
  entityLabelPlural: string;
  allowedOperations: BulkOperationType[];
  editableFields: BulkOperationField[];
  transitionField?: BulkOperationField;
  moveTargets?: {
    field: BulkOperationField;
    parentField?: BulkOperationField;
  };
}

export interface BulkOperationResult {
  id: string;
  title?: string;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
}

export interface BulkOperationSummary {
  total: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  results: BulkOperationResult[];
}

export interface BulkEditPayload {
  fields: Record<string, any>;
}

export interface BulkTransitionPayload {
  targetStatus: string;
  comment?: string;
}

export interface BulkMovePayload {
  targetId: string;
  targetType: string;
}
