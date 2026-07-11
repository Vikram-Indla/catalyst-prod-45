/**
 * Work Item Design Tokens for Capacity Module
 * Consistent colors and styling across the 360° drawer
 */

export const CategoryColors = {
  enterprise: { border: 'var(--ds-background-success-bold)', bg: 'rgba(77, 139, 77, 0.08)', text: 'var(--ds-background-success-bold, var(--ds-background-success-bold))' },
  program: { border: 'var(--ds-link)', bg: 'var(--ds-background-information)', text: 'var(--ds-link)' },
  project: { border: 'var(--ds-chart-teal-bold)', bg: 'var(--ds-background-success)', text: 'var(--ds-chart-teal-bold)' },
  product: { border: 'var(--ds-background-success-bold)', bg: 'var(--ds-background-success-bold)', text: 'var(--ds-background-success-bold, var(--ds-background-success-bold))' },
} as const;

export const WorkItemColors: Record<string, { bg: string; text: string; ring: string }> = {
  theme: { bg: 'rgba(77, 139, 77, 0.12)', text: 'var(--ds-background-success-bold, var(--ds-background-success-bold))', ring: 'var(--ds-background-success-bold, var(--ds-background-success-bold))' },
  objective: { bg: 'rgba(107, 114, 128, 0.12)', text: 'var(--ds-text-subtlest, var(--ds-text-subtlest))', ring: 'var(--ds-text-subtlest, var(--ds-text-subtlest))' },
  key_result: { bg: 'rgba(212, 184, 150, 0.12)', text: 'var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle))', ring: 'var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle))' },
  epic: { bg: 'var(--ds-background-information)', text: 'var(--ds-link)', ring: 'var(--ds-link)' },
  feature: { bg: 'var(--ds-background-success)', text: 'var(--ds-chart-teal-bold)', ring: 'var(--ds-chart-teal-bold)' },
  story: { bg: 'rgba(139, 115, 85, 0.12)', text: 'var(--ds-text-subtle)', ring: 'var(--ds-text-subtle)' },
  defect: { bg: 'var(--ds-background-danger-bold)', text: 'var(--ds-background-danger-bold)', ring: 'var(--ds-background-danger-bold)' },
  incident: { bg: 'var(--ds-background-danger-bold)', text: 'var(--ds-background-danger-bold)', ring: 'var(--ds-background-danger-bold)' },
  business_request: { bg: 'var(--ds-background-success-bold)', text: 'var(--ds-background-success-bold, var(--ds-background-success-bold))', ring: 'var(--ds-background-success-bold, var(--ds-background-success-bold))' },
};

export function getWorkItemCategory(type: string): keyof typeof CategoryColors {
  const map: Record<string, keyof typeof CategoryColors> = {
    theme: 'enterprise',
    objective: 'enterprise',
    key_result: 'enterprise',
    epic: 'program',
    feature: 'program',
    story: 'project',
    defect: 'project',
    incident: 'project',
    business_request: 'product',
  };
  return map[type] || 'project';
}

export function formatWorkItemType(type: string): string {
  const names: Record<string, string> = {
    theme: 'Theme',
    objective: 'Objective',
    key_result: 'Key Result',
    epic: 'Epic',
    feature: 'Feature',
    story: 'Story',
    defect: 'Defect',
    incident: 'Incident',
    business_request: 'Business Request',
  };
  return names[type] || type;
}
