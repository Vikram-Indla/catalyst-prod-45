// ============================================================================
// LABEL TYPES
// ============================================================================

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface TaskLabel {
  id: string;
  taskId: string;
  labelId: string;
  label: Label;
  assignedAt: string;
}

// Predefined label colors
export const LABEL_COLORS = [
  { name: 'Red', value: 'var(--ds-text-danger, var(--ds-text-danger, #dc2626))' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: 'var(--ds-text-success, var(--ds-text-success, #16a34a))' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))' },
  { name: 'Lime', value: '#84cc16' }
];
