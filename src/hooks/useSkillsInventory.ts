// src/hooks/useSkillsInventory.ts
// Data fetching and mutation hooks for Skills Inventory
// Using mock data until database tables are created

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Skill, 
  TeamMemberSkill, 
  Certification, 
  SkillRequirement,
  SkillsInventoryStats,
  SkillInventoryRow,
  SkillGapAnalysis,
  SkillMatrixCell,
  SkillProficiencyLevel,
  TeamMember,
  PROFICIENCY_LEVELS
} from "@/types/skills";

// ============================================
// MOCK DATA
// ============================================

const mockSkills: Skill[] = [
  { id: '1', name: 'React', category: 'technical', is_active: true, created_at: '', updated_at: '' },
  { id: '2', name: 'TypeScript', category: 'technical', is_active: true, created_at: '', updated_at: '' },
  { id: '3', name: 'Node.js', category: 'technical', is_active: true, created_at: '', updated_at: '' },
  { id: '4', name: 'AWS', category: 'cloud_infrastructure', is_active: true, created_at: '', updated_at: '' },
  { id: '5', name: 'Python', category: 'technical', is_active: true, created_at: '', updated_at: '' },
  { id: '6', name: 'Kubernetes', category: 'cloud_infrastructure', is_active: true, created_at: '', updated_at: '' },
  { id: '7', name: 'SQL', category: 'data_analytics', is_active: true, created_at: '', updated_at: '' },
  { id: '8', name: 'Agile/Scrum', category: 'methodology', is_active: true, created_at: '', updated_at: '' },
];

const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'Ahmed Al-Rashid', email: 'ahmed@example.com', role: 'Senior Developer', is_active: true },
  { id: '2', name: 'Sarah Chen', email: 'sarah@example.com', role: 'Tech Lead', is_active: true },
  { id: '3', name: 'Mohammed Hassan', email: 'mohammed@example.com', role: 'DevOps Engineer', is_active: true },
  { id: '4', name: 'Fatima Al-Zahrani', email: 'fatima@example.com', role: 'Full Stack Developer', is_active: true },
  { id: '5', name: 'Omar Ibrahim', email: 'omar@example.com', role: 'Data Engineer', is_active: true },
];

const mockTeamMemberSkills: TeamMemberSkill[] = [
  { id: '1', team_member_id: '1', skill_id: '1', proficiency_level: 'expert', is_primary_skill: true, self_assessed: true, manager_verified: true, created_at: '', updated_at: '' },
  { id: '2', team_member_id: '1', skill_id: '2', proficiency_level: 'advanced', is_primary_skill: false, self_assessed: true, manager_verified: true, created_at: '', updated_at: '' },
  { id: '3', team_member_id: '2', skill_id: '1', proficiency_level: 'expert', is_primary_skill: true, self_assessed: true, manager_verified: true, created_at: '', updated_at: '' },
  { id: '4', team_member_id: '2', skill_id: '4', proficiency_level: 'advanced', is_primary_skill: false, self_assessed: true, manager_verified: false, created_at: '', updated_at: '' },
  { id: '5', team_member_id: '3', skill_id: '4', proficiency_level: 'expert', is_primary_skill: true, self_assessed: true, manager_verified: true, created_at: '', updated_at: '' },
  { id: '6', team_member_id: '3', skill_id: '6', proficiency_level: 'expert', is_primary_skill: false, self_assessed: true, manager_verified: true, created_at: '', updated_at: '' },
  { id: '7', team_member_id: '4', skill_id: '1', proficiency_level: 'advanced', is_primary_skill: true, self_assessed: true, manager_verified: false, created_at: '', updated_at: '' },
  { id: '8', team_member_id: '4', skill_id: '3', proficiency_level: 'intermediate', is_primary_skill: false, self_assessed: true, manager_verified: false, created_at: '', updated_at: '' },
  { id: '9', team_member_id: '5', skill_id: '5', proficiency_level: 'expert', is_primary_skill: true, self_assessed: true, manager_verified: true, created_at: '', updated_at: '' },
  { id: '10', team_member_id: '5', skill_id: '7', proficiency_level: 'advanced', is_primary_skill: false, self_assessed: true, manager_verified: true, created_at: '', updated_at: '' },
];

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all skills from the catalog
 */
export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      return mockSkills;
    }
  });
}

/**
 * Fetch skills for a specific team member or all members
 */
export function useTeamMemberSkills(teamMemberId?: string) {
  return useQuery({
    queryKey: ['team-member-skills', teamMemberId],
    queryFn: async () => {
      let skills = mockTeamMemberSkills.map(s => ({
        ...s,
        skill: mockSkills.find(sk => sk.id === s.skill_id),
        team_member: mockTeamMembers.find(tm => tm.id === s.team_member_id)
      }));
      
      if (teamMemberId) {
        skills = skills.filter(s => s.team_member_id === teamMemberId);
      }
      
      return skills as TeamMemberSkill[];
    }
  });
}

/**
 * Fetch certifications for a team member
 */
export function useCertifications(teamMemberId?: string) {
  return useQuery({
    queryKey: ['certifications', teamMemberId],
    queryFn: async () => {
      // Return empty array for now - no mock certifications
      return [] as Certification[];
    }
  });
}

/**
 * Fetch skill requirements for an entity (program, feature, epic, team)
 */
export function useSkillRequirements(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['skill-requirements', entityType, entityId],
    queryFn: async () => {
      // Return empty array for now
      return [] as SkillRequirement[];
    },
    enabled: !!entityType && !!entityId
  });
}

/**
 * Calculate skills inventory stats
 */
export function useSkillsInventoryStats() {
  return useQuery({
    queryKey: ['skills-inventory-stats'],
    queryFn: async () => {
      return {
        total_skills_tracked: mockTeamMemberSkills.length,
        total_team_members: mockTeamMembers.length,
        average_coverage: 78,
        critical_gaps: 2,
        total_certifications: 12,
        expiring_certifications: 3
      } as SkillsInventoryStats;
    }
  });
}

/**
 * Fetch inventory table data with member aggregations
 */
export function useSkillsInventoryTable(filters: {
  program_id?: string;
  team_id?: string;
  category?: string;
  search_query?: string;
}) {
  return useQuery({
    queryKey: ['skills-inventory-table', filters],
    queryFn: async () => {
      let members = [...mockTeamMembers];
      
      if (filters.search_query) {
        members = members.filter(m => 
          m.name.toLowerCase().includes(filters.search_query!.toLowerCase())
        );
      }

      const rows: SkillInventoryRow[] = members.map(member => {
        const memberSkills = mockTeamMemberSkills.filter(s => s.team_member_id === member.id);
        const primarySkillRecord = memberSkills.find(s => s.is_primary_skill);
        const primarySkill = primarySkillRecord ? {
          ...primarySkillRecord,
          skill: mockSkills.find(sk => sk.id === primarySkillRecord.skill_id)
        } : undefined;

        const qualifiedSkills = memberSkills.filter(s => 
          PROFICIENCY_LEVELS[s.proficiency_level].value >= 3
        ).length;
        const coverage = memberSkills.length > 0 
          ? Math.round((qualifiedSkills / memberSkills.length) * 100) 
          : 0;

        return {
          team_member: member,
          primary_skill: primarySkill as TeamMemberSkill | undefined,
          total_skills: memberSkills.length,
          expert_skills: memberSkills.filter(s => s.proficiency_level === 'expert').length,
          certifications_count: Math.floor(Math.random() * 5),
          coverage_percentage: coverage,
          last_updated: new Date().toISOString()
        };
      });

      return rows;
    }
  });
}

/**
 * Build skills matrix data for heatmap
 */
export function useSkillsMatrix(teamId?: string) {
  return useQuery({
    queryKey: ['skills-matrix', teamId],
    queryFn: async () => {
      const matrixData: SkillMatrixCell[] = mockTeamMemberSkills.map(ts => ({
        team_member_id: ts.team_member_id,
        skill_id: ts.skill_id,
        proficiency_level: ts.proficiency_level,
        proficiency_value: PROFICIENCY_LEVELS[ts.proficiency_level].value
      }));

      return {
        members: mockTeamMembers,
        skills: mockSkills,
        matrixData
      };
    },
    enabled: true
  });
}

/**
 * Calculate skill gaps for a team
 */
export function useSkillGapAnalysis(teamId?: string) {
  return useQuery({
    queryKey: ['skill-gap-analysis', teamId],
    queryFn: async () => {
      // Mock gap analysis
      const gaps: SkillGapAnalysis[] = [
        {
          skill: mockSkills[5], // Kubernetes
          required_count: 3,
          current_count: 1,
          gap: -2,
          gap_percentage: -67,
          severity: 'critical',
          team_members_with_skill: [mockTeamMembers[2]]
        },
        {
          skill: mockSkills[4], // Python
          required_count: 2,
          current_count: 1,
          gap: -1,
          gap_percentage: -50,
          severity: 'warning',
          team_members_with_skill: [mockTeamMembers[4]]
        }
      ];

      return gaps;
    },
    enabled: true
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Add a skill to a team member
 */
export function useAddTeamMemberSkill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      team_member_id: string;
      skill_id: string;
      proficiency_level: SkillProficiencyLevel;
      years_experience?: number;
      is_primary_skill?: boolean;
      notes?: string;
    }) => {
      // Mock mutation - in real implementation would call Supabase
      console.log('Adding skill:', data);
      return { id: Date.now().toString(), ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-skills'] });
      queryClient.invalidateQueries({ queryKey: ['skills-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['skills-inventory-stats'] });
    }
  });
}

/**
 * Update a team member's skill
 */
export function useUpdateTeamMemberSkill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      ...data 
    }: {
      id: string;
      proficiency_level?: SkillProficiencyLevel;
      years_experience?: number;
      is_primary_skill?: boolean;
      notes?: string;
      manager_verified?: boolean;
    }) => {
      console.log('Updating skill:', id, data);
      return { id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-skills'] });
      queryClient.invalidateQueries({ queryKey: ['skills-inventory-table'] });
    }
  });
}

/**
 * Delete a team member's skill
 */
export function useDeleteTeamMemberSkill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting skill:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-skills'] });
      queryClient.invalidateQueries({ queryKey: ['skills-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['skills-inventory-stats'] });
    }
  });
}

/**
 * Add a certification
 */
export function useAddCertification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      team_member_id: string;
      skill_id?: string;
      name: string;
      issuing_organization?: string;
      credential_id?: string;
      issue_date?: string;
      expiry_date?: string;
      credential_url?: string;
    }) => {
      console.log('Adding certification:', data);
      return { id: Date.now().toString(), ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['skills-inventory-stats'] });
    }
  });
}

/**
 * Create or update a skill in the catalog
 */
export function useUpsertSkill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      id?: string;
      name: string;
      name_ar?: string;
      description?: string;
      category: string;
    }) => {
      console.log('Upserting skill:', data);
      return { id: data.id || Date.now().toString(), ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    }
  });
}

/**
 * Add skill requirement to an entity
 */
export function useAddSkillRequirement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      skill_id: string;
      entity_type: string;
      entity_id: string;
      required_proficiency: SkillProficiencyLevel;
      required_count?: number;
      priority?: string;
    }) => {
      console.log('Adding skill requirement:', data);
      return { id: Date.now().toString(), ...data };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['skill-requirements', variables.entity_type, variables.entity_id] 
      });
    }
  });
}
