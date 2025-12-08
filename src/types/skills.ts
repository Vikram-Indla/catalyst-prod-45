// Enums
export type SkillProficiencyLevel = 'awareness' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SkillCategory = 'technical' | 'cloud_infrastructure' | 'data_analytics' | 'security' | 'leadership' | 'soft_skills' | 'domain_knowledge' | 'methodology';

// Database Models
export interface Skill {
  id: string;
  name: string;
  name_ar?: string;
  description?: string;
  category: SkillCategory;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  notes?: string;
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
}

export interface SkillRequirement {
  id: string;
  skill_id: string;
  entity_type: 'program' | 'feature' | 'epic' | 'team';
  entity_id: string;
  required_proficiency: SkillProficiencyLevel;
  required_count: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  skill?: Skill;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  team_id?: string;
  avatar_url?: string;
  is_active: boolean;
}

// View Models
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
  proficiency_value: number;
}

export interface SkillGapItem {
  skill: Skill;
  required_count: number;
  current_count: number;
  gap: number;
  gap_percentage: number;
  severity: 'critical' | 'warning' | 'healthy';
}

export interface SkillsInventoryStats {
  total_skills_tracked: number;
  total_team_members: number;
  average_coverage: number;
  critical_gaps: number;
  total_certifications: number;
  expiring_certifications: number;
  expert_count: number;
}

// Constants
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
    description: 'Basic knowledge, no practical experience'
  },
  beginner: {
    label: 'Beginner',
    label_ar: 'مبتدئ',
    value: 2,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    description: 'Limited experience, needs guidance'
  },
  intermediate: {
    label: 'Intermediate',
    label_ar: 'متوسط',
    value: 3,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    description: 'Competent, works independently'
  },
  advanced: {
    label: 'Advanced',
    label_ar: 'متقدم',
    value: 4,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    description: 'Highly proficient, can mentor others'
  },
  expert: {
    label: 'Expert',
    label_ar: 'خبير',
    value: 5,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    description: 'Industry-leading expertise'
  }
};

export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; label_ar: string; icon: string }> = {
  technical: { label: 'Technical', label_ar: 'تقني', icon: 'Code' },
  cloud_infrastructure: { label: 'Cloud & Infrastructure', label_ar: 'السحابة والبنية التحتية', icon: 'Cloud' },
  data_analytics: { label: 'Data & Analytics', label_ar: 'البيانات والتحليلات', icon: 'BarChart3' },
  security: { label: 'Security', label_ar: 'الأمان', icon: 'Shield' },
  leadership: { label: 'Leadership', label_ar: 'القيادة', icon: 'Users' },
  soft_skills: { label: 'Soft Skills', label_ar: 'المهارات الشخصية', icon: 'Heart' },
  domain_knowledge: { label: 'Domain Knowledge', label_ar: 'المعرفة التخصصية', icon: 'BookOpen' },
  methodology: { label: 'Methodology', label_ar: 'المنهجية', icon: 'GitBranch' }
};
