export type HealthStatus = 'on_track' | 'at_risk' | 'off_track';
export type BusinessValue = 'high' | 'medium' | 'low';

export const HEALTH_STATUS_CONFIG: Record<HealthStatus, {
  hex: string;
  bg: string;
  label: string;
}> = {
  on_track: { hex: '#16A34A', bg: '#F0FDF4', label: 'On Track' },
  at_risk: { hex: '#D97706', bg: '#FFFBEB', label: 'At Risk' },
  off_track: { hex: '#EF4444', bg: '#FEF2F2', label: 'Off Track' },
};

export interface RoadmapSummaryStats {
  total_on_roadmap: number;
  total_not_on_roadmap: number;
  total_initiatives: number;
  roadmap_projects: number;
  roadmap_enhancements: number;
  roadmap_improvements: number;
  roadmap_on_track: number;
  roadmap_at_risk: number;
  roadmap_off_track: number;
}
