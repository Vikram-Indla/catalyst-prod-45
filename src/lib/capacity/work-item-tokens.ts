/**
 * Work Item Design Tokens for Capacity Module
 * Consistent colors and styling across the 360° drawer
 */

export const CategoryColors = {
  enterprise: { border: '#4d8b4d', bg: 'rgba(77, 139, 77, 0.08)', text: '#4d8b4d' },
  program: { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)', text: '#2563eb' },
  project: { border: '#0d9488', bg: 'rgba(13, 148, 136, 0.08)', text: '#0d9488' },
  product: { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.08)', text: '#22c55e' },
} as const;

export const WorkItemColors: Record<string, { bg: string; text: string; ring: string }> = {
  theme: { bg: 'rgba(77, 139, 77, 0.12)', text: '#4d8b4d', ring: '#4d8b4d' },
  objective: { bg: 'rgba(107, 114, 128, 0.12)', text: '#6b7280', ring: '#6b7280' },
  key_result: { bg: 'rgba(212, 184, 150, 0.12)', text: '#d4b896', ring: '#d4b896' },
  epic: { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563eb', ring: '#2563eb' },
  feature: { bg: 'rgba(13, 148, 136, 0.12)', text: '#0d9488', ring: '#0d9488' },
  story: { bg: 'rgba(139, 115, 85, 0.12)', text: '#8b7355', ring: '#8b7355' },
  defect: { bg: 'rgba(220, 38, 38, 0.12)', text: '#dc2626', ring: '#dc2626' },
  incident: { bg: 'rgba(220, 38, 38, 0.12)', text: '#dc2626', ring: '#dc2626' },
  business_request: { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e', ring: '#22c55e' },
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
