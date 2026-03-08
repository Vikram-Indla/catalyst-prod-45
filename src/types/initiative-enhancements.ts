export type InitiativeTypeKey = 'project' | 'enhancement' | 'improvement' | 'entity_integration' | 'business_request';
export type HealthStatus = 'on_track' | 'at_risk' | 'off_track';
export type BusinessValue = 'high' | 'medium' | 'low';

export interface InitiativeType {
  id: string;
  key: InitiativeTypeKey;
  label: string;
  description: string | null;
  icon: string;
  color_token: string;
  color_hex: string;
  sort_order: number;
  is_active: boolean;
}

export const INITIATIVE_TYPE_COLORS: Record<InitiativeTypeKey, {
  hex: string;
  bg: string;
  text: string;
  border: string;
  gradient: string;
}> = {
  project: {
    hex: '#2563EB',
    bg: '#EFF6FF',
    text: '#1E40AF',
    border: '#1D4ED8',
    gradient: 'linear-gradient(90deg, #2563EB, #3B82F6)',
  },
  enhancement: {
    hex: '#0D9488',
    bg: '#F0FDFA',
    text: '#0F766E',
    border: '#0F766E',
    gradient: 'linear-gradient(90deg, #0D9488, #14B8A6)',
  },
  improvement: {
    hex: '#D97706',
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#B45309',
    gradient: 'linear-gradient(90deg, #D97706, #F59E0B)',
  },
  business_request: {
    hex: '#B45309',
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#D97706',
    gradient: 'linear-gradient(90deg, #D97706, #F59E0B)',
  },
  entity_integration: {
    hex: '#8B5CF6',
    bg: '#F5F3FF',
    text: '#6D28D9',
    border: '#7C3AED',
    gradient: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
  },
};

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
