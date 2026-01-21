/**
 * Module 3B-2: Queue Management Types
 */

// Queue Item Status
export type QueueItemStatus = 'queued' | 'claimed' | 'running' | 'completed' | 'failed' | 'skipped';

// Priority Level
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

// Sort Field
export type QueueSortField = 'position' | 'priority' | 'name' | 'time';

// Sort Order
export type SortOrder = 'asc' | 'desc';

// Queue Item
export interface QueueItemData {
  id: string;
  position: number;
  priority: number;
  status: QueueItemStatus;
  test_case: {
    id: string;
    case_number: string;
    title: string;
    priority: PriorityLevel;
  };
  estimated_time: number;
  created_at: string;
}

// Queue Filters
export interface QueueFilters {
  priority?: PriorityLevel | null;
  search?: string;
  sortBy: QueueSortField;
  sortOrder: SortOrder;
}

// Reorder Input
export interface ReorderInput {
  itemId: string;
  newPosition: number;
}

// Bulk Operation Input
export interface BulkOperationInput {
  runId: string;
  itemIds: string[];
}

// Bulk Priority Change Input
export interface BulkPriorityChangeInput extends BulkOperationInput {
  newPriority: PriorityLevel;
}

// Selection State
export interface SelectionState {
  selected: Set<string>;
  lastSelected: string | null;
}

// Drag-Drop State
export interface DragDropState {
  draggedItemId: string | null;
  dragOverItemId: string | null;
  isDragging: boolean;
}

// Queue Stats
export interface QueueStats {
  total: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  totalEstimatedTime: number;
}

// Priority Config (for UI)
export interface PriorityConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  weight: number;
}

// Priority Configs Map - Using semantic tokens
export const PRIORITY_CONFIGS: Record<PriorityLevel, PriorityConfig> = {
  critical: { 
    label: 'Critical', 
    bgColor: 'bg-destructive', 
    textColor: 'text-destructive-foreground', 
    borderColor: 'border-destructive',
    weight: 4 
  },
  high: { 
    label: 'High', 
    bgColor: 'bg-warning', 
    textColor: 'text-warning-foreground', 
    borderColor: 'border-warning',
    weight: 3 
  },
  medium: { 
    label: 'Medium', 
    bgColor: 'bg-muted', 
    textColor: 'text-muted-foreground', 
    borderColor: 'border-border',
    weight: 2 
  },
  low: { 
    label: 'Low', 
    bgColor: 'bg-muted/50', 
    textColor: 'text-muted-foreground/70', 
    borderColor: 'border-border/50',
    weight: 1 
  },
};

// Get priority from numeric value
export function getPriorityFromValue(value: number): PriorityLevel {
  if (value >= 100) return 'critical';
  if (value >= 75) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
}

// Get numeric value from priority
export function getValueFromPriority(priority: PriorityLevel): number {
  switch (priority) {
    case 'critical': return 100;
    case 'high': return 75;
    case 'medium': return 50;
    case 'low': return 25;
    default: return 50;
  }
}
