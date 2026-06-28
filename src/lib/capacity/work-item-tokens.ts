/**
 * Work Item Design Tokens for Capacity Module
 * Consistent colors and styling across the 360° drawer
 */

export const CategoryColors = {
  enterprise: { border: 'var(--ds-background-success-bold, #4d8b4d)', bg: 'rgba(77, 139, 77, 0.08)', text: 'var(--ds-background-success-bold, var(--ds-background-success-bold, #1F845A))' },
  program: { border: 'var(--ds-link, #2563eb)', bg: 'var(--ds-background-information, rgba(37, 99, 235, 0.08))', text: 'var(--ds-link, #2563eb)' },
  project: { border: 'var(--ds-chart-teal-bold, #0d9488)', bg: 'var(--ds-background-success, rgba(13, 148, 136, 0.08))', text: 'var(--ds-chart-teal-bold, #0d9488)' },
  product: { border: 'var(--ds-background-success-bold, #1F845A)', bg: 'var(--ds-background-success-bold, rgba(34, 197, 94, 0.08))', text: 'var(--ds-background-success-bold, var(--ds-background-success-bold, #1F845A))' },
} as const;

export const WorkItemColors: Record<string, { bg: string; text: string; ring: string }> = {
  theme: { bg: 'rgba(77, 139, 77, 0.12)', text: 'var(--ds-background-success-bold, var(--ds-background-success-bold, #1F845A))', ring: 'var(--ds-background-success-bold, var(--ds-background-success-bold, #1F845A))' },
  objective: { bg: 'rgba(107, 114, 128, 0.12)', text: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #626F86))', ring: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #626F86))' },
  key_result: { bg: 'rgba(212, 184, 150, 0.12)', text: 'var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle, #F7F8F9))', ring: 'var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle, #F7F8F9))' },
  epic: { bg: 'var(--ds-background-information, rgba(37, 99, 235, 0.12))', text: 'var(--ds-link, #2563eb)', ring: 'var(--ds-link, #2563eb)' },
  feature: { bg: 'var(--ds-background-success, rgba(13, 148, 136, 0.12))', text: 'var(--ds-chart-teal-bold, #0d9488)', ring: 'var(--ds-chart-teal-bold, #0d9488)' },
  story: { bg: 'rgba(139, 115, 85, 0.12)', text: 'var(--ds-text-subtle, #8B7355)', ring: 'var(--ds-text-subtle, #8B7355)' },
  defect: { bg: 'var(--ds-background-danger-bold, rgba(220, 38, 38, 0.12))', text: 'var(--ds-background-danger-bold, #dc2626)', ring: 'var(--ds-background-danger-bold, #dc2626)' },
  incident: { bg: 'var(--ds-background-danger-bold, rgba(220, 38, 38, 0.12))', text: 'var(--ds-background-danger-bold, #dc2626)', ring: 'var(--ds-background-danger-bold, #dc2626)' },
  business_request: { bg: 'var(--ds-background-success-bold, rgba(34, 197, 94, 0.12))', text: 'var(--ds-background-success-bold, var(--ds-background-success-bold, #1F845A))', ring: 'var(--ds-background-success-bold, var(--ds-background-success-bold, #1F845A))' },
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
