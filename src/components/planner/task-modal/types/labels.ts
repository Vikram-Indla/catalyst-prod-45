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
  { name: 'Red', value: 'var(--ds-text-danger, #dc2626)' },
  { name: 'Orange', value: 'var(--ds-background-warning-bold, #f97316)' },
  { name: 'Yellow', value: 'var(--ds-background-warning-bold, #E2B203)' },
  { name: 'Green', value: 'var(--ds-text-success, #16a34a)' },
  { name: 'Teal', value: 'var(--ds-background-accent-teal-bolder, #14b8a6)' },
  { name: 'Cyan', value: 'var(--ds-icon-information, #1D7AFC)' },
  { name: 'Blue', value: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))' },
  { name: 'Indigo', value: 'var(--ds-background-discovery-bold, #6366f1)' },
  { name: 'Purple', value: 'var(--ds-background-discovery-bold, #8b5cf6)' },
  { name: 'Pink', value: 'var(--ds-background-accent-magenta-bolder, #ec4899)' },
  { name: 'Gray', value: 'var(--ds-text-subtlest, #64748b)' },
  { name: 'Lime', value: 'var(--ds-background-success-bold, #1F845A)' }
];
