// src/types/skills.ts
// Skills Inventory Type Definitions for Catalyst

// ============================================
// ENUMS / UNION TYPES
// ============================================

export type SkillProficiencyLevel = 
  | 'awareness'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type SkillCategory =
  | 'technical'
  | 'cloud_infrastructure'
  | 'data_analytics'
  | 'security'
  | 'leadership'
  | 'soft_skills'
  | 'domain_knowledge'
  | 'methodology';

// ============================================
// DATABASE MODELS
// ============================================

export interface Skill {
  id: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  category: SkillCategory;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TeamMemberSkill {
  id: string;
  team_member_id: string;
  skill_id: string;
  proficiency_level: SkillProficiencyLevel;
  years_experience?: number;
  is_primary_skill: boolean;
  self_assessed: boolean;
  manager_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  last_used_date?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  skill?: Skill;
  team_member?: TeamMember;
}

export interface Certification {
  id: string;
  team_member_id: string;
  skill_id?: string;
  name: string;
  issuing_organization?: string;
  credential_id?: string;
  issue_date?: string;
  expiry_date?: string;
  credential_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  skill?: Skill;
}

export interface SkillRequirement {
  id: string;
  skill_id: string;
  entity_type: 'program' | 'feature' | 'epic' | 'team';
  entity_id: string;
  required_proficiency: SkillProficiencyLevel;
  required_count: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  skill?: Skill;
}

export interface TeamMember {
  id: string;
  name: string;
  name_ar?: string;
  email: string;
  role: string;
  team_id?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
}

// ============================================
// VIEW MODELS / UI TYPES
// ============================================

export interface SkillInventoryRow {
  team_member: TeamMember;
  primary_skill?: TeamMemberSkill;
  total_skills: number;
  expert_skills: number;
  certifications_count: number;
  coverage_percentage: number;
  last_updated: string;
}

export interface SkillMatrixCell {
  team_member_id: string;
  skill_id: string;
  proficiency_level: SkillProficiencyLevel;
  proficiency_value: number; // 1-5
}

export interface SkillGapAnalysis {
  skill: Skill;
  required_count: number;
  current_count: number;
  gap: number;
  gap_percentage: number;
  severity: 'critical' | 'warning' | 'healthy';
  team_members_with_skill: TeamMember[];
}

export interface SkillsInventoryStats {
  total_skills_tracked: number;
  total_team_members: number;
  average_coverage: number;
  critical_gaps: number;
  total_certifications: number;
  expiring_certifications: number;
}

export interface TeamCoverageItem {
  skill: Skill;
  coverage: number;
  memberCount: number;
  totalMembers: number;
}

export interface CriticalGapItem {
  skill: Skill;
  severity: 'critical' | 'warning' | 'healthy';
  required_for: string;
  current_coverage: number;
  recommendation: string;
}

// ============================================
// FILTER TYPES
// ============================================

export interface SkillsInventoryFilters {
  program_id?: string;
  team_id?: string;
  category?: SkillCategory;
  proficiency_levels?: SkillProficiencyLevel[];
  search_query?: string;
}

// ============================================
// FORM DATA TYPES
// ============================================

export interface SkillAssessmentFormData {
  team_member_id: string;
  skill_name: string;
  skill_category: SkillCategory;
  proficiency_level: SkillProficiencyLevel;
  years_experience?: number;
  certification_name?: string;
  notes?: string;
}

export interface CertificationFormData {
  team_member_id: string;
  skill_id?: string;
  name: string;
  issuing_organization?: string;
  credential_id?: string;
  issue_date?: string;
  expiry_date?: string;
  credential_url?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const PROFICIENCY_LEVELS: Record<SkillProficiencyLevel, {
  label: string;
  label_ar: string;
  value: number;
  color: string;
  bgColor: string;
  description: string;
}> = {
  awareness: {
    label: 'Awareness',
    label_ar: 'وعي',
    value: 1,
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.2)',
    description: 'Basic knowledge and understanding, no practical experience'
  },
  beginner: {
    label: 'Beginner',
    label_ar: 'مبتدئ',
    value: 2,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    description: 'Limited experience, needs guidance and support'
  },
  intermediate: {
    label: 'Intermediate',
    label_ar: 'متوسط',
    value: 3,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    description: 'Competent, can work independently on most tasks'
  },
  advanced: {
    label: 'Advanced',
    label_ar: 'متقدم',
    value: 4,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    description: 'Highly proficient, can mentor others and handle complex cases'
  },
  expert: {
    label: 'Expert',
    label_ar: 'خبير',
    value: 5,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    description: 'Industry-leading expertise, thought leader in the area'
  }
};

export const SKILL_CATEGORIES: Record<SkillCategory, {
  label: string;
  label_ar: string;
  icon: string;
  description: string;
}> = {
  technical: { 
    label: 'Technical', 
    label_ar: 'تقني', 
    icon: 'Code',
    description: 'Programming, development, and technical skills'
  },
  cloud_infrastructure: { 
    label: 'Cloud & Infrastructure', 
    label_ar: 'السحابة والبنية التحتية', 
    icon: 'Cloud',
    description: 'Cloud platforms, DevOps, and infrastructure management'
  },
  data_analytics: { 
    label: 'Data & Analytics', 
    label_ar: 'البيانات والتحليلات', 
    icon: 'BarChart3',
    description: 'Data engineering, analytics, and machine learning'
  },
  security: { 
    label: 'Security', 
    label_ar: 'الأمان', 
    icon: 'Shield',
    description: 'Cybersecurity, compliance, and risk management'
  },
  leadership: { 
    label: 'Leadership', 
    label_ar: 'القيادة', 
    icon: 'Users',
    description: 'Team leadership, management, and strategic thinking'
  },
  soft_skills: { 
    label: 'Soft Skills', 
    label_ar: 'المهارات الشخصية', 
    icon: 'Heart',
    description: 'Communication, collaboration, and interpersonal skills'
  },
  domain_knowledge: { 
    label: 'Domain Knowledge', 
    label_ar: 'المعرفة التخصصية', 
    icon: 'BookOpen',
    description: 'Industry-specific and domain expertise'
  },
  methodology: { 
    label: 'Methodology', 
    label_ar: 'المنهجية', 
    icon: 'GitBranch',
    description: 'Agile, SAFe, and process methodologies'
  }
};

export const PRIORITY_LEVELS: Record<string, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  critical: {
    label: 'Critical',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)'
  },
  high: {
    label: 'High',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)'
  },
  medium: {
    label: 'Medium',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)'
  },
  low: {
    label: 'Low',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)'
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getProficiencyColor(level: SkillProficiencyLevel): string {
  return PROFICIENCY_LEVELS[level].color;
}

export function getProficiencyBgColor(level: SkillProficiencyLevel): string {
  return PROFICIENCY_LEVELS[level].bgColor;
}

export function getProficiencyValue(level: SkillProficiencyLevel): number {
  return PROFICIENCY_LEVELS[level].value;
}

export function getCategoryIcon(category: SkillCategory): string {
  return SKILL_CATEGORIES[category].icon;
}

export function calculateCoverage(
  memberSkills: TeamMemberSkill[], 
  minProficiency: SkillProficiencyLevel = 'intermediate'
): number {
  if (memberSkills.length === 0) return 0;
  
  const minValue = PROFICIENCY_LEVELS[minProficiency].value;
  const qualifiedSkills = memberSkills.filter(
    s => PROFICIENCY_LEVELS[s.proficiency_level].value >= minValue
  );
  
  return Math.round((qualifiedSkills.length / memberSkills.length) * 100);
}

export function getGapSeverity(gap: number): 'critical' | 'warning' | 'healthy' {
  if (gap < -2) return 'critical';
  if (gap < 0) return 'warning';
  return 'healthy';
}
