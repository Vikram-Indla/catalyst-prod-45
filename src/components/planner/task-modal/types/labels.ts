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
  { name: 'Red', value: 'var(--ds-text-danger)' },
  { name: 'Orange', value: 'var(--ds-background-warning-bold)' },
  { name: 'Yellow', value: 'var(--ds-background-warning-bold)' },
  { name: 'Green', value: 'var(--ds-text-success)' },
  { name: 'Teal', value: 'var(--ds-background-accent-teal-bolder)' },
  { name: 'Cyan', value: 'var(--ds-icon-information)' },
  { name: 'Blue', value: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  { name: 'Indigo', value: 'var(--ds-background-discovery-bold)' },
  { name: 'Purple', value: 'var(--ds-background-discovery-bold)' },
  { name: 'Pink', value: 'var(--ds-background-accent-magenta-bolder)' },
  { name: 'Gray', value: 'var(--ds-text-subtlest)' },
  { name: 'Lime', value: 'var(--ds-background-success-bold)' }
];
