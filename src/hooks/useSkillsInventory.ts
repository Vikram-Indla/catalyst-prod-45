import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Skill, 
  TeamMemberSkill, 
  Certification, 
  SkillsInventoryStats,
  SkillProficiencyLevel,
  SkillCategory
} from '@/types/skills';

// ============ Queries ============

export const useSkills = () => {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async (): Promise<Skill[]> => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      return (data || []).map(skill => ({
        ...skill,
        category: skill.category as SkillCategory,
      }));
    },
  });
};

export const useTeamMemberSkills = (teamMemberId?: string) => {
  return useQuery({
    queryKey: ['team_member_skills', teamMemberId],
    queryFn: async () => {
      let query = supabase
        .from('team_member_skills')
        .select(`
          *,
          skill:skills(*),
          team_member:team_members(
            id,
            user_id,
            team_id,
            role,
            allocation_percentage
          )
        `)
        .order('created_at', { ascending: false });

      if (teamMemberId) {
        query = query.eq('team_member_id', teamMemberId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        team_member_id: item.team_member_id,
        skill_id: item.skill_id,
        proficiency_level: item.proficiency_level as SkillProficiencyLevel,
        years_experience: item.years_experience,
        is_primary_skill: item.is_primary_skill,
        self_assessed: item.self_assessed,
        manager_verified: item.manager_verified,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        skill: item.skill ? {
          ...item.skill,
          category: item.skill.category as SkillCategory,
        } : undefined,
        team_member: item.team_member ? {
          id: item.team_member.id,
          name: item.team_member.role || 'Unknown',
          email: '',
          role: item.team_member.role || '',
          team_id: item.team_member.team_id,
          is_active: true,
        } : undefined,
      }));
    },
  });
};

export const useCertifications = (teamMemberId?: string) => {
  return useQuery({
    queryKey: ['certifications', teamMemberId],
    queryFn: async (): Promise<Certification[]> => {
      let query = supabase
        .from('certifications')
        .select('*')
        .order('issue_date', { ascending: false });

      if (teamMemberId) {
        query = query.eq('team_member_id', teamMemberId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
};

export const useSkillsInventoryStats = () => {
  return useQuery({
    queryKey: ['skills_inventory_stats'],
    queryFn: async (): Promise<SkillsInventoryStats> => {
      // Get team member skills
      const { data: memberSkills, error: skillsError } = await supabase
        .from('team_member_skills')
        .select('id, team_member_id, proficiency_level');

      if (skillsError) throw skillsError;

      // Get certifications
      const { data: certifications, error: certsError } = await supabase
        .from('certifications')
        .select('id, expiry_date');

      if (certsError) throw certsError;

      // Get skill requirements for gap analysis
      const { data: requirements, error: reqError } = await supabase
        .from('skill_requirements')
        .select('skill_id, required_count');

      if (reqError) throw reqError;

      // Calculate stats
      const totalSkillsTracked = memberSkills?.length || 0;
      
      const uniqueMembers = new Set(memberSkills?.map(s => s.team_member_id) || []);
      const totalTeamMembers = uniqueMembers.size;

      // Calculate expert count
      const expertCount = memberSkills?.filter(
        s => s.proficiency_level === 'expert'
      ).length || 0;

      // Calculate average coverage (skills at intermediate or above / total skills per member)
      const intermediateOrAbove = ['intermediate', 'advanced', 'expert'];
      const qualifiedSkills = memberSkills?.filter(
        s => intermediateOrAbove.includes(s.proficiency_level)
      ).length || 0;
      const averageCoverage = totalSkillsTracked > 0 
        ? Math.round((qualifiedSkills / totalSkillsTracked) * 100) 
        : 0;

      // Count certifications
      const totalCertifications = certifications?.length || 0;

      // Count expiring certifications (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringCertifications = certifications?.filter(c => {
        if (!c.expiry_date) return false;
        const expiryDate = new Date(c.expiry_date);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
      }).length || 0;

      // Calculate critical gaps
      // Group member skills by skill_id and count
      const skillCounts: Record<string, number> = {};
      memberSkills?.forEach(ms => {
        // Only count intermediate and above as "having" the skill
        if (intermediateOrAbove.includes(ms.proficiency_level)) {
          const skillId = (ms as any).skill_id;
          if (skillId) {
            skillCounts[skillId] = (skillCounts[skillId] || 0) + 1;
          }
        }
      });

      const criticalGaps = requirements?.filter(req => {
        const currentCount = skillCounts[req.skill_id] || 0;
        return req.required_count > currentCount;
      }).length || 0;

      return {
        total_skills_tracked: totalSkillsTracked,
        total_team_members: totalTeamMembers,
        average_coverage: averageCoverage,
        critical_gaps: criticalGaps,
        total_certifications: totalCertifications,
        expiring_certifications: expiringCertifications,
        expert_count: expertCount,
      };
    },
  });
};

// ============ Mutations ============

interface AddTeamMemberSkillInput {
  team_member_id: string;
  skill_id: string;
  proficiency_level: SkillProficiencyLevel;
  years_experience?: number;
  is_primary_skill?: boolean;
  self_assessed?: boolean;
  manager_verified?: boolean;
  notes?: string;
}

export const useAddTeamMemberSkill = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: AddTeamMemberSkillInput) => {
      const { data, error } = await supabase
        .from('team_member_skills')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_member_skills'] });
      queryClient.invalidateQueries({ queryKey: ['skills_inventory_stats'] });
      toast({
        title: 'Skill added',
        description: 'The skill has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding skill',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

interface UpdateTeamMemberSkillInput {
  id: string;
  proficiency_level?: SkillProficiencyLevel;
  years_experience?: number;
  is_primary_skill?: boolean;
  self_assessed?: boolean;
  manager_verified?: boolean;
  notes?: string;
}

export const useUpdateTeamMemberSkill = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTeamMemberSkillInput) => {
      const { data, error } = await supabase
        .from('team_member_skills')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_member_skills'] });
      queryClient.invalidateQueries({ queryKey: ['skills_inventory_stats'] });
      toast({
        title: 'Skill updated',
        description: 'The skill has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating skill',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteTeamMemberSkill = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('team_member_skills')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_member_skills'] });
      queryClient.invalidateQueries({ queryKey: ['skills_inventory_stats'] });
      toast({
        title: 'Skill removed',
        description: 'The skill has been removed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error removing skill',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

interface AddCertificationInput {
  team_member_id: string;
  skill_id?: string;
  name: string;
  issuing_organization?: string;
  credential_id?: string;
  issue_date?: string;
  expiry_date?: string;
  credential_url?: string;
  is_active?: boolean;
}

export const useAddCertification = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: AddCertificationInput) => {
      const { data, error } = await supabase
        .from('certifications')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['skills_inventory_stats'] });
      toast({
        title: 'Certification added',
        description: 'The certification has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding certification',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
